import { and, desc, eq, sql } from "drizzle-orm";
import { accountApprovalReviews, accountClosureRequests, listings, userProfiles, users } from "../drizzle/schema";

const ACTIVE_TRADE_STATUSES = ["pending", "negotiating", "accepted", "shipping", "shipped", "frozen", "disputed"] as const;
const ACTIVE_REQUEST_PREFIX = "account-closure:";

type DatabaseHandle = any;

type AccountClosureAudit = {
  userId: number;
  isAccountClosed: boolean;
  isAdministrator: boolean;
  isSuspended: boolean;
  isBanned: boolean;
  activeTrades: number;
  completedTrades: number;
  unresolvedTradeComplaints: number;
  unresolvedReports: number;
  openSupportTickets: number;
  pendingApprovalReviews: number;
  activeListings: number;
  membershipStatus: string;
  billingTerm: string;
  priorRequests: number;
  blockers: string[];
};

function nowForMysql() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function numeric(value: unknown) {
  return Number(value ?? 0);
}

function firstRow(result: unknown) {
  if (Array.isArray(result)) return result[0] ?? {};
  return result ?? {};
}

function hasAffectedRow(result: unknown) {
  const header = Array.isArray(result) ? result[0] : result;
  return numeric((header as any)?.affectedRows ?? (header as any)?.rowsAffected) > 0;
}

function activeRequestKey(userId: number) {
  return `${ACTIVE_REQUEST_PREFIX}${userId}`;
}

function buildBlockers(metrics: Omit<AccountClosureAudit, "blockers">) {
  const blockers: string[] = [];
  if (metrics.isAdministrator) blockers.push("Administrator accounts require a separate ownership and access review.");
  if (metrics.isAccountClosed) blockers.push("This account is already closed.");
  if (metrics.isSuspended) blockers.push("This account has an active suspension.");
  if (metrics.isBanned) blockers.push("This account has an active ban.");
  if (metrics.activeTrades > 0) blockers.push(`${metrics.activeTrades} active or unresolved trade${metrics.activeTrades === 1 ? "" : "s"}.`);
  if (metrics.unresolvedTradeComplaints > 0) blockers.push(`${metrics.unresolvedTradeComplaints} unresolved trade complaint${metrics.unresolvedTradeComplaints === 1 ? "" : "s"}.`);
  if (metrics.unresolvedReports > 0) blockers.push(`${metrics.unresolvedReports} unresolved member report${metrics.unresolvedReports === 1 ? "" : "s"}.`);
  if (metrics.openSupportTickets > 0) blockers.push(`${metrics.openSupportTickets} open support ticket${metrics.openSupportTickets === 1 ? "" : "s"}.`);
  if (metrics.pendingApprovalReviews > 0) blockers.push(`${metrics.pendingApprovalReviews} pending account review${metrics.pendingApprovalReviews === 1 ? "" : "s"}.`);
  return blockers;
}

export async function getAccountClosureAudit(db: DatabaseHandle, userId: number): Promise<AccountClosureAudit> {
  const [rows] = await db.execute(sql`
    SELECT
      u.id AS userId,
      u.isAccountClosed AS isAccountClosed,
      u.role = 'admin' AS isAdministrator,
      u.isSuspended AS isSuspended,
      u.isBanned AS isBanned,
      (SELECT COUNT(*) FROM tradeProposals tp
        WHERE (tp.requesterId = ${userId} OR tp.recipientId = ${userId})
          AND tp.status IN ('pending', 'negotiating', 'accepted', 'shipping', 'shipped', 'frozen', 'disputed')) AS activeTrades,
      (SELECT COUNT(*) FROM tradeProposals tp
        WHERE (tp.requesterId = ${userId} OR tp.recipientId = ${userId})
          AND tp.status = 'completed') AS completedTrades,
      (SELECT COUNT(*) FROM tradeComplaints tc
        INNER JOIN tradeProposals tp ON tp.id = tc.proposalId
        WHERE tc.status = 'filed'
          AND (tp.requesterId = ${userId} OR tp.recipientId = ${userId})) AS unresolvedTradeComplaints,
      (SELECT COUNT(*) FROM userReports ur
        WHERE ur.status = 'pending'
          AND (ur.reportedUserId = ${userId} OR ur.reporterUserId = ${userId})) AS unresolvedReports,
      (SELECT COUNT(*) FROM supportTickets st
        WHERE st.userId = ${userId} AND st.status IN ('open', 'in_progress')) AS openSupportTickets,
      (SELECT COUNT(*) FROM accountApprovalReviews ar
        WHERE ar.userId = ${userId} AND ar.status = 'pending') AS pendingApprovalReviews,
      (SELECT COUNT(*) FROM listings l
        WHERE l.ownerId = ${userId} AND l.status = 'active' AND l.isActive = 1) AS activeListings,
      (SELECT COALESCE(um.status, 'free_launch') FROM userMemberships um WHERE um.userId = ${userId} LIMIT 1) AS membershipStatus,
      (SELECT COALESCE(um.billingTerm, 'none') FROM userMemberships um WHERE um.userId = ${userId} LIMIT 1) AS billingTerm,
      (SELECT COUNT(*) FROM accountClosureRequests acr
        WHERE acr.userId = ${userId}) AS priorRequests
    FROM users u
    WHERE u.id = ${userId}
    LIMIT 1
  `);
  const row = firstRow(rows) as Record<string, unknown>;
  if (!row.userId) throw new Error("Account not found.");

  const metrics = {
    userId: numeric(row.userId),
    isAccountClosed: numeric(row.isAccountClosed) === 1,
    isAdministrator: numeric(row.isAdministrator) === 1,
    isSuspended: numeric(row.isSuspended) === 1,
    isBanned: numeric(row.isBanned) === 1,
    activeTrades: numeric(row.activeTrades),
    completedTrades: numeric(row.completedTrades),
    unresolvedTradeComplaints: numeric(row.unresolvedTradeComplaints),
    unresolvedReports: numeric(row.unresolvedReports),
    openSupportTickets: numeric(row.openSupportTickets),
    pendingApprovalReviews: numeric(row.pendingApprovalReviews),
    activeListings: numeric(row.activeListings),
    membershipStatus: String(row.membershipStatus ?? "free_launch"),
    billingTerm: String(row.billingTerm ?? "none"),
    priorRequests: numeric(row.priorRequests),
  };

  return { ...metrics, blockers: buildBlockers(metrics) };
}

export async function closeEligibleAccount(db: DatabaseHandle, userId: number) {
  const closedAt = nowForMysql();
  const [result] = await db.execute(sql`
    UPDATE users u
    SET u.isAccountClosed = 1, u.accountClosedAt = ${closedAt}
    WHERE u.id = ${userId}
      AND u.isAccountClosed = 0
      AND u.role <> 'admin'
      AND u.isSuspended = 0
      AND u.isBanned = 0
      AND NOT EXISTS (
        SELECT 1 FROM tradeProposals tp
        WHERE (tp.requesterId = u.id OR tp.recipientId = u.id)
          AND tp.status IN ('pending', 'negotiating', 'accepted', 'shipping', 'shipped', 'frozen', 'disputed')
      )
      AND NOT EXISTS (
        SELECT 1 FROM tradeComplaints tc
        INNER JOIN tradeProposals tp ON tp.id = tc.proposalId
        WHERE tc.status = 'filed' AND (tp.requesterId = u.id OR tp.recipientId = u.id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM userReports ur
        WHERE ur.status = 'pending' AND (ur.reportedUserId = u.id OR ur.reporterUserId = u.id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM supportTickets st
        WHERE st.userId = u.id AND st.status IN ('open', 'in_progress')
      )
      AND NOT EXISTS (
        SELECT 1 FROM accountApprovalReviews ar
        WHERE ar.userId = u.id AND ar.status = 'pending'
      )
  `);
  if (!hasAffectedRow(result)) return false;

  await db.update(listings).set({ isActive: 0 }).where(and(eq(listings.ownerId, userId), eq(listings.isActive, 1)));
  await db.update(userProfiles).set({ showProfile: 0, receiveContactRequests: 0 }).where(eq(userProfiles.userId, userId));
  return true;
}

function serializeBlockers(audit: AccountClosureAudit) {
  return JSON.stringify({
    activeTrades: audit.activeTrades,
    completedTrades: audit.completedTrades,
    unresolvedTradeComplaints: audit.unresolvedTradeComplaints,
    unresolvedReports: audit.unresolvedReports,
    openSupportTickets: audit.openSupportTickets,
    pendingApprovalReviews: audit.pendingApprovalReviews,
    activeListings: audit.activeListings,
    membershipStatus: audit.membershipStatus,
    billingTerm: audit.billingTerm,
    blockers: audit.blockers,
  });
}

export async function getMyAccountClosureRequest(db: DatabaseHandle, userId: number) {
  const [request] = await db.select().from(accountClosureRequests)
    .where(eq(accountClosureRequests.userId, userId))
    .orderBy(desc(accountClosureRequests.requestedAt))
    .limit(1);
  return request ?? null;
}

export async function requestAccountClosure(db: DatabaseHandle, userId: number, memberNote?: string) {
  try {
    return await db.transaction(async (tx: DatabaseHandle) => {
      const existing = await tx.select({ id: accountClosureRequests.id, status: accountClosureRequests.status })
        .from(accountClosureRequests)
        .where(eq(accountClosureRequests.activeRequestKey, activeRequestKey(userId)))
        .limit(1);
      if (existing[0]) return { status: existing[0].status, requestId: existing[0].id, alreadyRequested: true };

      const audit = await getAccountClosureAudit(tx, userId);
      if (audit.isAccountClosed) return { status: "closed" as const, requestId: null, alreadyRequested: true };

      const now = nowForMysql();
      const isBlocked = audit.blockers.length > 0;
      const insert = await tx.insert(accountClosureRequests).values({
        userId,
        status: isBlocked ? "pending_review" : "closed",
        activeRequestKey: isBlocked ? activeRequestKey(userId) : null,
        memberNote: memberNote || null,
        blockerSummary: serializeBlockers(audit),
        requestedAt: now,
        reviewedAt: isBlocked ? null : now,
        closedAt: isBlocked ? null : now,
      });
      const requestId = numeric((insert as any)?.[0]?.insertId ?? (insert as any)?.insertId);

      if (isBlocked) return { status: "pending_review" as const, requestId, blockers: audit.blockers };

      const closed = await closeEligibleAccount(tx, userId);
      if (!closed) {
        const currentAudit = await getAccountClosureAudit(tx, userId);
        if (currentAudit.isAccountClosed) {
          await tx.update(accountClosureRequests).set({
            status: "closed",
            activeRequestKey: null,
            blockerSummary: serializeBlockers(currentAudit),
            reviewedAt: now,
            closedAt: now,
          }).where(eq(accountClosureRequests.id, requestId));
          return { status: "closed" as const, requestId, alreadyRequested: true, blockers: [] as string[] };
        }
        await tx.update(accountClosureRequests).set({
          status: "pending_review",
          activeRequestKey: activeRequestKey(userId),
          blockerSummary: serializeBlockers(currentAudit),
          reviewedAt: null,
          closedAt: null,
        }).where(eq(accountClosureRequests.id, requestId));
        return { status: "pending_review" as const, requestId, blockers: currentAudit.blockers };
      }

      return { status: "closed" as const, requestId, blockers: [] as string[] };
    });
  } catch (error: any) {
    if (error?.code !== "ER_DUP_ENTRY") throw error;
    const existing = await db.select({ id: accountClosureRequests.id, status: accountClosureRequests.status })
      .from(accountClosureRequests)
      .where(eq(accountClosureRequests.activeRequestKey, activeRequestKey(userId)))
      .limit(1);
    if (!existing[0]) throw error;
    return { status: existing[0].status, requestId: existing[0].id, alreadyRequested: true };
  }
}

export async function getAccountClosureRequestsForAdmin(db: DatabaseHandle, status?: "pending_review" | "closed" | "declined" | "withdrawn") {
  const query = db.select({
    id: accountClosureRequests.id,
    userId: accountClosureRequests.userId,
    status: accountClosureRequests.status,
    memberNote: accountClosureRequests.memberNote,
    blockerSummary: accountClosureRequests.blockerSummary,
    adminNote: accountClosureRequests.adminNote,
    requestedAt: accountClosureRequests.requestedAt,
    reviewedAt: accountClosureRequests.reviewedAt,
    closedAt: accountClosureRequests.closedAt,
    displayName: userProfiles.displayName,
    username: users.username,
  }).from(accountClosureRequests)
    .innerJoin(users, eq(users.id, accountClosureRequests.userId))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id));
  const rows = status
    ? await query.where(eq(accountClosureRequests.status, status)).orderBy(desc(accountClosureRequests.requestedAt))
    : await query.orderBy(desc(accountClosureRequests.requestedAt));
  return rows.map((row: any) => ({
    ...row,
    displayName: row.displayName || row.username || `Collector ${row.userId}`,
  }));
}

export async function reviewAccountClosureRequest(db: DatabaseHandle, input: {
  requestId: number;
  administratorId: number;
  decision: "approve_close" | "decline";
  adminNote: string;
}) {
  return db.transaction(async (tx: DatabaseHandle) => {
    const [request] = await tx.select().from(accountClosureRequests)
      .where(eq(accountClosureRequests.id, input.requestId))
      .limit(1);
    if (!request) throw new Error("Account closure request not found.");
    if (request.status !== "pending_review") throw new Error("This account closure request has already been decided.");

    const audit = await getAccountClosureAudit(tx, request.userId);
    const now = nowForMysql();
    if (input.decision === "decline") {
      const [result] = await tx.update(accountClosureRequests).set({
        status: "declined",
        activeRequestKey: null,
        adminNote: input.adminNote,
        reviewedBy: input.administratorId,
        reviewedAt: now,
        blockerSummary: serializeBlockers(audit),
      }).where(and(eq(accountClosureRequests.id, request.id), eq(accountClosureRequests.status, "pending_review")));
      if (!hasAffectedRow(result)) throw new Error("This account closure request changed before it could be decided.");
      return { status: "declined" as const, blockers: audit.blockers };
    }

    if (audit.blockers.length > 0) {
      throw new Error("Resolve the listed account-closure blockers before approving this request.");
    }
    const closed = await closeEligibleAccount(tx, request.userId);
    if (!closed) throw new Error("The account changed before it could be closed. Review its current blockers and try again.");

    const [result] = await tx.update(accountClosureRequests).set({
      status: "closed",
      activeRequestKey: null,
      adminNote: input.adminNote,
      reviewedBy: input.administratorId,
      reviewedAt: now,
      closedAt: now,
      blockerSummary: serializeBlockers(audit),
    }).where(and(eq(accountClosureRequests.id, request.id), eq(accountClosureRequests.status, "pending_review")));
    if (!hasAffectedRow(result)) throw new Error("This account closure request changed before it could be decided.");
    return { status: "closed" as const, blockers: [] as string[] };
  });
}

export { ACTIVE_TRADE_STATUSES };
