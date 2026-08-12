import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const messagesSource = readFileSync(new URL("../client/src/pages/Messages.tsx", import.meta.url), "utf8");

describe("communication sender-label payloads", () => {
  it("resolves inquiry replies and direct-message payloads from profile display names first", () => {
    expect(dbSource).toContain("export async function getCommunicationDisplayName");
    expect(dbSource).toContain("senderProfileDisplayName: userProfiles.displayName");
    expect(dbSource).toContain("return replies.map(reply =>");
    const recipientLabelLookups = dbSource.match(/recipientName: await getCommunicationDisplayName\(inquiry\.recipientId\)/g) ?? [];
    expect(recipientLabelLookups).toHaveLength(2);
    expect(routerSource).toContain("senderProfileDisplayName: userProfiles.displayName");
    expect(routerSource).toContain("return msgs.map(message =>");
  });

  it("uses the shared display-name lookup for all outbound message notices", () => {
    const occurrences = routerSource.match(/senderName: senderDisplayName/g) ?? [];
    expect(occurrences).toHaveLength(3);
    expect(routerSource).toContain("const senderDisplayName = await getCommunicationDisplayName(ctx.user.id)");
  });

  it("shows the inquiry counterpart rather than the signed-in user in an opened outgoing inquiry", () => {
    expect(messagesSource).toContain("const activeInquiryCounterpartName");
    expect(messagesSource).toContain("activeInquiry.senderId === user?.id");
    expect(messagesSource).toContain("activeInquiry.recipientName || `Collector ${activeInquiry.recipientId}`");
  });
});
