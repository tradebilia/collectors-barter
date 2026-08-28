import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const router = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const closureWorkflow = readFileSync(resolve(root, "server/accountClosure.ts"), "utf8");
const dashboard = readFileSync(resolve(root, "client/src/pages/AdminDashboard.tsx"), "utf8");
const operations = readFileSync(resolve(root, "client/src/components/AdminOperationsTab.tsx"), "utf8");

function procedure(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  if (startIndex < 0 || endIndex < 0) throw new Error(`Procedure boundary not found: ${start}`);
  return source.slice(startIndex, endIndex);
}

describe("administrator retained-record removal safeguards", () => {
  it("retires direct user, trade, and ticket deletion procedures instead of executing destructive statements", () => {
    const userDelete = procedure(router, "deleteUser: protectedProcedure", "archiveUser: protectedProcedure");
    const ticketDelete = procedure(router, "deleteTicket: protectedProcedure", "archiveTicket: protectedProcedure");
    const tradeDelete = procedure(router, "deleteTrade: protectedProcedure", "archiveTrade: protectedProcedure");
    for (const legacyProcedure of [userDelete, ticketDelete, tradeDelete]) {
      expect(legacyProcedure).toContain("Permanent");
      expect(legacyProcedure).toContain("disabled");
      expect(legacyProcedure).not.toMatch(/\bDELETE\s+FROM|\.delete\(/i);
    }
  });

  it("archives a member only through established closure safeguards, a reason, an exact phrase, and an administrator activity entry", () => {
    const archiveUser = procedure(router, "archiveUser: protectedProcedure", "updateUserRole: protectedProcedure");
    expect(archiveUser).toContain('z.literal(ADMIN_ARCHIVE_MEMBER_PHRASE)');
    expect(archiveUser).toContain("getAccountClosureAudit");
    expect(archiveUser).toContain("audit.blockers.length > 0");
    expect(archiveUser).toContain("closeEligibleAccount");
    expect(archiveUser).toContain("member_account_archived");
    expect(archiveUser).not.toMatch(/\bDELETE\s+FROM|\.delete\(/i);
    expect(closureWorkflow).toContain("export async function closeEligibleAccount");
    expect(closureWorkflow).toContain("SET u.isAccountClosed = 1");
  });

  it("closes and retains tickets and archives only finished trades with exact confirmation phrases and audit entries", () => {
    const archiveTicket = procedure(router, "archiveTicket: protectedProcedure", "// Flagged Content");
    const archiveTrade = procedure(router, "archiveTrade: protectedProcedure", "// Get moderation audit log");
    expect(archiveTicket).toContain('z.literal(ADMIN_CLOSE_TICKET_PHRASE)');
    expect(archiveTicket).toContain("UPDATE supportTickets SET status = 'closed'");
    expect(archiveTicket).toContain("support_ticket_closed_retained");
    expect(archiveTicket).not.toMatch(/\bDELETE\s+FROM|\.delete\(/i);
    expect(archiveTrade).toContain('z.literal(ADMIN_ARCHIVE_TRADE_PHRASE)');
    expect(archiveTrade).toContain("['completed', 'declined', 'cancelled']");
    expect(archiveTrade).toContain("trade_record_archived");
    expect(archiveTrade).not.toMatch(/\bDELETE\s+FROM|\.delete\(/i);
  });

  it("keeps archive visibility and high-friction UI confirmation in the administrator dashboard", () => {
    expect(dashboard).toContain("Archive Member Account");
    expect(dashboard).toContain("ARCHIVE MEMBER ACCOUNT");
    expect(dashboard).toContain("Archive Trade Record?");
    expect(dashboard).toContain("ARCHIVE TRADE RECORD");
    expect(dashboard).toContain("Close & Retain Ticket");
    expect(dashboard).toContain("CLOSE AND RETAIN TICKET");
    expect(dashboard).toContain("Show archived records");
    expect(dashboard).toContain("Show retained tickets");
    expect(dashboard).not.toContain("Yes, Delete Trade");
    expect(dashboard).not.toContain("Delete User Account");
  });

  it("adds the pending Closure Requests count as a read-only Operations link", () => {
    expect(router).toContain("pendingClosureRequests");
    expect(router).toContain("FROM accountClosureRequests WHERE status = 'pending_review'");
    expect(router).toContain("label: 'Closure requests'");
    expect(router).toContain("tab: 'account-closures'");
    expect(operations).toContain('"account-closures"');
    expect(operations).toContain("Counts link to the existing administrator workspaces");
  });
});
