import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "src/infrastructure/db/schema/index.ts",
  out: "src/infrastructure/db/migrations",
  dbCredentials: {
    url,
  },
  strict: true,
  verbose: true,
});
