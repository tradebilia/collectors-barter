import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../client/src/pages/ComingSoon.tsx"), "utf8");

describe("Restoration Workbench Coming Soon page", () => {
  it("uses the animated Tradebilia logo over the Restoration Workbench art", () => {
    expect(source).toContain('import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70"');
    expect(source).toContain('<AnimatedLogoSmall70 fontSize={171} wheelScale={1.95} wheelOffsetX={-55} wheelOffsetY={-30} dividerScale={1.35} dividerOffsetY={-20} wordmarkColor="#2b2119" neutralCategoryColor="#2b2119" categoryColorOverrides={COMING_SOON_CATEGORY_COLORS} wheelStrokeWidth={6} dividerStrokeWidth={3.6} fixedCategoryMetrics centerLockup centeredViewBoxWidth={2400} />');
    expect(source).toContain("Every collection<br />has a next chapter.");
    expect(source).toContain('tradebilia-coming-soon-scattered-mixed-grade-workbench-wide-parchment_09ff549f.png');
    expect(source).toContain("A home for remarkable collectibles—and the collectors who know their worth.");
  });

  it("retains consent-based launch signup within the central parchment composition", () => {
    expect(source).toContain("trpc.launchUpdates.subscribe.useMutation");
    expect(source).toContain("if (!consent || subscribeMutation.isPending) return;");
    expect(source).toContain("flex min-h-screen items-center justify-center");
    expect(source).toContain('aria-label="Collections on the exchange"');
    expect(source).toContain("<span>Disney Pins</span>");
  });
});
