import { Hono } from "hono";
import { db } from "../db/client.ts";
import { expenses } from "../db/schema/index.ts";
import { eq, and } from "drizzle-orm";

export const expensesRouter = new Hono();

// GET /api/expenses?projectId=1
expensesRouter.get("/", async (c) => {
  const projectId = c.req.query("projectId");
  const rows = await db.query.expenses.findMany({
    where: projectId ? eq(expenses.projectId, parseInt(projectId, 10)) : undefined,
    orderBy: (e, { desc }) => [desc(e.date)],
  });
  return c.json(rows);
});

// POST /api/expenses
expensesRouter.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(expenses).values({
    projectId: body.projectId,
    description: body.description,
    amount: body.amount,
    date: body.date,
    category: body.category ?? null,
    notes: body.notes ?? null,
  }).returning();
  return c.json(row, 201);
});

// GET /api/expenses/:id
expensesRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const row = await db.query.expenses.findFirst({ where: eq(expenses.id, id) });
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// PATCH /api/expenses/:id
expensesRouter.patch("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.json();
  const [row] = await db.update(expenses)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(expenses.id, id))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /api/expenses/:id
expensesRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const [row] = await db.delete(expenses).where(eq(expenses.id, id)).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
