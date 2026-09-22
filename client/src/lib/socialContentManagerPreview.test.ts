import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(new URL("../components/SocialContentManagerTab.tsx", import.meta.url), "utf8");
const graphicSource = readFileSync(new URL("../components/SocialPromotionGraphic.tsx", import.meta.url), "utf8");
const exporterSource = readFileSync(new URL("./socialGraphicExport.ts", import.meta.url), "utf8");

describe("Social Content Manager post preview", () => {
  it("provides an internal Preview Post action in the Create and Review workflow", () => {
    expect(componentSource).toContain("Preview Post");
    expect(componentSource).toContain("function openPreview()");
    expect(componentSource).toContain("<Dialog open={isPreviewOpen}");
    expect(componentSource).toContain("Close Preview");
  });

  it("renders a platform-specific graphic, caption, direct item link, and export action", () => {
    expect(componentSource).toContain("SocialPromotionGraphic");
    expect(componentSource).toContain("SOCIAL_GRAPHIC_SPECS");
    expect(componentSource).toContain("Generated social caption");
    expect(componentSource).toContain("Copy caption");
    expect(componentSource).toContain("Download Graphic");
    expect(componentSource).toContain("downloadSocialGraphic");
    expect(componentSource).toContain("prepareSocialGraphicImage");
    expect(componentSource).toContain("generateHighValueListingScene");
    expect(componentSource).toContain("generatedBackgroundUrl");
    expect(componentSource).toContain("generatedBackgroundVersion === 12");
    expect(componentSource).toContain("listingImageDataUrl: preparedGraphicImageUrl");
    expect(componentSource).toContain("Reading the public listing photo as a visual reference and creating one left-side item-inspired collector scene");
    expect(componentSource).toContain("Creating item-specific scene");
    expect(componentSource).toContain("preparedGraphicImageUrl");
    expect(componentSource).toContain("preparedBrandLogoUrl");
    expect(componentSource).toContain("preparedHeroBackgroundUrl");
    expect(componentSource).toContain("SOCIAL_GRAPHIC_BRAND_LOGO_URL");
    expect(componentSource).toContain("SOCIAL_GRAPHIC_HERO_BACKGROUND_URL");
    expect(componentSource).not.toContain("heroBackgroundDataUrl");
    expect(componentSource).toContain("getSocialPromotionItemLink");
    expect(componentSource).toContain("canonicalDestinationUrl");
    expect(componentSource).toContain("${TRADEBILIA_PUBLIC_ORIGIN}${selectedDraft.promotion.itemPath}");
    expect(componentSource).toContain("draft: graphicDraft ?? selectedDraft");
    expect(componentSource).toContain("getPreviewCaption");
    expect(componentSource).toContain("navigator.clipboard.writeText(previewCaption)");
    expect(componentSource).toContain('if (draft.source !== "High-Value Listing") return draft.copy;');
    expect(componentSource).not.toContain("brandLogoDataUrl");
    expect(componentSource).toContain("Preparing the listing reference");
    expect(componentSource).toContain("renderSocialGraphicCanvas");
    expect(componentSource).not.toContain("html2canvas");
    expect(exporterSource).toContain("document.createElement(\"canvas\")");
    expect(exporterSource).toContain("drawContainedImage");
    expect(exporterSource).toContain("SOCIAL_GRAPHIC_CANVAS_SIZES");
    expect(graphicSource).toContain("renderSocialGraphicCanvas");
    expect(graphicSource).toContain("draft,");
  });

  it("uses the original image only as a reference and retains manual-publishing safeguards", () => {
    expect(componentSource).toContain("one generated item-inspired visual");
    expect(componentSource).toContain("The original uploaded collectible image is not placed into high-value artwork or changed.");
    expect(componentSource).not.toContain("object-cover");
    expect(componentSource).toContain("Internal planning preview only. It does not publish");
    expect(componentSource).toContain("Platform layouts can vary after manual publishing.");
    expect(componentSource).not.toContain("publishSocialPost");
  });
});
