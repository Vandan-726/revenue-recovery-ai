import { z } from "zod";

const optional = z.string().trim().optional().transform((value) => value || undefined);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: optional,
  OPENROUTER_API_KEY: optional,
  OPENROUTER_MODEL: z.string().default("meta-llama/llama-3.3-70b-instruct"),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  TWILIO_ACCOUNT_SID: optional,
  TWILIO_AUTH_TOKEN: optional,
  TWILIO_PHONE_NUMBER: optional,
  TWILIO_WHATSAPP_FROM: optional,
  EXOTEL_API_KEY: optional,
  EXOTEL_API_TOKEN: optional,
  EXOTEL_SID: optional,
  EXOTEL_FROM_NUMBER: optional,
  SENDGRID_API_KEY: optional,
  SENDGRID_FROM_EMAIL: optional,
  AWS_ACCESS_KEY_ID: optional,
  AWS_SECRET_ACCESS_KEY: optional,
  AWS_REGION: z.string().default("ap-south-1"),
  SES_FROM_EMAIL: optional,
  RAZORPAY_KEY_ID: optional,
  RAZORPAY_KEY_SECRET: optional,
  SMS_PROVIDER: z.enum(["twilio", "exotel", "simulation"]).default("simulation"),
  EMAIL_PROVIDER: z.enum(["sendgrid", "ses", "simulation"]).default("simulation"),
  RECOVERY_PAYMENT_LINK: z.string().url().default("https://pay.example.com/update"),
  MAX_RETRIES: z.coerce.number().int().positive().default(3),
  MAX_DISCOUNT_AMOUNT: z.coerce.number().nonnegative().default(500),
  DISCOUNT_VALIDITY_HOURS: z.coerce.number().positive().default(24),
  HIGH_VALUE_THRESHOLD: z.coerce.number().nonnegative().default(5000),
  ESCALATION_THRESHOLD: z.coerce.number().nonnegative().default(10000),
  RECOVERY_DEMO_SPEED: z.coerce.number().positive().default(120),
  RECOVERY_MAX_DELAY_MS: z.coerce.number().positive().default(8000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const keys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid server environment. Check: ${keys}`);
}

export const env = parsed.data;
export type ServerEnv = typeof env;
