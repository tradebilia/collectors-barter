import { describe, expect, it } from "vitest";

describe("live integration staging setting", () => {
  it("disables the staging safeguard when explicitly configured for live operation", () => {
    expect(process.env.TRADEBILIA_STAGING_MODE).toBe("0");
  });
});
