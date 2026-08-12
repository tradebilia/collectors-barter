import { describe, expect, it } from "vitest";
import { matchesDirectMessageDirectionFilter } from "../client/src/lib/directMessageFilter";

describe("direct-message direction filters", () => {
  it("retains all conversations in the All filter", () => {
    expect(matchesDirectMessageDirectionFilter(30002, 30002, "all")).toBe(true);
    expect(matchesDirectMessageDirectionFilter(60003, 30002, "all")).toBe(true);
  });

  it("separates latest messages sent by the signed-in user from received replies", () => {
    expect(matchesDirectMessageDirectionFilter(30002, 30002, "sent")).toBe(true);
    expect(matchesDirectMessageDirectionFilter(60003, 30002, "sent")).toBe(false);
    expect(matchesDirectMessageDirectionFilter(60003, 30002, "received")).toBe(true);
    expect(matchesDirectMessageDirectionFilter(30002, 30002, "received")).toBe(false);
  });
});
