import { Hono } from "hono";
import { db } from "../db/client";
import { tasks } from "../db/schema/index";
import { eq, and } from "drizzle-orm";

export const tasksRouter = new Hono();

tasksRouter.get("/", async (c) => {
  const projectId = c.req.query("projectId");
  const status = c.req.query("status") as
    | "todo"
    | "in_progress"
    | "done"
    | undefined;

  const conditions = [];
  if (projectId) conditions.push(eq(tasks.projectId, parseInt(projectId, 10)));
  if (status) conditions.push(eq(tasks.status, status));

  const rows = await db.query.tasks.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  return c.json(rows);
});

tasksRouter.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db
    .insert(tasks)
    .values({
      projectId: body.projectId,
      title: body.title,
      description: body.description ?? null,
      status: body.status ?? "todo",
    })
    .returning();
  return c.json(row, 201);
});

tasksRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const row = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

tasksRouter.patch("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.json();
  const [row] = await db
    .update(tasks)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

tasksRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const [row] = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
