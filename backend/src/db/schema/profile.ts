import { pgTable, serial, varchar, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const profile = pgTable("profile", {
  id: serial("id").primaryKey(),
  businessName: varchar("business_name", { length: 255 }),
  yourName: varchar("your_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  street: varchar("street", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  zip: varchar("zip", { length: 20 }),
  country: varchar("country", { length: 100 }).default("US"),
  einEncrypted: text("ein_encrypted"),
  website: varchar("website", { length: 255 }),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 4 }).default("0"),
  defaultPaymentTerms: varchar("default_payment_terms", { length: 100 }).default("Net 30"),
  paymentInstructions: text("payment_instructions"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
