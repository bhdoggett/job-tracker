ALTER TABLE "expenses"
  ADD COLUMN IF NOT EXISTS "type" varchar(20) NOT NULL DEFAULT 'expense',
  ADD COLUMN IF NOT EXISTS "from_address" text,
  ADD COLUMN IF NOT EXISTS "to_address" text,
  ADD COLUMN IF NOT EXISTS "miles" numeric(8, 2);
