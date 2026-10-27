import { sql } from "drizzle-orm";
import type { TradebiliaDatabaseTarget } from "../databaseTarget";

export type DatabaseExecutor = {
  execute: (query: any) => Promise<unknown>;
};

export type DatabaseAttestation = {
  target: TradebiliaDatabaseTarget["name"];
  databaseName: string;
  connectionFingerprint: string;
};

function databaseNameFromResult(result: unknown): string {
  const rows = Array.isArray(result) ? result[0] : [];
  if (!Array.isArray(rows) || !rows[0] || typeof rows[0] !== "object") return "";
  return String((rows[0] as { databaseName?: unknown }).databaseName ?? "");
}

/**
 * Confirms a newly created database client is both reachable and attached to
 * the exact independently approved target. This uses SELECT-only statements.
 */
export async function attestTradebiliaDatabase(
  db: DatabaseExecutor,
  target: TradebiliaDatabaseTarget,
  options: { log?: boolean } = {},
): Promise<DatabaseAttestation> {
  await db.execute(sql`select 1`);
  const result = await db.execute(sql`SELECT DATABASE() AS databaseName`);
  const databaseName = databaseNameFromResult(result);

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
  if (options.log !== false) {
    console.log(`[database] Attestation: ${JSON.stringify(attestation)}`);
  }
  return attestation;
}
