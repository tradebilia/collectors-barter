import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const llmSource = readFileSync(new URL("./_core/llm.ts", import.meta.url), "utf8");
const uploadSection = routerSource.slice(
  routerSource.indexOf("uploadSocialContentMedia:"),
  routerSource.indexOf("getPromotionOpportunities:"),
);
const imagePreparationSection = routerSource.slice(
  routerSource.indexOf("getSocialGraphicImageDataUrl"),
  routerSource.indexOf("const SOCIAL_PROMOTION_FACT_FIELDS"),
);

describe("admin social-content media upload contract", () => {
  it("requires an administrator and stores uploads through the configured object storage helper", () => {
    expect(uploadSection).toContain('ctx.user.role !== "admin"');
    expect(uploadSection).toContain("storagePut(");
    expect(uploadSection).toContain("social-content/admin-");
  });

  it("restricts uploads to approved media types and a six-megabyte binary limit", () => {
    expect(uploadSection).toContain('"image/jpeg"');
    expect(uploadSection).toContain('"video/mp4"');
    expect(uploadSection).toContain("6 * 1024 * 1024");
    expect(uploadSection).toContain("PAYLOAD_TOO_LARGE");
  });

  it("prepares known Tradebilia images server-side for reliable graphic export", () => {
    expect(uploadSection).toContain("prepareSocialGraphicImage");
    expect(uploadSection).toContain("const dataUrls = await Promise.all");
    expect(uploadSection).toContain("return { dataUrls }");
    expect(uploadSection).not.toContain("brandLogoDataUrl");
    expect(uploadSection).not.toContain("heroBackgroundDataUrl");
    expect(uploadSection).toContain('ctx.user.role !== "admin"');
    expect(imagePreparationSection).toContain("SOCIAL_GRAPHIC_ALLOWED_IMAGE_HOSTS");
    expect(routerSource).not.toContain("SOCIAL_GRAPHIC_BRAND_LOGO_URL");
    expect(routerSource).not.toContain("SOCIAL_GRAPHIC_HERO_BACKGROUND_URL");
    expect(routerSource).toContain('"image/svg+xml"');
    expect(imagePreparationSection).toContain("https://tradebilia.manus.space");
    expect(imagePreparationSection).toContain("SOCIAL_GRAPHIC_MAX_IMAGE_BYTES");
    expect(imagePreparationSection).toContain("SOCIAL_GRAPHIC_ALLOWED_REDIRECT_HOSTS");
    expect(routerSource).toContain("d36hbw14aib5lz.cloudfront.net");
    expect(imagePreparationSection).toContain('redirect: "manual"');
    expect(imagePreparationSection).toContain('redirect: "error"');
    expect(imagePreparationSection).toContain("data:${contentType};base64");
  });

  it("generates automatic high-value scenes only from bounded public display metadata", () => {
    expect(uploadSection).toContain("generateHighValueListingScene");
    expect(uploadSection).toContain('ctx.user.role !== "admin"');
    expect(uploadSection).toContain("buildAutomaticHighValueScenePrompt");
    expect(uploadSection).toContain("listingImageDataUrl");
    expect(uploadSection).toContain("parseAutomaticSceneReferenceImage");
    expect(uploadSection).toContain("extractListingImageVisualReferences");
    expect(uploadSection).toContain("originalImages: [originalImage]");
    expect(uploadSection).toContain('model: "MODEL_GPT_IMAGE_2"');
    expect(uploadSection).toContain('quality: "medium"');
    expect(uploadSection).toContain('url?.startsWith("/manus-storage/")');
    expect(routerSource).toContain("cleanSocialScenePromptValue");
    expect(routerSource).toContain("attached listing image is a visual reference only");
    expect(routerSource).toContain('model: "gpt-5-mini"');
    expect(routerSource).toContain("maxCompletionTokens: 800");
    expect(routerSource).toContain("normalizedContent");
    expect(routerSource).toContain("References extracted from the actual listing image");
    expect(routerSource).toContain("Public team, league, character, and franchise cues are allowed");
    expect(routerSource).toContain("2–4 supporting environmental elements tied to the item");
    expect(routerSource).toContain("visibly detailed collector environment across the whole 16:9 canvas");
    expect(routerSource).toContain("Avoid broad black voids");
    expect(routerSource).toContain("one generated hero subject on the far-left side");
    expect(routerSource).toContain("strict banner-safe band");
    expect(routerSource).toContain("x=6%–34% and y=55%–94%");
    expect(routerSource).toContain("upper 48% of the canvas");
    expect(routerSource).toContain("Do not place any item-like duplicate, card, packaging, or source-image recreation on the right side");
    expect(llmSource).toContain("maxCompletionTokens?: number");
    expect(llmSource).toContain("payload.max_completion_tokens = resolvedMaxCompletionTokens");
  });
});
