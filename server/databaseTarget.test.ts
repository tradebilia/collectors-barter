import { describe, expect, it } from "vitest";
import {
  LEGACY_TRADEBILIA_DATABASE_NAME,
  resolveTradebiliaDatabaseTarget,
} from "./databaseTarget";

const LEGACY_BASE_URL = "mysql://legacy-user:legacy-password@legacy.example.test:4000/platform?ssl=%7B%22rejectUnauthorized%22%3Atrue%7D";
const NEW_DATABASE_URL = "mysql://new-user:new-password@new.example.test:4000/test?sslMode=VERIFY_IDENTITY";

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
    const target = resolveTradebiliaDatabaseTarget({
      DATABASE_URL: LEGACY_BASE_URL,
      NEW_TIDB_DATABASE_URL: NEW_DATABASE_URL,
      TRADEBILIA_DATABASE_TARGET: "new",
    });

    expect(target.name).toBe("new");
    expect(target.sourceEnv).toBe("NEW_TIDB_DATABASE_URL");
    expect(target.expectedDatabaseName).toBe("test");
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

  it("creates a stable non-secret connection fingerprint", () => {
    const target = resolveTradebiliaDatabaseTarget({ DATABASE_URL: LEGACY_BASE_URL });

    expect(target.connectionFingerprint).toMatch(/^[a-f0-9]{12}$/);
    expect(target.connectionFingerprint).not.toContain("legacy-user");
    expect(target.connectionFingerprint).not.toContain("legacy-password");
  });
});
