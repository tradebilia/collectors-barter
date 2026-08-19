import { describe, expect, it } from "vitest";
import { getGlobalSearchQuery, parseGlobalSearchValue } from "../shared/globalSearch";

describe("global marketplace search helpers", () => {
  it("reads and normalizes the top-bar q parameter from a browser search string", () => {
    expect(getGlobalSearchQuery("?q=%20Michael%20Jordan%20&source=topbar")).toBe("Michael Jordan");
    expect(getGlobalSearchQuery("?category=sports_cards")).toBe("");
  });

  it("keeps blank value filters absent instead of converting them to zero", () => {
    expect(parseGlobalSearchValue("")).toBeUndefined();
    expect(parseGlobalSearchValue("   ")).toBeUndefined();
    expect(parseGlobalSearchValue("0")).toBe(0);
    expect(parseGlobalSearchValue("125.50")).toBe(125.5);
    expect(parseGlobalSearchValue("-1")).toBeUndefined();
  });
});
