import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dbSource = readFileSync(join(process.cwd(), "server", "db.ts"), "utf8");
const directorySource = readFileSync(join(process.cwd(), "client", "src", "pages", "MemberSearch.tsx"), "utf8");

describe("Member Directory discovery workflow", () => {
  it("uses public town/state rather than private street address for location filtering", () => {
    const searchMembersSource = dbSource.slice(dbSource.indexOf("export async function searchMembers"), dbSource.indexOf("export async function toggleListingStatus"));
    expect(searchMembersSource).toContain("userProfiles.contactState");
    expect(searchMembersSource).not.toContain("userProfiles.contactAddress");
  });

  it("supports approved trust, activity, collection, value, member-since, and sort filters", () => {
    const searchMembersSource = dbSource.slice(dbSource.indexOf("export async function searchMembers"), dbSource.indexOf("export async function toggleListingStatus"));
    expect(searchMembersSource).toContain("input.categories?.length");
    expect(searchMembersSource).toContain("input.verifiedMerchantsOnly");
    expect(searchMembersSource).toContain("input.minRating");
    expect(searchMembersSource).toContain("input.minCompletedTrades");
    expect(searchMembersSource).toContain("input.activeListingsOnly");
    expect(searchMembersSource).toContain("activeListingValue");
    expect(searchMembersSource).toContain("input.memberSince");
    expect(searchMembersSource).toContain("switch (input.sort");
  });

  it("routes an intentional exact search to the existing public profile route", () => {
    expect(directorySource).toContain("setOpenExactMatch(hasExactQuery)");
    expect(directorySource).toContain("membersQuery.data?.exactMatchMemberId");
    expect(directorySource).toContain("setLocation(`/profile/${exactMemberId}`)");
    expect(directorySource).toContain("Press Enter or Search to open a matching member’s public profile.");
  });

  it("uses deliberate Search and Clear controls and profile-first result cards instead of a spotlight card", () => {
    expect(directorySource).toContain("<form onSubmit={applySearch}");
    expect(directorySource).toContain("Apply filters");
    expect(directorySource).toContain("Clear</Button>");
    expect(directorySource).toContain("View Profile");
    expect(directorySource).not.toContain("Collector spotlight");
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
});
