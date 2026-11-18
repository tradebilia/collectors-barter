import { originatingRankingOccurrence, preserveParentDisplayRanking, sortMetadataRankedCandidates, collectEbayDisplayCandidates } from './testAiRankingDisplay';

/** Diagnostic correlation only. Never authorizes identity, selection or financial use. */
export type TestAiDisplayCorrelation = {
  version: 'stage5-display-v1';
  side: 'item_a' | 'item_b';
  sourceId: string;
  runId: string;
  occurrenceKey: string;
  requestOccurrenceRef: string;
  observationId?: string | null;
  canonicalTransactionId?: string | null;
};
export type CandidateDisplayScope = { side?: 'item_a' | 'item_b'; sourceId?: string; runId?: string; activeRequest?: boolean };
export type CandidateDisplayRow = Record<string, any>;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
export function candidateCanonicalObservation(row: CandidateDisplayRow): string | null {
  return text(row.observationId) ?? text(row.provenance?.payloadHash);
}
export function candidateCanonicalTransaction(row: CandidateDisplayRow): string | null {
  return text(row.canonicalTransactionId) ?? text(row.provenance?.canonicalTransactionId);
}
const localOccurrences = new WeakMap<object, string>();
let nextLocalOccurrence = 0;
/** Allocate at the retained input boundary, before presentation copies/subsets.
 * Different inputs never share a fallback just because two merge calls start at 0.
 * A copy is the same occurrence only when it carries this explicit key or origin.
 */
export function retainCandidateDisplayOccurrence(row: CandidateDisplayRow): CandidateDisplayRow {
  const key = originatingRankingOccurrence(row) ?? text(row.displayCorrelation?.occurrenceKey)
    ?? text(row.candidateDisplayOccurrenceKey) ?? localOccurrenceKey(row);
  return { ...row, candidateDisplayOccurrenceKey: key };
}
function localOccurrenceKey(row: CandidateDisplayRow): string {
  let key = localOccurrences.get(row);
  if (!key) { key = `local-occurrence:${++nextLocalOccurrence}`; localOccurrences.set(row, key); }
  return key;
}
/** Stamp before collectEbayDisplayCandidates clones the actual retained inputs. */
export function collectEbayCandidateDisplayOccurrences(data: CandidateDisplayRow | null | undefined): CandidateDisplayRow[] {
  if (!data) return [];
  const stamp = (group: any) => Array.isArray(group) ? group.map(retainCandidateDisplayOccurrence) : group;
  return collectEbayDisplayCandidates({ ...data, listings: stamp(data.listings), visualReviewListings: stamp(data.visualReviewListings),
    visualFilter: data.visualFilter ? { ...data.visualFilter, listings: stamp(data.visualFilter.listings), contextListings: stamp(data.visualFilter.contextListings) } : undefined,
    preVisionFilter: data.preVisionFilter ? { ...data.preVisionFilter, excludedListings: stamp(data.preVisionFilter.excludedListings) } : undefined });
}
function originNamespace(origin: string | null): { sourceId?: string; runId?: string } {
  if (!origin || !origin.includes(':occ:')) return {};
  const parts = origin.split(':');
  try { return { sourceId: decodeURIComponent(parts[0]), runId: decodeURIComponent(parts[1]) }; }
  catch { return {}; }
}
export function candidateDisplayIdentity(row: CandidateDisplayRow, scope: CandidateDisplayScope = {}, localOccurrence = '0') {
  const origin = originatingRankingOccurrence(row) ?? text(row.displayCorrelation?.occurrenceKey);
  const namespace = originNamespace(origin);
  const side = scope.side ?? row.displayCorrelation?.side ?? 'side_unknown';
  const sourceId = namespace.sourceId ?? text(row.displayCorrelation?.sourceId) ?? text(row.metadataRanking?.sourceId) ?? text(row.sourceId) ?? scope.sourceId ?? 'source_unknown';
  const runId = namespace.runId ?? text(row.displayCorrelation?.runId) ?? text(row.metadataRanking?.populationId) ?? scope.runId ?? 'run_unknown';
  // Never use title, amount or provider ID as an occurrence identity.
  const occurrenceKey = origin ?? text(row.candidateDisplayOccurrenceKey) ?? localOccurrenceKey(row);
  return { side, sourceId, runId, occurrenceKey };
}
export function candidateDisplayKey(row: CandidateDisplayRow, scope: CandidateDisplayScope = {}, localOccurrence = '0'): string {
  const identity = candidateDisplayIdentity(row, scope, localOccurrence);
  return JSON.stringify([identity.side, identity.sourceId, identity.runId, identity.occurrenceKey]);
}

const visualDecisionFields = ['visualExecution', 'visualReviewStatus', 'visualReviewRationale', 'visualReview', 'visualAudit', 'visualEvidence', 'visualDifferences', 'visualRequirement', 'evidenceDisposition', 'evidenceReasons'] as const;
function decisionOrder(row: CandidateDisplayRow): number[] {
  const receipt = row.visualExecution;
  const attempts = Array.isArray(receipt?.attempts) ? receipt.attempts : [];
  const last = attempts.reduce((max: number, attempt: any) => Math.max(max, Number(attempt.ordinal) || 0), 0);
  const finished = attempts.filter((attempt: any) => attempt.outcome !== 'started').length;
  const terminal = receipt && !['selected_pending', 'unknown'].includes(receipt.state) ? 1 : 0;
  return [receipt?.version === 1 ? 1 : 0, last, finished, terminal, row.visualAudit ? 1 : 0];
}
function laterDecision(a: CandidateDisplayRow, b: CandidateDisplayRow): CandidateDisplayRow {
  const left = decisionOrder(a), right = decisionOrder(b);
  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) return left[index] > right[index] ? a : b;
  }
  // No linguistic heuristics; equal known decisions preserve first producer projection.
  return a;
}
/** Presentation enrichment is independent of the latest deciding fields. */
export function mergeCandidateDisplayProjection(parent: CandidateDisplayRow, projection: CandidateDisplayRow): CandidateDisplayRow {
  const deciding = laterDecision(parent, projection);
  const result: CandidateDisplayRow = { ...parent };
  for (const [key, value] of Object.entries(projection)) {
    if (value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length)) result[key] = value;
  }
  for (const field of visualDecisionFields) {
    if (field in deciding) result[field] = deciding[field];
    else delete result[field];
  }
  // Final server use is never replaced by a pre-selection display projection.
  result.valuationUse = parent.valuationUse ?? projection.valuationUse;
  result.candidatePricingLink = parent.candidatePricingLink ?? projection.candidatePricingLink;
  const knownParent = parent.metadataRanking?.occurrenceKey === originatingRankingOccurrence(projection) ? parent
    : projection.metadataRanking?.occurrenceKey === originatingRankingOccurrence(parent) ? projection : null;
  return knownParent ? preserveParentDisplayRanking(knownParent, result) : result;
}

/** One master population; repeats of a bound projection merge, distinct retained occurrences do not. */
export function mergeCandidateDisplayGroups(groups: CandidateDisplayRow[][], scope: CandidateDisplayScope = {}): CandidateDisplayRow[] {
  const rows = groups.flatMap((group) => Array.isArray(group) ? group : []);
  const canonicalOrigins = new Map<string, Set<string>>();
  for (const row of rows) {
    const origin = originatingRankingOccurrence(row);
    const observation = candidateCanonicalObservation(row);
    if (!origin || !observation) continue;
    const identity = candidateDisplayIdentity(row, scope);
    const alias = JSON.stringify([identity.side, identity.sourceId, identity.runId, observation]);
    const keys = canonicalOrigins.get(alias) ?? new Set<string>();
    keys.add(origin); canonicalOrigins.set(alias, keys);
  }
  const objectKeys = new Map<CandidateDisplayRow, string>();
  const merged = new Map<string, CandidateDisplayRow>();
  rows.forEach((row, index) => {
    if (scope.side && row.displayCorrelation?.side && row.displayCorrelation.side !== scope.side) return;
    let copy = row;
    const identity = candidateDisplayIdentity(row, scope, String(index));
    // Explicit scope rejects known other runs; absent run remains unknown, not invented.
    if (scope.runId && identity.runId !== 'run_unknown' && identity.runId !== scope.runId) return;
    const observation = candidateCanonicalObservation(row);
    if (!originatingRankingOccurrence(row) && observation) {
      const aliases = canonicalOrigins.get(JSON.stringify([identity.side, identity.sourceId, identity.runId, observation]));
      if (aliases?.size === 1) copy = { ...row, metadataOriginOccurrenceKey: [...aliases][0] };
    }
    const key = objectKeys.get(row) ?? candidateDisplayKey(copy, scope, String(index));
    objectKeys.set(row, key);
    const previous = merged.get(key);
    merged.set(key, previous ? mergeCandidateDisplayProjection(previous, copy) : { ...copy,
      candidateDisplayOccurrenceKey: candidateDisplayIdentity(copy, scope).occurrenceKey });
  });
  return sortMetadataRankedCandidates([...merged.values()]);
}

/** New display merge only: do not feed deduplicated counts back into client match-stop. */
export function mergeVisualReviewDisplayBatches(batches: CandidateDisplayRow[], scope: CandidateDisplayScope = {}): CandidateDisplayRow | undefined {
  if (!batches.length) return undefined;
  const latest = batches[batches.length - 1];
  const listings = mergeCandidateDisplayGroups(batches.map((batch) => [...(batch.listings ?? []), ...(batch.visualFilter?.contextListings ?? [])]), scope);
  return { ...latest, listings, visualReviewListings: listings,
    error: batches.map((batch) => batch.error).filter(Boolean).join('; ') || undefined,
    displayCoverage: batches.some((batch) => batch.error || batch.visualFilter?.status === 'provider_unavailable' || batch.visualFilter?.status === 'completed_with_timeout') ? 'partial' : 'complete',
  };
}
export function mergeEbayCandidateDisplayData(base: CandidateDisplayRow | undefined, review: CandidateDisplayRow | undefined, scope: CandidateDisplayScope = {}): CandidateDisplayRow | undefined {
  if (!review) return base;
  const parents = collectEbayCandidateDisplayOccurrences(base);
  const reviewed = [...(review.listings ?? []), ...(review.visualFilter?.contextListings ?? [])];
  const listings = mergeCandidateDisplayGroups([base?.listings ?? [], reviewed], scope);
  return { ...base, ...review, query: base?.query ?? review.query, debug: review.debug ?? base?.debug,
    listings, visualReviewListings: mergeCandidateDisplayGroups([parents, reviewed], scope),
    metadataParentDisplayListings: parents, preVisionFilter: review.preVisionFilter ?? base?.preVisionFilter,
    error: review.error ?? base?.error,
  };
}

/** Stamp the already selected <=120 request rows; no new candidate or policy change. */
export function stampCandidateDisplayIntake(rows: CandidateDisplayRow[], side: 'item_a' | 'item_b', requestRunId: string): CandidateDisplayRow[] {
  return rows.map((row, ordinal) => {
    const identity = candidateDisplayIdentity(row, { side, runId: requestRunId }, String(ordinal));
    // Known source runs stay authoritative; otherwise use this request namespace.
    const displayCorrelation: TestAiDisplayCorrelation = {
      version: 'stage5-display-v1', side,
      sourceId: identity.sourceId.slice(0, 120), runId: identity.runId.slice(0, 240),
      occurrenceKey: identity.occurrenceKey.slice(0, 1000),
      requestOccurrenceRef: `${requestRunId}:${side}:intake:${ordinal}`.slice(0, 240),
      observationId: candidateCanonicalObservation(row)?.slice(0, 240) ?? null,
      canonicalTransactionId: candidateCanonicalTransaction(row)?.slice(0, 1000) ?? null,
    };
    return { ...row, displayCorrelation };
  });
}

export type CandidateFinalDisplayOutcome = {
  side: 'item_a' | 'item_b';
  requestRunId: string;
  submitted: CandidateDisplayRow[];
  finalRows: CandidateDisplayRow[];
  analysisRunId: string | null;
};
function sameDisplayReceipt(a: any, b: any): boolean {
  return Boolean(a && b && a.version === 'stage5-display-v1' && a.version === b.version && a.side === b.side
    && a.sourceId === b.sourceId && a.runId === b.runId && a.occurrenceKey === b.occurrenceKey
    && a.requestOccurrenceRef === b.requestOccurrenceRef);
}
function canonicalAlias(row: CandidateDisplayRow, scope: CandidateDisplayScope): string | null {
  const observation = candidateCanonicalObservation(row);
  const identity = candidateDisplayIdentity(row, scope);
  // A canonical observation proves neither the display source nor its ranking run.
  if (!observation || identity.side === 'side_unknown' || identity.sourceId === 'source_unknown' || identity.runId === 'run_unknown') return null;
  return JSON.stringify([identity.side, identity.sourceId, identity.runId, observation]);
}
/** Join only actual current request intake receipts. Browser eligibility never means used. */
export function reconcileCandidateFinalUse(rows: CandidateDisplayRow[], outcome: CandidateFinalDisplayOutcome | null | undefined,
  scope: CandidateDisplayScope = {}, allowCanonical = true): CandidateDisplayRow[] {
  if (!outcome || (scope.side && scope.side !== outcome.side)) return rows.map((row) => {
    const { valuationUse: _stale, candidatePricingLink: _link, ...current } = row;
    return current;
  });
  const finalByOrdinal = new Map<number, CandidateDisplayRow[]>();
  for (const final of outcome.finalRows) {
    const ref = final.valuationUse?.auditRef;
    if (!ref || ref.side !== outcome.side || (outcome.analysisRunId && ref.analysisRunId !== outcome.analysisRunId)
      || !Number.isSafeInteger(ref.intakeOrdinal) || ref.intakeOrdinal < 0 || ref.intakeOrdinal >= outcome.submitted.length) continue;
    finalByOrdinal.set(ref.intakeOrdinal, [...(finalByOrdinal.get(ref.intakeOrdinal) ?? []), final]);
  }
  const sourceKeys = new Map<string, number>();
  const observationCounts = new Map<string, number>();
  rows.forEach((row, index) => {
    const key = candidateDisplayKey(row, { ...scope, side: outcome.side }, String(index));
    sourceKeys.set(key, (sourceKeys.get(key) ?? 0) + 1);
    const alias = canonicalAlias(row, { ...scope, side: outcome.side });
    if (alias) observationCounts.set(alias, (observationCounts.get(alias) ?? 0) + 1);
  });
  return rows.map((row, index) => {
    const { valuationUse: _stale, ...current } = row;
    const origin = originatingRankingOccurrence(row);
    const key = candidateDisplayKey(row, { ...scope, side: outcome.side }, String(index));
    const observation = candidateCanonicalObservation(row);
    const alias = canonicalAlias(row, { ...scope, side: outcome.side });
    const identity = candidateDisplayIdentity(row, { ...scope, side: outcome.side });
    if ((row.displayCorrelation?.side && row.displayCorrelation.side !== outcome.side)
      || (scope.runId && identity.runId !== scope.runId)) return { ...current, candidatePricingLink: 'unresolved' };
    const receiptMatches = row.displayCorrelation ? outcome.submitted.map((submitted, ordinal) => ({ submitted, ordinal }))
      .filter(({ submitted }) => sameDisplayReceipt(row.displayCorrelation, submitted.displayCorrelation)
        && candidateDisplayKey(submitted, { side: outcome.side }) === key) : [];
    const exactMatches = outcome.submitted.map((submitted, ordinal) => ({ submitted, ordinal }))
      .filter(({ submitted }) => origin && candidateDisplayKey(submitted, { side: outcome.side }) === key);
    const canonicalMatches = allowCanonical && !origin && !row.displayCorrelation && alias && observationCounts.get(alias) === 1
      ? outcome.submitted.map((submitted, ordinal) => ({ submitted, ordinal }))
        .filter(({ submitted }) => canonicalAlias(submitted, { side: outcome.side }) === alias) : [];
    const matches = row.displayCorrelation ? receiptMatches : exactMatches.length ? exactMatches : canonicalMatches;
    if (matches.length !== 1 || ((origin || row.displayCorrelation) && sourceKeys.get(key) !== 1)) return { ...current,
      candidatePricingLink: matches.length > 1 || !origin ? 'unresolved' : 'not_submitted' };
    const receipt = matches[0].submitted.displayCorrelation;
    if (receipt?.side !== outcome.side || receipt.version !== 'stage5-display-v1'
      || receipt.requestOccurrenceRef !== `${outcome.requestRunId}:${outcome.side}:intake:${matches[0].ordinal}`) return { ...current, candidatePricingLink: 'unresolved' };
    const finals = finalByOrdinal.get(matches[0].ordinal) ?? [];
    if (finals.length !== 1) return { ...current, candidatePricingLink: 'submitted_unresolved' };
    const finalRef = finals[0].valuationUse.auditRef;
    const echoed = finalRef.displayCorrelation;
    if (!sameDisplayReceipt(echoed, receipt)) return { ...current, candidatePricingLink: 'submitted_unresolved' };
    const finalOrigin = finalRef.sourceCorrelation?.metadataOriginOccurrenceKey ?? finalRef.sourceCorrelation?.metadataRanking?.occurrenceKey;
    // If the server retained source correlation, require agreement; canonical-only
    // joins additionally require its independently verified observation reference.
    if ((origin && finalOrigin && finalOrigin !== origin)
      || (!origin && !row.displayCorrelation && finalRef.verifiedObservationId !== observation)) return { ...current, candidatePricingLink: 'submitted_unresolved' };
    return { ...current, valuationUse: finals[0].valuationUse, candidatePricingLink: 'resolved' };
  });
}
