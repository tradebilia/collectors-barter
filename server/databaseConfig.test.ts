import { describe, expect, it } from "vitest";
import drizzleConfig from "../drizzle.config";
import { buildTradebiliaDatabaseUrl } from "./db";

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
});
