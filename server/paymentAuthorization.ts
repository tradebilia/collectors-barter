export type PaymentProposalParticipants = {
  requesterId: number;
  recipientId: number;
};

export type PaymentProposalObligation = PaymentProposalParticipants & {
  status: string;
  cashFromRequester: string | number | null;
  cashFromRecipient: string | number | null;
};

export function isAuthorizedPaymentVerification(
  proposal: PaymentProposalParticipants,
  payerId: number,
  payeeId: number,
): boolean {
  const payerIsParticipant = payerId === proposal.requesterId || payerId === proposal.recipientId;
  const payeeIsParticipant = payeeId === proposal.requesterId || payeeId === proposal.recipientId;
  return payerIsParticipant && payeeIsParticipant && payerId !== payeeId;
}

/**
 * Derives the only allowed direct-payment obligation from an accepted trade.
 * Caller input must never select the recipient or amount.
 */
export function getPaymentVerificationObligation(
  proposal: PaymentProposalObligation,
  payerId: number,
): { payerId: number; payeeId: number; amount: number } | null {
  if (proposal.status !== "accepted") return null;
  if (payerId !== proposal.requesterId && payerId !== proposal.recipientId) return null;

  const payeeId = payerId === proposal.requesterId ? proposal.recipientId : proposal.requesterId;
  const rawAmount = payerId === proposal.requesterId ? proposal.cashFromRequester : proposal.cashFromRecipient;
  const amount = Number(rawAmount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return { payerId, payeeId, amount };
}
