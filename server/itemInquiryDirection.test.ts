import { describe, expect, it } from "vitest";
import { getInquiryDirection, getInquiryDirectionPresentation } from "../client/src/lib/inquiryDirection";

describe("item inquiry direction presentation", () => {
  it("treats the initiating user as the sender and labels the counterpart as a recipient", () => {
    const direction = getInquiryDirection(30002, 30002);
    const presentation = getInquiryDirectionPresentation(direction, "Rtavani");

    expect(direction).toBe("sent");
    expect(presentation.badge).toBe("Sent");
    expect(presentation.listLabel).toBe("To: Rtavani");
    expect(presentation.detailHeading).toBe("Inquiry to Rtavani");
  });

  it("labels an inquiry authored by another user as received", () => {
    const direction = getInquiryDirection(30002, 60003);
    const presentation = getInquiryDirectionPresentation(direction, "Administrator");

    expect(direction).toBe("received");
    expect(presentation.badge).toBe("Received");
    expect(presentation.listLabel).toBe("From: Administrator");
    expect(presentation.detailHeading).toBe("Inquiry from Administrator");
  });
});
