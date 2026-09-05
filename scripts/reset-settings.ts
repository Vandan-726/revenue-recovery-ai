import { db, settingsTable } from "../lib/db/src/index";

async function reset() {
  const clean = {
    profile: {
      name: "Aarav Rao",
      email: "admin@recoverly.io",
      phone: "+91 98765 43210",
      role: "Workspace Owner",
      department: "Revenue Operations",
      avatar_initials: "AR",
    },
    account: {
      business_name: "Revenue Recovery Account",
      timezone: "Asia/Calcutta",
      currency: "INR",
      support_email: "support@recoverly.io",
      weekly_digest: true,
      high_value_alerts: true,
      webhook_alerts: false,
    },
    recovery: {
      enabled: true,
      paused: false,
      max_attempts: 3,
      retry_window_hours: 72,
      high_value_threshold: 25000,
      default_strategies: ["smart_retry", "email", "whatsapp"],
    },
    integrations: {
      razorpay: { connected: true, mode: "simulation" },
      twilio: { connected: true, mode: "simulation" },
      sendgrid: { connected: true, mode: "simulation" },
    },
  };

  await db
    .insert(settingsTable)
    .values({ accountId: "default", settings: clean })
    .onConflictDoUpdate({
      target: settingsTable.accountId,
      set: { settings: clean, updatedAt: new Date() },
    });

  console.log("✅ Clean default settings restored successfully!");
  process.exit(0);
}

reset().catch((e) => {
  console.error("Reset failed:", e);
  process.exit(1);
});
