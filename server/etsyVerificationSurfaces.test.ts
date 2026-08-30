import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("Etsy verification display coverage", () => {
  it("keeps Etsy verification on each existing public member-verification surface", () => {
    const surfaces = [
      ["client/src/pages/PublicProfile.tsx", "Etsy Verified"],
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

  it("does not expose saved Etsy OAuth credentials through public-profile data", () => {
    const routerSource = readFileSync(resolve(projectRoot, "server/routers.ts"), "utf8");
    const profileStart = routerSource.indexOf("getUserProfile: publicProcedure");
    const publicProfileSource = routerSource.slice(
      profileStart,
      routerSource.indexOf("search: publicProcedure", profileStart),
    );

    expect(profileStart).toBeGreaterThan(-1);
    expect(publicProfileSource).toContain("getPublicEtsyVerification");
    expect(publicProfileSource).not.toContain("etsyAccessToken");
    expect(publicProfileSource).not.toContain("etsyRefreshToken");
  });
});
