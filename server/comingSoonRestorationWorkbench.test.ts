import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../client/src/pages/ComingSoon.tsx"), "utf8");

describe("Restoration Workbench Coming Soon page", () => {
  it("uses the supplied revised Tradebilia artwork with Music represented", () => {
    expect(source).not.toContain('import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70"');
    expect(source).toContain("coming-soon-logo-music-wide-minimal-clean_2a22c044.png");
    expect(source).toContain("Tradebilia collectors trading exchange coming soon scene");
    expect(source).toContain('"Music"');
    expect(source).not.toContain("Every collection<br />has a next chapter.");
  });

  it("retains consent-based launch signup and accessible category semantics", () => {
    expect(source).toContain("trpc.launchUpdates.subscribe.useMutation");
    expect(source).toContain("if (subscribeMutation.isPending) return;");
    expect(source).toContain('aria-label="Collections on the exchange"');
    expect(source).toContain('placeholder="Enter your email for early access"');
    expect(source).toContain("We&apos;ll only use your email for Tradebilia launch updates.");
  });
});
