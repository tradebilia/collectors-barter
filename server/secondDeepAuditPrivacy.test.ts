import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("second deep-audit privacy repairs", () => {
  it("keeps full location server-only and filters hidden profiles from discovery", () => {
    const source = read("server/db.ts");
    const searchStart = source.indexOf("export async function searchMembers");
    const searchEnd = source.indexOf("export async function toggleListingStatus", searchStart);
    const searchBlock = source.slice(searchStart, searchEnd);

    expect(searchBlock).toContain("eq(userProfiles.showProfile, 1)");
    expect(searchBlock).toContain("members: orderedMembers.map(({ privateLocation, ...member }) => member)");
    expect(searchBlock).toContain("m.hideInventoryValue === 1 ? null");
    expect(searchBlock).toContain("member.activeListingValue === null");
  });

  it("protects hidden profiles and masks hidden values outside owner/admin access", () => {
    const source = read("server/routers.ts");
    const start = source.indexOf("getUserProfile: publicProcedure");
    const end = source.indexOf("search: publicProcedure", start);
    const block = source.slice(start, end);

    expect(block).toContain("profileRow?.showProfile === 0 && !viewerMayBypassProfilePrivacy");
    expect(block).toContain("shouldHideInventoryValue");
    expect(block).toContain("estimatedValue: null");
  });

  it("honors a recipient contact-request opt-out before creating a thread or inquiry", () => {
    const source = read("server/routers.ts");
    expect(source).toContain("This collector is not accepting contact requests.");
    expect(source.match(/receiveContactRequests: userProfiles\.receiveContactRequests/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
