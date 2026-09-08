import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("public-profile member action access", () => {
  it("shows member actions only to signed-in visitors viewing another member profile", () => {
    const source = read("client/src/pages/PublicProfile.tsx");

    expect(source).toContain("const isOwnProfile = currentUser?.id === user.id;");
    expect(source).toContain("const canUseMemberActions = Boolean(currentUser) && !isOwnProfile;");
    expect(source).toContain("{canUseMemberActions ? (");
    expect(source).toContain("onClick={() => setComposeOpen(true)}");
    expect(source).toContain("{composeOpen && currentUser && profileData && (");
    expect(source).toContain("Sign in to connect");
    expect(source).toContain("onClick={startLogin}");
  });

  it("keeps direct messaging and trade proposals server-protected", () => {
    const source = read("server/routers.ts");

    expect(source).toContain("sendDirectMessage: protectedProcedure");
    expect(source).toContain("createTradeProposal: protectedProcedure");
  });

  it("uses sign-in entry actions rather than message or trade dialogs for visitors on profile-linked listings", () => {
    const source = read("client/src/pages/ItemDetail.tsx");

    expect(source).toContain("const startMessageOwner = () => {");
    expect(source).toContain("Sign in to trade");
    expect(source).toContain("Sign in to message");
    expect(source).toContain("{listing && isAuthenticated && isEmailModalOpen && (");
  });
});
