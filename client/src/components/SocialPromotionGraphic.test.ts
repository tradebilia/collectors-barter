import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./SocialPromotionGraphic.tsx", import.meta.url), "utf8");

describe("Social promotion graphic", () => {
  it("supports social-ready sizes for the requested major platforms", () => {
    expect(source).toContain("Facebook Feed");
    expect(source).toContain("Instagram Square");
    expect(source).toContain("X Post");
    expect(source).toContain("Pinterest Pin");
    expect(source).toContain("LinkedIn Feed");
  });

  it("contains the original collectible image without cropping or AI modification", () => {
    expect(source).toContain("object-contain");
    expect(source).not.toContain("object-cover");
    expect(source).not.toContain("crossOrigin");
    expect(source).toContain("Original image · fully shown");
    expect(source).not.toContain("generateImage");
    expect(source).not.toContain("invokeLLM");
  });

  it("includes the new-item badge, item facts, Tradebilia branding, and direct item CTA", () => {
    expect(source).toContain("New to Tradebilia");
    expect(source).toContain("TRADEBILIA_LOGO_URL");
    expect(source).toContain("brandLogoUrl = TRADEBILIA_LOGO_URL");
    expect(source).toContain('alt="Tradebilia"');
    expect(source).toContain("View this item on Tradebilia");
    expect(source).toContain("draft.destinationUrl");
    expect(source).toContain("promotion?.facts.slice(0, 4)");
  });
});
