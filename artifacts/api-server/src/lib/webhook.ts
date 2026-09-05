import { createHmac, timingSafeEqual } from "node:crypto";

export function parseWebhookSignature(
  rawBody: Buffer | undefined,
  signature: string | undefined,
  secret: string | undefined,
) {
  if (!secret) return "missing_secret" as const;
  if (!rawBody || !signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const provided = Buffer.from(signature, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
