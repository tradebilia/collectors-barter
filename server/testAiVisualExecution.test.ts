import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Only the denied external model boundary is mocked; filter, selectors, parser,
// adjudication and receipt producers below are the actual application modules.
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
import { invokeLLM } from "./_core/llm";
import {
  applyVisualSourceReviews,
  buildVisualTargetMetadata,
  disneyPinsIndividualVisualScore,
  disneyPinsVisualCap,
  filterVisualSourceCandidates,
  VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS,
  type VisualSourceCandidate,
  type VisualSourceReview,
} from "./testAiVisualSourceFilter";
import { createNotDispatchedVisualExecution, summarizeVisualExecutionOccurrences } from "../shared/testAiVisualExecution";

const model = vi.mocked(invokeLLM);
const textReply = (content: string): Awaited<ReturnType<typeof invokeLLM>> => ({ id: "isolated", created: 0, model: "isolated",
  choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }] });
const reply = (value: unknown) => textReply(JSON.stringify(value));
const review = (verdict: VisualSourceReview["verdict"] = "match", patch: Partial<VisualSourceReview> = {}): VisualSourceReview => ({
  // Request-bound parser, not this model index, owns the actual occurrence.
  candidateIndex: 999,
  verdict,
  confidence: "high",
  rationale: "All inspected item features correspond; no hard conflict.",
  ...patch,
});
const response = (verdict: VisualSourceReview["verdict"] = "match", patch: Partial<VisualSourceReview> = {}) => reply({ reviews: [review(verdict, patch)] });
const input = (count = 1): VisualSourceCandidate[] => Array.from({ length: count }, (_, index) => ({
  title: "Example collectible", saleId: `sale-${index}`, imageUrl: `https://example.invalid/candidate-${index}.jpg`,
}));
const run = (listings = input(), overrides: Partial<Parameters<typeof filterVisualSourceCandidates>[0]> = {}) => filterVisualSourceCandidates({
  sourceRole: "marketplace", sourceLabel: "Stage 5 isolated source", targetImageUrl: "https://example.invalid/target.jpg", visualProvider: "openai",
  targetMetadata: "title=Example collectible; category=other", listings, ...overrides,
});
const rows = (result: Awaited<ReturnType<typeof filterVisualSourceCandidates>>) => [...result.listings, ...(result.contextListings ?? [])];
const attempts = (row: VisualSourceCandidate) => row.visualExecution?.attempts.map(({ ordinal, stage, format, outcome }) => ({ ordinal, stage, format, outcome }));
const gradedEvidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true,
  gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true };
const gameMetadata = 'title=The Legend of Zelda NES; category=video_games; grade=7.50; certificationCompany=PSA; fullItemDetails={"gameTitle":"The Legend of Zelda","platform":"NES","sealed":"Yes","isGraded":"Yes"}';
const gameTitle = "The Legend of Zelda NES 1987 Sealed PSA 7.5 A+";
const coinMetadata = buildVisualTargetMetadata({ title: "1903 Morgan Silver Dollar PCGS MS63", category: "coins", itemType: "single_coin",
  grade: "MS63", certificationCompany: "PCGS", fullItemDetails: { series: "Morgan Dollar", year: "1903", denomination: "1 Dollar", variety: "Morgan" } });
const coinEvidence = { ...gradedEvidence, identityMatches: true, dateMatches: true, varietyMatches: true, denominationMatches: true, mintMarkMatches: true };
const pinDetails = { pinName: "Mickey Mouse", character: "Mickey Mouse" };
// Use the persisted inventory key. The legacy broad Movie classifier also
// recognizes "individual_pin"; "single_pin" reaches the actual Disney selector.
const pinMetadata = buildVisualTargetMetadata({ title: "Mickey Mouse Pin", category: "disney_pins", itemType: "single_pin",
  fullItemDetails: pinDetails });
const pinCandidate = (): VisualSourceCandidate => ({ title: "Mickey Mouse Pin", itemType: "single_pin", saleId: "pin-sale-0",
  itemDetails: JSON.stringify(pinDetails), imageUrl: "https://example.invalid/pin.jpg" });
const pinEvidence = { characterMatches: true, artworkMatches: true, silhouetteMatches: true, backingCardMatches: true,
  setDesignMatches: true, identityMatches: true };
const expectPinQueueFixture = () => {
  const score = disneyPinsIndividualVisualScore(pinCandidate(), pinMetadata);
  expect(score).toMatchObject({ score: 40, matched: ["pinName", "character"] });
  expect(disneyPinsVisualCap(score.score)).toBe(2);
};
const expectDisneyRequests = () => {
  expect(model).toHaveBeenCalledTimes(4);
  expect(model.mock.calls.map(([params]) => params.response_format?.type)).toEqual(["json_schema", "json_schema", "json_object", "json_object"]);
  for (const [params] of model.mock.calls) expect(params.model).toBe("gpt-6-luna");
  expect(JSON.stringify(model.mock.calls[0][0].messages)).toContain("CANDIDATE 0: title=Mickey Mouse Pin");
  for (const call of model.mock.calls.slice(1, 3)) {
    expect(JSON.stringify(call[0].messages)).toContain("INDEPENDENT DISNEY PINS IDENTITY ADJUDICATION");
    expect(JSON.stringify(call[0].messages)).not.toContain("THIRD CONFIRMATION ATTEMPT");
  }
  expect(JSON.stringify(model.mock.calls[3][0].messages)).toContain("THIRD CONFIRMATION ATTEMPT");
  expect(JSON.stringify(model.mock.calls[3][0].messages)).toContain("CANDIDATE 0 INDEPENDENT HIGH-RESOLUTION IMAGE");
};

it("uses the Forge-compatible object response format when no visual provider is selected", async () => {
  model.mockResolvedValue(response());
  const result = await run([pinCandidate()], { visualProvider: undefined, targetMetadata: pinMetadata });
  expect(result.reviews).toHaveLength(1);
  expect(model).toHaveBeenCalledTimes(1);
  expect(model.mock.calls[0]?.[0]).toMatchObject({ model: "gpt-5-mini", response_format: { type: "json_object" } });
});

// Wait for the real invokeVisualReview timer to abort, then reject the explicit
// provider mock. Merely putting "timeout" in an Error message is not a timeout.
const abortingProvider: Parameters<typeof model.mockImplementationOnce>[0] = (params) => new Promise((_resolve, reject) => {
  params.signal?.addEventListener("abort", () => reject(new Error("isolated provider aborted")), { once: true });
});

beforeEach(() => {
  model.mockReset();
  // Any accidental image fetch is forbidden. These non-eBay fixtures never
  // activate the existing inline-image or focused eBay image transport.
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Stage 5 network denied"); }));
});
afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Stage 5 actual visual execution receipts", () => {
  it("reports an actual deterministic title conflict without manufacturing AI mismatch", async () => {
    const targetMetadata = buildVisualTargetMetadata({ title: "Conan the Destroyer", category: "movies", itemType: "individual_movie",
      fullItemDetails: { title: "Conan the Destroyer", format: "VHS" } });
    const result = await run([{ title: "Conan CGC 8.0 A VHS Tape", imageUrl: "https://example.invalid/conan.jpg" }], { targetMetadata });
    expect(model).not.toHaveBeenCalled();
    expect(result.reviewedCount).toBe(0);
    expect(result.reviews).toEqual([]);
    expect(rows(result)[0].visualExecution).toMatchObject({ version: 1, state: "not_dispatched", hardExclusion: true,
      reasonCode: "declared_identity_conflict", identity: { result: "mismatch", origin: "deterministic" }, attempts: [] });
    expect(result.visualExecutionCounts).toMatchObject({ inputOccurrenceCount: 1, dispatchedCandidateCount: 0, responseReviewedCandidateCount: 0 });
  });

  it("keeps universal duplicate hold separate from title/price-equal distinct sales", async () => {
    model.mockRejectedValue(new Error("unexpected duplicate-fixture model call"))
      .mockResolvedValueOnce(response()).mockResolvedValueOnce(response());
    // providerRecordId belongs to display ranking; universal preparation reads
    // saleId/listingId/itemId/id/URL. Equal title, price and image are not keys.
    const result = await run([
      { ...input()[0], price: 25, saleId: "same" },
      { ...input()[0], price: 25, saleId: "same" },
      { ...input()[0], price: 25, saleId: "distinct" },
    ]);
    expect(model).toHaveBeenCalledTimes(2);
    expect(result.listings).toHaveLength(2);
    expect(result.contextListings).toHaveLength(1);
    expect(rows(result)).toHaveLength(3);
    expect(model.mock.calls.map(([params]) => params.response_format?.type)).toEqual(["json_schema", "json_schema"]);
    expect(JSON.stringify(model.mock.calls[0][0].messages)).toContain("CANDIDATE 0: title=Example collectible");
    expect(JSON.stringify(model.mock.calls[1][0].messages)).toContain("CANDIDATE 2: title=Example collectible");
    const duplicate = result.contextListings![0];
    expect(duplicate).toMatchObject({ saleId: "same", metadataRanking: { ordinal: 1 } });
    expect(duplicate.visualExecution).toMatchObject({ reasonCode: "universal_duplicate_hold", state: "not_dispatched", selectedForReview: false, hardExclusion: true,
      identity: { result: "not_established", origin: "none" }, attempts: [] });
    expect(result.listings.map((row) => row.saleId)).toEqual(["same", "distinct"]);
    for (const row of result.listings) {
      expect(row.visualExecution).toMatchObject({ state: "completed", hardExclusion: false, selectedForReview: true });
      expect(attempts(row)).toEqual([{ ordinal: 1, stage: "initial", format: "json_schema", outcome: "usable_review" }]);
    }
    expect(new Set(rows(result).map((row) => row.metadataRanking?.occurrenceKey)).size).toBe(3);
    expect(result.visualExecutionCounts).toMatchObject({ inputOccurrenceCount: 3, emittedOccurrenceCount: 3,
      selectedCandidateCount: 2, dispatchedCandidateCount: 2, responseReviewedCandidateCount: 2,
      selectedPendingCandidateCount: 0, dispatchedWithoutResponseReviewCount: 0, timedOutCandidateCount: 0, coverage: "complete" });
  });

  it("does not classify no-hard-conflict prose as a hard exclusion", async () => {
    model.mockResolvedValue(response("match", { rationale: "No hard conflict. All visible features correspond." }));
    const result = await run();
    expect(result.listings[0].visualExecution).toMatchObject({ state: "completed", hardExclusion: false,
      identity: { result: "match", origin: "visual", reviewVerdict: "match" } });
    expect(attempts(result.listings[0])).toEqual([{ ordinal: 1, stage: "initial", format: "json_schema", outcome: "usable_review" }]);
  });

  it("keeps actual model mismatch distinct from deterministic hard holds", async () => {
    model.mockResolvedValue(response("mismatch", { rationale: "The primary artwork differs.", visualEvidence: { artworkMatches: false } }));
    const result = await run();
    expect(result.listings[0]).toMatchObject({ visualReviewStatus: "mismatch", evidenceDisposition: "warning_review",
      visualExecution: { state: "completed", hardExclusion: false, identity: { result: "mismatch", origin: "visual" } } });
    expect(result.visualExecutionCounts?.responseReviewedCandidateCount).toBe(1);
  });

  it("does not infer dispatch from required when the overall deadline is already expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const result = await run(input(3), { reviewDeadlineAt: Date.now() });
    expect(model).not.toHaveBeenCalled();
    expect(result.status).toBe("completed_with_timeout");
    expect(result.deadlineReached).toBe(true);
    expect(result.timedOutCount).toBe(0);
    expect(result.visualExecutionCounts).toMatchObject({ requiredCandidateCount: 3, selectedCandidateCount: 3,
      selectedPendingCandidateCount: 3, dispatchedCandidateCount: 0, timedOutCandidateCount: 0 });
    for (const row of rows(result)) expect(row.visualExecution).toMatchObject({ state: "selected_pending", reasonCode: "overall_deadline", attempts: [] });
  });

  it("leaves selected rows undispatched after the unchanged first-window match stop", async () => {
    model.mockResolvedValue(response());
    const result = await run(input(24));
    expect(model).toHaveBeenCalledTimes(20);
    expect(result.reviewedCount).toBe(20);
    expect(result.visualExecutionCounts).toMatchObject({ requiredCandidateCount: 24, selectedCandidateCount: 24,
      dispatchedCandidateCount: 20, responseReviewedCandidateCount: 20, selectedPendingCandidateCount: 4 });
    const unreached = rows(result).filter((row) => !row.visualExecution?.attempts.length);
    expect(unreached).toHaveLength(4);
    for (const row of unreached) expect(row.visualExecution).toMatchObject({ state: "selected_pending", reasonCode: "adaptive_match_target" });
  });

  it("reports adaptive queue maximum without changing its thirty-candidate cap", async () => {
    model.mockResolvedValue(response("mismatch", { rationale: "Different artwork." }));
    const result = await run(input(32));
    expect(model).toHaveBeenCalledTimes(30);
    expect(result.visualExecutionCounts).toMatchObject({ selectedCandidateCount: 32, dispatchedCandidateCount: 30, selectedPendingCandidateCount: 2 });
    expect(rows(result).filter((row) => row.visualExecution?.reasonCode === "adaptive_window_limit")).toHaveLength(2);
  });

  it("retains completed decisions while deadline skips later batches, not candidate timeouts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    let calls = 0;
    model.mockImplementation(() => {
      calls += 1;
      if (calls === 4) vi.setSystemTime(100);
      return Promise.resolve(response());
    });
    const result = await run(input(8), { reviewDeadlineAt: 50 });
    expect(model).toHaveBeenCalledTimes(4);
    expect(result.visualExecutionCounts).toMatchObject({ dispatchedCandidateCount: 4, responseReviewedCandidateCount: 4,
      selectedPendingCandidateCount: 4, timedOutCandidateCount: 0 });
    expect(rows(result).filter((row) => row.visualExecution?.identity.result === "match")).toHaveLength(4);
    expect(rows(result).filter((row) => row.visualExecution?.reasonCode === "overall_deadline")).toHaveLength(4);
  });

  it("separates synthetic unreadable from genuine candidate-bound unreadable response", async () => {
    model.mockResolvedValueOnce(response("unreadable", { rationale: "The image cannot be inspected." }))
      .mockResolvedValueOnce(reply({ reviews: [] }));
    const result = await run(input(2));
    expect(model).toHaveBeenCalledTimes(2); // Nonempty initial invalid reply does not gain a new fallback.
    expect(result.reviewedCount).toBe(2); // Legacy attached-row semantics unchanged.
    expect(result.visualExecutionCounts).toMatchObject({ dispatchedCandidateCount: 2, responseReviewedCandidateCount: 1,
      dispatchedWithoutResponseReviewCount: 1 });
    const [actual, synthetic] = result.listings;
    expect(actual.visualExecution).toMatchObject({ state: "completed", identity: { result: "manual_unknown", origin: "visual", reviewVerdict: "unreadable" } });
    expect(synthetic.visualReviewStatus).toBe("unreadable");
    expect(synthetic.visualExecution).toMatchObject({ state: "dispatched_inconclusive", reasonCode: "no_usable_decision",
      identity: { result: "manual_unknown", origin: "unknown" } });
    expect(attempts(synthetic)?.[0].outcome).toBe("no_decision");
  });

  it("keeps rough match unconfirmed despite completed execution", async () => {
    model.mockResolvedValue(response("rough_match", { rationale: "The cover is plausibly the same but cropped." }));
    const result = await run();
    expect(result.listings[0].visualExecution).toMatchObject({ state: "completed",
      identity: { result: "manual_unknown", origin: "visual", reviewVerdict: "rough_match" } });
  });

  it("retains both failed initial formats through provider_unavailable and discards raw error text", async () => {
    model.mockRejectedValueOnce(new Error("secret-like initial provider error"))
      .mockRejectedValueOnce(new Error("isolated fallback provider error"));
    const result = await run();
    expect(result.status).toBe("provider_unavailable");
    expect(result.reviews).toEqual([]);
    expect(result.reviewedCount).toBe(0);
    expect(attempts(result.listings[0])).toEqual([
      { ordinal: 1, stage: "initial", format: "json_schema", outcome: "error" },
      { ordinal: 2, stage: "initial", format: "json_object", outcome: "error" },
    ]);
    expect(result.visualExecutionCounts).toMatchObject({ dispatchedCandidateCount: 1, responseReviewedCandidateCount: 0, dispatchedWithoutResponseReviewCount: 1 });
    expect(JSON.stringify(result.listings[0].visualExecution)).not.toContain("secret-like");
  });

  it("retains completed operational receipts and unstarted selections after an unexpected outer catch", async () => {
    let clockReads = 0;
    // Actual filter completes its first batch; its next deadline read throws.
    // This controls only the clock, not filter/module/adjudication logic.
    vi.spyOn(Date, "now").mockImplementation(() => {
      clockReads += 1;
      if (clockReads === 3) throw new Error("isolated outer deadline read failure");
      return 0;
    });
    model.mockResolvedValue(response());
    const result = await run(input(8));
    expect(model).toHaveBeenCalledTimes(4);
    expect(result.status).toBe("provider_unavailable");
    expect(result.reviewedCount).toBe(0);
    expect(result.reviews).toEqual([]);
    expect(result.visualExecutionCounts).toMatchObject({ dispatchedCandidateCount: 4, responseReviewedCandidateCount: 4,
      selectedPendingCandidateCount: 4, timedOutCandidateCount: 0 });
    const dispatched = rows(result).filter((row) => row.visualExecution?.attempts.length);
    expect(dispatched).toHaveLength(4);
    for (const row of dispatched) expect(row.visualExecution).toMatchObject({ state: "completed", identity: { result: "manual_unknown", origin: "unknown" } });
    const unreached = rows(result).filter((row) => !row.visualExecution?.attempts.length);
    for (const row of unreached) expect(row.visualExecution).toMatchObject({ state: "selected_pending", reasonCode: "provider_error" });
  });

  it("records empty schema and object responses as no decision through the outer catch", async () => {
    model.mockResolvedValue(textReply(""));
    const result = await run();
    expect(model).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("provider_unavailable");
    expect(result.listings[0].visualExecution?.attempts.map((attempt) => attempt.outcome)).toEqual(["no_decision", "no_decision"]);
    expect(result.visualExecutionCounts?.responseReviewedCandidateCount).toBe(0);
  });

  it("uses actual typed timeout history and recovers through the existing object format", async () => {
    vi.useFakeTimers();
    model.mockImplementationOnce(abortingProvider).mockResolvedValueOnce(response());
    const pending = run();
    await vi.advanceTimersByTimeAsync(VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS);
    const result = await pending;
    expect(model).toHaveBeenCalledTimes(2);
    expect(attempts(result.listings[0])).toEqual([
      { ordinal: 1, stage: "initial", format: "json_schema", outcome: "timed_out" },
      { ordinal: 2, stage: "initial", format: "json_object", outcome: "usable_review" },
    ]);
    expect(result.listings[0].visualExecution?.state).toBe("completed");
    expect(result.visualExecutionCounts).toMatchObject({ dispatchedCandidateCount: 1, responseReviewedCandidateCount: 1, timedOutCandidateCount: 1 });
    expect(result.timedOutCount).toBe(0); // Existing terminal-error count deliberately unchanged.
  });

  it("reports terminal typed timeouts without counting the synthetic fallback as a response", async () => {
    vi.useFakeTimers();
    model.mockImplementation(abortingProvider);
    const pending = run();
    await vi.advanceTimersByTimeAsync(VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS * 2);
    const result = await pending;
    expect(result.status).toBe("completed_with_timeout");
    expect(result.reviewedCount).toBe(1);
    expect(result.timedOutCount).toBe(1);
    expect(result.listings[0].visualReviewStatus).toBe("unreadable");
    expect(result.listings[0].visualExecution).toMatchObject({ state: "timed_out", reasonCode: "candidate_timeout",
      identity: { result: "manual_unknown", origin: "unknown" } });
    expect(result.visualExecutionCounts).toMatchObject({ dispatchedCandidateCount: 1, responseReviewedCandidateCount: 0, timedOutCandidateCount: 1 });
  });

  it("does not classify provider prose mentioning timeout as a typed timeout", async () => {
    model.mockRejectedValue(new Error("timeout: provider unavailable"));
    const result = await run();
    expect(result.status).toBe("provider_unavailable");
    expect(result.listings[0].visualExecution?.state).toBe("dispatched_inconclusive");
    expect(result.visualExecutionCounts?.timedOutCandidateCount).toBe(0);
    expect(result.listings[0].visualExecution?.attempts.every((attempt) => attempt.outcome === "error")).toBe(true);
  });

  it("preserves a valid graded initial match when optional gallery formats fail", async () => {
    const initial = review("match", { rationale: "The graded item identity, holder, and numeric grade match.", visualEvidence: gradedEvidence });
    model.mockResolvedValueOnce(reply({ reviews: [initial] })).mockRejectedValueOnce(new Error("optional gallery unavailable"))
      .mockRejectedValueOnce(new Error("optional object unavailable"));
    const result = await run([{ title: "The Legend of Zelda NES Sealed", fullItemDetails: { gameTitle: "The Legend of Zelda", platform: "NES", sealed: "Yes", isGraded: "Yes" },
      imageUrl: "https://example.invalid/candidate.jpg", imageUrls: ["https://example.invalid/candidate.jpg", "https://example.invalid/gallery.jpg"] }], { targetMetadata: gameMetadata });
    expect(model).toHaveBeenCalledTimes(3);
    expect(result.listings[0]).toMatchObject({ visualReviewStatus: "match", visualEvidence: gradedEvidence,
      visualAudit: { initialVerdict: "match", initialRationale: initial.rationale, initialEvidence: gradedEvidence,
        decidingRationale: initial.rationale, retryStatus: "failed", finalPass: "initial", finalEvidence: gradedEvidence },
      visualExecution: { state: "dispatched_inconclusive", identity: { result: "match", origin: "visual" } } });
    expect(result.listings[0].visualExecution?.attempts.map((attempt) => [attempt.stage, attempt.outcome])).toEqual([
      ["initial", "usable_review"], ["high_resolution_retry", "error"], ["high_resolution_retry", "error"],
    ]);
    expect(result.visualExecutionCounts?.responseReviewedCandidateCount).toBe(1);
  });

  it("retains a valid optional initial match alongside terminal retry timeout", async () => {
    vi.useFakeTimers();
    model.mockResolvedValueOnce(response("match", { rationale: "The graded item identity, holder, and numeric grade match.", visualEvidence: gradedEvidence }))
      .mockImplementation(abortingProvider);
    const pending = run([{ title: "The Legend of Zelda NES Sealed", fullItemDetails: { gameTitle: "The Legend of Zelda", platform: "NES", sealed: "Yes", isGraded: "Yes" },
      imageUrl: "https://example.invalid/candidate.jpg", imageUrls: ["https://example.invalid/candidate.jpg", "https://example.invalid/gallery.jpg"] }], { targetMetadata: gameMetadata });
    await vi.advanceTimersByTimeAsync(VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS * 2);
    const result = await pending;
    expect(model).toHaveBeenCalledTimes(3);
    expect(result.listings[0].visualExecution).toMatchObject({ state: "timed_out", identity: { result: "match", origin: "visual" } });
    expect(result.listings[0].visualAudit).toMatchObject({ initialVerdict: "match", retryStatus: "failed", finalPass: "initial", finalEvidence: gradedEvidence });
    expect(result.visualExecutionCounts).toMatchObject({ responseReviewedCandidateCount: 1, timedOutCandidateCount: 1 });
  });

  it("preserves raw initial/final audit exactly through a permitted retry correction", async () => {
    const initial = review("mismatch", { rationale: "The primary image is unclear; candidate appears raw.", visualEvidence: { rawOrLooseVisible: false } });
    const finalRationale = "Grading label difference: target label reads Sealed A++ versus candidate label reads Sealed A+; the game identity otherwise matches.";
    model.mockResolvedValueOnce(reply({ reviews: [initial] })).mockResolvedValueOnce(response("unreadable", { confidence: "low", rationale: finalRationale, visualEvidence: gradedEvidence }));
    const result = await run([{ title: gameTitle, imageUrl: "https://example.invalid/game.jpg" }], { targetMetadata: gameMetadata });
    expect(model).toHaveBeenCalledTimes(2);
    expect(result.listings[0]).toMatchObject({ visualReviewStatus: "match", visualAudit: { initialVerdict: "mismatch", initialRationale: initial.rationale,
      initialEvidence: initial.visualEvidence, retryVerdict: "unreadable", retryConfidence: "low", retryRationale: finalRationale,
      decidingRationale: finalRationale, finalPass: "high_resolution_retry", finalEvidence: gradedEvidence } });
    expect(result.listings[0].visualExecution).toMatchObject({ state: "completed", identity: { result: "match", origin: "visual" } });
    expect(result.listings[0].visualExecution?.attempts.map((attempt) => attempt.stage)).toEqual(["initial", "high_resolution_retry"]);
  });

  it("does not confirm an initial graded/raw conflict when both retries fail", async () => {
    model.mockResolvedValueOnce(response("mismatch", { rationale: "The candidate is visibly raw.", visualEvidence: { ...gradedEvidence, rawOrLooseVisible: true, slabVisible: false, gradeMatches: false } }))
      .mockRejectedValueOnce(new Error("retry unavailable")).mockRejectedValueOnce(new Error("retry fallback unavailable"));
    const result = await run([{ title: gameTitle, imageUrl: "https://example.invalid/game.jpg" }], { targetMetadata: gameMetadata });
    expect(model).toHaveBeenCalledTimes(3);
    expect(result.listings[0].visualReviewStatus).not.toBe("match");
    expect(result.listings[0].visualExecution?.identity.result).not.toBe("match");
    expect(result.listings[0].visualAudit).toMatchObject({ initialVerdict: "mismatch", retryStatus: "failed", finalPass: "initial" });
  });

  it("keeps mandatory coin adjudication failure manual without inventing approval", async () => {
    model.mockResolvedValueOnce(response("match", { visualEvidence: coinEvidence })).mockRejectedValueOnce(new Error("coin retry unavailable"))
      .mockRejectedValueOnce(new Error("coin object unavailable"));
    const result = await run([{ title: "1903 Morgan Silver Dollar PCGS MS63", imageUrl: "https://example.invalid/coin.jpg" }], { targetMetadata: coinMetadata });
    expect(model).toHaveBeenCalledTimes(3);
    expect(result.listings[0].visualExecution).toMatchObject({ state: "dispatched_inconclusive", identity: { result: "manual_unknown", origin: "visual" } });
    expect(result.listings[0].evidenceDisposition).toBe("warning_review");
    expect(result.listings[0].visualAudit).toMatchObject({ initialVerdict: "match", retryStatus: "failed", adjudicationStatus: "unavailable", finalPass: "initial" });
    expect(result.visualExecutionCounts?.responseReviewedCandidateCount).toBe(1);
  });

  it("uses the actual existing compact coin retry parser without counting formats as candidates", async () => {
    model.mockResolvedValueOnce(response("match", { visualEvidence: coinEvidence }))
      .mockResolvedValueOnce(reply({ candidate: 999, visualEvidence: coinEvidence, notes: "All exact coin facts correspond." }));
    const result = await run([{ title: "1903 Morgan Silver Dollar PCGS MS63", imageUrl: "https://example.invalid/coin.jpg" }], { targetMetadata: coinMetadata });
    expect(model).toHaveBeenCalledTimes(2);
    expect(result.listings[0].visualExecution?.attempts.map((attempt) => attempt.outcome)).toEqual(["usable_review", "usable_review"]);
    expect(result.visualExecutionCounts).toMatchObject({ selectedCandidateCount: 1, dispatchedCandidateCount: 1, responseReviewedCandidateCount: 1 });
  });

  it("records the actual third Disney confirmation after typed second-pass timeout", async () => {
    vi.useFakeTimers();
    expectPinQueueFixture();
    model.mockRejectedValue(new Error("unexpected Disney-fixture model call"))
      .mockResolvedValueOnce(response("match", { visualEvidence: pinEvidence }))
      .mockImplementationOnce(abortingProvider).mockRejectedValueOnce(new Error("second format unavailable"))
      .mockResolvedValueOnce(response("match", { rationale: "Independent third confirmation completed.", visualEvidence: pinEvidence }));
    const pending = run([pinCandidate()], { targetMetadata: pinMetadata });
    await vi.advanceTimersByTimeAsync(VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS - 1);
    expect(model).toHaveBeenCalledTimes(2);
    expect(model.mock.calls[1][0].signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;
    expectDisneyRequests();
    expect(model.mock.calls[1][0].signal?.aborted).toBe(true);
    expect(result.listings).toHaveLength(1);
    expect(result.contextListings ?? []).toHaveLength(0);
    expect(attempts(result.listings[0])).toEqual([
      { ordinal: 1, stage: "initial", format: "json_schema", outcome: "usable_review" },
      { ordinal: 2, stage: "high_resolution_retry", format: "json_schema", outcome: "timed_out" },
      { ordinal: 3, stage: "high_resolution_retry", format: "json_object", outcome: "error" },
      { ordinal: 4, stage: "disney_third_confirmation", format: "json_object", outcome: "usable_review" },
    ]);
    expect(result.listings[0].visualAudit).toMatchObject({ initialVerdict: "match", retryVerdict: "match", retryRationale: "Independent third confirmation completed.",
      finalPass: "high_resolution_retry", adjudicationStatus: "confirmed" });
    expect(result.listings[0].visualExecution).toMatchObject({ state: "completed", reasonCode: "review_returned", hardExclusion: false,
      identity: { result: "match", origin: "visual" } });
    expect(result.visualExecutionCounts).toMatchObject({ inputOccurrenceCount: 1, emittedOccurrenceCount: 1, selectedCandidateCount: 1,
      dispatchedCandidateCount: 1, responseReviewedCandidateCount: 1, selectedPendingCandidateCount: 0,
      dispatchedWithoutResponseReviewCount: 0, timedOutCandidateCount: 1, coverage: "complete" });
    expect(result.timedOutCount).toBe(0); // Recovered typed timeout remains history, not a terminal candidate error.
  });

  it("records failed Disney third confirmation without using timeout as deciding evidence", async () => {
    vi.useFakeTimers();
    expectPinQueueFixture();
    model.mockRejectedValue(new Error("unexpected Disney-fixture model call"))
      .mockResolvedValueOnce(response("match", { visualEvidence: pinEvidence }))
      .mockImplementationOnce(abortingProvider).mockRejectedValueOnce(new Error("second format unavailable"))
      .mockResolvedValueOnce(reply({ reviews: [] }));
    const pending = run([pinCandidate()], { targetMetadata: pinMetadata });
    await vi.advanceTimersByTimeAsync(VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS - 1);
    expect(model).toHaveBeenCalledTimes(2);
    expect(model.mock.calls[1][0].signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;
    expectDisneyRequests();
    expect(model.mock.calls[1][0].signal?.aborted).toBe(true);
    expect(result.listings).toHaveLength(1);
    expect(attempts(result.listings[0])).toEqual([
      { ordinal: 1, stage: "initial", format: "json_schema", outcome: "usable_review" },
      { ordinal: 2, stage: "high_resolution_retry", format: "json_schema", outcome: "timed_out" },
      { ordinal: 3, stage: "high_resolution_retry", format: "json_object", outcome: "error" },
      { ordinal: 4, stage: "disney_third_confirmation", format: "json_object", outcome: "no_decision" },
    ]);
    expect(result.listings[0].visualExecution).toMatchObject({ state: "dispatched_inconclusive", reasonCode: "no_usable_decision", hardExclusion: false });
    // Existing Disney emitted verdict/attachment is preserved; this reporting
    // work deliberately does not introduce a redundant retry-admission gate.
    expect(result.listings[0].visualAudit).toMatchObject({ initialVerdict: "match", retryStatus: "failed", adjudicationStatus: "unavailable",
      finalPass: "initial", initialEvidence: pinEvidence, finalEvidence: pinEvidence });
    expect(result.listings[0].visualAudit).not.toHaveProperty("retryVerdict");
    expect(result.visualExecutionCounts).toMatchObject({ inputOccurrenceCount: 1, emittedOccurrenceCount: 1, selectedCandidateCount: 1,
      dispatchedCandidateCount: 1, responseReviewedCandidateCount: 1, selectedPendingCandidateCount: 0,
      dispatchedWithoutResponseReviewCount: 0, timedOutCandidateCount: 1, coverage: "complete" });
    expect(result.timedOutCount).toBe(0);
  });

  it("keeps a real Disney character conflict hard-held with the supported inventory type", async () => {
    expectPinQueueFixture();
    model.mockRejectedValue(new Error("hard-held Disney candidate must not dispatch"));
    const result = await run([{ ...pinCandidate(), title: "Minnie Mouse Pin",
      itemDetails: JSON.stringify({ pinName: "Minnie Mouse", character: "Minnie Mouse" }) }], { targetMetadata: pinMetadata });
    expect(model).not.toHaveBeenCalled();
    expect(result.listings).toEqual([]);
    expect(result.contextListings).toHaveLength(1);
    expect(rows(result)[0].visualExecution).toMatchObject({ state: "not_dispatched", reasonCode: "declared_identity_conflict",
      selectedForReview: false, hardExclusion: true, identity: { result: "mismatch", origin: "deterministic" }, attempts: [] });
    expect(result.reviews).toEqual([]);
    expect(result.visualExecutionCounts).toMatchObject({ inputOccurrenceCount: 1, emittedOccurrenceCount: 1,
      selectedCandidateCount: 0, dispatchedCandidateCount: 0, responseReviewedCandidateCount: 0, timedOutCandidateCount: 0, coverage: "complete" });
  });

  it("does not dispatch context workflows or manufacture missing-image calls", async () => {
    const art = await run(input(), { targetMetadata: "title=Original drawing; category=comics; itemType=original_art" });
    expect(rows(art)[0].visualExecution).toMatchObject({ reasonCode: "workflow_context_only", state: "not_dispatched", attempts: [] });
    const signed = await run([{ title: "Jane Doe signed photo JSA", imageUrl: "https://example.invalid/signed.jpg" }], {
      targetMetadata: buildVisualTargetMetadata({ title: "Jane Doe signed photo", category: "autographs", itemType: "signed_item",
        fullItemDetails: { signer: "Jane Doe", signedItemType: "Photo", authenticationCompany: "JSA" } }),
    });
    expect(rows(signed)[0].visualExecution?.reasonCode).toBe("workflow_context_only");
    const targetMissing = await run(input(), { targetImageUrl: null });
    expect(rows(targetMissing)[0].visualExecution).toMatchObject({ state: "selected_pending", reasonCode: "target_image_unavailable", attempts: [] });
    const candidateMissing = await run([{ title: "Example collectible" }]);
    expect(rows(candidateMissing)[0].visualExecution).toMatchObject({ state: "not_dispatched", reasonCode: "candidate_image_unavailable", attempts: [] });
    expect(model).not.toHaveBeenCalled();
  });

  it("keeps score/cap exclusions report-only and preserves the existing rank population", async () => {
    model.mockResolvedValue(response("mismatch", { rationale: "The candidate does not show the same coin.", visualEvidence: { identityMatches: false, dateMatches: false, varietyMatches: false, denominationMatches: false } }));
    const targetMetadata = buildVisualTargetMetadata({ title: "1903-S Morgan Silver Dollar PCGS MS63 First Strike", category: "coins", itemType: "single_coin",
      grade: "MS63", certificationCompany: "PCGS", fullItemDetails: { series: "Morgan Dollar", year: "1903", denomination: "1 Dollar", mintMark: "S",
        variety: "Morgan", designation: "First Strike", composition: "Silver", country: "United States" } });
    const itemDetails = JSON.stringify({ series: "Morgan Dollar", year: "1903", denomination: "1 Dollar", mintMark: "S", variety: "Morgan",
      designation: "First Strike", composition: "Silver", country: "United States" });
    const result = await run(Array.from({ length: 9 }, (_, index) => ({ title: `1903-S Morgan Silver Dollar PCGS MS63 First Strike listing ${index + 1}`,
      itemDetails, imageUrl: `https://example.invalid/coin-${index}.jpg` })), { targetMetadata });
    expect(model).toHaveBeenCalledTimes(16);
    expect(result.reviewedCount).toBe(8);
    expect(result.visualExecutionCounts).toMatchObject({ inputOccurrenceCount: 9, selectedCandidateCount: 8, dispatchedCandidateCount: 8, responseReviewedCandidateCount: 8 });
    const excluded = rows(result).find((row) => row.metadataMatchRank === 9);
    expect(excluded).toMatchObject({ metadataMatchScore: 100, visualExecution: { reasonCode: "selection_excluded", hardExclusion: false, attempts: [] } });
    expect(rows(result).map((row) => row.metadataRanking?.populationSize)).toEqual(Array(9).fill(9));
    expect(rows(result)).toHaveLength(9);
    expect(rows(result).filter((row) => row.visualExecution?.reasonCode === "selection_excluded")).toHaveLength(1);
    const dispatched = rows(result).filter((row) => row.visualExecution?.attempts.length);
    expect(dispatched).toHaveLength(8);
    for (const row of dispatched) expect(attempts(row)).toEqual([
      { ordinal: 1, stage: "initial", format: "json_schema", outcome: "usable_review" },
      { ordinal: 2, stage: "high_resolution_retry", format: "json_schema", outcome: "usable_review" },
    ]);
  });

  it("keeps standalone attachment execution unknown despite audit, required and caller counts", () => {
    const result = applyVisualSourceReviews<VisualSourceCandidate>([{ title: "Example collectible", visualRequirement: "required",
      visualExecution: { ...createNotDispatchedVisualExecution("selection_excluded"), state: "completed" as const } }],
    [review("match", { candidateIndex: 0, visualAudit: { imageCount: 1, initialVerdict: "match", initialConfidence: "high", retryStatus: "performed", finalPass: "high_resolution_retry" } })], 99);
    expect(result.listings[0].visualReviewStatus).toBe("match");
    expect(result.reviewedCount).toBe(1);
    expect(result.retainedUnreviewedCount).toBe(98);
    expect(result.listings[0].visualExecution).toMatchObject({ state: "unknown", reasonCode: "legacy_unknown", attempts: [],
      identity: { result: "match", origin: "unknown" } });
    expect(summarizeVisualExecutionOccurrences(result.listings, 1)).toMatchObject({ coverage: "unknown", requiredCandidateCount: 1,
      dispatchedCandidateCount: 0, responseReviewedCandidateCount: 0, unknownExecutionCandidateCount: 1 });
  });

  it("counts overlapping projections once but leaves distinct source/run/retained occurrences distinct", async () => {
    model.mockResolvedValue(response());
    const result = await run(input(2));
    const summary = summarizeVisualExecutionOccurrences([...result.listings, result.listings[0]], 2);
    expect(summary).toMatchObject({ inputOccurrenceCount: 2, emittedOccurrenceCount: 2, dispatchedCandidateCount: 2, coverage: "complete" });
    const anotherRun = { ...result.listings[0], metadataRanking: { ...result.listings[0].metadataRanking!, populationId: "another-run" } };
    expect(summarizeVisualExecutionOccurrences([...result.listings, anotherRun], 3).emittedOccurrenceCount).toBe(3);
  });

  it("emits outer producer holds without any prose-based or eligibility effects", () => {
    const receipt = createNotDispatchedVisualExecution("outer_identity_filter", { hardExclusion: true,
      identity: { result: "mismatch", origin: "deterministic" } });
    expect(receipt).toMatchObject({ state: "not_dispatched", selectedForReview: false, hardExclusion: true, attempts: [] });
    expect(createNotDispatchedVisualExecution("outer_metadata_hold").identity).toEqual({ result: "not_established", origin: "none" });
    expect(createNotDispatchedVisualExecution("outer_replica_hold", { hardExclusion: true }).attempts).toEqual([]);
    expect(receipt).not.toHaveProperty("evidenceDisposition");
    expect(receipt).not.toHaveProperty("valuationEligible");
  });
});
