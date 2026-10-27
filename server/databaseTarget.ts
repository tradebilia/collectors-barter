import { createHash } from "node:crypto";
import type { SslOptions } from "mysql2";

export const LEGACY_TRADEBILIA_DATABASE_NAME = "GnMVDXgu6G8uhj5ZYQtcGe";

export type TradebiliaDatabaseTargetName = "legacy" | "new";

export type TradebiliaDatabaseTarget = {
  name: TradebiliaDatabaseTargetName;
  databaseUrl: string;
  expectedDatabaseName: string;
  sourceEnv: "DATABASE_URL" | "NEW_TIDB_DATABASE_URL";
  connectionFingerprint: string;
};

type TradebiliaTlsOptions = SslOptions & { verifyIdentity?: boolean };

export type TradebiliaDatabaseConnection = {
  uri: string;
  ssl?: TradebiliaTlsOptions;
};

/**
 * Preserves the legacy runtime behavior: DATABASE_URL supplies the host,
 * credentials, port, and TLS configuration while Tradebilia selects its own
 * database name. The resulting URL must never be logged.
 */
export function buildTradebiliaDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = `/${LEGACY_TRADEBILIA_DATABASE_NAME}`;
  return url.toString();
}

function normalizeTargetName(value: string | undefined): TradebiliaDatabaseTargetName {
  const normalized = String(value ?? "legacy").trim().toLowerCase();
  if (normalized === "legacy" || normalized === "new") return normalized;
  throw new Error('TRADEBILIA_DATABASE_TARGET must be either "legacy" or "new".');
}

function databaseNameFromUrl(databaseUrl: string): string {
  const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, "").trim();
  if (!databaseName) {
    throw new Error("The selected database URL must include a database name.");
  }
  return databaseName;
}

/**
 * Returns a stable non-secret fingerprint for operational attestation. It
 * deliberately excludes credentials and all query-string settings from logs.
 */
function connectionFingerprint(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  const safeIdentity = `${url.protocol}//${url.hostname}:${url.port || "default"}/${url.pathname.replace(/^\/+/, "")}`;
  return createHash("sha256").update(safeIdentity).digest("hex").slice(0, 12);
}

function parseTlsOptions(value: string): TradebiliaTlsOptions {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("The ssl query parameter must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The ssl query parameter must be a JSON object.");
  }

  const options = parsed as Record<string, unknown>;
  if (options.rejectUnauthorized !== undefined && typeof options.rejectUnauthorized !== "boolean") {
    throw new Error("ssl.rejectUnauthorized must be a boolean when provided.");
  }
  if (options.verifyIdentity !== undefined && typeof options.verifyIdentity !== "boolean") {
    throw new Error("ssl.verifyIdentity must be a boolean when provided.");
  }

  // Preserve supported TLS material such as CA/cert/key while normalizing only
  // the fields we enforce. The URL and this object are never logged.
  return {
    ...(options as TradebiliaTlsOptions),
    rejectUnauthorized: options.rejectUnauthorized !== false,
    ...(options.verifyIdentity === true ? { verifyIdentity: true } : {}),
  };
}

/**
 * Converts supported URL-level TLS settings into the explicit mysql2 options
 * that Drizzle passes to the driver. `sslMode` is not a mysql2 URL option and
 * must never be left on a raw URI where it could be ignored.
 */
export function resolveTradebiliaDatabaseConnection(target: TradebiliaDatabaseTarget): TradebiliaDatabaseConnection {
  const url = new URL(target.databaseUrl);
  const sslValue = url.searchParams.get("ssl");
  const sslMode = url.searchParams.get("sslMode")?.trim().toUpperCase();

  if (sslValue && sslMode) {
    throw new Error("Use either ssl or sslMode in a database URL, not both.");
  }

  let ssl: TradebiliaTlsOptions | undefined;
  if (sslValue) {
    ssl = parseTlsOptions(sslValue);
    url.searchParams.delete("ssl");
  } else if (sslMode) {
    if (sslMode !== "VERIFY_IDENTITY") {
      throw new Error("Only sslMode=VERIFY_IDENTITY is supported for a Tradebilia database target.");
    }
    ssl = { rejectUnauthorized: true, verifyIdentity: true };
    url.searchParams.delete("sslMode");
  }

  if (target.name === "new") {
    if (!ssl) {
      throw new Error("NEW_TIDB_DATABASE_URL must use verified TLS via ssl or sslMode=VERIFY_IDENTITY.");
    }
    if (ssl.rejectUnauthorized !== true) {
      throw new Error("NEW_TIDB_DATABASE_URL must reject unauthorized TLS certificates.");
    }
  }

  return ssl ? { uri: url.toString(), ssl } : { uri: url.toString() };
}

/**
 * Runtime database selection is explicit and safe by default:
 * - unset / "legacy" keeps the current Tradebilia database on DATABASE_URL;
 * - "new" uses only NEW_TIDB_DATABASE_URL.
 *
 * There is intentionally no automatic fallback. A failed new-database startup
 * must stop rather than silently writing to a different database.
 */
export function resolveTradebiliaDatabaseTarget(env: NodeJS.ProcessEnv = process.env): TradebiliaDatabaseTarget {
  const name = normalizeTargetName(env.TRADEBILIA_DATABASE_TARGET);
  const sourceEnv = name === "new" ? "NEW_TIDB_DATABASE_URL" : "DATABASE_URL";
  const sourceUrl = env[sourceEnv];

  if (!sourceUrl) {
    throw new Error(`${sourceEnv} must be configured for TRADEBILIA_DATABASE_TARGET=${name}.`);
  }

  let databaseUrl: string;
  let expectedDatabaseName: string;
  try {
    databaseUrl = name === "legacy" ? buildTradebiliaDatabaseUrl(sourceUrl) : sourceUrl;
    expectedDatabaseName = name === "legacy"
      ? LEGACY_TRADEBILIA_DATABASE_NAME
      : databaseNameFromUrl(databaseUrl);
    new URL(databaseUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid URL";
    throw new Error(`Invalid ${sourceEnv} for TRADEBILIA_DATABASE_TARGET=${name}: ${message}`);
  }

  const target: TradebiliaDatabaseTarget = {
    name,
    databaseUrl,
    expectedDatabaseName,
    sourceEnv,
    connectionFingerprint: connectionFingerprint(databaseUrl),
  };
  // Fail before server startup for unsupported or insecure TLS configuration.
  resolveTradebiliaDatabaseConnection(target);
  return target;
}
