import { describe, expect, it } from "vitest";
import { getDirectMessageDirection, getDirectMessageDirectionPresentation } from "../client/src/lib/directMessageDirection";

describe("direct-message direction presentation", () => {
  it("labels the latest message from the signed-in user as an outgoing conversation", () => {
    const direction = getDirectMessageDirection(30002, 30002);
    expect(getDirectMessageDirectionPresentation(direction, "Rtavani")).toMatchObject({
      listLabel: "To: Rtavani",
      badge: "Sent",
      detailHeading: "Conversation to Rtavani",
    });
  });

  it("labels the latest message from the counterpart as an incoming conversation", () => {
    const direction = getDirectMessageDirection(60003, 30002);
    expect(getDirectMessageDirectionPresentation(direction, "Rtavani")).toMatchObject({
      listLabel: "From: Rtavani",
      badge: "Received",
      detailHeading: "Conversation from Rtavani",
    });
  });
});
