CREATE TABLE IF NOT EXISTS "profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_name" varchar(255),
	"your_name" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"street" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"zip" varchar(20),
	"country" varchar(100) DEFAULT 'US',
	"ein_encrypted" text,
	"website" varchar(255),
	"default_tax_rate" numeric(5, 4) DEFAULT '0',
	"default_payment_terms" varchar(100) DEFAULT 'Net 30',
	"payment_instructions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
