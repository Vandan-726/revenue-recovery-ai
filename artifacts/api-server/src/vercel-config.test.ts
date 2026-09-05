import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const configPath = path.resolve(process.cwd(), "artifacts/api-server/vercel.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

const apiEntryPath = path.resolve(process.cwd(), "artifacts/api-server/api/index.ts");

test("Vercel deployment routes API requests to the Express entrypoint", () => {
  const rewrites = config.rewrites ?? config.routes ?? [];
  assert.ok(Array.isArray(rewrites), "Expected Vercel route config to exist");
  assert.equal(existsSync(apiEntryPath), true, "Expected a Vercel serverless entry at artifacts/api-server/api/index.ts");

  const hasApiRewrite = rewrites.some((entry: { source?: string; destination?: string; src?: string; dest?: string }) => {
    const source = entry.source ?? entry.src ?? "";
    const destination = entry.destination ?? entry.dest ?? "";
    return (source === "/api/(.*)" || source === "/v1/(.*)") && (destination === "/api/index" || destination === "/api/index.ts");
  });

  const hasHealthRewrite = rewrites.some((entry: { source?: string; destination?: string; src?: string; dest?: string }) => {
    const source = entry.source ?? entry.src ?? "";
    const destination = entry.destination ?? entry.dest ?? "";
    return (source === "/healthz" || source === "/metrics") && (destination === "/api/index" || destination === "/api/index.ts");
  });

  assert.equal(hasApiRewrite, true, "API routes should be rewritten to the Express serverless entrypoint");
  assert.equal(hasHealthRewrite, true, "Health and metrics routes should be rewritten to the Express serverless entrypoint");
});
