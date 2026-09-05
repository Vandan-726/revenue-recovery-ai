import { pgTable, text, integer, real, timestamp, uuid, index } from "drizzle-orm/pg-core";

export const analyticsEventsTable = pgTable("analytics_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  recoveryId: uuid("recovery_id"),
  eventType: text("event_type").notNull(),
  channel: text("channel"),
  strategy: text("strategy"),
  amount: integer("amount").default(0).notNull(),
  cost: real("cost").default(0).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  eventTypeIdx: index("analytics_events_event_type_idx").on(table.eventType),
  createdAtIdx: index("analytics_events_created_at_idx").on(table.createdAt),
  strategyIdx: index("analytics_events_strategy_idx").on(table.strategy),
}));

export const analyticsDailyTable = pgTable("analytics_daily", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: text("date").notNull().unique(),
  detected: integer("detected").default(0).notNull(),
  recovered: integer("recovered").default(0).notNull(),
  recoveredAmount: integer("recovered_amount").default(0).notNull(),
  recoveredCost: real("recovered_cost").default(0).notNull(),
  activeCustomers: integer("active_customers").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
export type AnalyticsDaily = typeof analyticsDailyTable.$inferSelect;
