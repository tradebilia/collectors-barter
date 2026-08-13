import { describe, expect, it } from "vitest";
import { ownsReportAttachment, parseReportEvidence, serializeReportEvidence } from "./reportEvidence";

describe("report evidence metadata", () => {
  it("preserves report context and server-owned attachment references", () => {
    const stored = serializeReportEvidence({
      notes: "Package arrived with damage.",
      listingReference: "TR-000001",
      contactEmail: "collector@example.com",
      attachments: [{ key: "reports/30002/receipt.png", url: "/manus-storage/reports/30002/receipt.png", name: "receipt.png", type: "image/png", size: 1024 }],
    });
    expect(parseReportEvidence(stored)).toMatchObject({ listingReference: "TR-000001", attachments: [{ name: "receipt.png" }] });
  });

  it("keeps legacy plain-text evidence readable and rejects another member's attachment", () => {
    expect(parseReportEvidence("Old evidence note")).toMatchObject({ notes: "Old evidence note", attachments: [] });
    expect(ownsReportAttachment(30002, { key: "reports/30003/file.png", url: "/manus-storage/reports/30003/file.png" })).toBe(false);
  });
});
