import { describe, expect, it } from "vitest";
import { getInquiryReplyReadState, isInquiryUnreadForUser } from "./db";

describe("sendInquiryReply unread state", () => {
  it("alerts the original inquiry sender and not the person who sends the reply", () => {
    const inquiry = {
      senderId: 101,
      recipientId: 202,
      senderIsRead: 1,
      recipientIsRead: 1,
    };

    const afterReply = {
      ...inquiry,
      ...getInquiryReplyReadState(),
    };

    expect(afterReply).toMatchObject({
      senderIsRead: 0,
      recipientIsRead: 1,
    });
    expect(isInquiryUnreadForUser(afterReply, inquiry.senderId)).toBe(true);
    expect(isInquiryUnreadForUser(afterReply, inquiry.recipientId)).toBe(false);
  });
});
