import { describe, expect, it } from "vitest";
import { classifyApiFailure } from "./apiHealth";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const project = resolve(__dirname, "..");

describe("IPQS pending approval workflow", () => {
  it("classifies quota, rate-limit, authentication, timeout, and upstream failures without relying on raw provider payloads", () => {
    expect(classifyApiFailure({ statusCode: 429, message: "Too many requests" })).toBe("rate_limited");
    expect(classifyApiFailure({ statusCode: 401, message: "Invalid API key" })).toBe("authentication");
    expect(classifyApiFailure({ message: "Insufficient credit balance" })).toBe("quota_exhausted");
    expect(classifyApiFailure({ message: "request timed out" })).toBe("timeout");
    expect(classifyApiFailure({ statusCode: 503, message: "Service unavailable" })).toBe("upstream");
  });

  it("creates pending approval records only after an available under-one-year IPQS history result", () => {
    const source = readFileSync(resolve(project, "server/routers.ts"), "utf8");
    expect(source).toContain("const ipqsHistory = await getIpqsEmailHistory(input.email);");
    expect(source).toContain("ipqsHistory.available && ipqsHistory.underOneYear");
    expect(source).toContain("createPendingEmailHistoryApproval(userId, ipqsHistory.firstSeenAt)");
  });

  it("enforces pending approval before listing creation and active Trade Room initiation", () => {
    const routerSource = readFileSync(resolve(project, "server/routers.ts"), "utf8");
    const tradeSource = readFileSync(resolve(project, "server/tradeFlowRouter.ts"), "utf8");
    expect(routerSource).toContain("await requireMarketplaceApproval(ctx.user.id);");
    expect(tradeSource).toContain("await requireMarketplaceApproval(userId);");
    expect(tradeSource).toMatch(/sendTradeProposal:[\s\S]*?await requireMarketplaceApproval\(userId\)/);
  });

  it("keeps API Health display data free of secret-bearing fields", () => {
    const schemaSource = readFileSync(resolve(project, "drizzle/schema.ts"), "utf8");
    expect(schemaSource).toContain("export const apiHealthEvents");
    const eventTableStart = schemaSource.indexOf("export const apiHealthEvents");
    const eventTableEnd = schemaSource.indexOf("export const watchlistEntries", eventTableStart);
    const eventTable = schemaSource.slice(eventTableStart, eventTableEnd);
    expect(eventTable).not.toMatch(/apiKey|secret|token/i);
  });
});
