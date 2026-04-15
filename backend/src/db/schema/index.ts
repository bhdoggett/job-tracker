export * from "./projects";
export * from "./tasks";
export * from "./time-entries";
export * from "./invoices";
export * from "./invoice-line-items";

import { relations } from "drizzle-orm";
import { projects } from "./projects";
import { tasks } from "./tasks";
import { timeEntries } from "./time-entries";
import { invoices } from "./invoices";
import { invoiceLineItems } from "./invoice-line-items";

export const projectRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks),
  timeEntries: many(timeEntries),
  invoices: many(invoices),
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  timeEntries: many(timeEntries),
}));

export const timeEntryRelations = relations(timeEntries, ({ one }) => ({
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
  task: one(tasks, { fields: [timeEntries.taskId], references: [tasks.id] }),
}));

export const invoiceRelations = relations(invoices, ({ one, many }) => ({
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  lineItems: many(invoiceLineItems),
}));

export const invoiceLineItemRelations = relations(
  invoiceLineItems,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceLineItems.invoiceId],
      references: [invoices.id],
    }),
    timeEntry: one(timeEntries, {
      fields: [invoiceLineItems.timeEntryId],
      references: [timeEntries.id],
    }),
  })
);
