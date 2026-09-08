import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const accountSettings = readFileSync(new URL("../client/src/pages/AccountSettings.tsx", import.meta.url), "utf8");
const ebayConnection = readFileSync(new URL("../client/src/components/EbayConnection.tsx", import.meta.url), "utf8");
const facebookConnection = readFileSync(new URL("../client/src/components/FacebookConnection.tsx", import.meta.url), "utf8");
const linkedInConnection = readFileSync(new URL("../client/src/components/LinkedInConnection.tsx", import.meta.url), "utf8");
const publicProfile = readFileSync(new URL("../client/src/pages/PublicProfile.tsx", import.meta.url), "utf8");

describe("Profile Integrations provider logos", () => {
  it("uses modular provider connection cards and the approved Whatnot source in the Integration tab", () => {
    expect(accountSettings).toContain("https://assets.tradebilia.com/WhatNot_ab669ac9.png");
    expect(accountSettings).toContain('import { EbayConnection } from "@/components/EbayConnection"');
    expect(accountSettings).toContain('import { FacebookConnection } from "@/components/FacebookConnection"');
    expect(accountSettings).toContain('import { LinkedInConnection } from "@/components/LinkedInConnection"');
    expect(accountSettings).toContain('import { EtsyConnection } from "@/components/EtsyConnection"');
    expect(accountSettings).toContain("<EbayConnection />");
    expect(accountSettings).toContain("<FacebookConnection />");
    expect(accountSettings).toContain("<LinkedInConnection />");
    expect(accountSettings).toContain("<EtsyConnection />");
  });

  it("uses the supplied logos in the primary connection cards", () => {
    expect(ebayConnection).toContain("https://assets.tradebilia.com/Ebaylogo_12a10426.png");
    expect(facebookConnection).toContain("https://assets.tradebilia.com/Facebooklogo_0c02c2d1.png");
    expect(linkedInConnection).toContain("https://assets.tradebilia.com/LinkedIn_df1e2c1e.webp");
  });

  it("serves Public Profile brand-logo references from Cloudflare static storage", () => {
    expect(publicProfile).toContain("https://assets.tradebilia.com/public-profile-logos/Facebook_Logo_2019_9f37233f.png");
    expect(publicProfile).toContain("https://assets.tradebilia.com/public-profile-logos/PayPal_6434033c.svg");
    expect(publicProfile).toContain("https://assets.tradebilia.com/public-profile-logos/Instagram_logo_2016_2d7f0690.svg");
    expect(publicProfile).toContain("https://assets.tradebilia.com/public-profile-logos/X_logo_2023_white_bdc2fda7.svg");
    expect(publicProfile).toContain("https://assets.tradebilia.com/public-profile-logos/EBay_logo_0494719f.svg");
    expect(publicProfile).toContain("https://assets.tradebilia.com/public-profile-logos/LinkedIn_logo_initials_290575a9.png");
    expect(publicProfile).not.toContain("upload.wikimedia.org/wikipedia/commons");
  });

  it("stacks connection controls below provider branding on mobile widths", () => {
    const mobileCardLayout = "flex flex-col items-stretch gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between";
    expect(accountSettings).toContain(mobileCardLayout);
    expect(ebayConnection).toContain(mobileCardLayout);
    expect(facebookConnection).toContain(mobileCardLayout);
    expect(linkedInConnection).toContain(mobileCardLayout);
  });
});
