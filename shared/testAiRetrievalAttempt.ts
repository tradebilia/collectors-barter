export type RetrievalOutcome =
  | 'success_records' | 'not_found' | 'config_unavailable' | 'input_unsupported'
  | 'auth_error' | 'rate_limited' | 'http_error' | 'network_error' | 'timeout' | 'aborted'
  | 'invalid_json' | 'unexpected_shape' | 'row_rejection';

export type RetrievalRejectionCode =
  | 'row_not_object' | 'invalid_id' | 'invalid_title' | 'invalid_price' | 'invalid_date' | 'normalization_failure';

/** Named existing scalar fields only; this is not a wrapper/alias discovery mechanism. */
export type RetrievalRowContract = {
  idFields?: readonly string[];
  titleFields?: readonly string[];
  priceFields?: readonly string[];
  dateFields?: readonly string[];
};

export type RetrievalAttemptContext = {
  query: string;
  stage: 'search' | 'product_sales';
  attempt: number;
  executed?: boolean;
};

/** Display diagnostics, never identity or price authority. Unreadable counts are null. */
export type RetrievalAttempt = RetrievalAttemptContext & {
  executed: boolean;
  status: 'success' | 'error';
  outcome: RetrievalOutcome;
  httpStatus: number | null;
  received: number | null;
  accepted: number | null;
  rejected: number | null;
  normalized: number | null;
  normalizationRejected: number | null;
  rejectionCounts: Partial<Record<RetrievalRejectionCode, number>>;
  message: string | null;
};

export type RetrievalIssue = RetrievalAttempt;

export type RetrievalItemsResult = {
  items: Record<string, unknown>[];
  receipt: RetrievalAttempt;
  hasNextPage: boolean;
};

function objectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function firstObserved(row: Record<string, unknown>, fields: readonly string[]): unknown {
  for (const field of fields) {
    if (row[field] !== null && row[field] !== undefined) return row[field];
  }
  return undefined;
}

function scalarText(value: unknown): boolean {
  return (typeof value === 'string' && value.trim().length > 0)
    || (typeof value === 'number' && Number.isFinite(value));
}

function positiveScalarPrice(value: unknown): boolean {
  if (typeof value !== 'number' && typeof value !== 'string') return false;
  if (typeof value === 'string' && !value.trim()) return false;
  const price = Number(value);
  return Number.isFinite(price) && price > 0;
}

export function validateRetrievalRow(row: unknown, contract: RetrievalRowContract): RetrievalRejectionCode[] {
  if (!objectRecord(row)) return ['row_not_object'];
  const codes: RetrievalRejectionCode[] = [];
  if (contract.idFields && !scalarText(firstObserved(row, contract.idFields))) codes.push('invalid_id');
  // Titles feed existing string-only metadata/grade/issue readers. Numeric IDs
  // are supported, but a numeric title is not an observed textual title format.
  if (contract.titleFields) {
    const title = firstObserved(row, contract.titleFields);
    if (typeof title !== 'string' || !title.trim()) codes.push('invalid_title');
  }
  if (contract.priceFields && !positiveScalarPrice(firstObserved(row, contract.priceFields))) codes.push('invalid_price');
  // TCG's existing contract requires a nonblank observed soldDate, not a guessed date.
  if (contract.dateFields) {
    const date = firstObserved(row, contract.dateFields);
    if (typeof date !== 'string' || !date.trim()) codes.push('invalid_date');
  }
  return codes;
}

function safeMessage(outcome: RetrievalOutcome, httpStatus: number | null): string | null {
  switch (outcome) {
    case 'success_records': case 'not_found': return null;
    case 'config_unavailable': return 'Sold-Comps API key not configured';
    case 'input_unsupported': return 'Sold-Comps lookup input is unavailable or unsupported';
    case 'auth_error': return `Sold-Comps authorization failed (HTTP ${httpStatus})`;
    case 'rate_limited': return 'Sold-Comps request was rate limited (HTTP 429)';
    case 'http_error': return `Sold-Comps provider request failed (HTTP ${httpStatus})`;
    case 'network_error': return 'Sold-Comps provider could not be reached';
    case 'timeout': return 'Sold-Comps provider request timed out';
    case 'aborted': return 'Sold-Comps provider request was aborted';
    case 'invalid_json': return 'Sold-Comps provider returned invalid JSON';
    case 'unexpected_shape': return 'Sold-Comps provider returned an unsupported response envelope';
    case 'row_rejection': return 'Sold-Comps provider rows failed minimal validation';
  }
}

function failureReceipt(context: RetrievalAttemptContext, outcome: RetrievalOutcome, httpStatus: number | null = null): RetrievalAttempt {
  return {
    ...context,
    executed: context.executed !== false,
    status: 'error', outcome, httpStatus,
    received: null, accepted: null, rejected: null, normalized: null, normalizationRejected: null, rejectionCounts: {},
    message: safeMessage(outcome, httpStatus),
  };
}

export function unavailableRetrievalAttempt(
  context: RetrievalAttemptContext,
  outcome: 'config_unavailable' | 'input_unsupported',
): RetrievalAttempt {
  return failureReceipt({ ...context, executed: false }, outcome);
}

export function retrievalIssue(attempt: RetrievalAttempt): RetrievalIssue | null {
  if (attempt.status !== 'error' && !(attempt.rejected !== null && attempt.rejected > 0)
    && !(attempt.normalizationRejected !== null && attempt.normalizationRejected > 0)) return null;
  return { ...attempt, rejectionCounts: { ...attempt.rejectionCounts },
    message: attempt.message ?? safeMessage('row_rejection', attempt.httpStatus) };
}

function typedTransportOutcome(error: unknown): 'network_error' | 'timeout' | 'aborted' {
  // Inspect the actual exception type/name, never timeout-like message prose.
  if (error instanceof Error) {
    if (error.name === 'TimeoutError') return 'timeout';
    if (error.name === 'AbortError') return 'aborted';
  }
  return 'network_error';
}

/** Request bounds/signals belong to the caller. No timeout, retries, body diagnostics or env access here. */
export async function retrieveItemsAttempt(
  request: () => Promise<Pick<Response, 'ok' | 'status' | 'json'>>,
  context: RetrievalAttemptContext,
  contract: RetrievalRowContract,
): Promise<RetrievalItemsResult> {
  let response: Pick<Response, 'ok' | 'status' | 'json'>;
  try {
    response = await request();
  } catch (error) {
    return { items: [], receipt: failureReceipt(context, typedTransportOutcome(error)), hasNextPage: false };
  }
  // A failed HTTP response is not an empty search, even if its body is malformed.
  if (!response.ok) {
    const outcome = response.status === 401 || response.status === 403 ? 'auth_error'
      : response.status === 429 ? 'rate_limited' : 'http_error';
    return { items: [], receipt: failureReceipt(context, outcome, response.status), hasNextPage: false };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    const transport = typedTransportOutcome(error);
    return { items: [], receipt: failureReceipt(context,
      transport === 'timeout' || transport === 'aborted' ? transport : 'invalid_json', response.status), hasNextPage: false };
  }
  if (!objectRecord(body) || !Array.isArray(body.items)) {
    return { items: [], receipt: failureReceipt(context, 'unexpected_shape', response.status), hasNextPage: false };
  }
  const items: Record<string, unknown>[] = [];
  const rejectionCounts: Partial<Record<RetrievalRejectionCode, number>> = {};
  let rejected = 0;
  for (const row of body.items) {
    const codes = validateRetrievalRow(row, contract);
    if (codes.length) {
      rejected += 1;
      for (const code of codes) rejectionCounts[code] = (rejectionCounts[code] ?? 0) + 1;
    } else {
      // Preserve the actual valid sibling and all its original metadata/photos.
      items.push(row as Record<string, unknown>);
    }
  }
  const outcome: RetrievalOutcome = items.length ? 'success_records' : body.items.length ? 'row_rejection' : 'not_found';
  return {
    items,
    receipt: { ...context, executed: context.executed !== false,
      status: outcome === 'row_rejection' ? 'error' : 'success', outcome, httpStatus: response.status,
      received: body.items.length, accepted: items.length, rejected, normalized: null, normalizationRejected: null, rejectionCounts,
      message: safeMessage(outcome, response.status) },
    hasNextPage: body.hasNextPage === true,
  };
}
