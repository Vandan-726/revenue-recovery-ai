import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { parseWebhookSignature } from "./webhook";

const body = Buffer.from('{"event":"payment.failed"}');
const secret = "test-webhook-secret";
const validSignature = createHmac("sha256", secret).update(body).digest("hex");

test("accepts a valid Razorpay HMAC signature", () => {
  assert.equal(parseWebhookSignature(body, validSignature, secret), true);
});

test("rejects a tampered body or signature", () => {
  assert.equal(parseWebhookSignature(Buffer.from('{"event":"order.paid"}'), validSignature, secret), false);
  assert.equal(parseWebhookSignature(body, `${validSignature.slice(0, -2)}00`, secret), false);
});

test("reports missing webhook configuration and headers", () => {
  assert.equal(parseWebhookSignature(body, validSignature, undefined), "missing_secret");
  assert.equal(parseWebhookSignature(body, undefined, secret), false);
});
