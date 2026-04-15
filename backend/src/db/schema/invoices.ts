import {
  pgTable,
  serial,
  integer,
  varchar,
  numeric,
  pgEnum,
  timestamp,
  text,
  date,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
]);

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "restrict" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  issuedDate: date("issued_date").notNull(),
  dueDate: date("due_date"),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 4 })
    .notNull()
    .default("0"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
