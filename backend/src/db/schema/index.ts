export * from "./projects";
export * from "./tasks";
export * from "./time-entries";
export * from "./time-entry-tasks";
export * from "./invoices";
export * from "./invoice-line-items";
export * from "./profile";
export * from "./expenses";
export * from "./docs";

import { relations } from "drizzle-orm";
import { projects } from "./projects";
import { tasks } from "./tasks";
import { timeEntries } from "./time-entries";
import { timeEntryTasks } from "./time-entry-tasks";
import { invoices } from "./invoices";
import { invoiceLineItems } from "./invoice-line-items";
import { expenses } from "./expenses";
import { docs } from "./docs";

export const projectRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks),
  timeEntries: many(timeEntries),
  invoices: many(invoices),
  expenses: many(expenses),
  docs: many(docs),
}));

export const docRelations = relations(docs, ({ one }) => ({
  project: one(projects, { fields: [docs.projectId], references: [projects.id] }),
}));

export const expenseRelations = relations(expenses, ({ one }) => ({
  project: one(projects, { fields: [expenses.projectId], references: [projects.id] }),
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  timeEntries: many(timeEntries),
  timeEntryTasks: many(timeEntryTasks),
}));

export const timeEntryRelations = relations(timeEntries, ({ one, many }) => ({
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
  task: one(tasks, { fields: [timeEntries.taskId], references: [tasks.id] }),
  timeEntryTasks: many(timeEntryTasks),
}));

export const timeEntryTaskRelations = relations(timeEntryTasks, ({ one }) => ({
  timeEntry: one(timeEntries, {
    fields: [timeEntryTasks.timeEntryId],
    references: [timeEntries.id],
  }),
  task: one(tasks, {
    fields: [timeEntryTasks.taskId],
    references: [tasks.id],
  }),
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
