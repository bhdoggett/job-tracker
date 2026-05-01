import { Hono } from "hono";
import { db } from "../db/client";
import { timeEntries, timeEntryTasks } from "../db/schema/index";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

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
    with: { timeEntryTasks: true },
  });
  return c.json(rows.map((r) => ({
    ...r,
    taskIds: r.timeEntryTasks.map((t: { taskId: number }) => t.taskId),
    timeEntryTasks: undefined,
  })));
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

  const taskIds: number[] = body.taskIds ?? (body.taskId ? [body.taskId] : []);
  if (taskIds.length > 0) {
    await db.insert(timeEntryTasks).values(
      taskIds.map((tid: number) => ({ timeEntryId: row.id, taskId: tid }))
    );
  }
  return c.json({ ...row, taskIds }, 201);
});

timeEntriesRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const row = await db.query.timeEntries.findFirst({
    where: eq(timeEntries.id, id),
    with: { timeEntryTasks: true },
  });
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ ...row, taskIds: row.timeEntryTasks.map((t: { taskId: number }) => t.taskId), timeEntryTasks: undefined });
});

timeEntriesRouter.patch("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.json();

  // Recompute durationMin from start/end if not explicitly provided
  let computedDuration: number | null = body.durationMin ?? null;
  if (computedDuration === null && body.startedAt && body.endedAt) {
    const diff =
      new Date(body.endedAt).getTime() - new Date(body.startedAt).getTime();
    computedDuration = Math.round(diff / 60000);
  }

  const updateData = {
    projectId: body.projectId,
    taskId: body.taskId ?? null,
    startedAt: body.startedAt ? new Date(body.startedAt) : null,
    endedAt: body.endedAt ? new Date(body.endedAt) : null,
    durationMin: computedDuration,
    notes: body.notes ?? null,
    updatedAt: new Date(),
  };

  const [row] = await db
    .update(timeEntries)
    .set(updateData)
    .where(eq(timeEntries.id, id))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);

  const taskIds: number[] = body.taskIds ?? (body.taskId ? [body.taskId] : []);
  await db.delete(timeEntryTasks).where(eq(timeEntryTasks.timeEntryId, id));
  if (taskIds.length > 0) {
    await db.insert(timeEntryTasks).values(
      taskIds.map((tid: number) => ({ timeEntryId: id, taskId: tid }))
    );
  }
  return c.json({ ...row, taskIds });
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
