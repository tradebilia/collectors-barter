import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (page: string) => readFileSync(resolve(root, `client/src/pages/${page}`), "utf8");
const readPath = (path: string) => readFileSync(resolve(root, path), "utf8");

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

const mobileReferenceTitleSources = [
  "client/src/pages/AccountSettings.tsx",
  "client/src/pages/AccountSetup.tsx",
  "client/src/pages/AddInventory.tsx",
  "client/src/pages/Contact.tsx",
  "client/src/pages/Conventions.tsx",
  "client/src/pages/Forum.tsx",
  "client/src/pages/ForumTopic.tsx",
  "client/src/pages/Inventory.tsx",
  "client/src/pages/MemberSearch.tsx",
  "client/src/pages/Messages.tsx",
  "client/src/pages/Profile.tsx",
  "client/src/pages/PublicProfile.tsx",
  "client/src/pages/ReferralRequest.tsx",
  "client/src/pages/ReportUser.tsx",
  "client/src/pages/TradeHub.tsx",
  "client/src/pages/TradeShowcase.tsx",
  "client/src/pages/TradeVoting.tsx",
  "client/src/pages/VerifiedMerchants.tsx",
  "client/src/pages/Watchlist.tsx",
  "client/src/components/RankingPageHero.tsx",
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

  it("applies the same mobile-only title frame to every standard page-title hero", () => {
    const styles = readPath("client/src/index.css");
    expect(styles).toContain("@media (max-width: 639px)");
    expect(styles).toContain(".mobile-hero-title-reference");
    expect(styles).toContain("width: calc(131% - 2rem) !important");
    expect(styles).toContain("transform: translateX(-4.3%) !important");

    for (const sourcePath of mobileReferenceTitleSources) {
      expect(readPath(sourcePath), sourcePath).toContain("mobile-hero-title-reference");
    }
  });
});
