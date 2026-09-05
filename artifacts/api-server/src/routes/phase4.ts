import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, providerConfigsTable, notificationTemplatesTable } from "@workspace/db";
import { executeNotification, listNotifications, notificationStats, recordDeliveryEvent, type NotifyChannel } from "../lib/phase4/notifier";
import { listTemplates } from "../lib/phase4/templates";
import { providerHealth } from "../lib/phase4/providers";

const router: IRouter = Router();
const channel = (value: unknown): NotifyChannel | null => ["sms", "email", "whatsapp", "voice", "payment_retry"].includes(String(value)) ? String(value) as NotifyChannel : null;

router.post("/v1/notifications", async (req, res) => {
  const selected = channel(req.body?.channel);
  const recoveryId = String(req.body?.recovery_id ?? "");
  if (!selected || !recoveryId) return res.status(400).json({ error: "channel and recovery_id are required" });
  try {
    const result = await executeNotification(recoveryId, selected, { language: req.body?.language, templateKey: req.body?.template_key, discount: req.body?.discount });
    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "notification_failed";
    return res.status(message === "rate_limit_exceeded" ? 429 : 500).json({ error: message });
  }
});

router.get("/v1/notifications", async (req, res) => {
  return res.json({ notifications: await listNotifications(typeof req.query.recovery_id === "string" ? req.query.recovery_id : undefined), stats: notificationStats() });
});

router.get("/v1/notification-templates", async (_req, res) => {
  const stored = await db.select().from(notificationTemplatesTable).orderBy(desc(notificationTemplatesTable.updatedAt));
  return res.json({ templates: stored.length ? stored : listTemplates() });
});

router.get("/v1/provider-health", (_req, res) => res.json(providerHealth()));

router.post("/v1/delivery-events", async (req, res) => {
  const { provider, provider_event_id, status, notification_id, payload } = req.body ?? {};
  if (!provider || !provider_event_id || !status) return res.status(400).json({ error: "provider, provider_event_id and status are required" });
  return res.status(201).json(await recordDeliveryEvent({ provider, providerEventId: provider_event_id, status, notificationId: notification_id, payload: payload ?? {} }));
});

router.get("/v1/provider-configs", async (_req, res) => res.json({ configs: await db.select().from(providerConfigsTable) }));

export default router;
