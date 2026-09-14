import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Trade Room USPS evidence verification", () => {
  const routerSource = readFileSync(join(process.cwd(), "server/shippingTrackingRouter.ts"), "utf8");
  const reviewerSource = readFileSync(join(process.cwd(), "server/uspsTrackingEvidence.ts"), "utf8");
  const tradeFlowSource = readFileSync(join(process.cwd(), "server/tradeFlowRouter.ts"), "utf8");

  it("limits evidence review to an authenticated sender in the active shipping stage", () => {
    expect(routerSource).toContain("reviewUspsEvidenceForTrade: protectedProcedure");
    expect(routerSource).toContain('proposal.status !== "shipping"');
    expect(routerSource).toContain("listing.ownerId !== ctx.user.id");
    expect(routerSource).toContain("imageDataUrl: z.string().max(4_500_000)");
  });

  it("persists only explicit recognized USPS evidence as submitted tracking", () => {
    expect(routerSource).toContain('review.classification === "tracking_not_available"');
    expect(routerSource).toContain('review.classification !== "recognized_result"');
    expect(routerSource).not.toContain("INSERT INTO tradeTrackingNumbers");
    expect(routerSource).toContain('validationStatus: "valid"');
    expect(routerSource).toContain('validationStatus: "invalid"');
    expect(routerSource).toContain("expectedListingIdsByUser");
    expect(routerSource).toContain("allParticipantsSubmittedTracking");
    expect(routerSource).toContain('retention: "Not stored by Tradebilia"');
    expect(routerSource).not.toContain("storagePut(");
    expect(tradeFlowSource).toContain("ORDER BY createdAt ASC, id ASC");
  });

  it("requires explicit USPS text and never treats color or a CAPTCHA as validation", () => {
    expect(reviewerSource).toContain("Never infer validity from color");
    expect(reviewerSource).toContain("a CAPTCHA");
    expect(reviewerSource).toContain("recognized_result");
    expect(reviewerSource).toContain("tracking_not_available");
    expect(reviewerSource).toContain("mismatched_tracking_number");
    expect(reviewerSource).toContain("needs_review");
  });
});
