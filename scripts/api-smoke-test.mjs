import assert from "node:assert/strict";

const baseUrl = process.env.API_BASE_URL ?? "http://localhost:80";

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { response, body };
}

const checks = [
  ["/api/healthz", 200],
  ["/api/health", 200],
  ["/api/v1/dashboard", 200],
  ["/api/v1/dashboard/metrics", 200],
  ["/api/v1/analytics?start_date=2026-01-01&end_date=2026-09-04", 200],
  ["/api/v1/settings", 200],
  ["/api/v1/recoveries?page=1&per_page=25", 200],
];

for (const [path, expectedStatus] of checks) {
  const { response } = await request(path);
  assert.equal(response.status, expectedStatus, `${path} should return ${expectedStatus}`);
}

const invalidQuery = await request("/api/v1/recoveries?per_page=0");
assert.equal(invalidQuery.response.status, 400, "invalid recovery pagination should be rejected");

const invalidJson = await fetch(`${baseUrl}/api/v1/webhooks/razorpay`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: '{"event":',
});
assert.equal(invalidJson.status, 400, "malformed JSON should be rejected");

const webhook = await request("/api/v1/webhooks/razorpay", {
  method: "POST",
  headers: { "content-type": "application/json", "x-razorpay-signature": "invalid" },
  body: JSON.stringify({ event: "payment.failed", payload: {} }),
});
assert.ok([401, 503].includes(webhook.response.status), "webhook must reject invalid or unconfigured requests");

console.log(`API smoke checks passed: ${checks.length + 3}`);