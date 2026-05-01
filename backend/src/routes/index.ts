import type { Hono } from "hono";
import { projectsRouter } from "./projects";
import { tasksRouter } from "./tasks";
import { timeEntriesRouter } from "./time-entries";
import { invoicesRouter } from "./invoices";
import { profileRouter } from "./profile";
import { expensesRouter } from "./expenses";
import { docsRouter } from "./docs";

export function registerRoutes(app: Hono) {
  app.route("/api/projects", projectsRouter);
  app.route("/api/tasks", tasksRouter);
  app.route("/api/time-entries", timeEntriesRouter);
  app.route("/api/invoices", invoicesRouter);
  app.route("/api/profile", profileRouter);
  app.route("/api/expenses", expensesRouter);
  app.route("/api/docs", docsRouter);
}
