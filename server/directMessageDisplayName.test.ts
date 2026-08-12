import { describe, expect, it } from "vitest";
import { resolveDirectMessageDisplayName } from "./directMessageDisplayName";

describe("direct message sender display names", () => {
  it("uses the sender account name when no profile display name exists", () => {
    expect(resolveDirectMessageDisplayName(null, "Administrator", 30002)).toBe("Administrator");
  });

  it("prioritizes a non-empty profile display name and retains a generic fallback", () => {
    expect(resolveDirectMessageDisplayName("  Admin Profile  ", "Administrator", 30002)).toBe("Admin Profile");
    expect(resolveDirectMessageDisplayName("", null, 30002)).toBe("Collector 30002");
  });
});
