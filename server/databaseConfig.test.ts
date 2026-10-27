import { describe, expect, it, vi } from "vitest";
import drizzleConfig from "../drizzle.config";
import { buildTradebiliaDatabaseUrl } from "./db";
import { resolveTradebiliaDatabaseConnection, resolveTradebiliaDatabaseTarget } from "./databaseTarget";
import { validateDatabaseConnection, validateEnvironment } from "./_core/startupChecks";

describe("Drizzle database continuity configuration", () => {
  it("uses CUSTOM_DATABASE_URL for migrations when the live database is configured", () => {
    expect(process.env.CUSTOM_DATABASE_URL).toBeTruthy();
    expect(drizzleConfig.dbCredentials.url).toBe(process.env.CUSTOM_DATABASE_URL);
  });

  it("replaces only the database name when deriving the runtime Tradebilia URL", () => {
    const source = "mysql://user:password@example.test:4000/platform?ssl=%7B%22rejectUnauthorized%22%3Atrue%7D";
    const derived = new URL(buildTradebiliaDatabaseUrl(source));

    expect(derived.username).toBe("user");
    expect(derived.password).toBe("password");
    expect(derived.hostname).toBe("example.test");
    expect(derived.port).toBe("4000");
    expect(derived.pathname).toBe("/GnMVDXgu6G8uhj5ZYQtcGe");
    expect(derived.search).toBe("?ssl=%7B%22rejectUnauthorized%22%3Atrue%7D");
  });

  it("defaults runtime selection to legacy even when a new URL is configured", () => {
    const target = resolveTradebiliaDatabaseTarget({
      DATABASE_URL: "mysql://legacy:password@legacy.example.test:4000/platform",
      NEW_TIDB_DATABASE_URL: "mysql://new:password@new.example.test:4000/test",
    });

    expect(target.name).toBe("legacy");
    expect(target.expectedDatabaseName).toBe("GnMVDXgu6G8uhj5ZYQtcGe");
  });

  it("normalizes new TiDB VERIFY_IDENTITY TLS into explicit mysql2 options", () => {
    const target = resolveTradebiliaDatabaseTarget({
      NEW_TIDB_DATABASE_URL: "mysql://new:password@new.example.test:4000/test?sslMode=VERIFY_IDENTITY",
      TRADEBILIA_DATABASE_TARGET: "new",
    });
    const connection = resolveTradebiliaDatabaseConnection(target);

    expect(connection.ssl).toEqual({ rejectUnauthorized: true, verifyIdentity: true });
    expect(new URL(connection.uri).searchParams.has("sslMode")).toBe(false);
  });

  it("fails closed when a new TiDB URL omits verified TLS", () => {
    expect(() => resolveTradebiliaDatabaseTarget({
      NEW_TIDB_DATABASE_URL: "mysql://new:password@new.example.test:4000/test",
      TRADEBILIA_DATABASE_TARGET: "new",
    })).toThrow("must use verified TLS");
  });

  it("validates a new target using only its protected URL", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(() => validateEnvironment({
      JWT_SECRET: "test-jwt",
      VITE_APP_ID: "test-app",
      BUILT_IN_FORGE_API_URL: "https://forge.example.test",
      BUILT_IN_FORGE_API_KEY: "test-forge-key",
      NEW_TIDB_DATABASE_URL: "mysql://new:password@new.example.test:4000/test?sslMode=VERIFY_IDENTITY",
      TRADEBILIA_DATABASE_TARGET: "new",
    })).not.toThrow();
    log.mockRestore();
  });

  it("attests the selected database name without logging a connection URL", async () => {
    const target = resolveTradebiliaDatabaseTarget({
      DATABASE_URL: "mysql://legacy:password@legacy.example.test:4000/platform",
      TRADEBILIA_DATABASE_TARGET: "legacy",
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const result = await validateDatabaseConnection({
      target,
      requireDb: async () => ({
        execute: vi.fn(async (query: any) => {
          const statement = String(query?.queryChunks?.map((chunk: any) => chunk?.value ?? chunk).join("") ?? "");
          return statement.toLowerCase().includes("database")
            ? [[{ databaseName: "GnMVDXgu6G8uhj5ZYQtcGe" }], []]
            : [[], []];
        }),
      }),
    });

    expect(result).toMatchObject({ target: "legacy", databaseName: "GnMVDXgu6G8uhj5ZYQtcGe" });
    const logged = log.mock.calls.flat().join(" ");
    expect(logged).toContain("Database attestation");
    expect(logged).not.toContain("legacy.example.test");
    expect(logged).not.toContain("password");
    log.mockRestore();
  });

  it("fails startup attestation when the selected target connects to another database", async () => {
    const target = resolveTradebiliaDatabaseTarget({
      DATABASE_URL: "mysql://legacy:password@legacy.example.test:4000/platform",
      TRADEBILIA_DATABASE_TARGET: "legacy",
    });

    await expect(validateDatabaseConnection({
      target,
      requireDb: async () => ({
        execute: vi.fn(async (query: any) => {
          const statement = String(query?.queryChunks?.map((chunk: any) => chunk?.value ?? chunk).join("") ?? "");
          return statement.toLowerCase().includes("database")
            ? [[{ databaseName: "wrong_database" }], []]
            : [[], []];
        }),
      }),
    })).rejects.toThrow("expected GnMVDXgu6G8uhj5ZYQtcGe but connected to wrong_database");
  });
});
