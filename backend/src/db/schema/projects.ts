import {
  pgTable,
  serial,
  text,
  varchar,
  numeric,
  pgEnum,
  timestamp,
} from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
