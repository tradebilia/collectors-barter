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

  it("stacks Trade Room panels and retains the desktop rail and eleven-column negotiation workspace", () => {
    const source = read("client/src/pages/WarRoom.tsx");
    expect(source).toContain("flex min-h-0 flex-1 flex-col overflow-visible lg:flex-row lg:overflow-hidden");
    expect(source).toContain("grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-11");
    expect(source).toContain("min-h-[34rem] w-full flex-shrink-0 flex-col p-4 lg:min-h-0 lg:w-[360px]");
    expect(source).toContain("overflow-x-auto pb-2 lg:pb-0");
  });

  it("keeps account settings tabs horizontally usable on phones and five-column on larger screens", () => {
    const source = read("client/src/pages/AccountSettings.tsx");
    expect(source).toContain("overflow-x-auto rounded-lg bg-slate-200 p-1 sm:grid sm:grid-cols-5");
    expect(source).toContain("grid grid-cols-1 gap-4 sm:grid-cols-2");
    expect(source).toContain("grid grid-cols-1 gap-3 sm:grid-cols-2");
  });

  it("centers account-flow hero artwork on phones while preserving the desktop offset", () => {
    for (const page of ["AccountSetup.tsx", "AddInventory.tsx", "PublicProfile.tsx", "ReferralRequest.tsx"]) {
      expect(read(`client/src/pages/${page}`)).toContain("lg:-ml-32");
    }
    expect(read("client/src/pages/PublicProfile.tsx")).toContain("grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 sm:grid-cols-4");
    expect(read("client/src/pages/AccountSetup.tsx")).toContain("grid grid-cols-1 gap-3 sm:grid-cols-3");
  });

  it("applies the Report a Member hero correction only below the desktop breakpoint", () => {
    const source = read("client/src/pages/ReportUser.tsx");
    expect(source).toContain("@media (max-width: 1023px)");
    expect(source).toContain("mobileHeroStyle.dataset.reportUserMobileHero");
    expect(source).toContain("items-center justify-center -ml-32");
  });
});
