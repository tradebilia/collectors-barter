import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../client/src/pages/ComingSoon.tsx"), "utf8");

describe("Restoration Workbench Coming Soon page", () => {
  it("uses the animated Tradebilia logo over the Restoration Workbench art", () => {
    expect(source).toContain('import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70"');
    expect(source).toContain('<AnimatedLogoSmall70 fontSize={196} wheelScale={2.24} wheelOffsetX={-65} wheelOffsetY={-30} dividerScale={1.55} dividerOffsetY={-20} wordmarkColor="#2b2119" neutralCategoryColor="#2b2119" categoryColorOverrides={COMING_SOON_CATEGORY_COLORS} wheelColors={COMING_SOON_WHEEL_COLORS} wheelStrokeWidth={6} dividerStrokeWidth={3.6} fixedCategoryMetrics centerLockup centeredViewBoxWidth={3000} lockupScale={1.25} />');
    expect(source).toContain("Every collection<br />has a next chapter.");
    expect(source).toContain('tradebilia-coming-soon-scattered-mixed-grade-workbench-extra-wide-parchment_9f77d258.png');
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
