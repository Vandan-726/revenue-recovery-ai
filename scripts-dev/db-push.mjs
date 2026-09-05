// Loads env (stripping quotes) then runs drizzle-kit push for @workspace/db.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(file) {
  const path = resolve(root, file);
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

for (const file of [".env", ".env.local", ".env.development", ".env.development.local"]) {
  loadEnvFile(file);
}

if (!process.env.DATABASE_URL) {
  console.error("[db-push] DATABASE_URL is not set.");
  process.exit(1);
}

const dbDir = resolve(root, "lib/db");
const drizzleKit = resolve(dbDir, "node_modules/.bin/drizzle-kit");
const bin = existsSync(drizzleKit)
  ? drizzleKit
  : resolve(root, "node_modules/.bin/drizzle-kit");

const child = spawn(bin, ["push", "--force", "--config", "./drizzle.config.ts"], {
  cwd: dbDir,
  env: process.env,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
