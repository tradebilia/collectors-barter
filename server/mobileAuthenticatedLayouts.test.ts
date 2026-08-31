import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("authenticated mobile-only responsive layout contracts", () => {
  it("keeps Inventory desktop cards while collapsing to one card per phone row", () => {
    const source = read("client/src/pages/Inventory.tsx");
    expect(source).toContain("grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6");
  });

  it("stacks Messages and Trade Hub on phones while preserving their desktop workspaces", () => {
    const messages = read("client/src/pages/Messages.tsx");
    const tradeHub = read("client/src/pages/TradeHub.tsx");
    expect(messages).toContain("grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr_1.2fr]");
    expect(tradeHub).toContain("grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-12");
    expect(tradeHub).toContain("lg:col-span-5");
  });

  it("stacks Trade Room panels until wide desktop space is available for the rail and eleven-column negotiation workspace", () => {
    const source = read("client/src/pages/WarRoom.tsx");
    expect(source).toContain("flex min-h-0 flex-1 flex-col overflow-visible xl:flex-row xl:items-stretch xl:overflow-hidden");
    expect(source).toContain("grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-11");
    expect(source).toContain("min-h-[34rem] w-full flex-shrink-0 flex-col p-4 xl:h-full xl:min-h-0 xl:w-[360px]");
    expect(source).toContain("overflow-x-auto pb-2 lg:pb-0");
  });

  it("keeps every Account Settings tab reachable on phones and arranged as a desktop grid", () => {
    const source = read("client/src/pages/AccountSettings.tsx");
    const tabsList = source.match(/<TabsList className="([^"]+)"/);
    const tabValues = [...source.matchAll(/<TabsTrigger[^>]*value="([^"]+)"/g)].map((match) => match[1]);

    expect(tabsList?.[1]).toContain("overflow-x-auto");
    expect(tabsList?.[1]).toContain("sm:grid");
    expect(tabsList?.[1]).toMatch(/sm:grid-cols-[5-9]/);
    expect(tabValues).toHaveLength(6);
    expect(new Set(tabValues)).toEqual(new Set(["profile", "membership", "security", "integrations", "communications", "preferences"]));
    expect(source).toContain("grid grid-cols-1 gap-4 sm:grid-cols-2");
    expect(source).toContain("grid grid-cols-1 gap-3 sm:grid-cols-2");
  });

  it("centers account-flow hero artwork with equal edge spacing at every breakpoint", () => {
    for (const page of ["AccountSetup.tsx", "AddInventory.tsx", "PublicProfile.tsx", "ReferralRequest.tsx"]) {
      const source = read(`client/src/pages/${page}`);
      expect(source).toContain("items-center justify-center");
      expect(source).not.toContain("-ml-32");
    }
    const publicProfile = read("client/src/pages/PublicProfile.tsx");
    expect(publicProfile).toContain("grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 sm:grid-cols-4");
    expect(publicProfile).toContain("relative z-10 mx-auto max-w-5xl px-4 pt-8 lg:px-8");
    expect(read("client/src/pages/AccountSetup.tsx")).toContain("grid grid-cols-1 gap-3 sm:grid-cols-3");
  });

  it("keeps the Report a Member hero centered at every breakpoint without injected offset styles", () => {
    const source = read("client/src/pages/ReportUser.tsx");
    expect(source).toContain("max-w-7xl items-center justify-center");
    expect(source).not.toContain("@media (max-width: 1023px)");
    expect(source).not.toContain("mobileHeroStyle.dataset.reportUserMobileHero");
    expect(source).not.toContain("-ml-32");
  });
});
