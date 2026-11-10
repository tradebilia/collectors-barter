/** Stage 5 operational reporting only; never identity/signing/pricing authority. */
export type VisualExecutionStage = "initial" | "high_resolution_retry" | "disney_third_confirmation";
export type VisualExecutionFormat = "json_schema" | "json_object";
export type VisualExecutionOutcome = "started" | "usable_review" | "no_decision" | "timed_out" | "error";
/** Diagnostics only: these fixed codes never grant identity or valuation authority. */
export type VisualExecutionFailureCode =
  | "empty_content" | "provider_refusal" | "response_truncated" | "invalid_json"
  | "invalid_response_shape" | "missing_reviews" | "invalid_reviews" | "empty_reviews"
  | "invalid_verdict" | "invalid_confidence" | "invalid_candidate_binding" | "missing_rationale"
  | "provider_request_failed" | "candidate_timeout" | "reason_not_recorded";
export type VisualExecutionFinishReason = "stop" | "length" | "content_filter" | "tool_calls" | "function_call" | "other" | "not_recorded";
export type VisualExecutionRefusal = "present" | "absent" | "not_recorded";
/** Returned indexes may be rebound by the existing one-candidate normalizer. */
export type VisualExecutionCandidateBinding = "bound_to_request" | "rebound_to_request" | "not_recorded";
export type VisualExecutionReasonCode =
  | "workflow_context_only" | "universal_pre_visual_hold" | "universal_duplicate_hold"
  | "multi_item_hold" | "declared_identity_conflict" | "selection_excluded"
  | "outer_identity_filter" | "outer_metadata_hold" | "outer_replica_hold"
  | "target_image_unavailable" | "candidate_image_unavailable" | "adaptive_window_limit"
  | "adaptive_match_target" | "overall_deadline" | "selected_not_dispatched"
  | "review_returned" | "no_usable_decision" | "candidate_timeout" | "provider_error" | "legacy_unknown";
export type VisualExecutionAttempt = {
  /** One actual logical invokeVisualReview call, in this occurrence's dispatch order. */
  ordinal: number;
  stage: VisualExecutionStage;
  format: VisualExecutionFormat;
  outcome: VisualExecutionOutcome;
  errorCode?: "candidate_timeout" | "provider_error";
  /** Optional for legacy receipts. Never copy provider text, errors or URLs here. */
  failureCode?: VisualExecutionFailureCode;
  finishReason?: VisualExecutionFinishReason;
  refusal?: VisualExecutionRefusal;
  candidateBinding?: VisualExecutionCandidateBinding;
};
export type VisualExecutionIdentity = {
  result: "match" | "mismatch" | "manual_unknown" | "not_established";
  origin: "visual" | "deterministic" | "none" | "unknown";
  /** Preserves rough/unreadable as distinct unconfirmed observations. */
  reviewVerdict?: "match" | "rough_match" | "mismatch" | "unreadable";
};
export type VisualExecution = {
  version: 1;
  state: "not_dispatched" | "selected_pending" | "completed" | "dispatched_inconclusive" | "timed_out" | "unknown";
  reasonCode: VisualExecutionReasonCode;
  /** Actual selected pool, never inferred from visualRequirement or a verdict. */
  selectedForReview: boolean;
  /** Producer-coded pre-visual hard hold, not an explanation-text classifier. */
  hardExclusion: boolean;
  identity: VisualExecutionIdentity;
  attempts: VisualExecutionAttempt[];
};
export type VisualExecutionCounts = {
  version: 1;
  unit: "input_occurrences";
  scope: "filter_invocation" | "source_population";
  coverage: "complete" | "partial" | "unknown";
  populationId?: string;
  sourceId?: string;
  inputOccurrenceCount: number;
  emittedOccurrenceCount: number;
  requiredCandidateCount: number;
  selectedCandidateCount: number;
  dispatchedCandidateCount: number;
  responseReviewedCandidateCount: number;
  dispatchedWithoutResponseReviewCount: number;
  selectedPendingCandidateCount: number;
  timedOutCandidateCount: number;
  unknownExecutionCandidateCount: number;
};

/** Call at an actual producer hold/skip branch, never by inspecting rationale. */
export function createNotDispatchedVisualExecution(
  reasonCode: VisualExecutionReasonCode,
  options?: { hardExclusion?: boolean; identity?: VisualExecutionIdentity },
): VisualExecution {
  return { version: 1, state: "not_dispatched", reasonCode, selectedForReview: false,
    hardExclusion: options?.hardExclusion ?? false,
    identity: options?.identity ?? { result: "not_established", origin: "none" }, attempts: [] };
}

type ExecutionCountRow = {
  metadataRanking?: { populationId: string; sourceId: string; occurrenceKey: string };
  visualRequirement?: unknown;
  visualExecution?: VisualExecution;
};

/** Same invocation input population across listings + context; retries are not candidates.
 * Unbound rows remain separate input occurrences, never title/price-deduplicated.
 */
export function summarizeVisualExecutionOccurrences(
  rows: ExecutionCountRow[],
  inputOccurrenceCount: number,
  binding?: { populationId: string; sourceId: string; scope?: VisualExecutionCounts["scope"] },
): VisualExecutionCounts {
  const occurrences = new Map<string, ExecutionCountRow[]>();
  rows.forEach((row, index) => {
    const rank = row.metadataRanking;
    const key = rank ? JSON.stringify([rank.populationId, rank.sourceId, rank.occurrenceKey]) : `unbound:${index}`;
    occurrences.set(key, [...(occurrences.get(key) ?? []), row]);
  });
  const groups = [...occurrences.values()];
  const facts = groups.map((group) => {
    const receipts = group.flatMap((row) => row.visualExecution ? [row.visualExecution] : []);
    const attempts = receipts.flatMap((receipt) => receipt.attempts);
    const dispatched = attempts.some((attempt) => attempt.stage === "initial");
    return {
      required: group.some((row) => row.visualRequirement === "required"),
      selected: receipts.some((receipt) => receipt.selectedForReview),
      dispatched,
      response: dispatched && attempts.some((attempt) => attempt.outcome === "usable_review"),
      timeout: attempts.some((attempt) => attempt.outcome === "timed_out"),
      unknown: !receipts.length || receipts.every((receipt) => receipt.state === "unknown"),
    };
  });
  const count = (predicate: (fact: typeof facts[number]) => boolean) => facts.filter(predicate).length;
  const unknownExecutionCandidateCount = count((fact) => fact.unknown);
  return {
    version: 1,
    unit: "input_occurrences",
    scope: binding?.scope ?? "filter_invocation",
    coverage: unknownExecutionCandidateCount ? "unknown" : groups.length === inputOccurrenceCount ? "complete" : "partial",
    ...(binding ? { populationId: binding.populationId, sourceId: binding.sourceId } : {}),
    inputOccurrenceCount,
    emittedOccurrenceCount: groups.length,
    requiredCandidateCount: count((fact) => fact.required),
    selectedCandidateCount: count((fact) => fact.selected),
    dispatchedCandidateCount: count((fact) => fact.dispatched),
    responseReviewedCandidateCount: count((fact) => fact.response),
    dispatchedWithoutResponseReviewCount: count((fact) => fact.dispatched && !fact.response),
    selectedPendingCandidateCount: count((fact) => fact.selected && !fact.dispatched),
    timedOutCandidateCount: count((fact) => fact.timeout),
    unknownExecutionCandidateCount,
  };
}
