import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const accountSettings = readFileSync(new URL("../client/src/pages/AccountSettings.tsx", import.meta.url), "utf8");
const ebayConnection = readFileSync(new URL("../client/src/components/EbayConnection.tsx", import.meta.url), "utf8");
const facebookConnection = readFileSync(new URL("../client/src/components/FacebookConnection.tsx", import.meta.url), "utf8");
const linkedInConnection = readFileSync(new URL("../client/src/components/LinkedInConnection.tsx", import.meta.url), "utf8");

describe("Profile Integrations provider logos", () => {
  it("uses each supplied provider logo in the Integration tab", () => {
    expect(accountSettings).toContain("https://assets.tradebilia.com/Paypal_25ebc114.png");
    expect(accountSettings).toContain("https://assets.tradebilia.com/WhatNot_ab669ac9.png");
    expect(accountSettings).toContain("https://assets.tradebilia.com/Facebooklogo_0c02c2d1.png");
    expect(accountSettings).toContain("https://assets.tradebilia.com/LinkedIn_df1e2c1e.webp");
    expect(accountSettings).toContain("https://assets.tradebilia.com/Ebaylogo_12a10426.png");
  });

  it("uses the supplied logos in the primary connection cards", () => {
    expect(ebayConnection).toContain("https://assets.tradebilia.com/Ebaylogo_12a10426.png");
    expect(facebookConnection).toContain("https://assets.tradebilia.com/Facebooklogo_0c02c2d1.png");
    expect(linkedInConnection).toContain("https://assets.tradebilia.com/LinkedIn_df1e2c1e.webp");
  });

  it("stacks connection controls below provider branding on mobile widths", () => {
    const mobileCardLayout = "flex flex-col items-stretch gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between";
    expect(accountSettings).toContain(mobileCardLayout);
    expect(ebayConnection).toContain(mobileCardLayout);
    expect(facebookConnection).toContain(mobileCardLayout);
    expect(linkedInConnection).toContain(mobileCardLayout);
  });
});
