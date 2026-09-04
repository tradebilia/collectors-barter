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
});
