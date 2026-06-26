import { pgTable, integer, primaryKey } from "drizzle-orm/pg-core";
import { invoices } from "./invoices";
import { timeEntries } from "./time-entries";

export const invoiceTimeEntries = pgTable(
  "invoice_time_entries",
  {
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    timeEntryId: integer("time_entry_id")
      .notNull()
      .references(() => timeEntries.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.invoiceId, t.timeEntryId] })]
);
