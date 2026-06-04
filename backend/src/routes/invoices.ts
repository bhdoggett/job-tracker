import { Hono } from "hono";
import { db } from "../db/client";
import {
  invoices,
  invoiceLineItems,
  timeEntries,
  timeEntryTasks,
  tasks,
  projects,
} from "../db/schema/index";
import { eq, and, gte, lte } from "drizzle-orm";
import { parseId, rowOrNotFound } from "../utils/route-helpers";
import { groupTimeEntriesByDay } from "../lib/invoice-helpers";

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

  // Query time entries in period, filtering by startedAt
  const entryConditions = [eq(timeEntries.projectId, projectId)];
  if (periodStart)
    entryConditions.push(gte(timeEntries.startedAt, new Date(periodStart)));
  if (periodEnd)
    entryConditions.push(lte(timeEntries.startedAt, new Date(periodEnd)));

  const entries = await db.query.timeEntries.findMany({
    where: and(...entryConditions),
  });

  // Fetch task titles for each entry
  const entriesWithTasks = await Promise.all(
    entries.map(async (entry) => {
      const entryTasks = await db
        .select({ title: tasks.title })
        .from(timeEntryTasks)
        .innerJoin(tasks, eq(timeEntryTasks.taskId, tasks.id))
        .where(eq(timeEntryTasks.timeEntryId, entry.id));
      return {
        startedAt: entry.startedAt ? entry.startedAt.toISOString() : null,
        durationMin: entry.durationMin,
        notes: entry.notes,
        taskTitles: entryTasks.map((t) => t.title),
      };
    })
  );

  // Group entries by calendar day
  const dayGroups = groupTimeEntriesByDay(entriesWithTasks);

  // Generate invoice number: INV-YYYY-NNN
  const year = new Date().getFullYear();
  const existing = await db.query.invoices.findMany({
    orderBy: (inv, { desc }) => [desc(inv.createdAt)],
  });
  const seq = String(existing.length + 1).padStart(3, "0");
  const invoiceNumber = `INV-${year}-${seq}`;

  // Build line items from day groups
  const rate = parseFloat(project.rate);
  let subtotal = 0;
  const lineItemsData = dayGroups.map((group) => {
    const hours = group.totalMinutes / 60;
    const quantity = hours.toFixed(2);
    const amount = (hours * rate).toFixed(2);
    subtotal += hours * rate;
    return {
      date: group.date,
      tasks: group.tasks || null,
      description: group.description || `Work on ${project.name}`,
      quantity,
      unitPrice: project.rate,
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
  const id = parseId(c);
  const row = await db.query.invoices.findFirst({
    where: eq(invoices.id, id),
    with: { lineItems: true },
  });
  return rowOrNotFound(c, row);
});

invoicesRouter.patch("/:id", async (c) => {
  const id = parseId(c);
  const body = await c.req.json();
  const [row] = await db
    .update(invoices)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(invoices.id, id))
    .returning();
  return rowOrNotFound(c, row);
});

invoicesRouter.delete("/:id", async (c) => {
  const id = parseId(c);
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  if (!inv) return c.json({ error: "Not found" }, 404);
  if (inv.status !== "draft")
    return c.json({ error: "Can only delete draft invoices" }, 400);
  await db.delete(invoices).where(eq(invoices.id, id));
  return c.json({ success: true });
});

// Line item management
invoicesRouter.post("/:id/line-items", async (c) => {
  const invoiceId = parseId(c);
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
  return rowOrNotFound(c, row);
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
