import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { registerRoutes } from "./routes/index";

export function createApp() {
  const app = new Hono();
  app.use("*", logger());
  app.use("*", cors({ origin: "http://localhost:5173" }));
  registerRoutes(app);
  return app;
}
