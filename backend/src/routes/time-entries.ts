import { Hono } from "hono";
import { db } from "../db/client";
import { timeEntries } from "../db/schema/index";
import { eq, and, gte, lte } from "drizzle-orm";

export const timeEntriesRouter = new Hono();

timeEntriesRouter.get("/", async (c) => {
  const projectId = c.req.query("projectId");
  const from = c.req.query("from");
  const to = c.req.query("to");

  const conditions = [];
  if (projectId)
    conditions.push(eq(timeEntries.projectId, parseInt(projectId, 10)));
  if (from) conditions.push(gte(timeEntries.createdAt, new Date(from)));
  if (to) conditions.push(lte(timeEntries.createdAt, new Date(to)));

  const rows = await db.query.timeEntries.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: (te, { desc }) => [desc(te.createdAt)],
  });
  return c.json(rows);
});

timeEntriesRouter.post("/", async (c) => {
  const body = await c.req.json();

  // Compute durationMin from start/end if not provided manually
  let durationMin = body.durationMin ?? null;
  if (durationMin === null && body.startedAt && body.endedAt) {
    const diff =
      new Date(body.endedAt).getTime() - new Date(body.startedAt).getTime();
    durationMin = Math.round(diff / 60000);
  }

  const [row] = await db
    .insert(timeEntries)
    .values({
      projectId: body.projectId,
      taskId: body.taskId ?? null,
      startedAt: body.startedAt ? new Date(body.startedAt) : null,
      endedAt: body.endedAt ? new Date(body.endedAt) : null,
      durationMin,
      notes: body.notes ?? null,
    })
    .returning();
  return c.json(row, 201);
});

timeEntriesRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const row = await db.query.timeEntries.findFirst({
    where: eq(timeEntries.id, id),
  });
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

timeEntriesRouter.patch("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.json();

  // Recompute durationMin if start/end updated
  let durationMin = body.durationMin;
  if (durationMin === undefined && body.startedAt && body.endedAt) {
    const diff =
      new Date(body.endedAt).getTime() - new Date(body.startedAt).getTime();
    durationMin = Math.round(diff / 60000);
  }

  const updateData: Record<string, unknown> = {
    ...body,
    updatedAt: new Date(),
  };
  if (durationMin !== undefined) updateData.durationMin = durationMin;

  const [row] = await db
    .update(timeEntries)
    .set(updateData)
    .where(eq(timeEntries.id, id))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

timeEntriesRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const [row] = await db
    .delete(timeEntries)
    .where(eq(timeEntries.id, id))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
