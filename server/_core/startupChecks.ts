// Startup self-checks: validate required environment variables and database
// connectivity BEFORE the server starts accepting traffic. Previously the
// server booted "successfully" with a missing/broken .env and only failed
// cryptically on the first request (e.g. "JWT_SECRET environment variable is
// not set" at sign-in, ERR_INVALID_URL at first query). Now misconfiguration
// is caught at boot with a clear, actionable message.
import { sql } from "drizzle-orm";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "VITE_APP_ID",
  "BUILT_IN_FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY",
] as const;

export function validateEnvironment(): void {
  const missing = REQUIRED_ENV_VARS.filter(name => !process.env[name]);
  if (missing.length > 0) {
    console.error("========================================================");
    console.error("STARTUP CHECK FAILED: missing required environment vars:");
    for (const name of missing) console.error(`  - ${name}`);
    console.error("Check that the .env file exists in the project root and");
    console.error("contains all required values, then restart the server.");
    console.error("========================================================");
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  // Sanity-check DATABASE_URL is a parseable URL before anything uses it.
  try {
    new URL(process.env.DATABASE_URL as string);
  } catch {
    throw new Error(
      "DATABASE_URL is set but is not a valid URL. Check the .env file for quoting/formatting errors.",
    );
  }
  console.log("[startup] Environment check: PASS (all required variables present)");
}

export async function validateDatabaseConnection(): Promise<void> {
  const { requireDb } = await import("../db");
  try {
    const db = await requireDb();
    await db.execute(sql`select 1`);
    console.log("[startup] Database check: PASS (connection verified)");
  } catch (error) {
    console.error("========================================================");
    console.error("STARTUP CHECK FAILED: cannot connect to the database.");
    console.error("Verify DATABASE_URL credentials and network access.");
    console.error("========================================================");
    throw error;
  }
}
