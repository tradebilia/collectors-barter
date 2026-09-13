import { describe, expect, it } from "vitest";
import { getVideoRoomEntryMode } from "./videoCallState";

describe("Trade Room video-call state", () => {
  it("starts a new call when no participant is currently marked as the caller", () => {
    expect(getVideoRoomEntryMode(null, 10)).toBe("start");
  });

  it("lets the active caller resume without creating a duplicate start event", () => {
    expect(getVideoRoomEntryMode(10, 10)).toBe("resume");
    expect(getVideoRoomEntryMode("10", 10)).toBe("resume");
  });

  it("identifies the other member as a joiner rather than a new caller", () => {
    expect(getVideoRoomEntryMode(10, 20)).toBe("join");
  });
});
