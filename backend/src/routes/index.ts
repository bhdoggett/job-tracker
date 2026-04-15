import type { Hono } from "hono";
import { projectsRouter } from "./projects";
import { tasksRouter } from "./tasks";
import { timeEntriesRouter } from "./time-entries";
import { invoicesRouter } from "./invoices";

export function registerRoutes(app: Hono) {
  app.route("/api/projects", projectsRouter);
  app.route("/api/tasks", tasksRouter);
  app.route("/api/time-entries", timeEntriesRouter);
  app.route("/api/invoices", invoicesRouter);
}
