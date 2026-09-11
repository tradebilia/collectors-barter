import { describe, expect, it } from "vitest";
import { formatTrackingDate, isValidTrackingDate } from "./formatTrackingDate";

describe("formatTrackingDate", () => {
  it("formats a FedEx ISO timestamp without appending a second time suffix", () => {
    expect(formatTrackingDate("2026-09-12T17:00:00Z", "en-US")).toBe("9/12/2026");
  });

  it("formats date-only carrier values at midday to avoid timezone rollover", () => {
    expect(formatTrackingDate("2026-09-12", "en-US")).toBe("9/12/2026");
  });

  it("does not expose Invalid Date for malformed or empty values", () => {
    expect(formatTrackingDate("not-a-date", "en-US")).toBe("Not provided");
    expect(formatTrackingDate(null, "en-US")).toBe("Not provided");
    expect(isValidTrackingDate("not-a-date")).toBe(false);
  });
});
