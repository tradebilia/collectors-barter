import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(new URL("../components/HomepagePhraseLoop.tsx", import.meta.url), "utf8");

const approvedPhrases = [
  "Why buy or sell when you can trade?",
  "Trade what you have. Get what you want.",
  "Have it. Want it. Trade it.",
  "Your collection. Your trade. Your next find.",
  "Don’t buy it. Don’t sell it. Trade for it.",
  "Turn what you have into what you want.",
  "Collect. Connect. Trade.",
  "Where collectors trade what they love.",
  "One collection. Endless possibilities.",
  "The smarter way to collect.",
  "What’s yours could be someone else’s treasure.",
  "Trade your way to the collection you want",
];

describe("homepage phrase loop", () => {
  it("keeps all 12 approved phrases in the requested order", () => {
    expect(componentSource).toContain("export const HOMEPAGE_PHRASES = [");
    expect(componentSource.match(/  \"[^\"]+\",/g)).toEqual(
      approvedPhrases.map(phrase => `  \"${phrase}\",`),
    );
  });

  it("keeps the complete phrase centered while words reveal individually", () => {
    expect(componentSource).toContain("block w-full max-w-6xl px-2 text-center");
    expect(componentSource).toContain("index < displayedWordCount ? \"opacity-100\" : \"opacity-0\"");
    expect(componentSource).toContain("aria-atomic=\"true\"");
  });

  it("uses the approved five-second phrase and logo holds with reduced-motion support", () => {
    expect(componentSource).toContain("const PHRASE_HOLD_MS = 5000;");
    expect(componentSource).toContain("const LOGO_HOLD_MS = 5000;");
    expect(componentSource).toContain("prefers-reduced-motion: reduce");
    expect(componentSource).toContain("<AnimatedLogoSmall70");
  });

  it("keeps the animation section full width and separates it from the footer", () => {
    const homepageSource = readFileSync(new URL("../pages/Home.tsx", import.meta.url), "utf8");
    expect(homepageSource).toContain("<HomepagePhraseLoop />");
    expect(homepageSource.indexOf("<HomepagePhraseLoop />")).toBeLessThan(homepageSource.indexOf("{/* Footer */}"));
  });
});
