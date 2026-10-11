export type PcgsAuctionLike = {
  provenanceToken?: string | null;
  saleStatus?: string | null;
  currency?: string | null;
  price?: number | string | null;
  date?: string | null;
  evidenceDisposition?: string | null;
};

export const PCGS_CURRENT_VALUE_WINDOW_MS = 365 * 86_400_000;

function hasValidCompletedSaleFacts(row: PcgsAuctionLike): boolean {
  return Boolean(
    row.provenanceToken
    && row.saleStatus === 'completed'
    && row.currency === 'USD'
    && Number(row.price) > 0,
  );
}

function dateMilliseconds(row: PcgsAuctionLike): number | null {
  const timestamp = Date.parse(String(row.date ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

/**
 * Buckets PCGS rows exclusively from the server-signed admission decision.
 * Grade scope—including a target-scoped history row without a repeated grade—is
 * decided by the server before the row receives its provenance token. The UI
 * must not attempt a separate grade reconciliation.
 */
export function bucketPcgsAuctionRows<T extends PcgsAuctionLike>(rows: T[], now = Date.now()) {
  const completedRows = rows.filter(hasValidCompletedSaleFacts);
  const datedCompletedRows = completedRows.filter((row) => dateMilliseconds(row) !== null);
  const undatedOrIncompleteRows = rows.filter((row) => !datedCompletedRows.includes(row));
  const serverApprovedRows = datedCompletedRows.filter((row) => row.evidenceDisposition === 'valuation_eligible');
  const currentValueRows = serverApprovedRows.filter((row) => {
    const timestamp = dateMilliseconds(row);
    return timestamp !== null && timestamp <= now && now - timestamp <= PCGS_CURRENT_VALUE_WINDOW_MS;
  });
  const historicalTrendRows = serverApprovedRows.filter((row) => !currentValueRows.includes(row));
  const contextOnlyRows = rows.filter((row) => !currentValueRows.includes(row) && !historicalTrendRows.includes(row));

  return {
    completedRows,
    datedCompletedRows,
    undatedOrIncompleteRows,
    currentValueRows,
    historicalTrendRows,
    contextOnlyRows,
  };
}
