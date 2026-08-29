import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (page: string) => readFileSync(resolve(root, `client/src/pages/${page}`), "utf8");

const centeredHeroPages = [
  "AccountSettings.tsx",
  "AccountSetup.tsx",
  "AddInventory.tsx",
  "Contact.tsx",
  "ForumTopic.tsx",
  "Inventory.tsx",
  "ItemDetail.tsx",
  "Profile.tsx",
  "PublicProfile.tsx",
  "ReferralRequest.tsx",
  "ReportUser.tsx",
  "TradeShowcase.tsx",
  "TradeVoting.tsx",
  "VerifiedMerchants.tsx",
  "Watchlist.tsx",
] as const;

describe("non-marketplace hero title alignment", () => {
  it("uses a centered flex title wrapper without the legacy negative margin", () => {
    for (const page of centeredHeroPages) {
      const source = read(page);
      expect(source, page).toContain("items-center justify-center");
      expect(source, page).not.toContain("-ml-32");
    }
  });

  it("keeps the homepage’s measured lockup treatment as the centering reference", () => {
    expect(read("Home.tsx")).toContain("-translate-x-[6.5%]");
  });
});
