export type CashObligation = { payerId: number; payeeId: number; amount: number };
export type PaymentStatusRow = { payerId: number; status: string | null };

export function hasTrackingForEveryItem(expectedListingIds: number[], trackedListingIds: number[]) {
  const tracked = new Set(trackedListingIds.map(Number));
  return expectedListingIds.every((listingId) => tracked.has(Number(listingId)));
}

export function haveAllCashPaymentsBeenSent(obligations: CashObligation[], payments: PaymentStatusRow[]) {
  const statusByPayerId = new Map(payments.map((payment) => [Number(payment.payerId), payment.status]));
  return obligations.every((obligation) => ["sent", "received", "verified"].includes(statusByPayerId.get(obligation.payerId) ?? "pending"));
}

export function haveAllCashPaymentsBeenReceived(obligations: CashObligation[], payments: PaymentStatusRow[]) {
  const statusByPayerId = new Map(payments.map((payment) => [Number(payment.payerId), payment.status]));
  return obligations.every((obligation) => ["received", "verified"].includes(statusByPayerId.get(obligation.payerId) ?? "pending"));
}

export function haveAllRequiredItemRecipientsConfirmed(expectedRecipientIds: number[], confirmedRecipientIds: number[]) {
  const confirmed = new Set(confirmedRecipientIds.map(Number));
  return [...new Set(expectedRecipientIds.map(Number))].every((recipientId) => confirmed.has(recipientId));
}
