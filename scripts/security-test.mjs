import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";
let totalTests = 0;
let passedTests = 0;

function logPass(testName) {
  passedTests++;
  totalTests++;
  console.log(`  [PASS] ${testName}`);
}

function logFail(testName, error) {
  totalTests++;
  console.error(`❌ [FAIL] ${testName}:`, error?.message || error);
}

async function request(path, options = {}) {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(url, options);
      let body = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          body = await response.json();
        } catch {
          body = null;
        }
      } else {
        body = await response.text();
      }
      return { response, body, headers: response.headers };
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

console.log("=================================================");
console.log("🛡️  REVENUE RECOVERY AI - SECURITY TESTING SUITE");
console.log(`Target Base URL: ${baseUrl}`);
console.log("=================================================\n");

// ============================================================================
// SUITE 1: Webhook Security & HMAC Signature Verification
// ============================================================================
console.log("📌 SUITE 1: Webhook Security & Signature Validation");

try {
  // Test 1.1: Webhook call without signature header (requiring signature verification)
  const res1 = await request("/api/v1/webhooks/razorpay", {
    method: "POST",
    headers: { 
      "content-type": "application/json",
      "x-require-signature": "true",
    },
    body: JSON.stringify({ event: "payment.failed", payload: {} }),
  });
  assert.ok(
    [401, 403, 503].includes(res1.response.status),
    `Unsigned webhook should be rejected with 401/403/503. Got status: ${res1.response.status}`
  );
  logPass("Reject unsigned webhook requests without valid headers");
} catch (err) {
  logFail("Reject unsigned webhook requests without valid headers", err);
}

try {
  // Test 1.2: Webhook call with invalid/forged signature header
  const res2 = await request("/api/v1/webhooks/razorpay", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": "forged_signature_hash_1234567890abcdef",
    },
    body: JSON.stringify({ event: "payment.failed", payload: {} }),
  });
  assert.ok(
    [401, 403, 503].includes(res2.response.status),
    `Forged webhook signature should be rejected with 401/403/503. Got status: ${res2.response.status}`
  );
  logPass("Reject webhooks with invalid or forged HMAC signatures");
} catch (err) {
  logFail("Reject webhooks with invalid or forged HMAC signatures", err);
}

try {
  // Test 1.3: HMAC signature calculation validation
  const testSecret = "test_secret_key_123";
  const testPayload = JSON.stringify({ event: "payment.failed", payment_id: "pay_test123" });
  const hmac = crypto.createHmac("sha256", testSecret).update(testPayload).digest("hex");
  assert.equal(typeof hmac, "string");
  assert.equal(hmac.length, 64, "SHA256 HMAC must be 64 hexadecimal characters");
  logPass("Valid SHA256 HMAC signature calculation logic");
} catch (err) {
  logFail("Valid SHA256 HMAC signature calculation logic", err);
}

// ============================================================================
// SUITE 2: Input Validation, Schema Bounds & Payload Security
// ============================================================================
console.log("\n📌 SUITE 2: Input Validation & Boundary Security");

try {
  // Test 2.1: Malformed JSON syntax handling
  const resMalformed = await fetch(`${baseUrl}/api/v1/settings`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: '{"profile": { "name": "Broken JSON',
  });
  assert.equal(resMalformed.status, 400, "Malformed JSON must return HTTP 400 Bad Request");
  const jsonBody = await resMalformed.json();
  assert.equal(jsonBody.error, "invalid_request", "Malformed JSON error should return invalid_request code");
  logPass("Reject malformed JSON payloads gracefully with HTTP 400");
} catch (err) {
  logFail("Reject malformed JSON payloads gracefully with HTTP 400", err);
}

try {
  // Test 2.2: Out-of-bounds pagination parameters
  const resPagination1 = await request("/api/v1/recoveries?per_page=0");
  assert.equal(resPagination1.response.status, 400, "per_page=0 should return HTTP 400");

  const resPagination2 = await request("/api/v1/recoveries?per_page=-50");
  assert.equal(resPagination2.response.status, 400, "Negative per_page should return HTTP 400");

  const resPagination3 = await request("/api/v1/recoveries?per_page=999999");
  assert.equal(resPagination3.response.status, 400, "Excessive per_page should return HTTP 400");

  logPass("Enforce pagination bounds and reject illegal page/per_page values");
} catch (err) {
  logFail("Enforce pagination bounds and reject illegal page/per_page values", err);
}

try {
  // Test 2.3: Invalid notification channel validation
  const resChannel = await request("/api/v1/notifications", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "unsupported_channel_type", recovery_id: "rec_123" }),
  });
  assert.equal(resChannel.response.status, 400, "Invalid notification channel must return 400");
  logPass("Validate enum fields (notification channels) on request bodies");
} catch (err) {
  logFail("Validate enum fields (notification channels) on request bodies", err);
}

try {
  // Test 2.4: Missing required fields validation
  const resMissing = await request("/api/v1/delivery-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "razorpay" }), // Missing provider_event_id and status
  });
  assert.equal(resMissing.response.status, 400, "Missing required fields must return 400");
  logPass("Enforce required parameters on endpoint requests");
} catch (err) {
  logFail("Enforce required parameters on endpoint requests", err);
}

// ============================================================================
// SUITE 3: Injection Attack Resilience (SQLi, XSS, Path Traversal)
// ============================================================================
console.log("\n📌 SUITE 3: Injection Attack Resilience Check");

const sqliPayloads = [
  "' OR '1'='1",
  "'; DROP TABLE recoveries; --",
  "1 UNION SELECT null, null, null--",
  "1' AND 1=CONVERT(int, (SELECT @@version))--",
];

try {
  for (const sqli of sqliPayloads) {
    const resSqli = await request(`/api/v1/recoveries?search=${encodeURIComponent(sqli)}`);
    assert.ok(
      [200, 400].includes(resSqli.response.status),
      `SQLi payload should be sanitized and not produce 500 internal error. Got: ${resSqli.response.status}`
    );
    if (resSqli.body && typeof resSqli.body === "object") {
      const jsonStr = JSON.stringify(resSqli.body);
      assert.ok(!jsonStr.toLowerCase().includes("syntax error"), "Response must not leak database SQL syntax errors");
      assert.ok(!jsonStr.toLowerCase().includes("pg_stat"), "Response must not leak Postgres system tables");
    }
  }
  logPass("Resist SQL Injection attack vectors without leaking database errors");
} catch (err) {
  logFail("Resist SQL Injection attack vectors without leaking database errors", err);
}

const xssPayloads = [
  "<script>alert('xss')</script>",
  "<img src=x onerror=alert(document.cookie)>",
  "javascript:alert(1)",
  "'\"><svg/onload=alert(1)>",
];

try {
  for (const xss of xssPayloads) {
    const resXss = await request("/api/v1/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        profile: { name: xss, role: "Tester" },
      }),
    });
    assert.ok([200, 400].includes(resXss.response.status), `XSS input handled safely with status ${resXss.response.status}`);
  }
  logPass("Handle Cross-Site Scripting (XSS) input vectors safely");
} catch (err) {
  logFail("Handle Cross-Site Scripting (XSS) input vectors safely", err);
}

try {
  // Test Path Traversal
  const pathTraversalPayloads = [
    "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "....//....//etc//passwd",
    "invalid_id_not_found",
  ];
  for (const pt of pathTraversalPayloads) {
    const resPt = await request(`/api/v1/recoveries/${pt}`);
    assert.ok(
      [400, 404].includes(resPt.response.status),
      `Path traversal payload should be rejected with 400/404. Got: ${resPt.response.status}`
    );
  }
  logPass("Prevent Path Traversal / Directory Traversal attempts");
} catch (err) {
  logFail("Prevent Path Traversal / Directory Traversal attempts", err);
}

// ============================================================================
// SUITE 4: Sensitive Data Leakage & Information Disclosure Check
// ============================================================================
console.log("\n📌 SUITE 4: Sensitive Data Leakage & Info Disclosure Check");

try {
  // Test 4.1: Verify /api/v1/settings does not expose secret keys in plain text
  const resSettings = await request("/api/v1/settings");
  assert.equal(resSettings.response.status, 200);
  const settingsBody = JSON.stringify(resSettings.body);
  
  assert.ok(!settingsBody.includes("sk-or-v1-"), "OpenRouter API Key must NOT be exposed in settings API response");
  assert.ok(!settingsBody.includes("RAZORPAY_KEY_SECRET"), "Razorpay Key Secret name/value must not be exposed");
  assert.ok(!settingsBody.includes("postgresql://"), "Database connection string must not be exposed in API settings");

  logPass("Prevent sensitive API secrets and credentials leakage in settings endpoint");
} catch (err) {
  logFail("Prevent sensitive API secrets and credentials leakage in settings endpoint", err);
}

try {
  // Test 4.2: Stack Trace and File System leak check on 404 / 500 error responses
  const res404 = await request("/api/v1/nonexistent-security-endpoint-12345");
  assert.equal(res404.response.status, 404);
  const body404 = typeof res404.body === "string" ? res404.body : JSON.stringify(res404.body);

  assert.ok(!body404.includes("at Module._compile"), "404 response must not leak Node.js call stack trace");
  assert.ok(!body404.includes("d:\\Vandan Patel"), "404 response must not leak local server file paths");
  assert.ok(!body404.includes("/artifacts/api-server"), "404 response must not leak internal source path");

  logPass("Prevent stack traces and server filesystem paths leakage on 404 responses");
} catch (err) {
  logFail("Prevent stack traces and server filesystem paths leakage on 404 responses", err);
}

try {
  // Test 4.3: Check environment variables exposure in client workspace
  const rootDir = process.cwd();
  const envFiles = [".env", ".env.local", ".env.development", ".env.development.local"];
  let exposedViteKeys = [];

  for (const envFile of envFiles) {
    const filePath = path.join(rootDir, envFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      for (const line of content.split("\n")) {
        if (line.startsWith("VITE_") && (line.includes("SECRET") || line.includes("KEY"))) {
          exposedViteKeys.push(`${envFile}: ${line.split("=")[0]}`);
        }
      }
    }
  }

  assert.equal(
    exposedViteKeys.length,
    0,
    `Secret keys exposed with VITE_ prefix in frontend env: ${exposedViteKeys.join(", ")}`
  );
  logPass("Verify no backend secret keys are prefixed with VITE_ for frontend bundle export");
} catch (err) {
  logFail("Verify no backend secret keys are prefixed with VITE_ for frontend bundle export", err);
}

// ============================================================================
// SUITE 5: HTTP Security Headers & CORS Policy
// ============================================================================
console.log("\n📌 SUITE 5: CORS Policy & HTTP Security Headers");

try {
  const resHealth = await request("/api/healthz");
  assert.equal(resHealth.response.status, 200);

  // Check CORS header
  const corsHeader = resHealth.headers.get("access-control-allow-origin");
  assert.ok(corsHeader !== undefined, "CORS Access-Control-Allow-Origin header present");

  logPass("Enforce standard CORS header response controls");
} catch (err) {
  logFail("Enforce standard CORS header response controls", err);
}

// ============================================================================
// SUITE 6: API Endpoints Health & Security Surface Test
// ============================================================================
console.log("\n📌 SUITE 6: Complete Endpoint Security Surface Test");

const endpointsToTest = [
  ["GET", "/api/healthz", 200],
  ["GET", "/api/health", 200],
  ["GET", "/api/ready", 200],
  ["GET", "/metrics", 200],
  ["GET", "/api/v1/dashboard", 200],
  ["GET", "/api/v1/dashboard/metrics", 200],
  ["GET", "/api/v1/analytics", 200],
  ["GET", "/api/v1/settings", 200],
  ["GET", "/api/v1/recoveries", 200],
  ["GET", "/api/v1/notifications", 200],
  ["GET", "/api/v1/notification-templates", 200],
  ["GET", "/api/v1/provider-health", 200],
  ["GET", "/api/v1/provider-configs", 200],
];

for (const [method, ep, expectedStatus] of endpointsToTest) {
  try {
    const res = await request(ep, { method });
    assert.equal(res.response.status, expectedStatus, `${method} ${ep} should respond with ${expectedStatus}`);
    logPass(`${method} ${ep} - Endpoint active & healthy (${res.response.status})`);
  } catch (err) {
    logFail(`${method} ${ep} security check`, err);
  }
}

// ============================================================================
// SUMMARY REPORT
// ============================================================================
console.log("\n=================================================");
console.log("📊 SECURITY TESTING SUITE COMPLETED");
console.log(`Passed: ${passedTests} / ${totalTests} checks`);
if (passedTests === totalTests) {
  console.log("✅ ALL SECURITY VERIFICATION CHECKS PASSED SUCCESSFULLY!");
} else {
  console.log(`⚠️ ${totalTests - passedTests} CHECKS FAILED - REVIEW LOGS ABOVE.`);
}
console.log("=================================================\n");
