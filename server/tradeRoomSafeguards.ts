export function resolveTradeContactName(contact: {
  contactFullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  username?: string | null;
}): string | null {
  const contactFullName = contact.contactFullName?.trim();
  if (contactFullName) return contactFullName;

  const firstAndLastName = [contact.firstName?.trim(), contact.lastName?.trim()]
    .filter((part): part is string => Boolean(part))
    .join(" ");
  if (firstAndLastName) return firstAndLastName;

  return contact.name?.trim() || contact.username?.trim() || null;
}

export function getReviewSubmissionBlocker({
  isParticipant,
  tradeStatus,
  alreadyReviewed,
}: {
  isParticipant: boolean;
  tradeStatus: string;
  alreadyReviewed: boolean;
}): "not-participant" | "trade-not-completed" | "already-reviewed" | null {
  if (!isParticipant) return "not-participant";
  if (tradeStatus !== "completed") return "trade-not-completed";
  if (alreadyReviewed) return "already-reviewed";
  return null;
}
