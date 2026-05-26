import type { Context } from "hono";

/** Parse `:id` route param as integer. */
export function parseId(c: Context): number {
  return parseInt(c.req.param("id"), 10);
}

/**
 * Return row as JSON, or 404 if undefined/null.
 * Use for GET and PATCH handlers that return the affected row.
 */
export function rowOrNotFound<T>(c: Context, row: T | null | undefined) {
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
}
