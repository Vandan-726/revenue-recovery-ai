import { and, desc, eq } from "drizzle-orm";
import { auditLogsTable, db, deliveryEventsTable, notificationsTable, paymentsTable, recoveriesTable } from "@workspace/db";
import { sendEmail, sendSms, sendWhatsApp, startVoiceCall, retryPayment, type ProviderResult } from "./providers";
import { renderTemplate, type Language, type TemplateKey } from "./templates";
import { env } from "../env";

export type NotifyChannel = "sms" | "email" | "whatsapp" | "voice" | "payment_retry";

const rate = new Map<string, number[]>();
const windowMs = 60 * 60 * 1000;
const limit = 3;

function allow(recipient: string) {
  const now = Date.now();
  const recent = (rate.get(recipient) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  rate.set(recipient, recent);
  return true;
}

function recipientFor(channel: NotifyChannel, payment: typeof paymentsTable.$inferSelect, recovery: typeof recoveriesTable.$inferSelect) {
  const metadata = payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata) ? payment.metadata as Record<string, unknown> : {};
  const values = { sms: metadata.phone ?? recovery.customerId, whatsapp: metadata.phone ?? recovery.customerId, voice: metadata.phone ?? recovery.customerId, email: metadata.email ?? recovery.customerId, payment_retry: payment.providerPaymentId };
  return String(values[channel] ?? "unknown");
}

export async function executeNotification(recoveryId: string, channel: NotifyChannel, options: { language?: Language; templateKey?: TemplateKey; discount?: number } = {}) {
  const [recovery] = await db.select().from(recoveriesTable).where(eq(recoveriesTable.id, recoveryId)).limit(1);
  if (!recovery) throw new Error("recovery_not_found");
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, recovery.paymentId)).limit(1);
  if (!payment) throw new Error("payment_not_found");
  const recipient = recipientFor(channel, payment, recovery);
  if (!allow(recipient)) throw new Error("rate_limit_exceeded");
  const language = options.language ?? "en";
  const templateKey = options.templateKey ?? "payment_failed_update_method";
  const content = renderTemplate(templateKey, language, {
    customer_name: recovery.customerId ?? "there",
    amount: Math.floor(recovery.amount / 100),
    discount: options.discount ?? 500,
    code: `REC_${recoveryId.slice(0, 8).toUpperCase()}`,
    hours: 24,
    link: `${env.RECOVERY_PAYMENT_LINK}/${recoveryId}`,
  });
  let result: ProviderResult;
  if (channel === "sms") result = await sendSms(recipient, content.body);
  else if (channel === "whatsapp") result = await sendWhatsApp(recipient, content.body);
  else if (channel === "email") result = await sendEmail(recipient, content.subject ?? "Payment update", `<p>${content.body}</p>`, content.body);
  else if (channel === "voice") result = await startVoiceCall(recipient, content.body);
  else result = await retryPayment(payment.providerPaymentId, recovery.amount);

  const [notification] = await db.insert(notificationsTable).values({
    recoveryId,
    channel,
    provider: result.provider,
    recipient,
    templateKey,
    language,
    status: result.status,
    providerReference: result.reference,
    content: { ...content, detail: result.detail },
    metadata: { phase: 4 },
    attemptCount: 1,
    sentAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  await db.insert(auditLogsTable).values({ recoveryId, action: `Phase 4 ${channel} ${result.status}`, actor: "phase4", details: { notification_id: notification.id, provider: result.provider, recipient, detail: result.detail } });
  return { ...notification, provider_result: result };
}

export async function recordDeliveryEvent(input: { provider: string; providerEventId: string; status: string; notificationId?: string; payload: Record<string, unknown> }) {
  const [event] = await db.insert(deliveryEventsTable).values({ provider: input.provider, providerEventId: input.providerEventId, status: input.status, notificationId: input.notificationId, payload: input.payload }).onConflictDoNothing().returning();
  if (event?.notificationId) await db.update(notificationsTable).set({ status: input.status, updatedAt: new Date() }).where(eq(notificationsTable.id, event.notificationId));
  return event ?? null;
}

export async function listNotifications(recoveryId?: string) {
  return db.select().from(notificationsTable).where(recoveryId ? eq(notificationsTable.recoveryId, recoveryId) : undefined).orderBy(desc(notificationsTable.createdAt)).limit(100);
}

export function notificationStats() {
  return { rate_limit: { max: limit, window_seconds: windowMs / 1000 }, providers: { sms: env.SMS_PROVIDER, email: env.EMAIL_PROVIDER, voice: "twilio", payment_retry: "razorpay" } };
}
