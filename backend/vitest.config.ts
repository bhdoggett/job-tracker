import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // export.test.ts and import.test.ts share one scratch Postgres database
    // (job_tracker_test) and truncate it between tests, so they cannot run
    // concurrently with each other.
    fileParallelism: false,
  },
});
