// LLM-based root cause analysis (Phase 3, section 4).
// Uses OpenRouter's OpenAI-compatible chat completions API via native fetch.
// Falls back to deterministic rule-based analysis when the LLM is unavailable.
import { logger } from "../logger";
import {
  ERROR_DESCRIPTIONS,
  LLM_CONFIG,
  type CustomerHistory,
  type LlmAnalysis,
  type RecommendedAction,
  type Urgency,
} from "./config";

export interface PaymentData {
  amount: number;
  error_code?: string | null;
  error_description?: string | null;
  method?: string | null;
  created_at?: string | Date | null;
}

const VALID_ACTIONS: RecommendedAction[] = [
  "retry",
  "sms",
  "email",
  "whatsapp",
  "update_payment_link",
  "discount",
  "call",
  "escalate",
];

function buildAnalysisPrompt(
  payment: PaymentData,
  history: CustomerHistory,
): string {
  const errorCode = payment.error_code ?? "UNKNOWN";
  const errorDesc =
    ERROR_DESCRIPTIONS[errorCode] ?? payment.error_description ?? "";

  return `You are a payment recovery AI analyst. Analyze this payment failure and provide recovery recommendations.

PAYMENT DETAILS:
- Amount: INR ${(payment.amount ?? 0) / 100}
- Error Code: ${errorCode}
- Error Description: ${errorDesc}
- Payment Method: ${payment.method ?? "Unknown"}
- Created At: ${payment.created_at ?? "Unknown"}

CUSTOMER HISTORY:
- Is New Customer: ${history.is_new}
- Previous Success Rate: ${history.success_rate}%
- Account Age (days): ${history.age_days}
- Failed Attempts (past 7 days): ${history.failed_attempts}
- Lifetime Value: INR ${history.lifetime_value}
- Payment Methods on File: ${history.payment_methods_count}

TASK:
1. Determine the root cause (20-30 words max)
2. Rate your confidence (0-100)
3. Recommend recovery actions (choose from: retry, update_payment_link, sms, email, whatsapp, discount, call, escalate)
4. Set urgency level (low, medium, high)
5. Explain your reasoning

IMPORTANT: Return ONLY a valid JSON object like this:
{"root_cause":"Card expired or CVV mismatch","confidence":75,"recommended_actions":["update_payment_link","sms","email"],"urgency":"high","reasoning":"Error code indicates card-related issue. Customer is high-value so urgent outreach needed."}

Only return the JSON, no other text.`;
}

function normalizeActions(actions: unknown): RecommendedAction[] {
  if (!Array.isArray(actions)) return [];
  const normalized = actions
    .map((a) => String(a).trim().toLowerCase())
    .filter((a): a is RecommendedAction =>
      (VALID_ACTIONS as string[]).includes(a),
    );
  return [...new Set(normalized)];
}

function normalizeUrgency(value: unknown): Urgency {
  const v = String(value ?? "").toLowerCase();
  return v === "low" || v === "medium" || v === "high" ? v : "medium";
}

function parseLlmResponse(text: string): Omit<LlmAnalysis, "source"> | null {
  // Remove markdown code fences if present
  const cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const actions = normalizeActions(parsed.recommended_actions);
    if (!parsed.root_cause || actions.length === 0) return null;
    const confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 50));
    return {
      root_cause: String(parsed.root_cause),
      confidence,
      recommended_actions: actions,
      urgency: normalizeUrgency(parsed.urgency),
      reasoning: String(parsed.reasoning ?? "LLM analysis"),
    };
  } catch {
    return null;
  }
}

// Rule-based analysis used when the LLM call fails or is not configured.
export function fallbackAnalysis(payment: PaymentData): LlmAnalysis {
  const errorCode = payment.error_code ?? "";
  const rules: Record<
    string,
    {
      root_cause: string;
      actions: RecommendedAction[];
      urgency: Urgency;
      confidence: number;
    }
  > = {
    BAD_REQUEST_PAYMENT_DECLINED: {
      root_cause: "Bank declined the transaction",
      actions: ["retry", "update_payment_link", "sms"],
      urgency: "high",
      confidence: 70,
    },
    BAD_REQUEST_PAYMENT_FAILED_INSUFFICIENT_FUNDS: {
      root_cause: "Insufficient funds in account",
      actions: ["update_payment_link", "email", "discount"],
      urgency: "medium",
      confidence: 80,
    },
    BAD_REQUEST_PAYMENT_CARD_INVALID: {
      root_cause: "Card details invalid or expired",
      actions: ["update_payment_link", "sms"],
      urgency: "high",
      confidence: 85,
    },
    BAD_REQUEST_PAYMENT_TIMED_OUT: {
      root_cause: "Payment request timed out at the gateway",
      actions: ["retry", "email"],
      urgency: "medium",
      confidence: 75,
    },
  };

  const rule = rules[errorCode] ?? {
    root_cause: "Payment failed for an unspecified reason",
    actions: ["retry", "email"] as RecommendedAction[],
    urgency: "medium" as Urgency,
    confidence: 50,
  };

  return {
    root_cause: rule.root_cause,
    confidence: rule.confidence,
    recommended_actions: rule.actions,
    urgency: rule.urgency,
    reasoning: "Fallback rule-based analysis",
    source: "fallback",
  };
}

export async function analyzePaymentFailure(
  payment: PaymentData,
  history: CustomerHistory,
): Promise<LlmAnalysis> {
  if (!LLM_CONFIG.apiKey) {
    logger.info("LLM not configured (no OPENROUTER_API_KEY); using fallback");
    return fallbackAnalysis(payment);
  }

  const prompt = buildAnalysisPrompt(payment, history);
  const modelsToTry = [
    LLM_CONFIG.model,
    LLM_CONFIG.model.replace(/:free$/, ""),
    "meta-llama/llama-3.3-70b-instruct",
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(`${LLM_CONFIG.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LLM_CONFIG.apiKey}`,
          "HTTP-Referer": "https://revenue-recovery.v0.app",
          "X-Title": "Revenue Recovery AI",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: LLM_CONFIG.temperature,
          max_tokens: LLM_CONFIG.maxTokens,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        logger.warn(
          { model, status: response.status, detail: detail.slice(0, 200) },
          "OpenRouter model attempt failed; trying next candidate",
        );
        continue;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      const parsed = parseLlmResponse(content);
      if (!parsed) {
        logger.warn({ model }, "Could not parse LLM response; trying next candidate");
        continue;
      }

      logger.info({ model, root_cause: parsed.root_cause }, "LLM analysis complete");
      return { ...parsed, source: "llm" };
    } catch (error) {
      logger.warn({ model, err: error }, "LLM call error; trying next candidate");
    }
  }

  logger.warn("All LLM candidates failed; using rule-based fallback");
  return fallbackAnalysis(payment);
}
