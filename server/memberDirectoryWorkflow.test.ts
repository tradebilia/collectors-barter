import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dbSource = readFileSync(join(process.cwd(), "server", "db.ts"), "utf8");
const directorySource = readFileSync(join(process.cwd(), "client", "src", "pages", "MemberSearch.tsx"), "utf8");

describe("Member Directory workflow", () => {
  it("uses town/state rather than private street address for public location filtering", () => {
    const searchMembersSource = dbSource.slice(dbSource.indexOf("export async function searchMembers"), dbSource.indexOf("export async function toggleListingStatus"));
    expect(searchMembersSource).toContain("userProfiles.contactState");
    expect(searchMembersSource).not.toContain("userProfiles.contactAddress");
  });

  it("uses persisted direct-message and public-profile actions rather than local browser threads", () => {
    expect(directorySource).toContain("trpc.members.startDirectMessageThread.useMutation");
    expect(directorySource).toContain("/profile/${member.userId}");
    expect(directorySource).not.toContain("ensureDirectThread");
    expect(directorySource).not.toContain("loadPresenceMap");
  });
});
