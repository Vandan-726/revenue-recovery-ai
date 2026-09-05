import path from "path";
import fs from "fs";

// Load environment variables if not already set
if (!process.env.DATABASE_URL) {
  const rootDir = process.cwd();
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
      break;
    }
  }
}

async function clear() {
  const { 
    db, 
    recoveriesTable, 
    recoveryAttemptsTable, 
    auditLogsTable, 
    paymentsTable, 
    eventsTable,
    notificationsTable,
    deliveryEventsTable
  } = await import("../lib/db/src/index");

  console.log("🧹 Wiping all recovery and transaction records...");
  
  // Clear tables in foreign key order
  await db.delete(deliveryEventsTable);
  await db.delete(notificationsTable);
  await db.delete(auditLogsTable);
  await db.delete(recoveryAttemptsTable);
  await db.delete(recoveriesTable);
  await db.delete(paymentsTable);
  await db.delete(eventsTable);

  console.log("✅ All recoveries and payment events successfully cleared!");
  console.log("   - Total recoveries: 0");
  console.log("   - Total payments: 0");
  console.log("   - Total audit logs: 0");
  process.exit(0);
}

clear().catch((err) => {
  console.error("❌ Failed to clear database:", err);
  process.exit(1);
});
