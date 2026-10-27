import { describe, expect, it } from "vitest";
import { safeDatabaseErrorCode } from "./databaseError";

describe("safe database error code", () => {
  it("keeps a bounded driver code without serializing a raw error message", () => {
    expect(safeDatabaseErrorCode(Object.assign(new Error("mysql://user:password@private"), { code: "ECONNREFUSED" })))
      .toBe("ECONNREFUSED");
  });

  it("uses a generic code for messages and malformed codes", () => {
    expect(safeDatabaseErrorCode(new Error("password=secret hostname=private"))).toBe("DATABASE_UNAVAILABLE");
    expect(safeDatabaseErrorCode({ code: "contains space" })).toBe("DATABASE_UNAVAILABLE");
  });
});
