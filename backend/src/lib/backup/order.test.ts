// backend/src/lib/backup/order.test.ts
import { describe, it, expect } from "vitest";
import { insertOrder, deleteOrder, tableByName, hasSerialPrimaryKey } from "./order";

describe("insertOrder", () => {
  it("includes exactly the 10 application tables", () => {
    const order = insertOrder();
    expect([...order].sort()).toEqual([
      "docs",
      "expenses",
      "invoice_line_items",
      "invoice_time_entries",
      "invoices",
      "profile",
      "projects",
      "tasks",
      "time_entries",
      "time_entry_tasks",
    ]);
  });

  it("orders projects before its dependents", () => {
    const order = insertOrder();
    const idx = (name: string) => order.indexOf(name);
    for (const dependent of ["tasks", "time_entries", "docs", "expenses", "invoices"]) {
      expect(idx("projects")).toBeLessThan(idx(dependent));
    }
  });

  it("orders tasks and time_entries before time_entry_tasks", () => {
    const order = insertOrder();
    const idx = (name: string) => order.indexOf(name);
    expect(idx("tasks")).toBeLessThan(idx("time_entry_tasks"));
    expect(idx("time_entries")).toBeLessThan(idx("time_entry_tasks"));
  });

  it("orders invoices and time_entries before invoice_line_items and invoice_time_entries", () => {
    const order = insertOrder();
    const idx = (name: string) => order.indexOf(name);
    for (const dependent of ["invoice_line_items", "invoice_time_entries"]) {
      expect(idx("invoices")).toBeLessThan(idx(dependent));
      expect(idx("time_entries")).toBeLessThan(idx(dependent));
    }
  });
});

describe("deleteOrder", () => {
  it("is the exact reverse of insertOrder", () => {
    expect(deleteOrder()).toEqual([...insertOrder()].reverse());
  });
});

describe("tableByName", () => {
  it("returns the matching drizzle table for a known name", () => {
    expect(tableByName("projects")).toBeDefined();
  });

  it("throws for an unknown table name", () => {
    expect(() => tableByName("not_a_table")).toThrow(/Unknown table/);
  });
});

describe("hasSerialPrimaryKey", () => {
  it("is true for tables with a serial id primary key", () => {
    expect(hasSerialPrimaryKey("projects")).toBe(true);
    expect(hasSerialPrimaryKey("profile")).toBe(true);
  });

  it("is false for the composite-primary-key join tables", () => {
    expect(hasSerialPrimaryKey("time_entry_tasks")).toBe(false);
    expect(hasSerialPrimaryKey("invoice_time_entries")).toBe(false);
  });
});
