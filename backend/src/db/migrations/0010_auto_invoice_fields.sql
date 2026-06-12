ALTER TABLE "projects" ADD COLUMN "start_date" date;--> statement-breakpoint
UPDATE "projects" SET "start_date" = "created_at"::date;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "start_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "start_date" SET DEFAULT CURRENT_DATE;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "auto_invoice_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "auto_invoice_frequency_days" integer DEFAULT 14 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "auto_generated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "viewed_at" timestamp with time zone;