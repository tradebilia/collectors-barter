import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

function between(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  expect(startIndex, `Missing start marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `Missing end marker: ${end}`).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("third deep-audit P0 public privacy and sign-in repairs", () => {
  it("uses one public-owner eligibility rule across public listing presentation and aggregate counts", () => {
    const source = read("server/db.ts");
    const eligibility = read("server/publicVisibility.ts");
    const format = between(source, "async function formatListings", "export async function getMarketplaceFeed");
    const feed = between(source, "export async function getMarketplaceFeed", "export async function getListingDetail");
    const detailStart = source.indexOf("export async function getListingDetail");
    expect(detailStart).toBeGreaterThanOrEqual(0);
    const detail = source.slice(detailStart, detailStart + 10_000);
    const statistics = between(source, "export async function getSiteStatistics", "async function getProposalCards");

    expect(eligibility).toContain("up.showProfile = 1 AND u.isAccountClosed = 0");
    expect(format).toContain("options: { publicOnly?: boolean }");
    expect(format).toContain("options.publicOnly");
    expect(format).toContain("profileMap.has(row.ownerId) && row.status === \"active\" && Number(row.isActive) === 1");
    expect(feed).toContain("isPublicMemberEligible(listings.ownerId)");
    expect(feed).toContain("formatListings(listingRows, viewerId, { publicOnly: true })");
    expect(detail).toContain("isPublicMemberEligible(listings.ownerId)");
    expect(detail).toContain("formatListings(similarRowsWithPhotos, viewerId, { publicOnly: true })");
    expect(detail).toContain("eq(listings.isActive, 1)");
    expect(statistics.match(/isPublicMemberEligible\(listings\.ownerId\)/g)).toHaveLength(2);
    expect(statistics).toContain("eq(users.isAccountClosed, 0)");
    expect(source.match(/formatListings\(listingRows, viewerId \?\? null, \{ publicOnly: true \}\)/g)).toHaveLength(2);
    expect(source).toContain("formatListings(enrichedOwnListings, user.id)");
    expect(source).toContain("formatListings(enrichedWatchlistRows, user.id)");
  });

  it("prevents hidden or closed members from being disclosed through merchant, trade-history, and presence endpoints", () => {
    const source = read("server/routers.ts");
    const merchants = between(source, "getVerifiedMerchants: publicProcedure", "getUserProfile: publicProcedure");
    const history = between(source, "getUserTrades: publicProcedure", "getRecentTrades: publicProcedure");
    const recentTrades = between(source, "getRecentTrades: publicProcedure", "getMyWarnings: protectedProcedure");
    const presenceStart = source.indexOf("onlineStatus: router");
    expect(presenceStart).toBeGreaterThanOrEqual(0);
    const presence = source.slice(presenceStart, presenceStart + 12_000);

    expect(merchants).toContain("isPublicMemberEligible(sql`u.id`)");
    expect(history.match(/isPublicMemberEligible\(sql`tp\.(?:requesterId|recipientId)`\)/g)).toHaveLength(2);
    expect(recentTrades.match(/isPublicMemberEligible\(sql`tp\.(?:requesterId|recipientId)`\)/g)).toHaveLength(2);
    expect(presence).toContain("eq(users.isAccountClosed, 0)");
    expect(presence).toContain("eq(userProfiles.showProfile, 1)");
    expect(presence).not.toContain("lastActivityAt: lastActivity");
    expect(presence).not.toContain("lastActivityAt: seller.lastActivityAt");
  });

  it("routes every public sign-in control to the app-owned custom credential modal, not legacy OAuth", () => {
    const signInHelper = read("client/src/const.ts");
    const app = read("client/src/App.tsx");
    const componentDirectory = resolve(root, "client/src");
    const queue = [componentDirectory];
    const clientSources: string[] = [];

    while (queue.length) {
      const directory = queue.pop()!;
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) queue.push(path);
        if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) clientSources.push(readFileSync(path, "utf8"));
      }
    }

    expect(signInHelper).toContain('location.searchParams.set("signin", "1")');
    expect(signInHelper).not.toContain("/api/oauth/start");
    expect(app).toContain("function GlobalSignInModal()");
    expect(app).toContain("<GlobalSignInModal />");
    expect(clientSources.join("\n")).not.toContain("window.location.href = `${window.location.origin}/api/oauth/start`");
  });
});
