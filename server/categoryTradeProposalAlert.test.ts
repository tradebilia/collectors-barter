import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

const read = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("category-page trade proposal flow", () => {
  it("uses white requested-listing and personalized-message fields", () => {
    const source = read("client/src/pages/CategoryPage.tsx");
    expect(source).toContain("trpc.tradeFlow.initiateTradeProposal.useMutation");
    expect(source).not.toContain("trpc.market.createTradeProposal.useMutation");
    expect(source).toContain('<Input value={listing.title} readOnly className="bg-white text-slate-900 border-slate-200" />');
    expect(source).toContain('className="bg-white text-slate-900 border-slate-200"');
  });

  it("creates a recipient trade alert from the legacy category proposal helper", () => {
    const source = read("server/db.ts");
    const helper = source.slice(source.indexOf("export async function createTradeProposal"), source.indexOf("export async function selectTradeProposalItems"));
    expect(helper).toContain("INSERT INTO tradeAlerts");
    expect(helper).toContain("recipientUserId");
    expect(helper).toContain("'initiated'");
    expect(helper).toContain("isRead");
  });
});

