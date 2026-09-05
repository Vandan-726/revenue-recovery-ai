import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { analyticsDailyTable, analyticsEventsTable, recoveriesTable } from "@workspace/db/schema";

export type AnalyticsPeriod = "7d" | "30d" | "90d";

function periodStart(period: AnalyticsPeriod) {
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const start = new Date();
  start.setDate(start.getDate() - days);
  return start;
}

export async function recordAnalyticsEvent(input: {
  recoveryId?: string;
  eventType: string;
  channel?: string;
  strategy?: string;
  amount?: number;
  cost?: number;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(analyticsEventsTable).values({
    recoveryId: input.recoveryId,
    eventType: input.eventType,
    channel: input.channel,
    strategy: input.strategy,
    amount: input.amount ?? 0,
    cost: input.cost ?? 0,
    metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
  });
}

export async function getAnalytics(period: AnalyticsPeriod = "30d") {
  const start = periodStart(period);
  const events = await db.select().from(analyticsEventsTable)
    .where(gte(analyticsEventsTable.createdAt, start))
    .orderBy(desc(analyticsEventsTable.createdAt));
  const recoveries = await db.select().from(recoveriesTable)
    .where(gte(recoveriesTable.createdAt, start));

  const detected = events.filter((e) => ["payment_failed", "recovery_detected"].includes(e.eventType)).length || recoveries.length;
  const recovered = events.filter((e) => ["payment_recovered", "recovery_success"].includes(e.eventType)).length;
  const recoveredAmount = events.filter((e) => ["payment_recovered", "recovery_success"].includes(e.eventType)).reduce((sum, e) => sum + e.amount, 0);
  const totalCost = events.reduce((sum, e) => sum + Number(e.cost ?? 0), 0);
  const recoveryRate = detected ? recovered / detected : 0;

  const byStrategy = new Map<string, { attempts: number; recovered: number; amount: number; cost: number }>();
  for (const event of events) {
    const key = event.strategy ?? event.channel ?? "unattributed";
    const item = byStrategy.get(key) ?? { attempts: 0, recovered: 0, amount: 0, cost: 0 };
    if (["recovery_attempt", "notification_sent", "payment_recovered", "recovery_success"].includes(event.eventType)) item.attempts += 1;
    if (["payment_recovered", "recovery_success"].includes(event.eventType)) { item.recovered += 1; item.amount += event.amount; }
    item.cost += Number(event.cost ?? 0);
    byStrategy.set(key, item);
  }

  const trendMap = new Map<string, { detected: number; recovered: number; amount: number }>();
  for (const event of events) {
    const date = new Date(event.createdAt).toISOString().slice(0, 10);
    const item = trendMap.get(date) ?? { detected: 0, recovered: 0, amount: 0 };
    if (["payment_failed", "recovery_detected"].includes(event.eventType)) item.detected += 1;
    if (["payment_recovered", "recovery_success"].includes(event.eventType)) { item.recovered += 1; item.amount += event.amount; }
    trendMap.set(date, item);
  }

  return {
    period,
    kpis: { detected, recovered, recovery_rate: recoveryRate, recovered_amount: recoveredAmount, total_cost: totalCost, roi: totalCost ? recoveredAmount / totalCost : 0 },
    funnel: [
      { stage: "Detected", count: detected },
      { stage: "Analyzed", count: events.filter((e) => e.eventType === "analysis_completed").length },
      { stage: "Contacted", count: events.filter((e) => ["notification_sent", "recovery_attempt"].includes(e.eventType)).length },
      { stage: "Recovered", count: recovered },
    ],
    strategies: [...byStrategy.entries()].map(([strategy, item]) => ({ strategy, ...item, conversion_rate: item.attempts ? item.recovered / item.attempts : 0, roi: item.cost ? item.amount / item.cost : 0 })),
    trend: [...trendMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, ...value })),
    event_count: events.length,
  };
}

export async function getHealthMetrics() {
  const [eventCount] = await db.select({ count: sql<number>`count(*)` }).from(analyticsEventsTable);
  const [recoveryCount] = await db.select({ count: sql<number>`count(*)` }).from(recoveriesTable);
  return { analytics_events: Number(eventCount?.count ?? 0), recoveries: Number(recoveryCount?.count ?? 0), checked_at: new Date().toISOString() };
}
