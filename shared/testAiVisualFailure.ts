import type { VisualExecutionAttempt, VisualExecutionFailureCode } from './testAiVisualExecution';

export const visualExecutionFailureCodes = [
  'empty_content', 'provider_refusal', 'response_truncated', 'invalid_json', 'invalid_response_shape',
  'missing_reviews', 'invalid_reviews', 'empty_reviews', 'invalid_verdict', 'invalid_confidence',
  'invalid_candidate_binding', 'missing_rationale', 'provider_request_failed', 'candidate_timeout', 'reason_not_recorded',
] as const satisfies ReadonlyArray<VisualExecutionFailureCode>;
const finishReasons = ['stop', 'length', 'content_filter', 'tool_calls', 'function_call', 'other', 'not_recorded'] as const;
const refusals = ['present', 'absent', 'not_recorded'] as const;
const bindings = ['bound_to_request', 'rebound_to_request', 'not_recorded'] as const;
export type VisualExecutionAttemptDiagnostics = Pick<VisualExecutionAttempt, 'failureCode' | 'finishReason' | 'refusal' | 'candidateBinding'>;
const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
function enumValue<T extends string>(value: unknown, allowed: ReadonlyArray<T>): T | undefined {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : undefined;
}
/** A bounded DTO: no arbitrary provider values or additional properties survive. */
export function sanitizeVisualExecutionAttemptDiagnostics(input: unknown): VisualExecutionAttemptDiagnostics {
  const row = record(input);
  if (!row) return {};
  const failureCode = enumValue(row.failureCode, visualExecutionFailureCodes);
  const finishReason = enumValue(row.finishReason, finishReasons);
  const refusal = enumValue(row.refusal, refusals);
  const candidateBinding = enumValue(row.candidateBinding, bindings);
  return { ...(failureCode ? { failureCode } : {}), ...(finishReason ? { finishReason } : {}),
    ...(refusal ? { refusal } : {}), ...(candidateBinding ? { candidateBinding } : {}) };
}

const verdicts = ['match', 'rough_match', 'mismatch', 'unreadable'];
const confidences = ['high', 'medium', 'low'];
const hasVerdict = (row: unknown) => Boolean(enumValue(record(row)?.verdict, verdicts));
const hasConfidence = (row: unknown) => Boolean(enumValue(record(row)?.confidence, confidences));
const hasRationale = (row: unknown) => typeof record(row)?.rationale === 'string' && Boolean((record(row)!.rationale as string).trim());

/** Diagnostic syntax observation only, after the application parser returned null.
 * Mirrors its fences/trailing-comma cleanup to distinguish non-object JSON from
 * invalid JSON. Never returns a payload or influences parser acceptance.
 */
function hasJsonSyntax(content: string): boolean {
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  for (const candidate of [cleaned, cleaned.replace(/,\s*([}\]])/g, '$1')]) {
    try { JSON.parse(candidate); return true; } catch { /* Diagnostic only. */ }
  }
  return false;
}

/** Run after the existing parser AND all existing normalizers/fallbacks.
 * A usable response can never become a failure because of diagnostic metadata.
 * Pass only the response already returned by the existing invocation; no I/O.
 */
export function diagnoseVisualResponse(input: {
  response: unknown;
  content: string;
  parsedPayload: unknown;
  normalizedReviewCount: number;
  listingCount: number;
  expectedCandidateIndex: number;
}): VisualExecutionAttemptDiagnostics {
  const response = record(input.response);
  const choice = record(Array.isArray(response?.choices) ? response.choices[0] : undefined);
  const message = record(choice?.message);
  const finishReason = enumValue(choice?.finish_reason, finishReasons.filter((value) => value !== 'other' && value !== 'not_recorded'))
    ?? (typeof choice?.finish_reason === 'string' ? 'other' : 'not_recorded');
  const explicitRefusal = typeof message?.refusal === 'string' && Boolean(message.refusal.trim());
  const refusalPart = Array.isArray(message?.content) && message.content.some((part) => record(part)?.type === 'refusal');
  const refusal = explicitRefusal || refusalPart ? 'present'
    : message && Object.prototype.hasOwnProperty.call(message, 'refusal') && (message.refusal === null || message.refusal === '')
    ? 'absent' : 'not_recorded';
  const diagnostics: VisualExecutionAttemptDiagnostics = { finishReason, refusal, candidateBinding: 'not_recorded' };
  const payload = record(input.parsedPayload);
  const rows = Array.isArray(payload?.reviews) ? payload.reviews : undefined;
  if (input.normalizedReviewCount > 0) {
    // Only the existing normalizer establishes success. Model index discrepancies
    // are recorded as rebinding, never classified as failed candidate identity.
    const acceptedRow = rows?.find((row) => hasVerdict(row) && hasConfidence(row) && hasRationale(row));
    if (acceptedRow) {
      const index = record(acceptedRow)?.candidateIndex;
      diagnostics.candidateBinding = (typeof index === 'number' || typeof index === 'string') && Number(index) === input.expectedCandidateIndex
        ? 'bound_to_request' : 'rebound_to_request';
    }
    return diagnostics;
  }
  let failureCode: VisualExecutionFailureCode;
  if (refusal === 'present') failureCode = 'provider_refusal';
  else if (finishReason === 'length') failureCode = 'response_truncated';
  else if (!input.content.trim()) failureCode = 'empty_content';
  else if (!payload) failureCode = hasJsonSyntax(input.content) ? 'invalid_response_shape' : 'invalid_json';
  else if (!Object.prototype.hasOwnProperty.call(payload, 'reviews')) failureCode = 'missing_reviews';
  else if (!rows) failureCode = 'invalid_reviews';
  else if (!rows.length) failureCode = 'empty_reviews';
  else if (!Number.isInteger(input.expectedCandidateIndex) || input.expectedCandidateIndex < 0
    || input.expectedCandidateIndex >= input.listingCount) failureCode = 'invalid_candidate_binding';
  else if (rows.every((row) => !hasVerdict(row))) failureCode = 'invalid_verdict';
  else if (rows.every((row) => !hasConfidence(row))) failureCode = 'invalid_confidence';
  else if (rows.every((row) => !hasRationale(row))) failureCode = 'missing_rationale';
  else failureCode = 'reason_not_recorded';
  return { ...diagnostics, failureCode };
}
