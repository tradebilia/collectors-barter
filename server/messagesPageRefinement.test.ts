import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const messagesSource = readFileSync(resolve(process.cwd(), "client/src/pages/Messages.tsx"), "utf8");
const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const timestampSource = readFileSync(resolve(process.cwd(), "client/src/lib/messageTimestamps.ts"), "utf8");

describe("Messages page refinements", () => {
  it("uses a centered, expanded hero and prominent unlabeled subjects", () => {
    expect(messagesSource).toContain("h-[400px] items-center justify-center");
    expect(messagesSource).toContain("w-full max-w-6xl object-contain");
    expect(messagesSource).toContain('transform: "translateX(-2.34375%)"');
    expect(messagesSource).not.toContain("Direct Lines, Trusted Conversations</p>");
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

  it("preserves the original subject when a direct-message reply is inserted or listed", () => {
    expect(routerSource).toContain("const originalMessage = await db");
    expect(routerSource).toContain(".orderBy(asc(directMessages.createdAt))");
    expect(routerSource).toContain("subject: replySubject");
    expect(routerSource).toContain("NULLIF(TRIM(dm2.subject), '') IS NOT NULL ORDER BY dm2.createdAt ASC");
  });

  it("distinguishes message types and emphasizes direct-message sending", () => {
    expect(messagesSource).toContain("bg-amber-100 text-[10px]");
    expect(messagesSource).toContain("bg-violet-100 text-[10px]");
    expect(messagesSource).toContain("bg-violet-600 text-white");
    expect(messagesSource).not.toContain("Collector direct line");
  });

  it("formats list and detail timestamps with the viewer's local timezone", () => {
    expect(messagesSource).toContain("formatMessageTimestamp(message.createdAt, viewerTimeZone)");
    expect(timestampSource).toContain("normalized.replace(\" \", \"T\")}Z");
    expect(timestampSource).toContain("...(timeZone ? { timeZone } : {})");
    expect(timestampSource).toContain("dateStyle: \"medium\"");
    expect(timestampSource).toContain("timeStyle: \"short\"");
    expect(messagesSource).not.toContain("new Date(message.createdAt).toLocaleString()");
  });
});
