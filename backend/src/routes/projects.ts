import { Hono } from "hono";
import { db } from "../db/client";
import { projects, invoices, invoiceLineItems } from "../db/schema/index";
import { timeEntries } from "../db/schema/index";
import { tasks } from "../db/schema/index";
import { eq } from "drizzle-orm";
import { parseId, rowOrNotFound } from "../utils/route-helpers";

export const projectsRouter = new Hono();

projectsRouter.get("/", async (c) => {
  const status = c.req.query("status") as
    | "active"
    | "completed"
    | "archived"
    | undefined;
  const rows = await db.query.projects.findMany({
    where: status ? eq(projects.status, status) : undefined,
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });
  return c.json(rows);
});

projectsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db
    .insert(projects)
    .values({
      name: body.name,
      clientName: body.clientName,
      description: body.description ?? null,
      status: body.status ?? "active",
      rateType: body.rateType ?? "hourly",
      rate: body.rate,
    })
    .returning();
  return c.json(row, 201);
});

projectsRouter.get("/:id", async (c) => {
  const id = parseId(c);
  const row = await db.query.projects.findFirst({ where: eq(projects.id, id) });
  return rowOrNotFound(c, row);
});

projectsRouter.patch("/:id", async (c) => {
  const id = parseId(c);
  const body = await c.req.json();
  const [row] = await db
    .update(projects)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return rowOrNotFound(c, row);
});

projectsRouter.delete("/:id", async (c) => {
  const id = parseId(c);
  const projectInvoices = await db.query.invoices.findMany({ where: eq(invoices.projectId, id) });
  for (const inv of projectInvoices) {
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, inv.id));
  }
  if (projectInvoices.length > 0) {
    await db.delete(invoices).where(eq(invoices.projectId, id));
  }
  const [row] = await db.delete(projects).where(eq(projects.id, id)).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

projectsRouter.get("/:id/tasks", async (c) => {
  const id = parseId(c);
  const rows = await db.query.tasks.findMany({
    where: eq(tasks.projectId, id),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  return c.json(rows);
});

projectsRouter.get("/:id/time-entries", async (c) => {
  const id = parseId(c);
  const rows = await db.query.timeEntries.findMany({
    where: eq(timeEntries.projectId, id),
    orderBy: (te, { desc }) => [desc(te.createdAt)],
  });
  return c.json(rows);
});

projectsRouter.get("/:id/summary", async (c) => {
  const id = parseId(c);
  const project = await db.query.projects.findFirst({ where: eq(projects.id, id) });
  if (!project) return c.json({ error: "Not found" }, 404);

  const entries = await db.query.timeEntries.findMany({
    where: eq(timeEntries.projectId, id),
  });

  const totalMinutes = entries.reduce(
    (sum, e) => sum + (e.durationMin ?? 0),
    0
  );
  const totalHours = totalMinutes / 60;
  const rate = parseFloat(project.rate);
  const amountOwed =
    project.rateType === "hourly"
      ? (totalHours * rate).toFixed(2)
      : project.rate;

  return c.json({
    projectId: id,
    totalMinutes,
    totalHours,
    amountOwed,
  });
});
