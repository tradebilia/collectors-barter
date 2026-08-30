import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("uploaded hero title wheel animation", () => {
  it("layers the animated artwork component onto both uploaded hero-title pages", () => {
    const reportUser = read("client/src/pages/ReportUser.tsx");
    const memberDirectory = read("client/src/pages/MemberSearch.tsx");
    const artwork = read("client/src/components/AnimatedHeroTitleArtwork.tsx");
    const wheel = read("client/src/components/TradebiliaWheel.tsx");

    expect(reportUser).toContain("AnimatedHeroTitleArtwork");
    expect(memberDirectory).toContain("AnimatedHeroTitleArtwork");
    expect(artwork).toContain("TradebiliaWheel");
    expect(artwork).toContain("TradebiliaWheel");
    expect(wheel).toContain("tradebilia-wheel-rotor");
    expect(artwork).toContain("WebkitMaskImage");
  });

  it("keeps the wheel animation disabled when reduced motion is requested", () => {
    const styles = read("client/src/index.css");

    expect(styles).toContain(".tradebilia-wheel-rotor");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(".tradebilia-wheel-home,\n    .tradebilia-wheel-rotor");
  });
});

