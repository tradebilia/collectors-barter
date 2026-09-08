import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/Messages.tsx", import.meta.url), "utf8");

describe("Messages item inquiry direction controls", () => {
  it("offers All, Received, and Sent inquiry filters", () => {
    expect(source).toContain('aria-label="Item inquiry direction filters"');
    expect(source).toContain('{ value: "received", label: "Received" }');
    expect(source).toContain('{ value: "sent", label: "Sent" }');
  });

  it("renders explicit direction labels in inquiry cards and details", () => {
    expect(source).toContain("const inquiryDirectionLabel = inquiryDirection === \"sent\" ? \"To:\" : \"From:\"");
    expect(source).toContain("getInquiryDirectionPresentation(inquiryDirection, inquiryCounterpartName)");
    expect(source).toContain("activeInquiryPresentation?.detailHeading");
    expect(source).toContain("activeInquiryPresentation?.detailPrefix");
  });

  it("uses the shared direction presentation badge while keeping unread status limited to received inquiries", () => {
    expect(source).toContain('inquiryDirection === "received" && !inquiry.isRead');
    expect(source).toContain("{inquiryPresentation.badge}");
    expect(source).toContain('inquiryDirection === "sent" ? "border-blue-700 bg-blue-700 text-white hover:bg-blue-800"');
  });
});
