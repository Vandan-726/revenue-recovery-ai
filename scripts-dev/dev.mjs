// Dev orchestrator: loads env, then runs the Express API server and the Vite
// frontend together. Vite is the preview server (proxies /api -> Express).
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// --- Load env files (later files do not override already-set vars) ---
function loadEnvFile(file) {
  const path = resolve(root, file);
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
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

// Preview port from the platform (fallback 3000). Express runs internally.
const WEB_PORT = process.env.PORT || "3000";
const API_PORT = process.env.API_PORT || "3001";

if (!process.env.DATABASE_URL) {
  console.warn("[dev] WARNING: DATABASE_URL is not set. The API server will fail to start.");
}

const children = [];
function run(name, command, args, extraEnv, cwd) {
  const child = spawn(command, args, {
    cwd: cwd || root,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => {
    console.log(`[dev] ${name} exited with code ${code}`);
    shutdown(code ?? 0);
  });
  children.push(child);
  return child;
}

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const isWin = process.platform === "win32";
let tsx = resolve(root, "node_modules/.bin/tsx" + (isWin ? ".cmd" : ""));
const webDir = resolve(root, "artifacts/revenue-recovery-dashboard");
let vite = resolve(webDir, "node_modules/.bin/vite" + (isWin ? ".cmd" : ""));

if (isWin) {
  tsx = `"${tsx}"`;
  vite = `"${vite}"`;
}

// 1) Express API server (internal port), run via tsx for direct TS execution.
run("api", tsx, ["watch", "artifacts/api-server/src/index.ts"], {
  PORT: API_PORT,
  NODE_ENV: process.env.NODE_ENV || "development",
});

// 2) Vite frontend on the preview port; proxies /api to the API server.
run(
  "web",
  vite,
  ["--config", "vite.config.ts", "--host", "0.0.0.0", "--port", WEB_PORT],
  { PORT: WEB_PORT, API_PORT, BASE_PATH: "/" },
  webDir,
);
