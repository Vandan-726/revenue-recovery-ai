// Phase 3 configuration: recovery rules, action types, and error descriptions.
// Mirrors the Python PRD's Settings.RECOVERY_CONFIG and error dictionaries.

import { env } from "../env";

export const RECOVERY_CONFIG = {
  maxRetries: env.MAX_RETRIES,
  maxDiscount: env.MAX_DISCOUNT_AMOUNT,
  discountValidityHours: env.DISCOUNT_VALIDITY_HOURS,
  highValueThreshold: env.HIGH_VALUE_THRESHOLD,
  escalationThreshold: env.ESCALATION_THRESHOLD,
};

// LLM configuration. The user opted for OpenRouter (free tier).
export const LLM_CONFIG = {
  provider: "openrouter",
  apiKey: env.OPENROUTER_API_KEY ?? "",
  model: env.OPENROUTER_MODEL,
  baseUrl: env.OPENROUTER_BASE_URL,
  temperature: 0.3,
  maxTokens: 500,
};

// In development the real delays (minutes/hours) are compressed so the
// orchestration is observable in a short session. Set DEMO_SPEED=1 to disable.
export const DEMO_SPEED = env.RECOVERY_DEMO_SPEED;
export const MAX_SCHEDULED_DELAY_MS = env.RECOVERY_MAX_DELAY_MS;

// Canonical recommended-action tokens the analyzer may emit.
export type RecommendedAction =
  | "retry"
  | "sms"
  | "email"
  | "whatsapp"
  | "update_payment_link"
  | "discount"
  | "call"
  | "escalate";

// Executable action types, aligned with the Phase 1/2 strategy vocabulary
// (recoveries.strategies / recovery_attempts.strategy).
export enum ActionType {
  RETRY = "smart_retry",
  SMS = "sms",
  EMAIL = "email",
  WHATSAPP = "whatsapp",
  DISCOUNT = "discount",
  CALL = "call",
  ESCALATE = "escalate",
}

export type Urgency = "low" | "medium" | "high";

export interface LlmAnalysis {
  root_cause: string;
  confidence: number;
  recommended_actions: RecommendedAction[];
  urgency: Urgency;
  reasoning: string;
  source: "llm" | "fallback";
}

export interface StrategyStep {
  action: ActionType;
  delay_seconds: number;
  max_attempts?: number;
  config: Record<string, unknown>;
  order: number;
  priority: "low" | "medium" | "high";
}

export interface StrategyPlan {
  primary_strategy: ActionType | null;
  strategies: StrategyStep[];
  total_count: number;
}

export interface CustomerHistory {
  is_new: boolean;
  success_rate: number;
  age_days: number;
  failed_attempts: number;
  lifetime_value: number;
  payment_methods_count: number;
  last_recovery_at: Date | null;
}

export const ERROR_DESCRIPTIONS: Record<string, string> = {
  BAD_REQUEST_PAYMENT_DECLINED: "Card/payment method was declined by the bank",
  BAD_REQUEST_PAYMENT_CARD_INVALID: "Card details are invalid or expired",
  BAD_REQUEST_PAYMENT_FAILED_INSUFFICIENT_FUNDS:
    "Cardholder has insufficient funds",
  BAD_REQUEST_PAYMENT_INVALID_AMOUNT: "Payment amount is invalid",
  BAD_REQUEST_PAYMENT_TIMED_OUT: "Payment request timed out",
};
