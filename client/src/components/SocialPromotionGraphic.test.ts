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
    expect(source).not.toContain("Original image · fully shown");
    expect(source).not.toContain("generateImage");
    expect(source).not.toContain("invokeLLM");
  });

  it("uses a dominant new-listing header, enlarged Tradebilia branding, complete title source, and direct item CTA", () => {
    expect(source).toContain("New High-Value Listing");
    expect(source).toContain("getSocialPromotionItemTitle");
    expect(source).toContain("h-12");
    expect(source).toContain("TRADEBILIA_LOGO_URL");
    expect(source).toContain("brandLogoUrl = TRADEBILIA_LOGO_URL");
    expect(source).toContain('alt="Tradebilia"');
    expect(source).toContain("View item profile");
    expect(source).toContain("draft.destinationUrl");
    expect(source).toContain("promotion?.facts.slice(0, 4)");
    expect(source).toContain("SOCIAL_GRAPHIC_HERO_BACKGROUND_URL");
    expect(source).toContain("h-20 w-auto");
    expect(source).toContain("justify-center border-t");
    expect(source).not.toContain("<span>tradebilia</span>");
  });
});
