import { describe, expect, it } from "vitest";
import { buildTradeInitiatedEmailHtml } from "./_core/email";

describe("new trade proposal email", () => {
  it("uses the approved hero-backed Tradebilia header asset", () => {
    const html = buildTradeInitiatedEmailHtml({
      recipientEmail: "collector@example.com",
      recipientName: "Collector",
      senderName: "Administrator",
      itemTitle: "1952 Topps Mickey Mantle",
      tradeRef: "TR-000123",
    });

    expect(html).toContain("tradebilia_email_logo_reference_c09ef836.png");
    expect(html).toContain('style="background:#0a0d22;padding:0;text-align:center;"');
    expect(html).toContain('width="560"');
    expect(html).toContain("New Trade Proposal from Administrator");
    expect(html).toContain("View Trade Proposal");
  });
});
