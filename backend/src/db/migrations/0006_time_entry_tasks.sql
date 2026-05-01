CREATE TABLE "time_entry_tasks" (
  "time_entry_id" integer NOT NULL REFERENCES "time_entries"("id") ON DELETE CASCADE,
  "task_id" integer NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  PRIMARY KEY ("time_entry_id", "task_id")
);
