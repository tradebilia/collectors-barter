import { describe, expect, it } from "vitest";
import {
  LEGACY_TRADEBILIA_DATABASE_NAME,
  NEW_TRADEBILIA_DATABASE_NAME,
  resolveTradebiliaDatabaseConnection,
  resolveTradebiliaDatabaseTarget,
} from "./databaseTarget";

const LEGACY_BASE_URL = "mysql://legacy-user:legacy-password@legacy.example.test:4000/platform?ssl=%7B%22rejectUnauthorized%22%3Atrue%7D";
const NEW_DATABASE_URL = "mysql://new-user:new-password@new.example.test:4000/test?sslMode=VERIFY_IDENTITY";

function newTarget(url = NEW_DATABASE_URL) {
  return resolveTradebiliaDatabaseTarget({
    DATABASE_URL: LEGACY_BASE_URL,
    NEW_TIDB_DATABASE_URL: url,
    TRADEBILIA_DATABASE_TARGET: "new",
  });
}

describe("explicit Tradebilia database target selector", () => {
  it("defaults to the current legacy Tradebilia database when no target is selected", () => {
    const target = resolveTradebiliaDatabaseTarget({ DATABASE_URL: LEGACY_BASE_URL });
    const selected = new URL(target.databaseUrl);

    expect(target.name).toBe("legacy");
    expect(target.sourceEnv).toBe("DATABASE_URL");
    expect(target.expectedDatabaseName).toBe(LEGACY_TRADEBILIA_DATABASE_NAME);
    expect(selected.pathname).toBe(`/${LEGACY_TRADEBILIA_DATABASE_NAME}`);
    expect(selected.username).toBe("legacy-user");
    expect(selected.password).toBe("legacy-password");
  });

  it("uses NEW_TIDB_DATABASE_URL only after the explicit new target is selected", () => {
    const target = newTarget();

    expect(target.name).toBe("new");
    expect(target.sourceEnv).toBe("NEW_TIDB_DATABASE_URL");
    expect(target.expectedDatabaseName).toBe(NEW_TRADEBILIA_DATABASE_NAME);
    expect(new URL(target.databaseUrl).hostname).toBe("new.example.test");
  });

  it("fails closed for an unknown target rather than choosing a database silently", () => {
    expect(() => resolveTradebiliaDatabaseTarget({
      DATABASE_URL: LEGACY_BASE_URL,
      TRADEBILIA_DATABASE_TARGET: "future",
    })).toThrow('TRADEBILIA_DATABASE_TARGET must be either "legacy" or "new".');
  });

  it("fails closed when new is selected without its protected URL", () => {
    expect(() => resolveTradebiliaDatabaseTarget({
      DATABASE_URL: LEGACY_BASE_URL,
      TRADEBILIA_DATABASE_TARGET: "new",
    })).toThrow("NEW_TIDB_DATABASE_URL must be configured");
  });

  it("pins the new target to the independently approved database name", () => {
    expect(() => newTarget("mysql://new:password@new.example.test:4000/another_database?sslMode=VERIFY_IDENTITY"))
      .toThrow(`must select the approved database ${NEW_TRADEBILIA_DATABASE_NAME}`);
  });

  it("rejects unsupported URL protocols and multi-segment database paths", () => {
    expect(() => newTarget("postgres://new:password@new.example.test:4000/test?sslMode=VERIFY_IDENTITY"))
      .toThrow("must use the mysql protocol");
    expect(() => newTarget("mysql://new:password@new.example.test:4000/test/other?sslMode=VERIFY_IDENTITY"))
      .toThrow("must include exactly one database name");
  });

  it("requires a canonical DNS hostname rather than any numeric host representation", () => {
    expect(() => newTarget("mysql://new:password@192.0.2.1:4000/test?sslMode=VERIFY_IDENTITY"))
      .toThrow("must use a canonical DNS hostname");
    expect(() => newTarget("mysql://new:password@[2001:db8::1]:4000/test?sslMode=VERIFY_IDENTITY"))
      .toThrow("must use a canonical DNS hostname");
    expect(() => newTarget("mysql://new:password@0x7f000001:4000/test?sslMode=VERIFY_IDENTITY"))
      .toThrow("must use a canonical DNS hostname");
    expect(() => newTarget("mysql://new:password@2130706433:4000/test?sslMode=VERIFY_IDENTITY"))
      .toThrow("must use a canonical DNS hostname");
    expect(() => newTarget("mysql://new:password@127.1:4000/test?sslMode=VERIFY_IDENTITY"))
      .toThrow("must use a canonical DNS hostname");
  });

  it("requires both certificate and hostname verification for JSON new-target TLS", () => {
    expect(() => newTarget("mysql://new:password@new.example.test:4000/test?ssl=%7B%22rejectUnauthorized%22%3Atrue%7D"))
      .toThrow("must validate TLS certificates and the server hostname");
  });

  it("accepts JSON TLS only when both certificate and hostname verification are explicit", () => {
    const target = newTarget("mysql://new:password@new.example.test:4000/test?ssl=%7B%22rejectUnauthorized%22%3Atrue%2C%22verifyIdentity%22%3Atrue%7D");
    expect(resolveTradebiliaDatabaseConnection(target).ssl).toMatchObject({
      rejectUnauthorized: true,
      verifyIdentity: true,
    });
  });

  it("creates a stable non-secret connection fingerprint", () => {
    const target = resolveTradebiliaDatabaseTarget({ DATABASE_URL: LEGACY_BASE_URL });

    expect(target.connectionFingerprint).toMatch(/^[a-f0-9]{12}$/);
    expect(target.connectionFingerprint).not.toContain("legacy-user");
    expect(target.connectionFingerprint).not.toContain("legacy-password");
  });
});
