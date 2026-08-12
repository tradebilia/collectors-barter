export type DirectMessageDirectionFilter = "all" | "sent" | "received";

export function matchesDirectMessageDirectionFilter(
  latestSenderId: number | null | undefined,
  currentUserId: number | null | undefined,
  filter: DirectMessageDirectionFilter,
) {
  if (filter === "all") return true;
  if (!latestSenderId || !currentUserId) return false;

  const isSent = latestSenderId === currentUserId;
  return filter === "sent" ? isSent : !isSent;
}
