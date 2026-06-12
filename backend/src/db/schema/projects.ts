import {
  pgTable,
  serial,
  text,
  varchar,
  numeric,
  pgEnum,
  timestamp,
  date,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "completed",
  "archived",
]);
export const rateTypeEnum = pgEnum("rate_type", ["hourly", "fixed"]);

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  description: text("description"),
  notes: text("notes"),
  status: projectStatusEnum("status").notNull().default("active"),
  rateType: rateTypeEnum("rate_type").notNull().default("hourly"),
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
  startDate: date("start_date").notNull().default(sql`CURRENT_DATE`),
  autoInvoiceEnabled: boolean("auto_invoice_enabled").notNull().default(false),
  autoInvoiceFrequencyDays: integer("auto_invoice_frequency_days")
    .notNull()
    .default(14),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
