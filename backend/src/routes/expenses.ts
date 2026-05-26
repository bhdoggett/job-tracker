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
    projectId: body.projectId ?? null,
    description: body.description,
    amount: body.amount,
    date: body.date,
    category: body.category ?? null,
    notes: body.notes ?? null,
    type: body.type ?? "expense",
    fromAddress: body.fromAddress ?? null,
    toAddress: body.toAddress ?? null,
    miles: body.miles ?? null,
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
    .set({
      ...(body.projectId !== undefined && { projectId: body.projectId }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.date !== undefined && { date: body.date }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.fromAddress !== undefined && { fromAddress: body.fromAddress }),
      ...(body.toAddress !== undefined && { toAddress: body.toAddress }),
      ...(body.miles !== undefined && { miles: body.miles }),
      updatedAt: new Date(),
    })
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
