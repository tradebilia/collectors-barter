import { describe, expect, it } from "vitest";
import { isInquiryReadForUser, isInquiryUnreadForUser } from "./db";

describe("participant-specific inquiry read state", () => {
  it("treats a reply as unread only for the original inquiry sender", () => {
    const inquiry = {
      senderId: 101,
      recipientId: 202,
      senderIsRead: 0,
      recipientIsRead: 1,
    };

    expect(isInquiryUnreadForUser(inquiry, 101)).toBe(true);
    expect(isInquiryReadForUser(inquiry, 101)).toBe(false);
    expect(isInquiryUnreadForUser(inquiry, 202)).toBe(false);
    expect(isInquiryReadForUser(inquiry, 202)).toBe(true);
  });
});
