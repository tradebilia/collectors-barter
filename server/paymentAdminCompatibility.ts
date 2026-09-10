export function isMissingTradePaymentsTableError(error: unknown): boolean {
  const candidate = error as { code?: unknown; errno?: unknown; message?: unknown } | null;
  const code = typeof candidate?.code === "string" ? candidate.code : "";
  const message = typeof candidate?.message === "string" ? candidate.message : String(error ?? "");
  return (
    code === "ER_NO_SUCH_TABLE" ||
    Number(candidate?.errno) === 1146 ||
    (/tradePayments/i.test(message) && /does(?:n['’]t| not) exist|unknown table|no such table/i.test(message))
  );
}

export function emptyExternalCashAdjustments() {
  return [] as Array<{
    paymentId: number;
    proposalId: number;
    amount: number;
    paymentMethod: string;
    status: string;
    paymentIdentifier: string | null;
    transactionId: string | null;
    sentAt: Date | string | null;
    receivedAt: Date | string | null;
    disputeOpenedAt: Date | string | null;
    payerName: string;
    payeeName: string;
  }>;
}

export function shouldUseEmptyExternalCashAdjustments(error: unknown): boolean {
  return isMissingTradePaymentsTableError(error);
}

export const MISSING_TRADE_PAYMENTS_FALLBACK_MESSAGE = "External cash adjustments are unavailable until the legacy tradePayments table is provisioned.";
