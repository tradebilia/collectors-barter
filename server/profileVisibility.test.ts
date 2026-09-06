import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const settingsSource = readFileSync(resolve(process.cwd(), "client/src/pages/AccountSettings.tsx"), "utf8");

describe("member-only profile visibility", () => {
  it("filters hidden profiles from anonymous member-directory discovery", () => {
    expect(dbSource).toContain("if (!viewer) {");
    expect(dbSource).toContain("whereClauses.push(eq(userProfiles.showProfile, 1));");
    expect(dbSource).toContain("Hidden profiles are private from non-members but remain discoverable to signed-in Tradebilia members.");
  });

  it("allows signed-in members to access hidden profiles through the profile query", () => {
    expect(routerSource).toContain("const viewerIsSignedIn = Boolean(ctx.user);");
    expect(routerSource).toContain("const viewerMayAccessHiddenProfile = viewerIsSignedIn || viewerMayBypassProfilePrivacy;");
    expect(routerSource).toContain('if (profileRow?.showProfile === 0 && !viewerMayAccessHiddenProfile)');
  });

  it("explains the privacy behavior beside the public-profile switch", () => {
    expect(settingsSource).toContain("Public Profile");
    expect(settingsSource).toContain("signed-in Tradebilia members can still view your profile");
    expect(settingsSource).toContain("non-members and public discovery cannot");
  });
});

