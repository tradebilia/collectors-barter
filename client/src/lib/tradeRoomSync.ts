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
  const updatedAt = proposal.updatedAt ? new Date(String(proposal.updatedAt)).getTime() : '';
  return `${proposal.id}:${updatedAt}:${proposal.lastProposedBy ?? ''}`;
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
