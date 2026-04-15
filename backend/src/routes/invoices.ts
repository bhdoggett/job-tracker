import { Hono } from "hono";
import { db } from "../db/client";
import { invoices, invoiceLineItems, timeEntries, projects } from "../db/schema/index";
import { eq, and, gte, lte, isNull } from "drizzle-orm";

export const invoicesRouter = new Hono();

invoicesRouter.get("/", async (c) => {
  const projectId = c.req.query("projectId");
  const status = c.req.query("status") as
    | "draft"
    | "sent"
    | "paid"
    | undefined;

  const conditions = [];
  if (projectId)
    conditions.push(eq(invoices.projectId, parseInt(projectId, 10)));
  if (status) conditions.push(eq(invoices.status, status));

  const rows = await db.query.invoices.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: (inv, { desc }) => [desc(inv.createdAt)],
  });
  return c.json(rows);
});

invoicesRouter.post("/", async (c) => {
  const body = await c.req.json();
  const {
    projectId,
    issuedDate,
    dueDate,
    periodStart,
    periodEnd,
    taxRate = "0",
    notes,
  } = body;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return c.json({ error: "Project not found" }, 404);

  // Query unbilled time entries in period
  const entryConditions = [eq(timeEntries.projectId, projectId)];
  if (periodStart)
    entryConditions.push(gte(timeEntries.createdAt, new Date(periodStart)));
  if (periodEnd)
    entryConditions.push(lte(timeEntries.createdAt, new Date(periodEnd)));

  const entries = await db.query.timeEntries.findMany({
    where: and(...entryConditions),
  });

  // Generate invoice number: INV-YYYY-NNN
  const year = new Date().getFullYear();
  const existing = await db.query.invoices.findMany({
    orderBy: (inv, { desc }) => [desc(inv.createdAt)],
  });
  const seq = String(existing.length + 1).padStart(3, "0");
  const invoiceNumber = `INV-${year}-${seq}`;

  // Compute line items from time entries
  const rate = parseFloat(project.rate);
  let subtotal = 0;
  const lineItemsData = entries.map((entry) => {
    const hours = (entry.durationMin ?? 0) / 60;
    const quantity = hours.toFixed(2);
    const unitPrice = project.rate;
    const amount = (hours * rate).toFixed(2);
    subtotal += hours * rate;
    return {
      timeEntryId: entry.id,
      description: entry.notes ?? `Work on ${project.name}`,
      quantity,
      unitPrice,
      amount,
    };
  });

  const taxRateNum = parseFloat(taxRate);
  const taxAmount = (subtotal * taxRateNum).toFixed(2);
  const total = (subtotal + parseFloat(taxAmount)).toFixed(2);

  // Create invoice + line items in a transaction
  const result = await db.transaction(async (tx) => {
    const [invoice] = await tx
      .insert(invoices)
      .values({
        projectId,
        invoiceNumber,
        issuedDate,
        dueDate: dueDate ?? null,
        periodStart: periodStart ?? null,
        periodEnd: periodEnd ?? null,
        subtotal: subtotal.toFixed(2),
        taxRate,
        taxAmount,
        total,
        notes: notes ?? null,
      })
      .returning();

    const items =
      lineItemsData.length > 0
        ? await tx
            .insert(invoiceLineItems)
            .values(
              lineItemsData.map((li) => ({ ...li, invoiceId: invoice.id }))
            )
            .returning()
        : [];

    return { ...invoice, lineItems: items };
  });

  return c.json(result, 201);
});

invoicesRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const row = await db.query.invoices.findFirst({
    where: eq(invoices.id, id),
    with: { lineItems: true },
  });
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

invoicesRouter.patch("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.json();
  const [row] = await db
    .update(invoices)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(invoices.id, id))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

invoicesRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  if (!inv) return c.json({ error: "Not found" }, 404);
  if (inv.status !== "draft")
    return c.json({ error: "Can only delete draft invoices" }, 400);
  await db.delete(invoices).where(eq(invoices.id, id));
  return c.json({ success: true });
});

// Line item management
invoicesRouter.post("/:id/line-items", async (c) => {
  const invoiceId = parseInt(c.req.param("id"), 10);
  const body = await c.req.json();
  const [row] = await db
    .insert(invoiceLineItems)
    .values({ ...body, invoiceId })
    .returning();
  return c.json(row, 201);
});

invoicesRouter.patch("/:id/line-items/:itemId", async (c) => {
  const itemId = parseInt(c.req.param("itemId"), 10);
  const body = await c.req.json();
  const [row] = await db
    .update(invoiceLineItems)
    .set(body)
    .where(eq(invoiceLineItems.id, itemId))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

invoicesRouter.delete("/:id/line-items/:itemId", async (c) => {
  const itemId = parseInt(c.req.param("itemId"), 10);
  const [row] = await db
    .delete(invoiceLineItems)
    .where(eq(invoiceLineItems.id, itemId))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
