import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const profileSource = readFileSync(join(projectRoot, "client", "src", "pages", "PublicProfile.tsx"), "utf8");
const routerSource = readFileSync(join(projectRoot, "server", "routers.ts"), "utf8");

describe("public external account connection dates", () => {
  it("projects the existing connected timestamps for every public external account card", () => {
    const profileQuery = routerSource.slice(routerSource.indexOf("getUserProfile:"), routerSource.indexOf("getUserListings:"));
    expect(profileQuery).toContain("u.ebayConnectedAt");
    expect(profileQuery).toContain("u.facebookConnectedAt");
    expect(profileQuery).toContain("u.linkedinConnectedAt");
  });

  it("renders valid connection dates consistently without exposing a missing or malformed timestamp", () => {
    expect(profileSource).toContain("function ConnectionDate");
    expect(profileSource).toContain("Number.isNaN(date.getTime())");
    expect(profileSource).toContain('<ConnectionDate connectedAt={user.ebayConnectedAt} />');
    expect(profileSource).toContain('<ConnectionDate connectedAt={user.facebookConnectedAt} />');
    expect(profileSource).toContain('<ConnectionDate connectedAt={user.linkedinConnectedAt} />');
    expect(profileSource).toContain('month: "short", day: "numeric", year: "numeric"');
  });
});
