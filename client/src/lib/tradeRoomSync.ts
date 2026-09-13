type TradeProposalRevisionSource = {
  id?: number;
  updatedAt?: unknown;
  lastProposedBy?: number | null;
} | null | undefined;

type IncomingProposalCheck = {
  previousRevision: string | null;
  nextRevision: string | null;
  lastProposedBy?: number | null;
  myUserId?: number | null;
  isNegotiating: boolean;
};

export function getTradeProposalRevision(proposal: TradeProposalRevisionSource) {
  if (!proposal?.id) return null;
  // The database auto-updates `updatedAt` for every row write, including
  // Daily video-room start/join/leave state. Trade proposals alternate the
  // submitting member, so `lastProposedBy` is the reliable term-change signal.
  return `${proposal.id}:${proposal.lastProposedBy ?? ''}`;
}

export function isIncomingProposalRevision({
  previousRevision,
  nextRevision,
  lastProposedBy,
  myUserId,
  isNegotiating,
}: IncomingProposalCheck) {
  return Boolean(
    previousRevision
      && nextRevision
      && previousRevision !== nextRevision
      && isNegotiating
      && lastProposedBy
      && myUserId
      && lastProposedBy !== myUserId,
  );
}
