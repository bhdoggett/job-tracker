import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { registerRoutes } from "./routes/index";

export function createApp() {
  const app = new Hono();
  app.use("*", logger());
  app.use("*", cors({ origin: "http://localhost:5173" }));
  registerRoutes(app);

  // Without this, an uncaught error (e.g. a post-commit backup/import
  // failure — see import.ts) falls through to Hono's default plain-text
  // "Internal Server Error", which the client's res.json() can't parse. That
  // silently drops safetyExportPath, the user's only pointer back to their
  // pre-import snapshot after a restore has already replaced the database.
  // Returning JSON here — and forwarding safetyExportPath when the error
  // carries one — keeps that path recoverable on any unexpected failure.
  app.onError((err, c) => {
    console.error(err);
    const safetyExportPath = (err as { safetyExportPath?: string }).safetyExportPath;
    return c.json(
      { error: err.message || "Internal Server Error", ...(safetyExportPath ? { safetyExportPath } : {}) },
      500
    );
  });

  return app;
}
