import { Hono } from "hono";
import { db } from "../db/client.ts";
import { profile } from "../db/schema/index.ts";
import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "../lib/crypto.ts";

export const profileRouter = new Hono();

function toResponse(row: typeof profile.$inferSelect) {
  const { einEncrypted, ...rest } = row;
  return {
    ...rest,
    ein: einEncrypted ? decrypt(einEncrypted) : null,
  };
}

profileRouter.get("/", async (c) => {
  const row = await db.query.profile.findFirst({ where: eq(profile.id, 1) });
  if (!row) return c.json(null);
  return c.json(toResponse(row));
});

profileRouter.put("/", async (c) => {
  const body = await c.req.json();
  const { ein, ...fields } = body;

  const data: Record<string, unknown> = { ...fields };
  if (ein !== undefined) {
    data.einEncrypted = ein ? encrypt(ein) : null;
  }

  const existing = await db.query.profile.findFirst({ where: eq(profile.id, 1) });

  let row;
  if (existing) {
    [row] = await db
      .update(profile)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(profile.id, 1))
      .returning();
  } else {
    [row] = await db
      .insert(profile)
      .values({ id: 1, ...data })
      .returning();
  }

  return c.json(toResponse(row));
});
