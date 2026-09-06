import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("Etsy verification display coverage", () => {
  it("keeps Etsy verification on each existing public member-verification surface", () => {
    const surfaces = [
      ["client/src/pages/PublicProfile.tsx", "user.etsyVerified"],
      ["client/src/pages/ItemDetail.tsx", "ownerProfile.etsyVerified"],
      ["client/src/pages/MemberSearch.tsx", "Etsy Verified"],
      ["client/src/pages/TradeHub.tsx", "otherUser?.etsyVerified"],
      ["client/src/lib/tradeShowcaseMovements.ts", "Etsy Verified"],
    ] as const;

    for (const [relativePath, expectedSignal] of surfaces) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain(expectedSignal);
    }
  });

  it("keeps public-profile provider accounts compact and expands Etsy details on demand", () => {
    const source = readFileSync(resolve(projectRoot, "client/src/pages/PublicProfile.tsx"), "utf8");

    expect(source).toContain("Verified Accounts");
    expect(source).toContain("setSelectedVerification");
    expect(source).toContain("[\"overview\", \"collection\", \"trades\", \"reviews\", \"verified\"]");
    expect(source).toContain("Verified Accts");
    expect(source).toContain('activeTab === "verified"');
    expect(source).toContain("Etsy user ID:");
    expect(source).toContain("user.etsyUserId");
    expect(source).toContain("user.etsyDisplayName");
    expect(source).toContain("user.etsyShopName");
    expect(source).toContain("View Facebook profile");
    expect(source).toContain("View LinkedIn profile");
    expect(source).toContain('target="_blank"');
    expect(source).toContain('rel="noopener noreferrer"');
    expect(source).toContain("This verified Etsy account does not have a shop linked.");
    expect(source).not.toContain("user.etsyEmail");
    const headerSource = source.slice(source.indexOf("{/* User Info */"), source.indexOf("{/* Navigation Tabs */"));
    expect(headerSource).not.toContain("Etsy Verified");
  });

  it("does not expose saved Etsy OAuth credentials through public-profile data", () => {
    const routerSource = readFileSync(resolve(projectRoot, "server/routers.ts"), "utf8");
    const profileStart = routerSource.indexOf("getUserProfile: publicProcedure");
    const publicProfileSource = routerSource.slice(
      profileStart,
      routerSource.indexOf("search: publicProcedure", profileStart),
    );

    expect(profileStart).toBeGreaterThan(-1);
    expect(publicProfileSource).toContain("getPublicEtsyVerification");
    expect(publicProfileSource).toContain("getSafeVerifiedProfileUrl");
    expect(publicProfileSource).toContain('["facebook.com", "fb.com"]');
    expect(publicProfileSource).toContain('["linkedin.com"]');
    expect(publicProfileSource).not.toContain("etsyAccessToken");
    expect(publicProfileSource).not.toContain("etsyRefreshToken");
  });
});
