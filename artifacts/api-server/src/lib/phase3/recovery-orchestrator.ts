// Recovery orchestrator (Phase 3, section 6.1).
// Wires the analyzer, strategy selector, action handlers, and task queue into
// the existing Drizzle schema (recoveries, recovery_attempts, audit logs).
import { eq } from "drizzle-orm";
import {
  auditLogsTable,
  db,
  paymentsTable,
  recoveriesTable,
  recoveryAttemptsTable,
} from "@workspace/db";
import { logger } from "../logger";
import { ActionType, type CustomerHistory, type StrategyStep } from "./config";
import { analyzePaymentFailure, type PaymentData } from "./llm-analyzer";
import { selectStrategies } from "./strategy-selector";
import { runAction, type ActionContext } from "./action-handlers";
import { enqueue } from "./task-queue";

async function audit(
  recoveryId: string | null,
  eventId: string | null,
  action: string,
  actor: string,
  details: Record<string, unknown>,
) {
  await db
    .insert(auditLogsTable)
    .values({ recoveryId, eventId, action, actor, details });
}

export async function getCustomerHistory(
  customerId: string | null,
): Promise<CustomerHistory> {
  if (!customerId) {
    return {
      is_new: true,
      success_rate: 0,
      age_days: 0,
      failed_attempts: 0,
      lifetime_value: 0,
      payment_methods_count: 0,
      last_recovery_at: null,
    };
  }

  const [recoveries, payments] = await Promise.all([
    db.select().from(recoveriesTable).where(eq(recoveriesTable.customerId, customerId)),
    db.select().from(paymentsTable).where(eq(paymentsTable.customerId, customerId)),
  ]);

  const successful = recoveries.filter((r) => r.status === "recovered").length;
  const failed = recoveries.filter((r) => r.status === "failed").length;
  const lifetimeValue = Math.floor(
    payments.reduce((sum, p) => sum + (p.amount ?? 0), 0) / 100,
  );
  const lastRecoveryAt = recoveries.reduce<Date | null>((latest, r) => {
    return !latest || r.createdAt > latest ? r.createdAt : latest;
  }, null);

  return {
    is_new: payments.length < 2,
    success_rate: recoveries.length ? (successful / recoveries.length) * 100 : 0,
    age_days: 0,
    failed_attempts: failed,
    lifetime_value: lifetimeValue,
    payment_methods_count: new Set(payments.map((p) => p.method).filter(Boolean)).size || 1,
    last_recovery_at: lastRecoveryAt,
  };
}

// Execute a single recovery action (Phase 3, section 6.1 execute_recovery_action).
export async function executeRecoveryAction(
  recoveryId: string,
  action: ActionType,
  config: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const [recovery] = await db
    .select()
    .from(recoveriesTable)
    .where(eq(recoveriesTable.id, recoveryId))
    .limit(1);
  if (!recovery) throw new Error(`Recovery ${recoveryId} not found`);

  // Stop if already recovered.
  if (recovery.status === "recovered") {
    return { skipped: true, reason: "already_recovered" };
  }

  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, recovery.paymentId))
    .limit(1);

  const attemptNumber = recovery.attemptsUsed + 1;
  const [attempt] = await db
    .insert(recoveryAttemptsTable)
    .values({ recoveryId, strategy: action, status: "started" })
    .returning();

  const ctx: ActionContext = {
    recoveryId,
    amount: recovery.amount,
    currency: recovery.currency,
    customerId: recovery.customerId,
    errorCode: payment?.errorCode ?? null,
    attemptNumber,
  };

  const result = runAction(action, ctx, config);

  await db
    .update(recoveryAttemptsTable)
    .set({
      status: result.success ? "success" : "failed",
      response: result as unknown as Record<string, unknown>,
      cost: result.cost,
      providerReference:
        (result.detail.message_id as string) ??
        (result.detail.discount_code as string) ??
        null,
    })
    .where(eq(recoveryAttemptsTable.id, attempt.id));

  await db
    .update(recoveriesTable)
    .set({ attemptsUsed: attemptNumber, updatedAt: new Date() })
    .where(eq(recoveriesTable.id, recoveryId));

  await audit(recoveryId, null, `action_${action}`, "recovery-worker", {
    success: result.success,
    cost: result.cost,
    ...result.detail,
  });

  if (result.success && action === ActionType.RETRY) {
    // A successful retry captures the payment and recovers revenue.
    await db
      .update(recoveriesTable)
      .set({
        status: "recovered",
        recoveryAmount: recovery.amount,
        updatedAt: new Date(),
      })
      .where(eq(recoveriesTable.id, recoveryId));
    await db
      .update(paymentsTable)
      .set({ status: "captured", capturedAt: new Date(), updatedAt: new Date() })
      .where(eq(paymentsTable.id, recovery.paymentId));
    await audit(recoveryId, null, "recovery_successful", "recovery-worker", {
      via: action,
      amount: recovery.amount,
    });
    logger.info({ recoveryId, action }, "Recovery successful");
  }

  return result as unknown as Record<string, unknown>;
}

// Main orchestration task (Phase 3, section 6.1 initiate_recovery).
export async function runRecoveryOrchestration(recoveryId: string) {
  const [recovery] = await db
    .select()
    .from(recoveriesTable)
    .where(eq(recoveriesTable.id, recoveryId))
    .limit(1);
  if (!recovery) throw new Error(`Recovery ${recoveryId} not found`);

  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, recovery.paymentId))
    .limit(1);

  const history = await getCustomerHistory(recovery.customerId);

  const paymentData: PaymentData = {
    amount: payment?.amount ?? recovery.amount,
    error_code: payment?.errorCode ?? null,
    error_description: payment?.errorDescription ?? recovery.rootCause ?? null,
    method: payment?.method ?? null,
    created_at: payment?.failedAt ?? recovery.createdAt,
  };

  // 1. Analyze failure (LLM with rule-based fallback).
  const analysis = await analyzePaymentFailure(paymentData, history);

  await db
    .update(recoveriesTable)
    .set({ rootCause: analysis.root_cause, updatedAt: new Date() })
    .where(eq(recoveriesTable.id, recoveryId));

  await audit(recoveryId, recovery.eventId, "Root cause analysis completed", "LLM-Analyzer", {
    root_cause: analysis.root_cause,
    confidence: analysis.confidence,
    urgency: analysis.urgency,
    reasoning: analysis.reasoning,
    recommended_actions: analysis.recommended_actions,
    source: analysis.source,
  });

  // 2. Select recovery strategies.
  const plan = selectStrategies(
    analysis,
    {
      phone: payment?.metadata ? extractString(payment.metadata, "phone") : null,
      email: recovery.customerId,
      lifetime_value: history.lifetime_value,
      language: "en",
    },
    { amount: paymentData.amount },
  );

  const strategyNames = plan.strategies.map((s) => s.action);
  await db
    .update(recoveriesTable)
    .set({
      strategies: strategyNames,
      selectedStrategy: plan.primary_strategy,
      updatedAt: new Date(),
    })
    .where(eq(recoveriesTable.id, recoveryId));

  await audit(recoveryId, recovery.eventId, "Recovery strategies queued", "system", {
    strategies_count: plan.total_count,
    strategies: plan.strategies as unknown as Record<string, unknown>[],
  });

  // 3. Queue each strategy step with its (compressed) delay.
  const taskIds: string[] = [];
  for (const step of plan.strategies) {
    const id = enqueue(
      () => executeRecoveryAction(recoveryId, step.action, step.config),
      {
        name: `recovery:${recoveryId}:${step.action}`,
        delaySeconds: step.delay_seconds,
        maxRetries: step.max_attempts ?? 3,
        priority: step.priority === "high" ? 1 : 5,
      },
    );
    taskIds.push(id);
  }

  logger.info(
    { recoveryId, strategies: plan.total_count, source: analysis.source },
    "Recovery orchestration complete",
  );

  return {
    recovery_id: recoveryId,
    analysis,
    strategies: plan.strategies as unknown as StrategyStep[],
    task_ids: taskIds,
    status: "orchestration_complete" as const,
  };
}

function extractString(value: unknown, key: string): string | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

// Enqueue the orchestration itself (called from the webhook / API).
export function initiateRecovery(recoveryId: string): string {
  return enqueue(() => runRecoveryOrchestration(recoveryId), {
    name: `orchestrate:${recoveryId}`,
    delaySeconds: 0,
    maxRetries: 3,
  });
}
