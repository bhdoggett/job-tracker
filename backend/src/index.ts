import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { env } from "./lib/env";
import { db } from "./db/client";
import { runMigrations } from "./lib/migrate";

await runMigrations(db);

const app = createApp();

serve({ fetch: app.fetch, port: env.PORT }, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
});
