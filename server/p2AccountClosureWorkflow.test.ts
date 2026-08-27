import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getAccountClosureAudit } from "./accountClosure";

const root = process.cwd();
const schema = readFileSync(join(root, "drizzle/schema.ts"), "utf8");
const migration = readFileSync(join(root, "drizzle/0014_p2_account_closure_requests.sql"), "utf8");
const workflow = readFileSync(join(root, "server/accountClosure.ts"), "utf8");
const router = readFileSync(join(root, "server/routers.ts"), "utf8");
const customAuth = readFileSync(join(root, "server/_core/customAuth.ts"), "utf8");
const profile = readFileSync(join(root, "client/src/pages/AccountSettings.tsx"), "utf8");
const adminTab = readFileSync(join(root, "client/src/components/AccountClosureRequestsTab.tsx"), "utf8");
const policy = readFileSync(join(root, "client/src/pages/PrivacyPolicy.tsx"), "utf8");

describe("approved hybrid account-closure workflow", () => {
  it("uses additive closure state and request records without destructive migration statements", () => {
    expect(schema).toContain("isAccountClosed");
    expect(schema).toContain("accountClosedAt");
    expect(schema).toContain('export const accountClosureRequests');
    expect(schema).toContain('uniqueIndex("accountClosureRequests_activeRequestKey_unique")');
    expect(migration).toContain("ALTER TABLE `users` ADD COLUMN `isAccountClosed`");
    expect(migration).toContain("CREATE TABLE `accountClosureRequests`");
    expect(migration).not.toMatch(/\bDELETE\b|\bDROP\b|\bUPDATE\s+users\b/i);
  });

  it("guards immediate closure on every approved trade, safety, moderation, and account-review blocker", () => {
    expect(workflow).toContain("'pending', 'negotiating', 'accepted', 'shipping', 'shipped', 'frozen', 'disputed'");
    expect(workflow).toContain("tradeComplaints tc");
    expect(workflow).toContain("userReports ur");
    expect(workflow).toContain("supportTickets st");
    expect(workflow).toContain("accountApprovalReviews ar");
    expect(workflow).toContain("tp.status = 'completed'");
    expect(workflow).toContain("membershipStatus");
    expect(workflow).toContain("u.isSuspended = 0");
    expect(workflow).toContain("u.isBanned = 0");
    expect(workflow).toContain("u.role <> 'admin'");
  });

  it("classifies a clean account as eligible and routes only actual blockers to review", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce([[{
        userId: 42,
        isAccountClosed: 0,
        isAdministrator: 0,
        isSuspended: 0,
        isBanned: 0,
        activeTrades: 0,
        completedTrades: 4,
        unresolvedTradeComplaints: 0,
        unresolvedReports: 0,
        openSupportTickets: 0,
        pendingApprovalReviews: 0,
        activeListings: 3,
        membershipStatus: "free_launch",
        billingTerm: "none",
        priorRequests: 0,
      }]])
      .mockResolvedValueOnce([[{
        userId: 42,
        isAccountClosed: 0,
        isAdministrator: 0,
        isSuspended: 0,
        isBanned: 0,
        activeTrades: 1,
        completedTrades: 4,
        unresolvedTradeComplaints: 0,
        unresolvedReports: 1,
        openSupportTickets: 0,
        pendingApprovalReviews: 0,
        activeListings: 0,
        membershipStatus: "free_launch",
        billingTerm: "none",
        priorRequests: 0,
      }]]);
    const db = { execute } as any;

    await expect(getAccountClosureAudit(db, 42)).resolves.toMatchObject({ blockers: [], activeListings: 3, completedTrades: 4, membershipStatus: "free_launch" });
    await expect(getAccountClosureAudit(db, 42)).resolves.toMatchObject({
      activeTrades: 1,
      unresolvedReports: 1,
      blockers: ["1 active or unresolved trade.", "1 unresolved member report."],
    });
  });

  it("closes only through a conditional state change and preserves trade/report evidence", () => {
    expect(workflow).toContain("SET u.isAccountClosed = 1");
    expect(workflow).toContain("set({ isActive: 0 })");
    expect(workflow).toContain("set({ showProfile: 0, receiveContactRequests: 0 })");
    expect(workflow).not.toMatch(/\.delete\(|\bDELETE\s+FROM\s+(users|listings|tradeProposals|tradeMessages|userReports)/i);
    expect(workflow).toContain("activeRequestKey");
    expect(workflow).toContain("ER_DUP_ENTRY");
    expect(workflow).toContain("if (currentAudit.isAccountClosed)");
  });

  it("requires a protected member request and an administrator-only audited decision", () => {
    expect(router).toContain("accountClosure: router({");
    expect(router).toContain("getMyRequest: protectedProcedure");
    expect(router).toContain("request: protectedProcedure");
    expect(router).toContain("adminList: protectedProcedure");
    expect(router).toContain("adminAudit: protectedProcedure");
    expect(router).toContain("adminReview: protectedProcedure");
    expect(router).toContain('decision: z.enum(["approve_close", "decline"])');
    expect(router).toContain("adminNote: z.string().trim().min(1).max(2000)");
  });

  it("prevents both existing and newly created sessions for a closed account", () => {
    expect(customAuth).toContain("Cannot create a session for a closed account");
    expect(customAuth).toContain("if ((user as any).isAccountClosed === 1) return null;");
    expect(router).toContain("This account has been closed. Please contact Tradebilia support");
    expect(router).toContain("logout: publicProcedure.mutation");
  });

  it("shows transparent member closure status, a count-only administrator audit, and truthful retention language", () => {
    expect(profile).toContain("Request Account Closure");
    expect(profile).toContain("Eligible accounts close immediately");
    expect(profile).toContain("Trade and safety records are not erased");
    expect(adminTab).toContain("Account Closure Requests");
    expect(adminTab).toContain("This view intentionally shows counts and workflow status only");
    expect(adminTab).toContain("Approve & close");
    expect(policy).toContain("Account closure is a reviewed process");
    expect(policy).toContain("Request Account Closure");
    expect(policy).not.toContain("removed from our systems within 30 days");
  });
});
