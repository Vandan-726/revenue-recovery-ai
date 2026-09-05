import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const notificationTemplatesTable = pgTable("notification_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateKey: text("template_key").notNull(),
  channel: text("channel").notNull(),
  language: text("language").notNull().default("en"),
  subject: text("subject"),
  body: text("body").notNull(),
  active: integer("active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  recoveryId: uuid("recovery_id"),
  channel: text("channel").notNull(),
  provider: text("provider").notNull(),
  recipient: text("recipient").notNull(),
  templateKey: text("template_key"),
  language: text("language").notNull().default("en"),
  status: text("status").notNull().default("queued"),
  providerReference: text("provider_reference"),
  content: jsonb("content"),
  metadata: jsonb("metadata"),
  attemptCount: integer("attempt_count").notNull().default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deliveryEventsTable = pgTable("delivery_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  notificationId: uuid("notification_id"),
  provider: text("provider").notNull(),
  providerEventId: text("provider_event_id").notNull().unique(),
  status: text("status").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const providerConfigsTable = pgTable("provider_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: text("channel").notNull().unique(),
  provider: text("provider").notNull(),
  enabled: integer("enabled").notNull().default(0),
  config: jsonb("config").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplatesTable);
export const insertNotificationSchema = createInsertSchema(notificationsTable);
export const insertDeliveryEventSchema = createInsertSchema(deliveryEventsTable);
export const insertProviderConfigSchema = createInsertSchema(providerConfigsTable);

export type NotificationTemplate = typeof notificationTemplatesTable.$inferSelect;
export type Notification = typeof notificationsTable.$inferSelect;
export type DeliveryEvent = typeof deliveryEventsTable.$inferSelect;
export type ProviderConfig = typeof providerConfigsTable.$inferSelect;

export const PHASE4_CHANNELS = ["sms", "email", "whatsapp", "voice", "payment_retry"] as const;
export type Phase4Channel = (typeof PHASE4_CHANNELS)[number];
export const NOTIFICATION_STATUSES = ["queued", "sent", "delivered", "failed", "simulated"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
export const phase4Defaults = { sms: "twilio", email: "sendgrid", voice: "twilio", payment_retry: "razorpay" } as const;
export const phase4TemplateKeys = ["payment_failed_update_method", "payment_retry_success", "payment_reminder", "discount_offer", "final_notice"] as const;
export type Phase4TemplateKey = (typeof phase4TemplateKeys)[number];
export const phase4Languages = ["en", "hi"] as const;
export type Phase4Language = (typeof phase4Languages)[number];
export const phase4Providers = ["twilio", "exotel", "sendgrid", "ses", "razorpay", "simulation"] as const;
export type Phase4Provider = (typeof phase4Providers)[number];
