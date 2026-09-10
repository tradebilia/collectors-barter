import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HOMEPAGE_PHRASES, splitPhraseIntoFragments } from "@/components/HomepagePhraseLoop";

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

  it("splits phrases into complete punctuation-delimited fragments", () => {
    expect(componentSource).toContain("export function splitPhraseIntoFragments");
    expect(componentSource).toContain("phrase.match(/[^.!?]+[.!?]+|[^.!?]+$/g)");
    expect(componentSource).toContain("Have it. Want it. Trade it.");
    expect(splitPhraseIntoFragments("Have it. Want it. Trade it.")).toEqual(["Have it.", "Want it.", "Trade it."]);
    expect(splitPhraseIntoFragments(HOMEPAGE_PHRASES[1])).toEqual(["Trade what you have.", "Get what you want."]);
  });

  it("keeps the complete phrase centered while fragments reveal individually", () => {
    expect(componentSource).toContain("block w-full max-w-6xl whitespace-nowrap px-2 text-center");
    expect(componentSource).toContain("index < displayedFragmentCount ? \"opacity-100\" : \"opacity-0\"");
    expect(componentSource).toContain("aria-atomic=\"true\"");
  });

  it("uses the approved five-second phrase and logo holds with reduced-motion support", () => {
    expect(componentSource).toContain("export const FRAGMENT_REVEAL_MS = 2000;");
    expect(componentSource).toContain("export const PHRASE_HOLD_MS = 5000;");
    expect(componentSource).toContain("export const LOGO_HOLD_MS = 5000;");
    expect(componentSource).toContain("type AnimationPhase = \"reveal\" | \"hold\" | \"logo\";");
    expect(componentSource).toContain("h-[136px] w-full overflow-hidden");
    expect(componentSource).toContain("whitespace-nowrap");
    expect(componentSource).toContain("fontSize={132}");
    expect(componentSource).toContain("wheelScale={1.85}");
    expect(componentSource).toContain("prefers-reduced-motion: reduce");
    expect(componentSource).toContain("<AnimatedLogoSmall70");
  });

  it("keeps the animation section full width and separates it from the footer", () => {
    const homepageSource = readFileSync(new URL("../pages/Home.tsx", import.meta.url), "utf8");
    expect(homepageSource).toContain("<HomepagePhraseLoop />");
    expect(homepageSource.indexOf("<HomepagePhraseLoop />")).toBeLessThan(homepageSource.indexOf("{/* Footer */}"));
  });
});
