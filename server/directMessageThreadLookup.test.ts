import { describe, expect, it } from "vitest";
import { normalizeDirectMessageParticipants } from "./directMessageThreadLookup";

describe("direct-message thread participant lookup", () => {
  it("uses one stable participant pair for a first direct message without an item reference", () => {
    expect(normalizeDirectMessageParticipants(30002, 60003)).toEqual({
      participantAId: 30002,
      participantBId: 60003,
    });
  });

  it("uses the same participant pair when sender and recipient are reversed", () => {
    expect(normalizeDirectMessageParticipants(60003, 30002)).toEqual({
      participantAId: 30002,
      participantBId: 60003,
    });
  });
});
