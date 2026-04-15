import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { invoices } from "./invoices";
import { timeEntries } from "./time-entries";

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  timeEntryId: integer("time_entry_id").references(() => timeEntries.id, {
    onDelete: "set null",
  }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
