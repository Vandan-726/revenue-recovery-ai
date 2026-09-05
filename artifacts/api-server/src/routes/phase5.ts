import { Router } from "express";
import { getAnalytics, getHealthMetrics, recordAnalyticsEvent } from "../lib/phase5/analytics";
import type { AnalyticsPeriod } from "../lib/phase5/analytics";

const router = Router();

router.get("/v1/analytics", async (req, res) => {
  const period = req.query.period === "7d" || req.query.period === "90d" ? req.query.period : "30d";
  return res.json(await getAnalytics(period as AnalyticsPeriod));
});

router.post("/v1/analytics/events", async (req, res) => {
  await recordAnalyticsEvent(req.body ?? {});
  return res.status(202).json({ accepted: true });
});

router.get("/health", (_req, res) => res.json({ status: "ok" }));
router.get("/ready", async (_req, res) => {
  try { return res.json({ status: "ready", ...await getHealthMetrics() }); }
  catch { return res.status(503).json({ status: "not_ready" }); }
});

export default router;
