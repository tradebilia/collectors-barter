import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("trade-initiation email sender identity", () => {
  it("uses the loaded initiator record instead of the session context name", () => {
    const source = readFileSync(resolve(process.cwd(), "server/tradeFlowRouter.ts"), "utf8");
    expect(source).toContain("const initiatorDisplayName = (initiator as any)?.displayName || (initiator as any)?.name || (initiator as any)?.username");
    expect(source).toContain("senderName: initiatorDisplayName");
    expect(source).not.toContain("senderName: ctx.user.name ?? 'A Tradebilia member'");
  });
});

import { buildTradeInitiatedEmailHtml } from "./_core/email";

describe("trade-initiation email rendering", () => {
  it("renders the authoritative initiator name in the subject heading", () => {
    const html = buildTradeInitiatedEmailHtml({
      recipientEmail: "ktavani@example.com",
      recipientName: "Ktavani",
      senderName: "Administrator",
      itemTitle: "McFarlane King Spawn Original Art",
      tradeRef: "TR-000004",
    });
    expect(html).toContain("New Trade Proposal from Administrator");
    expect(html).not.toContain("New Trade Proposal from rtavani");
  });
});
