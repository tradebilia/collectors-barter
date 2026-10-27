// Startup self-checks: validate required environment variables and database
// connectivity BEFORE the server starts accepting traffic. Previously the
// server booted "successfully" with a missing/broken .env and only failed
// cryptically on the first request (e.g. "JWT_SECRET environment variable is
// not set" at sign-in, ERR_INVALID_URL at first query). Now misconfiguration
// is caught at boot with a clear, actionable message.
import {
  resolveTradebiliaDatabaseTarget,
  type TradebiliaDatabaseTarget,
} from "../databaseTarget";
import { attestTradebiliaDatabase } from "./databaseAttestation";
import { safeDatabaseErrorCode } from "./databaseError";

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
    const attestation = await attestTradebiliaDatabase(db, target, { log: false });
    console.log(`[startup] Database attestation: ${JSON.stringify(attestation)}`);
    return attestation;
  } catch (error) {
    console.error("========================================================");
    console.error(`[startup] Database attestation failed target=${target.name} code=${safeDatabaseErrorCode(error)}`);
    console.error(`Verify the selected ${target.sourceEnv} connection and approved database target.`);
    console.error("========================================================");
    throw error;
  }
}
