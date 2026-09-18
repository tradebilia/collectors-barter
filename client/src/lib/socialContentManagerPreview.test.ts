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
    expect(componentSource).toContain("preparedGraphicImageUrl");
    expect(componentSource).toContain("preparedBrandLogoUrl");
    expect(componentSource).toContain("brandLogoDataUrl");
    expect(componentSource).toContain("Preparing the original item image");
    expect(componentSource).toContain("renderSocialGraphicCanvas");
    expect(componentSource).not.toContain("html2canvas");
    expect(exporterSource).toContain("document.createElement(\"canvas\")");
    expect(exporterSource).toContain("drawContainedImage");
    expect(exporterSource).toContain("SOCIAL_GRAPHIC_CANVAS_SIZES");
    expect(graphicSource).toContain("draft.destinationUrl");
  });

  it("retains the original image and manual-publishing safeguards", () => {
    expect(componentSource).toContain("original item image is fitted in full and is never cropped or altered");
    expect(componentSource).toContain("The download exports the displayed platform graphic. It never changes the original uploaded collectible image.");
    expect(componentSource).not.toContain("object-cover");
    expect(componentSource).toContain("Internal planning preview only. It does not publish");
    expect(componentSource).toContain("Platform layouts can vary after manual publishing.");
    expect(componentSource).not.toContain("publishSocialPost");
  });
});
