ALTER TABLE "expenses"
  ADD COLUMN "type" varchar(20) NOT NULL DEFAULT 'expense',
  ADD COLUMN "from_address" text,
  ADD COLUMN "to_address" text,
  ADD COLUMN "miles" numeric(8, 2);
