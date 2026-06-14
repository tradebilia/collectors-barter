import { describe, it, expect } from "vitest";
import { getAvatarInitials } from "../client/src/lib/tradebilia";

describe("getAvatarInitials", () => {
  it("should return initials from firstName and lastName", () => {
    const result = getAvatarInitials({
      firstName: "Pierre",
      lastName: "Turgeon",
      displayName: "Collector 2",
    });
    expect(result).toBe("PT");
  });

  it("should return initials from firstName only if lastName is not available", () => {
    const result = getAvatarInitials({
      firstName: "John",
      lastName: null,
      displayName: "John Doe",
    });
    expect(result).toBe("J");
  });

  it("should return initials from displayName if firstName and lastName are not available", () => {
    const result = getAvatarInitials({
      firstName: null,
      lastName: null,
      displayName: "John Doe",
    });
    expect(result).toBe("JD");
  });

  it("should return single initial from displayName if only one word", () => {
    const result = getAvatarInitials({
      firstName: null,
      lastName: null,
      displayName: "John",
    });
    expect(result).toBe("J");
  });

  it("should return TB as fallback when no data is available", () => {
    const result = getAvatarInitials({
      firstName: null,
      lastName: null,
      displayName: null,
    });
    expect(result).toBe("TB");
  });

  it("should handle empty strings as null", () => {
    const result = getAvatarInitials({
      firstName: "",
      lastName: "",
      displayName: "Collector",
    });
    expect(result).toBe("C");
  });

  it("should handle uppercase conversion", () => {
    const result = getAvatarInitials({
      firstName: "pierre",
      lastName: "turgeon",
      displayName: "Collector 2",
    });
    expect(result).toBe("PT");
  });

  it("should handle mixed case displayName", () => {
    const result = getAvatarInitials({
      firstName: null,
      lastName: null,
      displayName: "john doe",
    });
    expect(result).toBe("JD");
  });
});
