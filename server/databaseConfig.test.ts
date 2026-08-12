import { describe, expect, it } from "vitest";
import drizzleConfig from "../drizzle.config";

describe("Drizzle database continuity configuration", () => {
  it("uses CUSTOM_DATABASE_URL for migrations when the live database is configured", () => {
    expect(process.env.CUSTOM_DATABASE_URL).toBeTruthy();
    expect(drizzleConfig.dbCredentials.url).toBe(process.env.CUSTOM_DATABASE_URL);
  });
});
