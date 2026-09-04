import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(new URL("../components/SocialContentManagerTab.tsx", import.meta.url), "utf8");

describe("Social Content Manager post preview", () => {
  it("provides an internal Preview Post action in the Create and Review workflow", () => {
    expect(componentSource).toContain("Preview Post");
    expect(componentSource).toContain("function openPreview()");
    expect(componentSource).toContain("<Dialog open={isPreviewOpen}");
    expect(componentSource).toContain("Close Preview");
  });

  it("renders the selected platform, current draft content, media, source, and status", () => {
    expect(componentSource).toContain("selectedPreviewPlatform");
    expect(componentSource).toContain("selectedDraft.platforms.map");
    expect(componentSource).toContain("selectedDraft.copy");
    expect(componentSource).toContain("selectedDraft.mediaUrl");
    expect(componentSource).toContain("isVideoMediaUrl");
    expect(componentSource).toContain("selectedDraft.source");
    expect(componentSource).toContain("selectedDraft.status");
  });

  it("retains the manual-publishing boundary in the preview", () => {
    expect(componentSource).toContain("Internal planning preview only. It does not publish");
    expect(componentSource).toContain("Platform layouts can vary after manual publishing.");
    expect(componentSource).not.toContain("publishSocialPost");
  });
});
