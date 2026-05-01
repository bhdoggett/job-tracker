import { Hono } from "hono";
import { db } from "../db/client";
import { docs } from "../db/schema/index";
import { eq, isNull } from "drizzle-orm";
import { writeFile, unlink, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, "../../uploads");

export const docsRouter = new Hono();

docsRouter.get("/", async (c) => {
  const projectId = c.req.query("projectId");
  const business = c.req.query("business");

  let rows;
  if (business === "true") {
    rows = await db.select().from(docs).where(isNull(docs.projectId));
  } else if (projectId) {
    rows = await db.select().from(docs).where(eq(docs.projectId, parseInt(projectId, 10)));
  } else {
    rows = await db.select().from(docs);
  }
  return c.json(rows);
});

docsRouter.post("/", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"] as File;
  const title = body["title"] as string;
  const projectId = body["projectId"] ? parseInt(body["projectId"] as string, 10) : null;

  if (!file || !title) return c.json({ error: "file and title required" }, 400);

  const ext = extname(file.name);
  const storedName = `${randomUUID()}${ext}`;
  const filePath = join(UPLOADS_DIR, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const [row] = await db.insert(docs).values({
    projectId,
    title,
    fileName: file.name,
    filePath: storedName,
    mimeType: file.type || null,
    size: buffer.length,
  }).returning();

  return c.json(row, 201);
});

docsRouter.get("/:id/download", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const [doc] = await db.select().from(docs).where(eq(docs.id, id));
  if (!doc) return c.json({ error: "Not found" }, 404);

  const filePath = join(UPLOADS_DIR, doc.filePath);
  const data = await readFile(filePath);

  c.header("Content-Type", doc.mimeType ?? "application/octet-stream");
  c.header("Content-Disposition", `attachment; filename="${doc.fileName}"`);
  return c.body(data);
});

docsRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const [doc] = await db.delete(docs).where(eq(docs.id, id)).returning();
  if (!doc) return c.json({ error: "Not found" }, 404);

  const filePath = join(UPLOADS_DIR, doc.filePath);
  await unlink(filePath).catch(() => {});
  return c.json({ success: true });
});
