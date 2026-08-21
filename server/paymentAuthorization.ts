export type PaymentProposalParticipants = {
  requesterId: number;
  recipientId: number;
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
