import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../client/src/pages/ComingSoon.tsx"), "utf8");

describe("Restoration Workbench Coming Soon page", () => {
  it("uses the animated Tradebilia logo over the Restoration Workbench art", () => {
    expect(source).toContain('import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70"');
    expect(source).toContain('<AnimatedLogoSmall70 fontSize={125} wordmarkColor="#2b2119" neutralCategoryColor="#2b2119" wheelScale={1.18} />');
    expect(source).toContain("Every collection<br />has a next chapter.");
  });

  it("retains consent-based launch signup within the central parchment composition", () => {
    expect(source).toContain("trpc.launchUpdates.subscribe.useMutation");
    expect(source).toContain("if (!consent || subscribeMutation.isPending) return;");
    expect(source).toContain("flex min-h-screen items-center justify-center");
    expect(source).toContain("Comics · Sports Cards · Toys · Games · Stamps · Coins · Pokémon · Movies · Autographs · Disney Pins");
  });
});
