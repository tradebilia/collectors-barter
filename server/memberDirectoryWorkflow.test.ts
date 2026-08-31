import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dbSource = readFileSync(join(process.cwd(), "server", "db.ts"), "utf8");
const routerSource = readFileSync(join(process.cwd(), "server", "routers.ts"), "utf8");
const directorySource = readFileSync(join(process.cwd(), "client", "src", "pages", "MemberSearch.tsx"), "utf8");

describe("Member Directory discovery workflow", () => {
  it("uses saved location only inside the server distance calculation and strips private address data from directory responses", () => {
    const searchMembersSource = dbSource.slice(dbSource.indexOf("export async function searchMembers"), dbSource.indexOf("export async function toggleListingStatus"));
    expect(searchMembersSource).toContain("userProfiles.contactState");
    expect(searchMembersSource).toContain("geocodePrivateLocation");
    expect(searchMembersSource).toContain("members: orderedMembers.map(({ privateLocation, ...member }) => member)");
    expect(directorySource).not.toContain("contactAddress");
    expect(directorySource).toContain("Calculated privately from saved account locations. Addresses are never shown.");
  });

  it("supports approved trust, activity, collection, value, distance, review-count, member-since, and sort filters", () => {
    const searchMembersSource = dbSource.slice(dbSource.indexOf("export async function searchMembers"), dbSource.indexOf("export async function toggleListingStatus"));
    expect(searchMembersSource).toContain("input.categories?.length");
    expect(searchMembersSource).toContain("input.verifiedMerchantsOnly");
    expect(searchMembersSource).toContain("input.minRating");
    expect(searchMembersSource).toContain("input.minReviewCount");
    expect(searchMembersSource).toContain("input.minCompletedTrades");
    expect(searchMembersSource).toContain("input.activeListingsOnly");
    expect(searchMembersSource).toContain("activeListingValue");
    expect(searchMembersSource).toContain("input.memberSince");
    expect(searchMembersSource).toContain("input.distanceMiles");
    expect(searchMembersSource).toContain("case \"nearest\"");
    expect(searchMembersSource).toContain("switch (input.sort");
    expect(routerSource).toContain("searchNearby: protectedProcedure");
  });

  it("routes an intentional username search to the existing public profile route", () => {
    expect(directorySource).toContain("setOpenExactMatch(Boolean(query))");
    expect(directorySource).toContain("membersQuery.data?.exactMatchMemberId");
    expect(directorySource).toContain("setLocation(`/profile/${exactMemberId}`)");
    expect(directorySource).toContain("Find a collector by username");
    expect(directorySource).toContain("Enter username");
  });

  it("uses deliberate username Search while applying discrete filters automatically and keeps cards profile-first", () => {
    expect(directorySource).toContain("<form onSubmit={applyUsernameSearch}");
    expect(directorySource).toContain("Selections update results automatically.");
    expect(directorySource).not.toContain("Apply filters");
    expect(directorySource).not.toContain("More filters");
    expect(directorySource).toContain("Clear all</Button>");
    expect(directorySource).toContain("View Profile");
    expect(directorySource).not.toContain("Collector spotlight");
    expect(directorySource).not.toContain("Members</span>");
    expect(directorySource).not.toContain("startDirectMessageThread");
    expect(directorySource).not.toContain("loadPresenceMap");
  });

  it("lets collectors choose multiple categories and uses an explicit Verified Merchant toggle", () => {
    expect(directorySource).toContain("Collecting categories");
    expect(directorySource).toContain("Choose any that apply");
    expect(directorySource).toContain('role="checkbox"');
    expect(directorySource).toContain("toggleCategory");
    expect(directorySource).toContain("Verified Merchant only");
    expect(directorySource).not.toContain("Member standing");
  });

  it("provides category bulk actions, removable active-filter chips, and merchant verification guidance", () => {
    expect(directorySource).toContain("Select all");
    expect(directorySource).toContain("Clear categories");
    expect(directorySource).toContain("Active filters");
    expect(directorySource).toContain("Clear all");
    expect(directorySource).toContain("removeActiveFilter");
    expect(directorySource).toContain("reviewed and approved by Tradebilia");
  });

  it("shows all account verifications separately from the reviewed merchant designation", () => {
    const searchMembersSource = dbSource.slice(dbSource.indexOf("export async function searchMembers"), dbSource.indexOf("export async function toggleListingStatus"));
    expect(searchMembersSource).toContain("accountVerifications:");
    expect(searchMembersSource).toContain("ebay: hasEbayPlatformVerification");
    expect(searchMembersSource).toContain("facebook: Boolean(m.facebookId) || m.facebookVerified === 1");
    expect(searchMembersSource).toContain("linkedin: Boolean(m.linkedinId)");
    expect(searchMembersSource).toContain("etsy: getPublicEtsyVerification(m.connectedAccounts).etsyVerified");
    expect(directorySource).toContain("Account verifications");
    expect(directorySource).toContain("Verified Merchant");
    expect(directorySource).toContain("eBay Verified");
    expect(directorySource).toContain("Facebook Verified");
    expect(directorySource).toContain("LinkedIn Verified");
    expect(directorySource).toContain("Etsy Verified");
    expect(directorySource).toContain("member.isVerifiedMerchant ?");
  });

  it("uses usernames rather than member numbers on directory cards", () => {
    expect(directorySource).toContain("member.username ? `@${member.username}` : \"Tradebilia collector\"");
    expect(directorySource).not.toContain("Member #{member.userId}");
  });
});
