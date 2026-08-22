import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");

describe("next-batch integrity repairs", () => {
  it("binds inquiry recipients to listing ownership and blocks locked forum replies", () => {
    const db = source("server/db.ts");
    expect(db).toContain("ownerId: listings.ownerId");
    expect(db).toContain("Item inquiries must be sent to the listing owner");
    expect(db).toContain("This discussion is locked.");
  });

  it("marks only successful referral deliveries as emailed", () => {
    const routers = source("server/routers.ts");
    expect(routers).toContain("const concurrency = 5;");
    expect(routers).toContain("outcomes.filter(outcome => outcome.sent).map(outcome => outcome.id)");
    expect(routers).toContain("markReferralsAsEmailed(sentIds)");
  });

  it("records sanitized FedEx tracking failures in API Health", () => {
    const fedex = source("server/fedexTracking.ts");
    expect(fedex).toContain('provider: "FedEx"');
    expect(fedex).toContain('operation: "tracking_lookup"');
  });
});
