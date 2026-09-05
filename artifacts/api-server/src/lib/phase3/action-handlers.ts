// Recovery action handlers (Phase 3, section 6.2).
// Side effects (payment retry, SMS, email, etc.) are simulated deterministically
// here — real provider clients (Razorpay/Twilio/SES) are wired in Phase 4.
import { randomBytes } from "node:crypto";
import { ActionType } from "./config";
import { executeNotification } from "../phase4/notifier";

export interface ActionContext {
  recoveryId: string;
  amount: number;
  currency: string;
  customerId: string | null;
  errorCode: string | null;
  attemptNumber: number;
}

export interface ActionResult {
  success: boolean;
  action: string;
  cost: number;
  detail: Record<string, unknown>;
  error?: string;
}

function smsTemplate(templateName: string, language: string, amountPaise: number): string {
  const rupees = Math.floor(amountPaise / 100);
  const templates: Record<string, Record<string, string>> = {
    en: {
      payment_failed_update_method: `Your payment of INR ${rupees} failed. Update your payment method here: [link]`,
    },
    hi: {
      payment_failed_update_method: `Aapka INR ${rupees} ka payment fail ho gaya. Yahan click karein: [link]`,
    },
  };
  return (
    templates[language]?.[templateName] ??
    templates.en[templateName] ??
    "Payment failed, please update your payment method."
  );
}

function emailTemplate(amountPaise: number): { subject: string; html: string } {
  const rupees = Math.floor(amountPaise / 100);
  return {
    subject: `Payment Update Required - INR ${rupees}`,
    html: `<h2>Payment Failed</h2><p>Your payment of INR ${rupees} couldn't go through.</p><a href="[update-link]">Update Payment Method</a>`,
  };
}

// A declined card is likely to succeed on a later retry; a hard-invalid card is
// not. This keeps the simulation realistic and deterministic-ish.
function retryLikelySucceeds(ctx: ActionContext): boolean {
  if (ctx.errorCode === "BAD_REQUEST_PAYMENT_CARD_INVALID") return false;
  // Higher chance of success on later attempts.
  const base = ctx.errorCode === "BAD_REQUEST_PAYMENT_DECLINED" ? 0.45 : 0.35;
  const chance = Math.min(0.9, base + ctx.attemptNumber * 0.15);
  return Math.random() < chance;
}

export function handleRetry(ctx: ActionContext): ActionResult {
  const success = retryLikelySucceeds(ctx);
  return {
    success,
    action: ActionType.RETRY,
    cost: 200, // gateway processing cost (paise)
    detail: {
      provider: "razorpay",
      simulated: true,
      captured: success,
      attempt_number: ctx.attemptNumber,
    },
  };
}

export async function handleSmsWithProvider(ctx: ActionContext, config: Record<string, unknown>): Promise<ActionResult> {
  const result = await executeNotification(ctx.recoveryId, "sms", { language: String(config.language ?? "en") as "en" | "hi", templateKey: String(config.template ?? "payment_failed_update_method") as any });
  return { success: result.provider_result.success, action: ActionType.SMS, cost: 25, detail: result.provider_result.detail, error: result.provider_result.error };
}

export async function handleEmailWithProvider(ctx: ActionContext): Promise<ActionResult> {
  const result = await executeNotification(ctx.recoveryId, "email");
  return { success: result.provider_result.success, action: ActionType.EMAIL, cost: 5, detail: result.provider_result.detail, error: result.provider_result.error };
}

export async function handleWhatsappWithProvider(ctx: ActionContext, config: Record<string, unknown>): Promise<ActionResult> {
  const result = await executeNotification(ctx.recoveryId, "whatsapp", { language: String(config.language ?? "en") as "en" | "hi" });
  return { success: result.provider_result.success, action: ActionType.WHATSAPP, cost: 15, detail: result.provider_result.detail, error: result.provider_result.error };
}

export function handleSms(ctx: ActionContext, config: Record<string, unknown>): ActionResult {
  const language = String(config.language ?? "en");
  const template = String(config.template ?? "payment_failed_update_method");
  const message = smsTemplate(template, language, ctx.amount);
  return {
    success: true,
    action: ActionType.SMS,
    cost: 25,
    detail: { simulated: true, message, message_id: `sms_${randomBytes(4).toString("hex")}` },
  };
}

export function handleEmail(ctx: ActionContext): ActionResult {
  const content = emailTemplate(ctx.amount);
  return {
    success: true,
    action: ActionType.EMAIL,
    cost: 5,
    detail: { simulated: true, ...content, message_id: `eml_${randomBytes(4).toString("hex")}` },
  };
}

export function handleWhatsapp(ctx: ActionContext, config: Record<string, unknown>): ActionResult {
  const language = String(config.language ?? "en");
  const template = String(config.template ?? "payment_failed_update_method");
  const message = smsTemplate(template, language, ctx.amount);
  return {
    success: true,
    action: ActionType.WHATSAPP,
    cost: 15,
    detail: { simulated: true, message, message_id: `wa_${randomBytes(4).toString("hex")}` },
  };
}

export function handleDiscount(ctx: ActionContext, config: Record<string, unknown>): ActionResult {
  const discountAmount = Number(config.discount_amount ?? 500);
  const validityHours = Number(config.validity_hours ?? 24);
  const code = `REC_${ctx.recoveryId.slice(0, 8)}`.toUpperCase();
  return {
    success: true,
    action: ActionType.DISCOUNT,
    cost: discountAmount,
    detail: { simulated: true, discount_code: code, discount_amount: discountAmount, validity_hours: validityHours },
  };
}

export function handleEscalate(ctx: ActionContext, config: Record<string, unknown>): ActionResult {
  return {
    success: true,
    action: ActionType.ESCALATE,
    cost: 0,
    detail: {
      simulated: true,
      escalated_to: String(config.escalate_to ?? "support_team"),
      priority: String(config.priority ?? "normal"),
    },
  };
}

export function runAction(
  action: ActionType,
  ctx: ActionContext,
  config: Record<string, unknown>,
): ActionResult {
  switch (action) {
    case ActionType.RETRY:
      return handleRetry(ctx);
    case ActionType.SMS:
      return handleSms(ctx, config);
    case ActionType.EMAIL:
      return handleEmail(ctx);
    case ActionType.WHATSAPP:
      return handleWhatsapp(ctx, config);
    case ActionType.DISCOUNT:
      return handleDiscount(ctx, config);
    case ActionType.ESCALATE:
      return handleEscalate(ctx, config);
    default:
      return { success: false, action: String(action), cost: 0, detail: {}, error: "unknown_action" };
  }
}
