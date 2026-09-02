import { describe, expect, it } from "vitest";
import { resolveProfileTimeZone } from "./profileTimeZone";

describe("profile timezone resolution", () => {
  it("resolves a full United States state name to New York time", () => {
    expect(resolveProfileTimeZone({
      contactState: "New York",
      contactCountry: "United States",
    })).toBe("America/New_York");
  });

  it("resolves a non-US country to its profile-derived default timezone", () => {
    expect(resolveProfileTimeZone({
      contactState: "",
      contactCountry: "Germany",
    })).toBe("Europe/Berlin");
  });

  it("returns no derived timezone when the profile has no usable location", () => {
    expect(resolveProfileTimeZone({ contactState: null, contactCountry: null })).toBeNull();
  });
});
