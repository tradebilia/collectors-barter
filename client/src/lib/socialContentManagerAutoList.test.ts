import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(new URL("../components/SocialContentManagerTab.tsx", import.meta.url), "utf8");

describe("social content manager auto-list control", () => {
  it("persists the administrator preference and only runs opportunity discovery when enabled", () => {
    expect(componentSource).toContain("tradebilia-admin-social-preferences-v1");
    expect(componentSource).toContain("autoListEnabled");
    expect(componentSource).toContain("enabled: autoListEnabled === true");
    expect(componentSource).toContain("Auto-list promotion opportunities");
  });

  it("keeps auto-listing separate from external publishing", () => {
    expect(componentSource).toContain("nothing posts automatically");
    expect(componentSource).toContain("Manual publishing safeguard");
    expect(componentSource).not.toContain("publishSocialPost");
  });

  it("uses the approval-gated asynchronous TNN video workflow and keeps publishing manual", () => {
    expect(componentSource).toContain("draftCompletedTradeTnnScript");
    expect(componentSource).toContain("startCompletedTradeVideoGeneration");
    expect(componentSource).toContain("getCompletedTradeVideoGeneration");
    expect(componentSource).toContain("generationStatus: \"generating\"");
    expect(componentSource).toContain("Approve this TNN video task?");
    expect(componentSource).toContain("Only one TNN video may generate at a time");
    expect(componentSource).toContain("generationAttempt >= 2");
    expect(componentSource).toContain("TNN video is attached and ready for private review.");
    expect(componentSource).toContain("nothing is published automatically");
    expect(componentSource).not.toContain("publishSocialPost");
  });

  it("prefills the TNN studio with seller, buyer, selected items, and the approved generation settings", () => {
    expect(componentSource).toContain("sellerName: trade.sellerName ?? null");
    expect(componentSource).toContain("buyerName: trade.buyerName ?? null");
    expect(componentSource).toContain("tradeId: Number.isFinite(Number(trade.tradeId))");
    expect(componentSource).toContain("buildTnnCompletedTradeVideoPlan");
    expect(componentSource).toContain("chooseNextTnnAnchor(lastTnnSoloAnchor)");
    expect(componentSource).toContain("Seller name");
    expect(componentSource).toContain("Buyer name");
    expect(componentSource).toContain("45 seconds · standard TNN report");
    expect(componentSource).toContain("Max Tradebloski · solo");
    expect(componentSource).toContain("Sidney Tradewell · solo");
    expect(componentSource).toContain("Max &amp; Sidney · duo report");
    expect(componentSource).toContain("Completed-trade items");
    expect(componentSource).toContain("AI-written script draft");
    expect(componentSource).toContain("One initial video and one explicitly approved replacement");
    expect(componentSource).toContain('const TNN_VIDEO_LOGO_PATH = "/manus-storage/GlossyTNNTradebiliaNewsLogo_2c671156.png"');
    expect(componentSource).toContain("TNN — transparent glossy Tradebilia News Network logo");
    expect(componentSource).toContain("Official TNN visual identity:");
    expect(componentSource).toContain('const TNN_NEWSROOM_REFERENCE_PATH = "/manus-storage/TNNTradebiliaNewsroomStudio_7f73bd45.png"');
    expect(componentSource).toContain('const TNN_OPENING_REFERENCE_PATH = "/manus-storage/TNNOpeningGlobeReference_f90474c7.png"');
    expect(componentSource).toContain("Approved TNN bright broadcast newsroom reference");
    expect(componentSource).toContain("Approved newsroom set:");
    expect(componentSource).toContain("WWW.Tradebilia.com");
    expect(componentSource).toContain("trade-bil-lee-uh");
    expect(componentSource).not.toContain("logoUrl: TNN_VIDEO_LOGO_URL");
    expect(componentSource).not.toContain("newsroomReferenceUrl: TNN_NEWSROOM_REFERENCE_URL");
  });

  it("refreshes saved high-value draft visual hints from current opportunity metadata", () => {
    expect(componentSource).toContain("currentVisualOpportunities");
    expect(componentSource).toContain("reconcileSocialDraftVisualHints(current, currentVisualOpportunities)");
    expect(componentSource).toContain("drafts never keep a generic environment");
  });
});
