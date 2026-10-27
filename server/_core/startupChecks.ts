// Startup self-checks: validate required environment variables and database
// connectivity BEFORE the server starts accepting traffic. Previously the
// server booted "successfully" with a missing/broken .env and only failed
// cryptically on the first request (e.g. "JWT_SECRET environment variable is
// not set" at sign-in, ERR_INVALID_URL at first query). Now misconfiguration
// is caught at boot with a clear, actionable message.
import { sql } from "drizzle-orm";
import {
  resolveTradebiliaDatabaseTarget,
  type TradebiliaDatabaseTarget,
} from "../databaseTarget";

const REQUIRED_ENV_VARS = [
  "JWT_SECRET",
  "VITE_APP_ID",
  "BUILT_IN_FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY",
] as const;

export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  const missing: string[] = REQUIRED_ENV_VARS.filter(name => !env[name]);
  if (missing.length > 0) {
    console.error("========================================================");
    console.error("STARTUP CHECK FAILED: missing required environment vars:");
    for (const name of missing) console.error(`  - ${name}`);
    console.error("Check that the .env file exists in the project root and");
    console.error("contains all required values, then restart the server.");
    console.error("========================================================");
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  try {
    resolveTradebiliaDatabaseTarget(env);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid configuration";
    throw new Error(
      `The selected Tradebilia database target is not valid: ${message}`,
    );
  }
  console.log("[startup] Environment check: PASS (all required variables present)");
}

export type DatabaseStartupDeps = {
  requireDb?: () => Promise<{ execute: (query: unknown) => Promise<unknown> }>;
  target?: TradebiliaDatabaseTarget;
};

export async function validateDatabaseConnection(deps: DatabaseStartupDeps = {}): Promise<{
  target: TradebiliaDatabaseTarget["name"];
  databaseName: string;
  connectionFingerprint: string;
}> {
  const requireDb = deps.requireDb ?? (await import("../db")).requireDb;
  const target = deps.target ?? resolveTradebiliaDatabaseTarget();
  try {
    const db = await requireDb();
    await db.execute(sql`select 1`);
    const result = await db.execute(sql`SELECT DATABASE() AS databaseName`);
    const rows = Array.isArray(result) ? result[0] : [];
    const databaseName = Array.isArray(rows) && rows[0] && typeof rows[0] === "object"
      ? String((rows[0] as { databaseName?: unknown }).databaseName ?? "")
      : "";

    if (databaseName !== target.expectedDatabaseName) {
      throw new Error(
        `Selected database target ${target.name} expected ${target.expectedDatabaseName} but connected to ${databaseName || "(none)"}.`,
      );
    }

    const attestation = {
      target: target.name,
      databaseName,
      connectionFingerprint: target.connectionFingerprint,
    };
    console.log(`[startup] Database attestation: ${JSON.stringify(attestation)}`);
    return attestation;
  } catch (error) {
    console.error("========================================================");
    console.error("STARTUP CHECK FAILED: cannot connect to the database.");
    console.error("Verify DATABASE_URL credentials and network access.");
    console.error("========================================================");
    throw error;
  }
}
