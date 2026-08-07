import { db, queryClient } from "../db/client";
import { MIGRATIONS_FOLDER } from "../lib/migrate";
import { baselineMigrations } from "../lib/baseline";

async function main(): Promise<number> {
  try {
    const result = await baselineMigrations(db, MIGRATIONS_FOLDER);

    if (result.outcome === "already-tracked") {
      console.log(
        "Nothing to do: migrations are already tracked in drizzle.__drizzle_migrations.",
      );
      return 0;
    }

    if (result.outcome === "empty-database") {
      console.log(
        "Nothing to do: no tables in the public schema. This database is fresh —\n" +
          "start the backend (or run `npm run db:migrate`) and migrations will apply normally.",
      );
      return 0;
    }

    console.log(`Baselined ${result.inserted} migrations as already applied:`);
    for (const tag of result.tags) console.log(`  ${tag}`);
    console.log("\nNo schema changes were made — only ledger rows were inserted.");
    console.log("Start the backend; auto-migrate will now skip these and boot cleanly.");
    return 0;
  } catch (err) {
    console.error(`Baseline failed: ${(err as Error).message}`);
    return 1;
  }
}

main()
  .then(async (code) => {
    await queryClient.end();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error(err);
    await queryClient.end();
    process.exit(1);
  });
