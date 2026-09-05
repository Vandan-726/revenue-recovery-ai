import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const eventsTable = pgTable("recovery_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull().default("razorpay"),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  signature: text("signature"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentsTable = pgTable("recovery_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerPaymentId: text("provider_payment_id").notNull().unique(),
  providerOrderId: text("provider_order_id"),
  customerId: text("customer_id"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("failed"),
  errorCode: text("error_code"),
  errorDescription: text("error_description"),
  method: text("method"),
  capturedAt: timestamp("captured_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recoveriesTable = pgTable("recoveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("payment_id").notNull().references(() => paymentsTable.id),
  eventId: uuid("event_id").references(() => eventsTable.id),
  customerId: text("customer_id"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  rootCause: text("root_cause"),
  status: text("status").notNull().default("active"),
  strategies: jsonb("strategies").$type<string[]>().notNull().default([]),
  selectedStrategy: text("selected_strategy"),
  attemptsUsed: integer("attempts_used").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  recoveryAmount: integer("recovery_amount"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recoveryAttemptsTable = pgTable("recovery_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  recoveryId: uuid("recovery_id").notNull().references(() => recoveriesTable.id),
  strategy: text("strategy").notNull(),
  status: text("status").notNull().default("queued"),
  providerReference: text("provider_reference"),
  response: jsonb("response"),
  cost: integer("cost").notNull().default(0),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogsTable = pgTable("recovery_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  recoveryId: uuid("recovery_id").references(() => recoveriesTable.id),
  eventId: uuid("event_id").references(() => eventsTable.id),
  action: text("action").notNull(),
  actor: text("actor").notNull().default("system"),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settingsTable = pgTable("recovery_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: text("account_id").notNull().unique().default("default"),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable);
export const insertPaymentSchema = createInsertSchema(paymentsTable);
export const insertRecoverySchema = createInsertSchema(recoveriesTable);
export const insertRecoveryAttemptSchema = createInsertSchema(recoveryAttemptsTable);
export const insertAuditLogSchema = createInsertSchema(auditLogsTable);
export const insertSettingsSchema = createInsertSchema(settingsTable);

export type Event = typeof eventsTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
export type Recovery = typeof recoveriesTable.$inferSelect;
export type RecoveryAttempt = typeof recoveryAttemptsTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
export type SettingsRow = typeof settingsTable.$inferSelect;