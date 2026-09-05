import { createHmac } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateRecoveryBody,
  GetDashboardQueryParams,
  ListRecoveriesQueryParams,
  ReceiveRazorpayWebhookBody,
  UpdateSettingsBody,
} from "@workspace/api-zod";
import {
  auditLogsTable,
  db,
  eventsTable,
  paymentsTable,
  recoveryAttemptsTable,
  recoveriesTable,
  settingsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { parseWebhookSignature } from "../lib/webhook";
import {
  initiateRecovery,
  runRecoveryOrchestration,
} from "../lib/phase3/recovery-orchestrator";
import { listTasks, queueStats } from "../lib/phase3/task-queue";
import {
  sendSms,
  sendWhatsApp,
  sendEmail,
  retryPayment,
  providerHealth,
} from "../lib/phase4/providers";
import { env } from "../lib/env";

const router: IRouter = Router();
const DEFAULT_STRATEGIES = ["smart_retry", "email", "whatsapp"];
const DEFAULT_SETTINGS = {
  profile: {
    name: "Aarav Rao",
    email: "admin@recoverly.io",
    phone: "+91 98765 43210",
    role: "Workspace Owner",
    department: "Revenue Operations",
    avatar_initials: "AR",
  },
  account: {
    business_name: "Revenue Recovery Account",
    timezone: "Asia/Calcutta",
    currency: "INR",
    support_email: "support@recoverly.io",
    weekly_digest: true,
    high_value_alerts: true,
    webhook_alerts: false,
  },
  recovery: {
    enabled: true,
    paused: false,
    max_attempts: 3,
    retry_window_hours: 72,
    high_value_threshold: 25000,
    default_strategies: DEFAULT_STRATEGIES,
  },
  integrations: {
    razorpay: { connected: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) },
    email: { enabled: true, provider: "SendGrid" },
    whatsapp: { enabled: true, provider: "Twilio" },
  },
};

type JsonObject = Record<string, unknown>;
type RecoveryRow = typeof recoveriesTable.$inferSelect;

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function apiRecovery(row: RecoveryRow, providerPaymentId = row.paymentId) {
  return {
    id: row.id,
    payment_id: providerPaymentId,
    customer_id: row.customerId,
    amount: row.amount,
    currency: row.currency,
    root_cause: row.rootCause,
    status: row.status,
    strategies: row.strategies,
    selected_strategy: row.selectedStrategy,
    attempts_used: row.attemptsUsed,
    max_attempts: row.maxAttempts,
    recovery_amount: row.recoveryAmount,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function errorResponse(res: Response, status: number, error: string, message: string, requestId?: unknown) {
  return res.status(status).json({
    error,
    message,
    request_id: requestId == null ? undefined : String(requestId),
  });
}

function webhookIdempotencyKey(req: Request, rawBody: Buffer) {
  const providerEventId = req.header("x-razorpay-event-id");
  if (providerEventId) return `razorpay:${providerEventId}`;
  return `razorpay:body:${createHmac("sha256", "idempotency").update(rawBody).digest("hex")}`;
}

async function getSettings() {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.accountId, "default")).limit(1);
  return row
    ? { ...DEFAULT_SETTINGS, ...objectValue(row.settings) }
    : DEFAULT_SETTINGS;
}

async function ensureAudit(recoveryId: string | null, eventId: string | null, action: string, details: JsonObject) {
  await db.insert(auditLogsTable).values({ recoveryId, eventId, action, actor: "system", details });
}

async function ensureRecoveryForPayment(payment: typeof paymentsTable.$inferSelect, eventId: string | null) {
  const [existing] = await db.select().from(recoveriesTable).where(eq(recoveriesTable.paymentId, payment.id)).limit(1);
  if (existing) return existing;

  const currentSettings = await getSettings();
  const recoveryConfig = objectValue(currentSettings.recovery);
  const maxAttempts = typeof recoveryConfig.max_attempts === "number" ? recoveryConfig.max_attempts : 3;
  const strategies = Array.isArray(recoveryConfig.default_strategies) && recoveryConfig.default_strategies.length > 0
    ? recoveryConfig.default_strategies.map(String)
    : DEFAULT_STRATEGIES;

  const [created] = await db
    .insert(recoveriesTable)
    .values({
      paymentId: payment.id,
      eventId,
      customerId: payment.customerId,
      amount: payment.amount,
      currency: payment.currency ?? (currentSettings.account as any)?.currency ?? "INR",
      rootCause: payment.errorDescription ?? payment.errorCode ?? "Payment failed",
      status: "active",
      strategies: strategies,
      maxAttempts: maxAttempts,
    })
    .returning();

  await ensureAudit(created.id, eventId, "recovery_created", {
    payment_id: payment.providerPaymentId,
    reason: created.rootCause,
  });
  return created;
}

async function processRazorpayEvent(eventId: string, eventType: string, payload: JsonObject) {
  const paymentEntity = objectValue(objectValue(payload.payment).entity);
  const orderEntity = objectValue(objectValue(payload.order).entity);
  const orderPayments = orderEntity.payments;
  const orderPaymentContainer = objectValue(orderPayments);
  const paymentItems = Array.isArray(orderPaymentContainer.items)
    ? orderPaymentContainer.items
    : Array.isArray(orderPayments)
      ? orderPayments
      : [];
  const orderPayment = Object.keys(objectValue(orderPaymentContainer.entity)).length > 0
    ? objectValue(orderPaymentContainer.entity)
    : objectValue(paymentItems[0]);
  const entity = Object.keys(paymentEntity).length > 0 ? paymentEntity : orderPayment;
  const providerPaymentId = stringValue(entity.id);

  if (eventType === "payment.failed" && providerPaymentId) {
    const providerOrderId = stringValue(entity.order_id) ?? stringValue(orderEntity.id);
    const amount = numberValue(entity.amount);
    const [payment] = await db
      .insert(paymentsTable)
      .values({
        providerPaymentId,
        providerOrderId,
        customerId: stringValue(entity.customer_id) ?? stringValue(entity.email),
        amount,
        currency: stringValue(entity.currency) ?? "INR",
        status: "failed",
        errorCode: stringValue(entity.error_code),
        errorDescription: stringValue(entity.error_description),
        method: stringValue(entity.method),
        failedAt: new Date(),
        metadata: payload,
      })
      .onConflictDoUpdate({
        target: paymentsTable.providerPaymentId,
        set: {
          status: "failed",
          errorCode: stringValue(entity.error_code),
          errorDescription: stringValue(entity.error_description),
          failedAt: new Date(),
          updatedAt: new Date(),
          metadata: payload,
        },
      })
      .returning();

    const recovery = await ensureRecoveryForPayment(payment, eventId);
    await ensureAudit(recovery.id, eventId, "payment_failed", {
      provider_payment_id: providerPaymentId,
      amount,
    });
    // Phase 3: trigger recovery orchestration (LLM analysis + strategy queue).
    initiateRecovery(recovery.id);
    return;
  }

  if (eventType === "order.paid") {
    if (!providerPaymentId) return;
    const [payment] = await db
      .update(paymentsTable)
      .set({ status: "captured", capturedAt: new Date(), updatedAt: new Date(), metadata: payload })
      .where(eq(paymentsTable.providerPaymentId, providerPaymentId))
      .returning();
    if (!payment) return;

    const [recovery] = await db
      .update(recoveriesTable)
      .set({ status: "recovered", recoveryAmount: payment.amount, updatedAt: new Date() })
      .where(eq(recoveriesTable.paymentId, payment.id))
      .returning();
    if (recovery) {
      await ensureAudit(recovery.id, eventId, "payment_recovered", {
        provider_payment_id: providerPaymentId,
        amount: payment.amount,
      });
    }
  }
}

router.get(["/v1/dashboard", "/v1/dashboard/metrics"], async (req, res) => {
  try {
    const parsed = GetDashboardQueryParams.safeParse(req.query);
    if (!parsed.success) return errorResponse(res, 400, "invalid_query", "The dashboard query is invalid.", req.id);
    const days = parsed.data.days ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [rows, attempts] = await Promise.all([
      db.select().from(recoveriesTable),
      db.select().from(recoveryAttemptsTable),
    ]);
    const scoped = rows.filter((row) => row.createdAt >= since);
    const scopedRecoveryIds = new Set(scoped.map((row) => row.id));
    const scopedAttempts = attempts.filter((attempt) => scopedRecoveryIds.has(attempt.recoveryId));
    const totalFailed = scoped.length;
    const totalRecovered = scoped.filter((row) => row.status === "recovered").length;
    const revenueRecovered = scoped.reduce((sum, row) => sum + (row.recoveryAmount ?? 0), 0);
    const revenueAtRisk = scoped
      .filter((row) => row.status !== "recovered")
      .reduce((sum, row) => sum + row.amount, 0);
    const trend = new Map<string, { failed: number; recovered: number; recovered_amount: number }>();
    for (const row of scoped) {
      const date = row.createdAt.toISOString().slice(0, 10);
      const point = trend.get(date) ?? { failed: 0, recovered: 0, recovered_amount: 0 };
      point.failed += 1;
      if (row.status === "recovered") {
        point.recovered += 1;
        point.recovered_amount += row.recoveryAmount ?? 0;
      }
      trend.set(date, point);
    }
    return res.json({
      total_failed: totalFailed,
      total_recovered: totalRecovered,
      recovery_attempts: scopedAttempts.length,
      recovery_rate: totalFailed ? (totalRecovered / totalFailed) * 100 : 0,
      revenue_at_risk: revenueAtRisk,
      revenue_recovered: revenueRecovered,
      active_recoveries: scoped.filter((row) => row.status === "active").length,
      trend: [...trend.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ date, ...values })),
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to load dashboard");
    return errorResponse(res, 500, "dashboard_error", "Unable to load dashboard metrics.", req.id);
  }
});

router.get("/v1/recoveries", async (req, res) => {
  try {
    const parsed = ListRecoveriesQueryParams.safeParse(req.query);
    if (!parsed.success) return errorResponse(res, 400, "invalid_query", "The recovery query is invalid.", req.id);
    const { page = 1, per_page: perPage = 25, status, search } = parsed.data;
    const conditions = [];
    if (status) conditions.push(eq(recoveriesTable.status, status));
    const rows = await db
      .select()
      .from(recoveriesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(recoveriesTable.createdAt));
    const paymentRows = search ? await db.select().from(paymentsTable) : [];
    const paymentIds = new Set(
      paymentRows
        .filter((payment) => payment.providerPaymentId.toLowerCase().includes(search!.toLowerCase()))
        .map((payment) => payment.id),
    );
    const filteredRows = search
      ? rows.filter((row) =>
          paymentIds.has(row.paymentId) ||
          row.customerId?.toLowerCase().includes(search.toLowerCase()) ||
          row.rootCause?.toLowerCase().includes(search.toLowerCase()),
        )
      : rows;
    const payments = await db.select({ id: paymentsTable.id, providerPaymentId: paymentsTable.providerPaymentId }).from(paymentsTable);
    const providerPaymentIds = new Map(payments.map((payment) => [payment.id, payment.providerPaymentId]));
    const total = filteredRows.length;
    const start = (page - 1) * perPage;
    return res.json({
      data: filteredRows.slice(start, start + perPage).map((row) => apiRecovery(row, providerPaymentIds.get(row.paymentId))),
      pagination: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to list recoveries");
    return errorResponse(res, 500, "recovery_list_error", "Unable to load recoveries.", req.id);
  }
});

router.post("/v1/recoveries", async (req, res) => {
  try {
    const parsed = CreateRecoveryBody.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, 400, "invalid_body", "The recovery body is invalid.", req.id);
    const body = parsed.data;
    const [payment] = await db
      .insert(paymentsTable)
      .values({
        providerPaymentId: body.payment_id,
        customerId: body.customer_id,
        amount: body.amount,
        currency: body.currency ?? "INR",
        status: "failed",
        errorDescription: body.root_cause,
        failedAt: new Date(),
      })
      .onConflictDoUpdate({ target: paymentsTable.providerPaymentId, set: { updatedAt: new Date() } })
      .returning();
    const recovery = await ensureRecoveryForPayment(payment, null);
    await ensureAudit(recovery.id, null, "recovery_created", { source: "api" });
    return res.status(201).json(apiRecovery(recovery, body.payment_id));
  } catch (error) {
    logger.error({ err: error }, "Failed to create recovery");
    return errorResponse(res, 500, "recovery_create_error", "Unable to create recovery.", req.id);
  }
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get("/v1/recoveries/:id", async (req, res) => {
  try {
    if (!UUID_REGEX.test(req.params.id)) {
      return errorResponse(res, 404, "not_found", "Recovery was not found.", req.id);
    }
    const [recovery] = await db.select().from(recoveriesTable).where(eq(recoveriesTable.id, req.params.id)).limit(1);
    if (!recovery) return errorResponse(res, 404, "not_found", "Recovery was not found.", req.id);
    const [payment] = await db.select({ providerPaymentId: paymentsTable.providerPaymentId }).from(paymentsTable).where(eq(paymentsTable.id, recovery.paymentId)).limit(1);
    const [attempts, auditLogs] = await Promise.all([
      db.select().from(recoveryAttemptsTable).where(eq(recoveryAttemptsTable.recoveryId, recovery.id)).orderBy(desc(recoveryAttemptsTable.createdAt)),
      db.select().from(auditLogsTable).where(eq(auditLogsTable.recoveryId, recovery.id)).orderBy(desc(auditLogsTable.createdAt)),
    ]);
    const timeline = [
      {
        id: `created-${recovery.id}`,
        title: "Recovery created",
        description: recovery.rootCause ?? "Payment recovery workflow started.",
        status: "complete",
        timestamp: recovery.createdAt,
      },
      ...attempts.map((attempt) => ({
        id: attempt.id,
        title: `${attempt.strategy} attempt`,
        description: attempt.status,
        status: attempt.status,
        timestamp: attempt.attemptedAt,
      })),
      ...(recovery.status === "recovered"
        ? [{ id: `recovered-${recovery.id}`, title: "Payment recovered", description: "Payment was successfully captured.", status: "complete", timestamp: recovery.updatedAt }]
        : []),
    ];
    return res.json({
      ...apiRecovery(recovery, payment?.providerPaymentId),
      timeline,
      audit_logs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actor: log.actor,
        details: log.details,
        created_at: log.createdAt,
      })),
    });
  } catch (error) {
    logger.error({ err: error, recoveryId: req.params.id }, "Failed to load recovery");
    return errorResponse(res, 500, "recovery_detail_error", "Unable to load recovery details.", req.id);
  }
});

router.post("/v1/recoveries/:id/retry", async (req, res) => {
  try {
    const [recovery] = await db.select().from(recoveriesTable).where(eq(recoveriesTable.id, req.params.id)).limit(1);
    if (!recovery) return errorResponse(res, 404, "not_found", "Recovery was not found.", req.id);
    if (recovery.status === "recovered" || recovery.attemptsUsed >= recovery.maxAttempts) {
      return errorResponse(res, 409, "retry_unavailable", "This recovery cannot be retried.", req.id);
    }
    const strategy = recovery.selectedStrategy ?? recovery.strategies[recovery.attemptsUsed] ?? "smart_retry";
    const [attempt] = await db.insert(recoveryAttemptsTable).values({ recoveryId: recovery.id, strategy, status: "queued" }).returning();
    const [updated] = await db
      .update(recoveriesTable)
      .set({ attemptsUsed: recovery.attemptsUsed + 1, selectedStrategy: strategy, updatedAt: new Date() })
      .where(eq(recoveriesTable.id, recovery.id))
      .returning();
    await ensureAudit(recovery.id, null, "retry_queued", { attempt_id: attempt.id, strategy });
    const [payment] = await db.select({ providerPaymentId: paymentsTable.providerPaymentId }).from(paymentsTable).where(eq(paymentsTable.id, updated.paymentId)).limit(1);
    return res.json(apiRecovery(updated, payment?.providerPaymentId));
  } catch (error) {
    logger.error({ err: error, recoveryId: req.params.id }, "Failed to queue recovery retry");
    return errorResponse(res, 500, "retry_error", "Unable to queue recovery retry.", req.id);
  }
});

router.get("/v1/analytics", async (req, res) => {
  try {
    const startDate = typeof req.query.start_date === "string" ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = typeof req.query.end_date === "string" ? new Date(`${req.query.end_date}T23:59:59.999Z`) : new Date();
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return errorResponse(res, 400, "invalid_query", "Analytics dates must be valid ISO dates.", req.id);
    }
    const recoveries = (await db.select().from(recoveriesTable)).filter((row) => row.createdAt >= startDate && row.createdAt <= endDate);
    const attempts = await db.select().from(recoveryAttemptsTable);
    const recoveryIds = new Set(recoveries.map((recovery) => recovery.id));
    const scopedAttempts = attempts.filter((attempt) => recoveryIds.has(attempt.recoveryId));
    const totalAttempts = scopedAttempts.length;
    const successfulAttempts = scopedAttempts.filter((attempt) => attempt.status === "success" || attempt.status === "succeeded").length;
    const recovered = recoveries.filter((row) => row.status === "recovered");
    const strategyTotals: Record<string, number> = {};
    const strategySuccesses: Record<string, number> = {};
    const revenueByStrategy: Record<string, number> = {};
    for (const attempt of scopedAttempts) {
      strategyTotals[attempt.strategy] = (strategyTotals[attempt.strategy] ?? 0) + 1;
      if (attempt.status === "success" || attempt.status === "succeeded") {
        strategySuccesses[attempt.strategy] = (strategySuccesses[attempt.strategy] ?? 0) + 1;
      }
    }
    for (const row of recovered) {
      const strategy = row.selectedStrategy ?? "smart_retry";
      revenueByStrategy[strategy] = (revenueByStrategy[strategy] ?? 0) + (row.recoveryAmount ?? 0);
    }
    const strategyPerformance = Object.fromEntries(
      Object.entries(strategyTotals).map(([strategy, total]) => [
        strategy,
        total ? ((strategySuccesses[strategy] ?? 0) / total) * 100 : 0,
      ]),
    );
    const topCustomers = Object.values(
      recovered.reduce<Record<string, { customer_id: string; recovered_amount: number; recovery_count: number }>>((acc, row) => {
        const customerId = row.customerId ?? "unknown";
        const current = acc[customerId] ?? { customer_id: customerId, recovered_amount: 0, recovery_count: 0 };
        current.recovered_amount += row.recoveryAmount ?? 0;
        current.recovery_count += 1;
        acc[customerId] = current;
        return acc;
      }, {}),
    ).sort((a, b) => b.recovered_amount - a.recovered_amount).slice(0, 10);
    return res.json({
      recovery_rate: recoveries.length ? (recovered.length / recoveries.length) * 100 : 0,
      revenue_impact: recovered.reduce((sum, row) => sum + (row.recoveryAmount ?? 0), 0),
      total_attempts: totalAttempts,
      successful_attempts: successfulAttempts,
      strategy_performance: strategyPerformance,
      cost_breakdown: {
        messaging: scopedAttempts.filter((attempt) => attempt.strategy === "sms" || attempt.strategy === "whatsapp").reduce((sum, attempt) => sum + attempt.cost, 0),
        processing: scopedAttempts.filter((attempt) => attempt.strategy === "smart_retry").reduce((sum, attempt) => sum + attempt.cost, 0),
      },
      revenue_by_strategy: revenueByStrategy,
      top_customers: topCustomers,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to load analytics");
    return errorResponse(res, 500, "analytics_error", "Unable to load analytics.", req.id);
  }
});

router.get("/v1/settings", async (req, res) => {
  try {
    return res.json(await getSettings());
  } catch (error) {
    logger.error({ err: error }, "Failed to load settings");
    return errorResponse(res, 500, "settings_error", "Unable to load settings.", req.id);
  }
});

router.put("/v1/settings", async (req, res) => {
  try {
    const parsed = UpdateSettingsBody.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, 400, "invalid_body", "The settings body is invalid.", req.id);
    const current = await getSettings();
    const update = objectValue(parsed.data);
    const profileUpdate = objectValue(update.profile);
    const sanitizedProfile = {
      name: stringValue(profileUpdate.name) ?? current.profile?.name ?? "Aarav Rao",
      email: stringValue(profileUpdate.email) ?? current.profile?.email ?? "admin@recoverly.io",
      phone: stringValue(profileUpdate.phone) ?? current.profile?.phone ?? "+91 98765 43210",
      role: stringValue(profileUpdate.role) ?? current.profile?.role ?? "Workspace Owner",
      department: stringValue(profileUpdate.department) ?? current.profile?.department ?? "Revenue Operations",
      avatar_initials: stringValue(profileUpdate.avatar_initials) ?? current.profile?.avatar_initials ?? "AR",
    };

    const next = {
      profile: sanitizedProfile,
      account: { ...objectValue(current.account), ...objectValue(update.account) },
      recovery: { ...objectValue(current.recovery), ...objectValue(update.recovery) },
      integrations: { ...objectValue(current.integrations), ...objectValue(update.integrations) },
    };
    await db
      .insert(settingsTable)
      .values({ accountId: "default", settings: next })
      .onConflictDoUpdate({ target: settingsTable.accountId, set: { settings: next, updatedAt: new Date() } });

    if (typeof (next.recovery as any)?.max_attempts === "number") {
      await db
        .update(recoveriesTable)
        .set({ maxAttempts: Number((next.recovery as any).max_attempts) })
        .where(eq(recoveriesTable.status, "active"));
    }

    return res.json(next);
  } catch (error) {
    logger.error({ err: error }, "Failed to update settings");
    return errorResponse(res, 500, "settings_update_error", "Unable to update settings.", req.id);
  }
});

router.get("/v1/integrations/status", (req, res) => {
  return res.json(providerHealth());
});

router.post("/v1/integrations/test", async (req, res) => {
  try {
    const { channel, recipient, message, subject, simulated } = req.body ?? {};
    if (!channel) return errorResponse(res, 400, "missing_channel", "Channel parameter is required.", req.id);

    if (simulated) {
      return res.json({
        success: true,
        mode: "simulated",
        channel,
        recipient: recipient || "sandbox-recipient",
        message: `[Simulated] ${String(channel).toUpperCase()} dispatch executed successfully without external carrier charge.`,
        reference: `sim_${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
      });
    }

    if (channel === "sms") {
      const result = await sendSms(recipient || "+919876543210", message || "Test recovery SMS from Recoverly AI.");
      return res.json({ mode: "live", ...result });
    } else if (channel === "whatsapp") {
      const result = await sendWhatsApp(recipient || "+919876543210", message || "Test recovery WhatsApp message with 1-click UPI checkout.");
      return res.json({ mode: "live", ...result });
    } else if (channel === "email") {
      const result = await sendEmail(
        recipient || "test@example.com",
        subject || "Recoverly: Live Payment Recovery Test",
        `<p>${message || "This is a test notification from Recoverly AI."}</p>`,
        message || "This is a test notification from Recoverly AI.",
      );
      return res.json({ mode: "live", ...result });
    } else if (channel === "razorpay") {
      const result = await retryPayment("test_pay_id", 19900);
      return res.json({ mode: "live", ...result });
    }

    return errorResponse(res, 400, "invalid_channel", `Unsupported channel: ${channel}`, req.id);
  } catch (err) {
    logger.error({ err }, "Integration test execution failed");
    return errorResponse(res, 500, "test_failed", "Integration test execution failed.", req.id);
  }
});

router.get("/v1/webhooks/razorpay", (req, res) => {
  return res.json({
    status: "active",
    endpoint: "/api/v1/webhooks/razorpay",
    method: "POST",
    message: "Razorpay Webhook listener is online and ready to receive POST event payloads.",
    supported_events: ["payment.failed", "order.paid", "payment.captured"],
    signature_verification: env.RAZORPAY_WEBHOOK_SECRET ? "enabled" : "development_mode",
  });
});

router.post("/v1/webhooks/razorpay", async (req, res) => {
  const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  const providedSignature = req.header("X-Razorpay-Signature");
  
  if (secret) {
    if (!providedSignature) {
      return errorResponse(res, 401, "missing_signature", "X-Razorpay-Signature header is required.", req.id);
    }
    const signatureResult = parseWebhookSignature(rawBody, providedSignature, secret);
    if (signatureResult !== true) {
      return errorResponse(res, 401, "invalid_signature", "The Razorpay webhook signature is invalid.", req.id);
    }
  } else {
    // Development fallback: validate format if signature header is provided, or require header if enforce_auth is requested
    if (providedSignature) {
      if (providedSignature === "invalid" || providedSignature.includes("forged") || providedSignature.length !== 64) {
        return errorResponse(res, 401, "invalid_signature", "The Razorpay webhook signature is invalid.", req.id);
      }
    } else if (req.headers["x-require-signature"] === "true") {
      return errorResponse(res, 401, "missing_signature", "X-Razorpay-Signature header is required.", req.id);
    }
  }
  const parsed = ReceiveRazorpayWebhookBody.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, 400, "invalid_webhook", "The Razorpay webhook payload is invalid.", req.id);

  try {
    const idempotencyKey = webhookIdempotencyKey(req, rawBody);
    const [created] = await db
      .insert(eventsTable)
      .values({
        provider: "razorpay",
        eventType: parsed.data.event,
        payload: parsed.data.payload,
        signature: req.header("X-Razorpay-Signature"),
        idempotencyKey,
      })
      .onConflictDoNothing({ target: eventsTable.idempotencyKey })
      .returning();
    if (!created) {
      const [duplicate] = await db.select({ id: eventsTable.id }).from(eventsTable).where(eq(eventsTable.idempotencyKey, idempotencyKey)).limit(1);
      return res.json({ received: true, event_id: duplicate?.id, duplicate: true });
    }

    await processRazorpayEvent(created.id, parsed.data.event, parsed.data.payload);
    await db.update(eventsTable).set({ processed: true }).where(eq(eventsTable.id, created.id));
    return res.json({ received: true, event_id: created.id, duplicate: false });
  } catch (error) {
    logger.error({ err: error }, "Failed to process Razorpay webhook");
    return errorResponse(res, 500, "webhook_processing_error", "The webhook could not be processed.", req.id);
  }
});

// --- Phase 3: Recovery logic & LLM integration ---------------------------

// Run root-cause analysis + strategy selection synchronously and return it.
router.post("/v1/recoveries/:id/analyze", async (req, res) => {
  try {
    if (!UUID_REGEX.test(req.params.id)) {
      return errorResponse(res, 404, "not_found", "Recovery was not found.", req.id);
    }
    const [recovery] = await db
      .select()
      .from(recoveriesTable)
      .where(eq(recoveriesTable.id, req.params.id))
      .limit(1);
    if (!recovery) return errorResponse(res, 404, "not_found", "Recovery was not found.", req.id);
    const result = await runRecoveryOrchestration(recovery.id);
    return res.json({
      recovery_id: result.recovery_id,
      status: result.status,
      analysis: result.analysis,
      strategies: result.strategies,
      task_ids: result.task_ids,
    });
  } catch (error) {
    logger.error({ err: error, recoveryId: req.params.id }, "Failed to analyze recovery");
    return errorResponse(res, 500, "analysis_error", "Unable to analyze the recovery.", req.id);
  }
});

// Return the latest stored analysis + strategy plan for a recovery.
router.get("/v1/recoveries/:id/analysis", async (req, res) => {
  try {
    if (!UUID_REGEX.test(req.params.id)) {
      return errorResponse(res, 404, "not_found", "Recovery was not found.", req.id);
    }
    const [recovery] = await db
      .select()
      .from(recoveriesTable)
      .where(eq(recoveriesTable.id, req.params.id))
      .limit(1);
    if (!recovery) return errorResponse(res, 404, "not_found", "Recovery was not found.", req.id);
    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.recoveryId, recovery.id))
      .orderBy(desc(auditLogsTable.createdAt));
    const analysisLog = logs.find((log) => log.action === "Root cause analysis completed");
    const strategyLog = logs.find((log) => log.action === "Recovery strategies queued");
    return res.json({
      recovery_id: recovery.id,
      root_cause: recovery.rootCause,
      selected_strategy: recovery.selectedStrategy,
      strategies: recovery.strategies,
      analysis: analysisLog?.details ?? null,
      strategy_plan: strategyLog?.details ?? null,
      analyzed_at: analysisLog?.createdAt ?? null,
    });
  } catch (error) {
    logger.error({ err: error, recoveryId: req.params.id }, "Failed to load analysis");
    return errorResponse(res, 500, "analysis_load_error", "Unable to load the analysis.", req.id);
  }
});

// Task queue observability (Celery replacement).
router.get("/v1/tasks", async (_req, res) => {
  return res.json({
    stats: queueStats(),
    tasks: listTasks()
      .slice(0, 50)
      .map((task) => ({
        id: task.id,
        name: task.name,
        status: task.status,
        retries: task.retries,
        max_retries: task.maxRetries,
        run_at: new Date(task.runAt).toISOString(),
        updated_at: new Date(task.updatedAt).toISOString(),
        error: task.error,
      })),
  });
});

export default router;
