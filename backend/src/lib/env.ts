import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

export const env = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    (() => {
      throw new Error("DATABASE_URL not set");
    })(),
  PORT: parseInt(process.env.PORT ?? "3001", 10),
  ENCRYPTION_KEY:
    process.env.ENCRYPTION_KEY ??
    (() => {
      throw new Error("ENCRYPTION_KEY not set");
    })(),
};
