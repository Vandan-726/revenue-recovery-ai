import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";

// Load environment variables from .env or .env.development.local if process.env.DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  const rootDir = path.resolve(__dirname, "../../");
  const envFiles = [".env.development.local", ".env.local", ".env"];
  for (const file of envFiles) {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    }
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Please set DATABASE_URL in .env.development.local with your real PostgreSQL connection string.");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
