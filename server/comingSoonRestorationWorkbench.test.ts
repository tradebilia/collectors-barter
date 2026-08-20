import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../client/src/pages/ComingSoon.tsx"), "utf8");

describe("Restoration Workbench Coming Soon page", () => {
  it("uses the user-supplied final transparent Tradebilia logo over the Restoration Workbench art", () => {
    expect(source).toContain('/manus-storage/tradebilia-final-transparent_b18f659a.svg');
    expect(source).toContain('alt="Tradebilia"');
    expect(source).toContain("Every collection<br />has a next chapter.");
  });

  it("retains consent-based launch signup within the central parchment composition", () => {
    expect(source).toContain("trpc.launchUpdates.subscribe.useMutation");
    expect(source).toContain("if (!consent || subscribeMutation.isPending) return;");
    expect(source).toContain("flex min-h-screen items-center justify-center");
    expect(source).toContain("Comics · Sports Cards · Toys · Games · Stamps · Coins · Pokémon · Movies · Autographs · Disney Pins");
  });
});
