import { pgTable, integer, primaryKey } from "drizzle-orm/pg-core";
import { timeEntries } from "./time-entries";
import { tasks } from "./tasks";

export const timeEntryTasks = pgTable(
  "time_entry_tasks",
  {
    timeEntryId: integer("time_entry_id")
      .notNull()
      .references(() => timeEntries.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.timeEntryId, t.taskId] })]
);
