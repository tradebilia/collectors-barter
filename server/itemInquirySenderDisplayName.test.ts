import { describe, expect, it } from "vitest";
import { resolveDirectMessageDisplayName } from "./directMessageDisplayName";

describe("item inquiry sender display names", () => {
  it("uses the administrator account name when the sender has no profile display name", () => {
    expect(resolveDirectMessageDisplayName(null, "Administrator", 30002)).toBe("Administrator");
  });
});
