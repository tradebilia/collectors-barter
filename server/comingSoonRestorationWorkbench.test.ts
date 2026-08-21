import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../client/src/pages/ComingSoon.tsx"), "utf8");

describe("Restoration Workbench Coming Soon page", () => {
  it("uses the animated Tradebilia logo over the Restoration Workbench art", () => {
    expect(source).toContain('import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70"');
    expect(source).toContain('<AnimatedLogoSmall70 fontSize={146} wheelScale={1.42} dividerScale={1.3} wordmarkColor="#2b2119" neutralCategoryColor="#2b2119" wheelStrokeWidth={6} dividerStrokeWidth={3.6} fixedCategoryMetrics centerLockup />');
    expect(source).toContain("Every collection<br />has a next chapter.");
  });

  it("retains consent-based launch signup within the central parchment composition", () => {
    expect(source).toContain("trpc.launchUpdates.subscribe.useMutation");
    expect(source).toContain("if (!consent || subscribeMutation.isPending) return;");
    expect(source).toContain("flex min-h-screen items-center justify-center");
    expect(source).toContain('aria-label="Collections on the exchange"');
    expect(source).toContain("<span>Disney Pins</span>");
  });
});
