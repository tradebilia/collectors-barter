import { defineConfig } from "drizzle-kit";

// The application uses CUSTOM_DATABASE_URL for the live Tradebilia dataset
// and only falls back to DATABASE_URL for the platform-managed database.
// Keep migration tooling aligned so a continuation session cannot generate or
// apply a schema migration against the wrong database by default.
const connectionString = process.env.CUSTOM_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("CUSTOM_DATABASE_URL or DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
