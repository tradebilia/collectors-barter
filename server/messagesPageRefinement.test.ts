import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const messagesSource = readFileSync(resolve(process.cwd(), "client/src/pages/Messages.tsx"), "utf8");
const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

describe("Messages page refinements", () => {
  it("uses a centered, expanded hero and prominent unlabeled subjects", () => {
    expect(messagesSource).toContain("min-h-[20rem] flex-col items-center justify-center");
    expect(messagesSource).toContain("text-xl font-semibold leading-8");
    expect(messagesSource).not.toContain('>Subject</p>');
    expect(messagesSource).not.toContain("Direct messages update live across open browser sessions");
  });

  it("selects the inquiry counterpart avatar according to message direction", () => {
    expect(messagesSource).toContain("activeInquiryDirection === \"sent\"");
    expect(messagesSource).toContain("(activeInquiry as any)?.recipientAvatarUrl");
    expect(messagesSource).toContain("activeInquiry?.senderAvatarUrl");
    expect(dbSource).toContain("senderAvatarUrl: userProfiles.avatarUrl");
  });

  it("formats list and detail timestamps with the viewer's local timezone", () => {
    expect(messagesSource).toContain("new Intl.DateTimeFormat(undefined");
    expect(messagesSource).toContain("dateStyle: \"medium\"");
    expect(messagesSource).toContain("timeStyle: \"short\"");
    expect(messagesSource).not.toContain("new Date(message.createdAt).toLocaleString()");
  });
});
