import { sql, type SQLWrapper } from "drizzle-orm";

/**
 * A public member must have explicitly enabled their profile and must not have
 * closed their account. Call this only for public/discovery queries; private
 * owner, trade-participant, and administrator queries retain their separate
 * authorization rules.
 */
export function isPublicMemberEligible(userId: SQLWrapper) {
  return sql`${userId} IN (
    SELECT up.userId
    FROM userProfiles up
    INNER JOIN users u ON u.id = up.userId
    WHERE up.showProfile = 1 AND u.isAccountClosed = 0
  )`;
}
