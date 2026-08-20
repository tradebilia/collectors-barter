import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../client/src/pages/ComingSoon.tsx"), "utf8");

describe("Restoration Workbench Coming Soon page", () => {
  it("uses the exact shared Tradebilia wheel-and-wordmark component over the selected workbench background", () => {
    expect(source).toContain('import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70"');
    expect(source).toContain('tradebilia-coming-soon-restoration-workbench-bg_4d7c4648.png');
    expect(source).toContain('<AnimatedLogoSmall70 fontSize={125} wordmarkColor="#211b17" neutralCategoryColor="#211b17" wheelScale={1.18} />');
    expect(source).toContain("Every collection has a next chapter.");
  });

  it("retains consent-based launch signup and represents all ten collector categories", () => {
    expect(source).toContain("trpc.launchUpdates.subscribe.useMutation");
    expect(source).toContain("if (!consent || subscribeMutation.isPending) return;");
    expect(source).toContain("grid-cols-5 sm:grid-cols-10");
    expect(source).toContain('label: "Disney Pins"');
    expect((source.match(/label: "/g) ?? []).length).toBe(10);
  });
});
