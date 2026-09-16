import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Whatnot Reference surfaces", () => {
  it("uses a separate aggregate-only settings section", () => {
    const source = read("client/src/pages/AccountSettings.tsx");
    expect(source).toContain("Whatnot Reference");
    expect(source).toContain("trpc.market.refreshWhatnotReference.useMutation");
    expect(source).toContain("Aggregate reputation only");
    expect(source).toContain("Individual reviews, reviewer identities, email, listings, and pricing are not imported.");
    expect(source).not.toContain("WhatnotConnection");
  });

  it("adds Whatnot Reference to the public trust sidebar without calling it verified", () => {
    const source = read("client/src/pages/PublicProfile.tsx");
    expect(source).toContain("user.whatnotReference");
    expect(source).toContain("Whatnot Reference");
    expect(source).toContain("Public data");
    expect(source).toContain("does not verify account ownership");
  });

  it("keeps the refresh workflow protected and server-side", () => {
    const source = read("server/routers.ts");
    expect(source).toContain("refreshWhatnotReference: protectedProcedure");
    expect(source).toContain("refreshUserWhatnotReference(ctx.user.id, input.username)");
    expect(source).toContain("disconnectWhatnotReference: protectedProcedure");
    expect(source).toContain("getPublicWhatnotReference(profileRow?.connectedAccounts)");
  });
});
