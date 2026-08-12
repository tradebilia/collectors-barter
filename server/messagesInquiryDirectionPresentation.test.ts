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
    expect(source).toContain("inquiryPresentation.listLabel");
    expect(source).toContain("activeInquiryPresentation?.detailHeading");
    expect(source).toContain("activeInquiryPresentation?.detailPrefix");
  });

  it("shows the status badge only for received inquiries so outgoing cards do not repeat Sent", () => {
    expect(source).toContain('{inquiryDirection === "received" && (');
    expect(source).not.toContain("const inquiryStatus =");
  });
});
