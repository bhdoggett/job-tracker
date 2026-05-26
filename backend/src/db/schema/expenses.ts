import { pgTable, serial, integer, varchar, numeric, text, date, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id, { onDelete: "set null" }),
  description: varchar("description", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  category: varchar("category", { length: 100 }),
  notes: text("notes"),
  type: varchar("type", { length: 20 }).notNull().default("expense"),
  fromAddress: text("from_address"),
  toAddress: text("to_address"),
  miles: numeric("miles", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
