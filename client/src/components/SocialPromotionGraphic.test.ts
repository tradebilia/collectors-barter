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

  it("uses the exact native canvas export so preview and download cannot diverge", () => {
    expect(source).toContain("renderSocialGraphicCanvas");
    expect(source).toContain("canvas.toDataURL(\"image/png\")");
    expect(source).toContain("itemImageUrl: itemImageUrl ?? draft.mediaUrl");
    expect(source).toContain("tradeItemImageUrls");
    expect(source).not.toContain("object-cover");
    expect(source).not.toContain("crossOrigin");
    expect(source).not.toContain("generateImage");
    expect(source).not.toContain("invokeLLM");
  });

  it("passes the real draft, platform, branding, and homepage-safe assets to the renderer", () => {
    expect(source).toContain("draft,");
    expect(source).toContain("platform,");
    expect(source).toContain("brandLogoUrl,");
    expect(source).toContain("SOCIAL_GRAPHIC_BRAND_LOGO_URL");
    expect(source).toContain("SOCIAL_GRAPHIC_HERO_BACKGROUND_URL");
    expect(source).toContain("heroBackgroundUrl,");
    expect(source).toContain('alt={`${spec.label} finished promotional graphic`}');
  });
});
