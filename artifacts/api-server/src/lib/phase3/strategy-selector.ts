// Recovery strategy selector (Phase 3, section 5).
// Translates the LLM analysis + customer/business rules into an ordered plan.
import {
  ActionType,
  RECOVERY_CONFIG,
  type LlmAnalysis,
  type StrategyPlan,
  type StrategyStep,
} from "./config";

export interface CustomerData {
  phone?: string | null;
  email?: string | null;
  lifetime_value: number;
  language?: string | null;
}

export interface StrategyPaymentData {
  amount: number;
}

function detectLanguage(customer: CustomerData): string {
  return customer.language ?? "en";
}

export function selectStrategies(
  analysis: LlmAnalysis,
  customer: CustomerData,
  payment: StrategyPaymentData,
): StrategyPlan {
  const actions = analysis.recommended_actions;
  const strategies: StrategyStep[] = [];

  // Rule 1: Immediate retry (declined / timeout style errors).
  if (actions.includes("retry")) {
    strategies.push({
      action: ActionType.RETRY,
      delay_seconds: 300,
      max_attempts: RECOVERY_CONFIG.maxRetries,
      config: { backoff_type: "exponential", backoff_multiplier: 2 },
      order: 1,
      priority: "high",
    });
  }

  // Rule 2: Customer outreach (SMS / WhatsApp / Email).
  const wantsOutreach =
    actions.includes("sms") ||
    actions.includes("whatsapp") ||
    actions.includes("update_payment_link");

  if (wantsOutreach) {
    if (customer.phone) {
      strategies.push({
        action: ActionType.SMS,
        delay_seconds: 600,
        config: {
          template: "payment_failed_update_method",
          language: detectLanguage(customer),
        },
        order: 2,
        priority: "high",
      });
    }
    if (customer.email || actions.includes("email")) {
      strategies.push({
        action: ActionType.EMAIL,
        delay_seconds: 1200,
        config: { template: "payment_failed_update_method" },
        order: 3,
        priority: "medium",
      });
    }
  } else if (actions.includes("email")) {
    strategies.push({
      action: ActionType.EMAIL,
      delay_seconds: 1200,
      config: { template: "payment_failed_update_method" },
      order: 3,
      priority: "medium",
    });
  }

  // Rule 3: Incentive (discount) for high-value customers.
  if (actions.includes("discount")) {
    if (customer.lifetime_value > RECOVERY_CONFIG.highValueThreshold) {
      const discountAmount = Math.min(
        RECOVERY_CONFIG.maxDiscount,
        Math.floor(payment.amount * 0.1),
      );
      strategies.push({
        action: ActionType.DISCOUNT,
        delay_seconds: 3600,
        config: {
          discount_amount: discountAmount,
          discount_percent: 10,
          max_discount: RECOVERY_CONFIG.maxDiscount,
          validity_hours: RECOVERY_CONFIG.discountValidityHours,
        },
        order: 4,
        priority: "medium",
      });
    }
  }

  // Rule 4: Escalation for urgent, very-high-value customers.
  if (
    analysis.urgency === "high" &&
    customer.lifetime_value > RECOVERY_CONFIG.escalationThreshold
  ) {
    strategies.push({
      action: ActionType.ESCALATE,
      delay_seconds: 86400,
      config: { escalate_to: "support_team", priority: "urgent" },
      order: 5,
      priority: "low",
    });
  }

  // Guarantee at least one actionable step.
  if (strategies.length === 0) {
    strategies.push({
      action: ActionType.EMAIL,
      delay_seconds: 1200,
      config: { template: "payment_failed_update_method" },
      order: 1,
      priority: "medium",
    });
  }

  strategies.sort((a, b) => a.order - b.order);

  return {
    primary_strategy: strategies[0]?.action ?? null,
    strategies,
    total_count: strategies.length,
  };
}
