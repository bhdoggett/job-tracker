CREATE TABLE IF NOT EXISTS "invoice_time_entries" (
	"invoice_id" integer NOT NULL,
	"time_entry_id" integer NOT NULL,
	CONSTRAINT "invoice_time_entries_invoice_id_time_entry_id_pk" PRIMARY KEY("invoice_id","time_entry_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_time_entries" ADD CONSTRAINT "invoice_time_entries_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_time_entries" ADD CONSTRAINT "invoice_time_entries_time_entry_id_time_entries_id_fk" FOREIGN KEY ("time_entry_id") REFERENCES "public"."time_entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "invoice_time_entries" ("invoice_id", "time_entry_id")
SELECT i.id, te.id
FROM invoices i
JOIN time_entries te
  ON te.project_id = i.project_id
  AND te.started_at >= i.period_start::date
  AND te.started_at < (i.period_end::date + INTERVAL '1 day')
WHERE i.period_start IS NOT NULL
  AND i.period_end IS NOT NULL
ON CONFLICT DO NOTHING;
