import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const operationsSource = readFileSync(resolve(root, "client/src/components/AdminOperationsTab.tsx"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");

describe("admin Operations support-ticket summary", () => {
  it("exposes support-ticket counts and recent activity from the Operations snapshot", () => {
    expect(routerSource).toContain("ensureSupportTicketsTable();");
    expect(routerSource).toContain("openSupportTickets");
    expect(routerSource).toContain("totalSupportTickets");
    expect(routerSource).toContain("recentSupportRows");
    expect(routerSource).toContain("submitterDisplayName");
    expect(routerSource).toContain("label: 'Support tickets'");
  });

  it("renders a consolidated Support Activity section and routes to Tickets", () => {
    expect(operationsSource).toContain("Support Activity");
    expect(operationsSource).toContain("Open or in progress");
    expect(operationsSource).toContain("All support tickets");
    expect(operationsSource).toContain("snapshot.supportTickets.recent");
    expect(operationsSource).toContain("Open Tickets workspace");
    expect(operationsSource).toContain('onNavigate("tickets")');
  });
});

