import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (name: string) =>
  readFileSync(join(process.cwd(), name), "utf-8");

describe("handoff documentation safeguards", () => {
  const guide = readProjectFile("SESSION_HANDOFF_GUIDE.md");
  const quickStart = readProjectFile("NEXT_SESSION_QUICK_START.md");
  const assets = readProjectFile("IMAGE_ASSET_INVENTORY.md");

  it("preserves the external database warning and explicit approval gate", () => {
    expect(guide).toContain("CUSTOM_DATABASE_URL");
    expect(guide).toContain("external MySQL/TiDB-compatible database");
    expect(guide).toContain("Rich explicitly confirms");
  });

  it("requires a continuation inside the existing Tradebilia Website project", () => {
    expect(guide).toContain("inside the existing “Tradebilia Website” project");
    expect(guide).toContain("Do not create a new website/WebDev project");
    expect(quickStart).toContain("Continue the Existing Tradebilia Website Project");
    expect(quickStart).toContain("Do not create a new website project");
    expect(assets).toContain("newly initialized web project");
  });

  it("documents all currently essential integration credential names without raw values", () => {
    for (const name of [
      "SOLD_COMPS_API_KEY",
      "PARSE_BOT_API_KEY",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_VERIFY_SERVICE_SID",
      "EBAY_PROD_CLIENT_ID",
      "EBAY_PROD_CLIENT_SECRET",
      "TRADEBILIA_OPENAI_API_KEY",
    ]) {
      expect(guide).toContain(name);
    }
  });

  it("documents the verified static recovery release and preserves the no-user-media rule", () => {
    expect(assets).toContain("tradebilia-static-assets-2026-08-11");
    expect(assets).toContain("182292f179319e64610d25c273018df8d3665c225b34870335d0c0651a78528c");
    expect(assets).toContain("Never commit");
    expect(quickStart).toContain("Do not move listing photos or avatars into GitHub");
  });
});
