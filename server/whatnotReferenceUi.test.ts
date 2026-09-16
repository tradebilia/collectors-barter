import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Whatnot Reference surfaces", () => {
  it("keeps Profile Integrations focused on connection management", () => {
    const source = read("client/src/pages/AccountSettings.tsx");
    expect(source).toContain("Whatnot Reference");
    expect(source).toContain("h-16 w-16 rounded-xl object-contain");
    expect(source).toContain("trpc.market.refreshWhatnotReference.useMutation");
    expect(source).toContain("Detailed reputation data is displayed on the public profile’s Verified Accounts area.");
    expect(source).toContain("Refresh Reference");
    expect(source).toContain("Disconnect");
    expect(source).not.toContain("WhatnotConnection");
  });

  it("adds Whatnot Reference to the public trust sidebar without calling it verified", () => {
    const source = read("client/src/pages/PublicProfile.tsx");
    expect(source).toContain("user.whatnotReference");
    expect(source).toContain("Whatnot Reference");
    expect(source).toContain("Public data");
    expect(source).toContain("does not verify account ownership");
  });

  it("serializes Whatnot Reference into the public profile payload", () => {
    const source = read("server/routers.ts");
    const profileStart = source.indexOf("getUserProfile: publicProcedure");
    const profileEnd = source.indexOf("getUserListings:", profileStart);
    const profileSource = source.slice(profileStart, profileEnd > profileStart ? profileEnd : undefined);
    expect(profileSource).toContain("const whatnotReference = getPublicWhatnotReference(profileRow?.connectedAccounts)");
    expect(profileSource).toContain("whatnotReference,");
  });

  it("adds Whatnot Reference to item-owner data and the item detail verification strip", () => {
    const dbSource = read("server/db.ts");
    const itemSource = read("client/src/pages/ItemDetail.tsx");
    expect(dbSource).toContain("whatnotReference: ownerWhatnotReference");
    expect(itemSource).toContain("listing.ownerProfile.whatnotReference");
    expect(itemSource).toContain("Whatnot Reference");
    expect(itemSource).toContain("Public Whatnot Reference");
  });

  it("keeps the refresh workflow protected and server-side", () => {
    const source = read("server/routers.ts");
    expect(source).toContain("refreshWhatnotReference: protectedProcedure");
    expect(source).toContain("refreshUserWhatnotReference(ctx.user.id, input.username)");
    expect(source).toContain("disconnectWhatnotReference: protectedProcedure");
    expect(source).toContain("getPublicWhatnotReference(profileRow?.connectedAccounts)");
  });
});
