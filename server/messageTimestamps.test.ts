import { describe, expect, it } from "vitest";
import { formatMessageTimestamp, parseDatabaseTimestamp } from "../client/src/lib/messageTimestamps";

describe("message timestamp timezone conversion", () => {
  it("parses a legacy database datetime as UTC rather than browser-local time", () => {
    expect(parseDatabaseTimestamp("2026-09-02 02:15:00").toISOString()).toBe("2026-09-02T02:15:00.000Z");
  });

  it("renders 2:15 AM UTC as 10:15 PM in New York daylight time", () => {
    expect(formatMessageTimestamp("2026-09-02 02:15:00", "America/New_York", "en-US")).toMatch(/Sep 1, 2026.*10:15 PM/);
  });

  it("renders the same instant in a different profile-derived timezone", () => {
    expect(formatMessageTimestamp("2026-09-02 02:15:00", "Europe/Berlin", "en-US")).toMatch(/Sep 2, 2026.*4:15 AM/);
  });
});
