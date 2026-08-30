import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const dashboardPath = path.resolve(import.meta.dirname, "../client/src/pages/AdminDashboard.tsx");
const tradeRoomPath = path.resolve(import.meta.dirname, "../client/src/pages/WarRoom.tsx");
const routerPath = path.resolve(import.meta.dirname, "tradeFlowRouter.ts");

async function readSources() {
  return Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(tradeRoomPath, "utf8"),
    readFile(routerPath, "utf8"),
  ]);
}

describe("Admin Trades read-only Trade Room inspection", () => {
  it("routes the Admin Trades action to the explicit administrator Trade Room view", async () => {
    const [dashboardSource, tradeRoomSource] = await readSources();
    expect(dashboardSource).toContain("navigate(`/trade-room/${trade.id}?adminView=1`)");
    expect(dashboardSource).toContain("Trade Room</Button>");
    expect(tradeRoomSource).toContain("adminViewRequested");
    expect(tradeRoomSource).toContain("AdminReadOnlyTradeRoom");
    expect(tradeRoomSource).toContain("Back to Admin Trades");
    expect(tradeRoomSource).toContain("{ proposalId, adminView: adminViewRequested }");
  });

  it("allows only an authenticated administrator to use the read-only query flag", async () => {
    const [, tradeRoomSource, routerSource] = await readSources();
    expect(routerSource).toContain("ctx.user.role === 'admin'");
    expect(routerSource).toContain("getTradeDetails: protectedProcedure");
    expect(routerSource).toContain("getTimeline: protectedProcedure");
    expect(routerSource).toContain("getMessages: protectedProcedure");
    expect(routerSource).toContain("requesterUser");
    expect(tradeRoomSource).toContain("trade actions, messages, payments, and edits are disabled");
  });

  it("keeps participant mutations behind the normal participant authorization path", async () => {
    const [, tradeRoomSource, routerSource] = await readSources();
    expect(routerSource).toContain("sendMessage: protectedProcedure");
    expect(routerSource).toContain("proceedToShipping: protectedProcedure");
    expect(routerSource).toContain("if (proposal.recipientId !== userId && proposal.requesterId !== userId)");
    expect(tradeRoomSource).toContain("enabled: proposalId > 0 && !adminViewRequested");
  });
});
