import { invokeLLM, type ImageContent, type TextContent } from "./_core/llm";
import { parseAnalyzerResponse } from "./testAiResponse";
import { findMaterialMetadataConflicts, metadataConflictReviewReason } from "../shared/testAiMetadataConflict";

export type VisualSourceCandidate = {
  title?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[];
  [key: string]: unknown;
};
export type VisualEvidence = {
  slabVisible: boolean;
  gradingLabelVisible: boolean;
  graderVisible: boolean;
  numericGradeVisible: boolean;
  gradeMatches: boolean;
  rawOrLooseVisible: boolean;
};
export type VisualSourceReview = {
  candidateIndex: number;
  verdict: "match" | "rough_match" | "mismatch" | "unreadable";
  confidence: "high" | "medium" | "low";
  rationale: string;
  visualEvidence?: VisualEvidence;
  visualAudit?: {
    imageCount: number;
    initialVerdict: VisualSourceReview["verdict"] | "no_decision";
    initialConfidence: VisualSourceReview["confidence"] | "no_decision";
    retryStatus: "not_needed" | "performed" | "failed";
    retryReason?: string;
    finalPass: "initial" | "high_resolution_retry";
    initialEvidence?: VisualEvidence;
    finalEvidence?: VisualEvidence;
  };
};
export type VisualSourceFilterResult<T extends VisualSourceCandidate> = {
  listings: T[];
  contextListings?: T[];
  preVisualExcludedCount?: number;
  status:
    | "applied"
    | "completed_with_timeout"
    | "skipped_no_target_image"
    | "skipped_no_candidate_images"
    | "provider_unavailable";
  reviewedCount: number;
  removedCount: number;
  retainedUnreviewedCount: number;
  timedOutCount?: number;
  deadlineReached?: boolean;
  reviews: VisualSourceReview[];
  note: string;
};

export const VISUAL_REVIEW_BATCH_SIZE = 20;
export const VISUAL_REVIEW_TARGET_MATCHES = 3;
export const VISUAL_REVIEW_MAX_CANDIDATES = 30;
export const VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS = 20_000;
export const VISUAL_REVIEW_OVERALL_DEADLINE_MS = 120_000;

const VERDICTS = new Set(["match", "rough_match", "mismatch", "unreadable"]);
const CONFIDENCES = new Set(["high", "medium", "low"]);
const RETRY_STATUSES = new Set(["not_needed", "performed", "failed"]);
const FINAL_PASSES = new Set(["initial", "high_resolution_retry"]);

function safeHttps(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

/** Prefer eBay's largest hosted image variant when a provider gives us a thumbnail. */
export function promoteEbayImageUrl(value: unknown): string | null {
  const url = safeHttps(value);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!/(?:^|\.)ebayimg\.com$/i.test(parsed.hostname)) return url;
    parsed.pathname = parsed.pathname.replace(/\/s-l\d+(?=\.[a-z0-9]+$)/i, "/s-l1600");
    return parsed.toString();
  } catch {
    return url;
  }
}

const EMBEDDED_EBAY_REVIEW_IMAGE_MAX_BYTES = 2_000_000;
const EMBEDDED_EBAY_REVIEW_IMAGE_TIMEOUT_MS = 6_000;

/**
 * The provider thumbnail and its promoted URL can resolve differently for a
 * downstream vision fetch. For a narrow, grading-conflict retry, embed the
 * already-promoted eBay image bytes so the model receives the exact pixels
 * inspected by the server. Non-eBay URLs stay remote to avoid broadening the
 * server-side fetch surface.
 */
export async function embedPromotedEbayImageForReview(
  value: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const promoted = promoteEbayImageUrl(value);
  if (!promoted) return null;
  let parsed: URL;
  try {
    parsed = new URL(promoted);
  } catch {
    return null;
  }
  if (!/(?:^|\.)ebayimg\.com$/i.test(parsed.hostname)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBEDDED_EBAY_REVIEW_IMAGE_TIMEOUT_MS);
  try {
    const response = await fetchImpl(promoted, {
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (!contentType || !/^image\/(?:jpeg|jpg|png|webp)$/i.test(contentType)) return null;
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > EMBEDDED_EBAY_REVIEW_IMAGE_MAX_BYTES) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.byteLength > EMBEDDED_EBAY_REVIEW_IMAGE_MAX_BYTES) return null;
    return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

class VisualReviewTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisualReviewTimeoutError";
  }
}

async function invokeVisualReview(
  params: Parameters<typeof invokeLLM>[0],
  timeoutMs: number,
): Promise<Awaited<ReturnType<typeof invokeLLM>>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await invokeLLM({ ...params, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new VisualReviewTimeoutError(`Visual review exceeded the ${timeoutMs / 1000}-second per-candidate limit.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

type GradingConflictArgs = {
  imageCount: number;
  review?: Pick<VisualSourceReview, "verdict" | "confidence" | "rationale">;
  title?: string | null;
  targetMetadata: string;
};

export function hasTitleDeclaredGradeVisualRawConflict(args: Omit<GradingConflictArgs, "imageCount">): boolean {
  if (!args.review) return false;
  const targetIsGraded = !hasExplicitlyUngradedTarget(args.targetMetadata) && /(?:^|;)\s*(?:grade|certificationCompany)=[^;]+/i.test(args.targetMetadata) && !/(?:^|;)\s*(?:grade|certificationCompany)=(?:unknown|raw|ungraded|none|n\/a)\s*(?:;|$)/i.test(args.targetMetadata);
  // A first-pass mismatch for a graded target is not final until a focused
  // high-resolution pass checks the holder, label, grader, and grade. We do
  // not rely on a marketplace title or model wording to activate this: those
  // fields can be omitted, stale, or attached to a different provider card.
  // The retry remains one extra bounded call and still fails closed.
  return targetIsGraded && args.review.verdict === "mismatch";
}

export function shouldReviewAdditionalVisualImages(args: GradingConflictArgs): boolean {
  if (args.imageCount <= 0 || !args.review) return false;
  const targetIsGraded = !hasExplicitlyUngradedTarget(args.targetMetadata) && /(?:^|;)\s*(?:grade|certificationCompany)=[^;]+/i.test(args.targetMetadata) && !/(?:^|;)\s*(?:grade|certificationCompany)=(?:unknown|raw|ungraded|none|n\/a)\s*(?:;|$)/i.test(args.targetMetadata);
  const titleHasGrade = /\b(?:grade|graded|score|rating)\s*(?:is|of|:)?\s*\d{1,3}(?:\.\d+)?\b|\b(?:PSA|AFA|CGC|CBCS|BGS|SGC|PCGS|NGC|WATA|VGA)\s*\d{1,3}(?:\.\d+)?\b/i.test(String(args.title ?? ""));
  const uncertainty = /\b(?:unreadable|unclear|obscured|not visible|not readable|cannot (?:see|read|confirm)|can't (?:see|read|confirm)|unable to confirm|conflicting|low[- ]confidence|manual review)\b/i.test(args.review.rationale);
  const gradedRawConflict = hasTitleDeclaredGradeVisualRawConflict(args);
  const unresolvedLabelField = explicitTargetLabelFields(args.targetMetadata).some((field) => !labelFieldEvidence(String(args.title ?? ""), args.review!.rationale, field.value));
  // A single provider image still receives one promoted high-resolution retry
  // for a graded-target mismatch. Ordinary one-image candidates retain the
  // existing single-pass behavior.
  if (args.imageCount <= 1) return gradedRawConflict;
  return args.review.verdict === "unreadable" || args.review.confidence === "low" || uncertainty || gradedRawConflict || (targetIsGraded && !titleHasGrade) || unresolvedLabelField;
}

export function normalizeVisualSourceReviews(
  payload: unknown,
  length: number
): VisualSourceReview[] {
  const rows = Array.isArray((payload as any)?.reviews)
    ? (payload as any).reviews
    : [];
  return rows
    .map((row: any) => ({
      candidateIndex: Number(row?.candidateIndex),
      verdict: row?.verdict,
      confidence: row?.confidence,
      // Keep the complete model explanation for the review panel. The previous
      // 240-character cap cut rationales off mid-sentence before the UI could
      // wrap or expand them.
      rationale:
        typeof row?.rationale === "string" ? row.rationale.trim() : "",
      visualEvidence: row?.visualEvidence && typeof row.visualEvidence === "object"
        ? {
            slabVisible: row.visualEvidence.slabVisible === true,
            gradingLabelVisible: row.visualEvidence.gradingLabelVisible === true,
            graderVisible: row.visualEvidence.graderVisible === true,
            numericGradeVisible: row.visualEvidence.numericGradeVisible === true,
            gradeMatches: row.visualEvidence.gradeMatches === true,
            rawOrLooseVisible: row.visualEvidence.rawOrLooseVisible === true,
          }
        : undefined,
      visualAudit: row?.visualAudit && typeof row.visualAudit === "object" && RETRY_STATUSES.has(row.visualAudit.retryStatus) && FINAL_PASSES.has(row.visualAudit.finalPass)
        ? {
            imageCount: Number.isInteger(row.visualAudit.imageCount) && row.visualAudit.imageCount >= 0 ? row.visualAudit.imageCount : 0,
            initialVerdict: VERDICTS.has(row.visualAudit.initialVerdict) ? row.visualAudit.initialVerdict : "no_decision",
            initialConfidence: CONFIDENCES.has(row.visualAudit.initialConfidence) ? row.visualAudit.initialConfidence : "no_decision",
            retryStatus: row.visualAudit.retryStatus,
            retryReason: typeof row.visualAudit.retryReason === "string" ? row.visualAudit.retryReason.trim() : undefined,
            finalPass: row.visualAudit.finalPass,
            initialEvidence: row.visualAudit.initialEvidence && typeof row.visualAudit.initialEvidence === "object"
              ? {
                  slabVisible: row.visualAudit.initialEvidence.slabVisible === true,
                  gradingLabelVisible: row.visualAudit.initialEvidence.gradingLabelVisible === true,
                  graderVisible: row.visualAudit.initialEvidence.graderVisible === true,
                  numericGradeVisible: row.visualAudit.initialEvidence.numericGradeVisible === true,
                  gradeMatches: row.visualAudit.initialEvidence.gradeMatches === true,
                  rawOrLooseVisible: row.visualAudit.initialEvidence.rawOrLooseVisible === true,
                }
              : undefined,
            finalEvidence: row.visualAudit.finalEvidence && typeof row.visualAudit.finalEvidence === "object"
              ? {
                  slabVisible: row.visualAudit.finalEvidence.slabVisible === true,
                  gradingLabelVisible: row.visualAudit.finalEvidence.gradingLabelVisible === true,
                  graderVisible: row.visualAudit.finalEvidence.graderVisible === true,
                  numericGradeVisible: row.visualAudit.finalEvidence.numericGradeVisible === true,
                  gradeMatches: row.visualAudit.finalEvidence.gradeMatches === true,
                  rawOrLooseVisible: row.visualAudit.finalEvidence.rawOrLooseVisible === true,
                }
              : undefined,
          }
        : undefined,
    }))
    .filter(
      (row: VisualSourceReview) =>
        Number.isInteger(row.candidateIndex) &&
        row.candidateIndex >= 0 &&
        row.candidateIndex < length &&
        VERDICTS.has(row.verdict) &&
        CONFIDENCES.has(row.confidence) &&
        row.rationale.length > 0
    )
    .filter(
      (row: VisualSourceReview, index: number, all: VisualSourceReview[]) =>
        all.findIndex((other: VisualSourceReview) => other.candidateIndex === row.candidateIndex) === index
    );
}

/**
 * Each LLM request in the bounded review loop contains exactly one candidate.
 * Its returned candidateIndex is therefore untrusted presentation metadata,
 * not an identity key. Pin the selected response to the candidate actually
 * sent to vision, preventing a malformed index from crossing two listings.
 */
export function normalizeSingleCandidateVisualReview(
  payload: unknown,
  listingCount: number,
  expectedCandidateIndex: number,
): VisualSourceReview[] {
  const rawRows = Array.isArray((payload as { reviews?: unknown })?.reviews)
    ? (payload as { reviews: unknown[] }).reviews
    : [];
  // Do not let a malformed, stale, or out-of-range model index discard an
  // otherwise valid review. The request itself is the authoritative binding.
  const reviews = normalizeVisualSourceReviews(
    { reviews: rawRows.map((row) => ({ ...(row as Record<string, unknown>), candidateIndex: expectedCandidateIndex })) },
    listingCount,
  );
  return reviews.slice(0, 1);
}

function isComicMetadata(metadata: string): boolean {
  return metadata.match(/(?:^|;)\s*category=([^;]*)/i)?.[1]?.trim().toLowerCase() === "comics";
}

export function conservativeComicVisualReviews(
  reviews: VisualSourceReview[],
  listings: VisualSourceCandidate[],
  targetMetadata: string,
): VisualSourceReview[] {
  if (!isComicMetadata(targetMetadata)) return reviews;
  return reviews.map((review) => {
    const candidateTitle = String(listings[review.candidateIndex]?.title ?? "");
    const rationale = review.rationale;
    const uncertainImage = /\b(?:low[- ]resolution|blurry|unclear|obscured|not visible|cannot (?:see|read)|can't (?:see|read)|appears raw|looks raw)\b/i.test(rationale);
    const candidateDeclaresGrade = /\b(?:cgc|cbcs|pgx|psa|graded|9\.\d|10\.0)\b/i.test(candidateTitle);
    if (review.verdict === "mismatch" && uncertainImage && candidateDeclaresGrade) {
      return {
        ...review,
        verdict: "unreadable",
        confidence: "low",
        rationale: `${rationale} Because the candidate metadata declares a graded comic but the image is unclear, this is downgraded to unreadable/manual review rather than a definitive mismatch.`,
      };
    }
    if ((review.verdict === "match" || review.verdict === "rough_match") && !/\b(?:exact(?:ly)?|same issue|issue number matches|cover art corresponds|identical cover)\b/i.test(rationale)) {
      return {
        ...review,
        verdict: "unreadable",
        confidence: "low",
        rationale: `${rationale} The model did not provide sufficient exact-issue or cover-art confirmation; retained for manual review rather than accepted as a visual match.`,
      };
    }
    return review;
  });
}

function metadataValue(metadata: string, key: string): string {
  return metadata.match(new RegExp(`(?:^|;)\\s*${key}=([^;]*)`, "i"))?.[1]?.trim() ?? "";
}

function metadataDetails(metadata: string): Record<string, unknown> {
  const raw = metadataValue(metadata, "fullItemDetails") || metadataValue(metadata, "itemDetails") || metadataValue(metadata, "details");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/** An explicit user-selected Is graded = No is authoritative over model inference. */
export function hasExplicitlyUngradedTarget(metadata: string): boolean {
  const direct = metadataValue(metadata, "isGraded").toLowerCase();
  const details = metadataDetails(metadata);
  const nested = String(details.isGraded ?? details.graded ?? "").trim().toLowerCase();
  return [direct, nested].some((value) => value === "no" || value === "false" || value === "0");
}

function explicitUngradedTargetInstruction(metadata: string): string {
  return hasExplicitlyUngradedTarget(metadata)
    ? " IMPORTANT TARGET CONSTRAINT: the user's structured metadata explicitly says Is graded = No. Treat the target as raw/ungraded for this review. Do not infer that the target is graded from a holder-like appearance, an ambiguous image, or contradictory model wording. Grade and certification matching are not required; compare the item's identity, artwork, packaging, edition, and variant instead. If both images are visibly raw/ungraded and the item identity matches, do not downgrade the result solely because the rationale mentions a graded-target rule."
    : "";
}

function normalizedGrade(value: string): string | null {
  const match = value.match(/\d{1,3}(?:\.\d+)?/);
  if (!match) return null;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? String(numeric) : match[0];
}

function candidateGradeEvidence(title: string, rationale: string, targetGrade: string, grader: string): boolean {
  const targetNumericGrade = normalizedGrade(targetGrade);
  const candidateText = `${title} ${rationale}`;
  const gradeMentioned = /\b(?:grade|graded|score|rating)\b/i.test(candidateText) || Boolean(grader && new RegExp(`\b${grader}\b`, "i").test(candidateText));
  if (!gradeMentioned) return false;
  if (!targetNumericGrade) return /\b(?:grade|graded|score|rating)\b\s*(?:is|of|:)?\s*\d{1,3}(?:\.\d+)?/i.test(candidateText);
  const numeric = targetNumericGrade.replace(".", "\\.");
  const gradeWords = "(?:grade|graded|score|rating)";
  const graderWord = grader ? `|${grader.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}` : "";
  return new RegExp(`(?:\\b(?:${gradeWords}${graderWord})\\b[^0-9]{0,24}(?:^|[^0-9])${numeric}(?:\\.0+)?(?:$|[^0-9])|(?:^|[^0-9])${numeric}(?:\\.0+)?(?:$|[^0-9])[^0-9]{0,12}\\b(?:${gradeWords}${graderWord})\\b)`, "i").test(candidateText);
}

function explicitTargetLabelFields(metadata: string): Array<{ label: string; value: string }> {
  const details = metadataDetails(metadata);
  const entries: Array<[string, unknown]> = [
    ['grade qualifier / label designation', details.gradeQualifier ?? details.qualifier ?? details.gradeDesignation],
    ['comic certification label status', details.certificationLabelStatus ?? details.labelStatus],
  ];
  return entries.flatMap(([label, raw]) => {
    const value = String(raw ?? '').trim();
    return value && !/^(unknown|none|n\/?a)$/i.test(value) ? [{ label, value }] : [];
  });
}

function labelFieldEvidence(title: string, rationale: string, expected: string): boolean {
  const escaped = expected.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, 'i').test(`${title} ${rationale}`);
}

/** A graded target requires readable candidate-grade evidence; holder similarity alone is insufficient. */
export function conservativeGradedVisualReviews(
  reviews: VisualSourceReview[],
  listings: VisualSourceCandidate[],
  targetMetadata: string,
): VisualSourceReview[] {
  if (hasExplicitlyUngradedTarget(targetMetadata)) return reviews;
  const targetGrade = metadataValue(targetMetadata, "grade");
  const targetGrader = metadataValue(targetMetadata, "certificationCompany");
  const targetLabelFields = explicitTargetLabelFields(targetMetadata);
  const targetIsGraded = Boolean(targetGrade && targetGrade.toLowerCase() !== "unknown") || Boolean(targetGrader && targetGrader.toLowerCase() !== "unknown");
  if (!targetIsGraded) return reviews;
  return reviews.map((review) => {
    const title = String(listings[review.candidateIndex]?.title ?? "");
    const gradeEvidence = candidateGradeEvidence(title, review.rationale, targetGrade, targetGrader);
    const structuredEvidence = review.visualEvidence;
    const visualGradeEvidence = Boolean(structuredEvidence &&
      structuredEvidence.slabVisible &&
      structuredEvidence.gradingLabelVisible &&
      structuredEvidence.graderVisible &&
      structuredEvidence.numericGradeVisible &&
      structuredEvidence.gradeMatches &&
      !structuredEvidence.rawOrLooseVisible
    );
    const titleDeclaresGraded = /\b(?:PSA|AFA|CGC|CBCS|BGS|SGC|PCGS|NGC|WATA|VGA)\s*(?:graded\s*)?\d{1,3}(?:\.\d+)?\b|\b(?:graded|slabbed|encapsulated)\b/i.test(title);
    const imageClaimsRaw = /\b(?:raw|ungraded|loose|un[- ]slabbed|no slab|no holder|no certification|no grade|grade (?:is )?not visible)\b/i.test(review.rationale);
    const unresolvedLabelField = targetLabelFields.find((field) => !labelFieldEvidence(title, review.rationale, field.value));
    const explicitGradeConfirmation = /\b(?:grade|numeric|descriptive)\b.{0,90}\b(?:clearly?\s+)?(?:readable|visible|confirmed|matches|match)\b/i.test(review.rationale);
    const explicitGradeConflict = /\b(?:not\s+(?:clearly\s+)?(?:readable|visible|verified)|unreadable|unclear|obscured|cannot|can't|unable|conflict(?:ing)?)\b/i.test(review.rationale);
    if ((review.verdict === "match" || review.verdict === "rough_match") && gradeEvidence && visualGradeEvidence && !unresolvedLabelField) return review;
    if (review.verdict === "mismatch" && titleDeclaresGraded && imageClaimsRaw) {
      return {
        ...review,
        verdict: "unreadable",
        confidence: "low",
        rationale: `${review.rationale} The candidate title declares a graded item, but the image interpretation conflicts with that evidence; retained for additional-image/manual review rather than finalized as a graded-versus-raw mismatch.`,
      };
    }
    if (review.verdict === "unreadable" && gradeEvidence && explicitGradeConfirmation && !explicitGradeConflict) {
      return {
        ...review,
        verdict: "match",
        confidence: review.confidence === "low" ? "medium" : review.confidence,
        rationale: `${review.rationale} The title and gallery review explicitly confirm the target grader and equivalent numeric grade, so this is eligible for visual identity consideration.` ,
      };
    }
    if (review.verdict !== "match" && review.verdict !== "rough_match") return review;
    return {
      ...review,
      verdict: "unreadable",
      confidence: "low",
      rationale: unresolvedLabelField
        ? `${review.rationale} The target declares ${unresolvedLabelField.label} “${unresolvedLabelField.value}”, but the candidate title or image review does not explicitly verify it; retained for manual review rather than sent as a confirmed visual match.`
        : `${review.rationale} The target is graded, but the candidate's numeric or descriptive grade is not clearly verified and the candidate's slab, label, grader, numeric grade, or raw/ungraded state is not fully verified by structured visual evidence; retained for manual review rather than sent as a confirmed visual match.`,
    };
  });
}

/**
 * Correct a contradictory model explanation for an explicitly ungraded target.
 * This remains narrow: both raw/ungraded states and a visual identity match must
 * be present, while material conflicts remain manual review.
 */
export function normalizeExplicitUngradedVisualReviews(
  reviews: VisualSourceReview[],
  targetMetadata: string,
): VisualSourceReview[] {
  if (!hasExplicitlyUngradedTarget(targetMetadata)) return reviews;
  return reviews.map((review) => {
    if (review.verdict !== "unreadable") return review;
    const rationale = review.rationale;
    const rawMentions = rationale.match(/\b(?:raw|ungraded)\b/gi)?.length ?? 0;
    const identityMatch = /\b(?:matches?|same|corresponds|visually match(?:es)?|artwork|packaging|layout).{0,220}\b(?:match|matches|same|corresponds|identical|confirmed)\b/i.test(rationale);
    const unresolvedConflict = /\b(?:different item|different edition|different variant|materially different|conflict(?:ing)?|cannot identify|unable to determine|not enough information)\b/i.test(rationale);
    if (rawMentions < 2 || !identityMatch || unresolvedConflict) return review;
    return {
      ...review,
      verdict: "match",
      confidence: review.confidence === "low" ? "medium" : review.confidence,
      rationale: `${rationale} The structured target metadata explicitly says Is graded = No, and the review confirms both items are raw/ungraded; the graded-target warning is therefore not applicable.`,
    };
  });
}

export function applyVisualSourceReviews<T extends VisualSourceCandidate>(
  listings: T[],
  reviews: VisualSourceReview[],
  reviewedCandidateCount: number
) {
  const reviewsByIndex = new Map(reviews.map(review => [review.candidateIndex, review]));
  return {
    // Visual review is deliberately non-destructive. A model flag provides
    // review provenance; only a separately established objective identity
    // conflict may exclude the candidate from deterministic valuation.
    listings: listings.map((listing, index) => {
      const review = reviewsByIndex.get(index);
      if (!review) return listing;
      return {
        ...listing,
        visualReviewStatus: review.verdict,
        visualReviewRationale: review.rationale,
        ...(review.visualAudit ? { visualAudit: review.visualAudit } : {}),
        ...(review.verdict === "mismatch" ? { evidenceDisposition: "warning_review" } : {}),
      } as T;
    }),
    reviewedCount: reviews.length,
    removedCount: 0,
    retainedUnreviewedCount: Math.max(
      0,
      reviewedCandidateCount - reviews.length
    ),
  };
}

const DECLARED_VARIANT_PATTERNS = [
  /\bmexican\b/i,
  /\bcanadian\b/i,
  /\b(?:foil|holofoil|chrome)\b/i,
  /\b(?:reprint|facsimile)\b/i,
  /\b(?:\d+(?:st|nd|rd|th)|second|third|fourth|fifth|sixth)\s+printing\b/i,
  /\b(?:variant|incentive|exclusive|virgin|blank cover|sketch cover|edition)\b/i,
  /\b(?:signed|autographed|signature)\b/i,
];

function extractTargetTitle(metadata: string): string {
  return metadata.match(/(?:^|;)\s*title=([^;]*)/i)?.[1]?.trim() ?? "";
}

function extractTargetItemDetails(metadata: string): Record<string, unknown> {
  const raw = metadata.match(/(?:^|;)\s*(?:fullItemDetails|itemDetails|details|catalog)=(.*)$/i)?.[1]?.trim();
  if (!raw || raw.toLowerCase() === "unknown") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function gradedCoinInstruction(metadata: string): string {
  const category = metadata.match(/(?:^|;)\s*category=([^;]*)/i)?.[1]?.trim().toLowerCase();
  const grade = metadata.match(/(?:^|;)\s*grade=([^;]*)/i)?.[1]?.trim().toLowerCase();
  const certificationCompany = metadata.match(/(?:^|;)\s*certificationCompany=([^;]*)/i)?.[1]?.trim().toLowerCase();
  const isGraded = Boolean(grade && grade !== "unknown") || Boolean(certificationCompany && certificationCompany !== "unknown");
  return category === "coins" && isGraded
    ? " For graded coins, certificate IDs/numbers are unique to each individual coin and must be ignored completely for visual matching: never mark a coin mismatch because the visible certificate ID differs, and never require the IDs to match. Compare the coin's visible design, date, mint mark, denomination, variety, holder/grading company, and grade instead."
    : "";
}

export function sportsCardSetInstruction(metadata: string): string {
  const category = metadata.match(/(?:^|;)\s*category=([^;]*)/i)?.[1]?.trim().toLowerCase();
  const itemType = metadata.match(/(?:^|;)\s*itemType=([^;]*)/i)?.[1]?.trim().toLowerCase().replace(/[ -]+/g, "_") ?? "";
  const isSet = category === "sports_cards" && (itemType === "set" || itemType.endsWith("_set"));
  return isSet
    ? " For a sports-card set target, item form is a mandatory identity gate: compare whether the target is a multi-card set, team/set product, or other multi-card presentation versus a single loose or individually slabbed card. If the target visibly contains multiple cards or set packaging and the candidate visibly contains one individual card, mark mismatch with high confidence even when the player, year, brand, grade, or price matches. If the set-versus-single form cannot be determined from the images, use unreadable/manual review rather than match."
    : "";
}

function normalizedChoice(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[ _-]+/g, "_");
}

type VintageToyPackagingForm = "carded" | "loose" | "unknown";

function vintageToyPackagingForm(value: unknown): VintageToyPackagingForm {
  const normalized = normalizedChoice(value);
  if (/carded|on_card|blister(?:_card|_pack)?/.test(normalized)) return "carded";
  if (/loose|unboxed|no_box/.test(normalized)) return "loose";
  return "unknown";
}

function vintageToyPackagingConflict(targetMetadata: string, candidateTitle: string): string | null {
  if (normalizedChoice(metadataValue(targetMetadata, "category")) !== "vintage_toys") return null;
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const targetTitle = extractTargetTitle(targetMetadata);
  const targetForm = vintageToyPackagingForm(targetDetails.packagingType ?? targetDetails.packageType ?? targetTitle);
  const candidateForm = vintageToyPackagingForm(candidateTitle);
  if (targetForm === "unknown" || candidateForm === "unknown" || targetForm === candidateForm) return null;
  return `Vintage-toy packaging form differs: target is ${targetForm}, but the candidate title explicitly indicates ${candidateForm}.`;
}

function vintageToyPackagingInstruction(metadata: string): string {
  if (normalizedChoice(metadataValue(metadata, "category")) !== "vintage_toys") return "";
  const details = extractTargetItemDetails(metadata);
  const targetTitle = extractTargetTitle(metadata);
  const targetForm = vintageToyPackagingForm(details.packagingType ?? details.packageType ?? targetTitle);
  if (targetForm === "unknown") return "";
  return ` For this vintage-toy target, packaging form is a mandatory identity gate: the target is explicitly ${targetForm}. A carded/on-card/blister-card figure is not the same form as a loose/unboxed figure, even when both are graded, share the same grader and numeric grade, or show the same character. Mark an explicit opposite-form candidate as mismatch with high confidence; if the packaging form cannot be determined, use unreadable/manual review.`;
}

function videoGameFormInstruction(metadata: string): string {
  if (normalizedChoice(metadataValue(metadata, "category")) !== "video_games") return "";
  return " For a video-game target, item form is a mandatory identity gate: sealed, CIB/complete-in-box, boxed-only, loose/raw, and parts-only are distinct comparable cohorts even when the title, cover, grader, and numeric grade match. A candidate label that visibly says CIB is not the same as a target label that visibly says Sealed. Inspect both labels and return a high-confidence mismatch for a confirmed sealed-versus-CIB or sealed-versus-raw difference. If the target's structured title/details say CIB or Complete in Box while its visible holder label says Sealed, do not guess which target form is authoritative: return unreadable/manual review because the target identity itself conflicts. Never call a candidate a visual match until the target form and candidate form are both explicit and equal.";
}

function focusedVideoGameLabelInstruction(metadata: string): string {
  if (normalizedChoice(metadataValue(metadata, "category")) !== "video_games") return "";
  return " VIDEO-GAME LABEL CHECK: read the printed form designation on each visible grading label before deciding. Examples include Sealed, Sealed A, CIB, Complete in Box, Boxed, or Qualified. A clear PSA slab whose label says CIB is a graded CIB game—not a raw or loose cartridge. A clear PSA slab whose label says Sealed or Sealed A is a graded sealed game—not CIB. If both labels and 9.0 grade are visible but one says Sealed and the other says CIB, return mismatch because the forms differ; never call either image raw.";
}

/**
 * Marketplace titles sometimes declare a different printing or regional edition
 * more clearly than the thumbnail. These are transparent identity warnings, not
 * silent deletions and not a replacement for the AI image comparison.
 */
export function buildDeclaredIdentityReviews<T extends VisualSourceCandidate>(
  listings: T[],
  targetMetadata: string,
): VisualSourceReview[] {
  const targetTitle = extractTargetTitle(targetMetadata).toLowerCase();
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const targetFacsimile = normalizedChoice(targetDetails.facsimile);
  const targetDistribution = normalizedChoice(targetDetails.distributionType);
  return listings.flatMap((listing, candidateIndex) => {
    const title = String(listing.title ?? "");
    const conflict = DECLARED_VARIANT_PATTERNS.find((pattern) => pattern.test(title) && !pattern.test(targetTitle));
    const phrase = conflict ? (title.match(conflict)?.[0] ?? "declared variant") : null;
    const candidateIsNewsstand = /\bnewsstand(?:\s+edition)?\b/i.test(title);
    const candidateIsDirect = /\b(?:direct\s+market|direct\s+edition)\b/i.test(title);
    const distributionConflict =
      (targetDistribution === "direct" && candidateIsNewsstand) ||
      (targetDistribution === "newsstand" && candidateIsDirect);
    const distributionPhrase = candidateIsNewsstand ? "Newsstand" : candidateIsDirect ? "Direct" : null;
    const facsimileConflict = targetFacsimile === "no" && /\b(?:facsimile|reprint|reproduction)\b/i.test(title);
    const packagingConflict = vintageToyPackagingConflict(targetMetadata, title);
    const materialConflicts = findMaterialMetadataConflicts(targetMetadata, listing);
    const fieldConflict = distributionConflict || facsimileConflict || Boolean(packagingConflict) || materialConflicts.length > 0;
    if (!conflict && !fieldConflict) return [];
    const reason = packagingConflict ?? (materialConflicts.length > 0
      ? metadataConflictReviewReason(materialConflicts)
      : distributionConflict
      ? `Distribution Type is ${targetDistribution === "direct" ? "Direct" : "Newsstand"}, but the title explicitly declares ${distributionPhrase}.`
      : `Facsimile is No, but the title explicitly declares ${title.match(/\b(?:facsimile|reprint|reproduction)\b/i)?.[0] ?? "a reproduction"}.`);
    return [{
      candidateIndex,
      verdict: "mismatch" as const,
      confidence: "high" as const,
      rationale: fieldConflict
        ? `${reason} Candidate retained for manual review.`
        : `Declared identity conflict in marketplace title: ${phrase}. Candidate retained for manual review.`,
    }];
  });
}

function visualPriorityScore<T extends VisualSourceCandidate>(item: T, targetMetadata: string): number {
  const targetTitle = extractTargetTitle(targetMetadata).toLowerCase();
  const title = String(item.title ?? "").toLowerCase();
  const targetTokens = new Set(targetTitle.split(/[^a-z0-9]+/).filter(token => token.length >= 2));
  const titleTokens = new Set(title.split(/[^a-z0-9]+/).filter(token => token.length >= 2));
  const overlap = [...targetTokens].filter(token => titleTokens.has(token)).length;
  const targetGrade = targetMetadata.match(/(?:^|;)\s*grade=([^;]+)/i)?.[1]?.trim().toLowerCase();
  const extractedTargetGrade = targetGrade?.match(/\d+(?:\.\d+)?/)?.[0];
  const normalizedTargetGrade = extractedTargetGrade && Number.isFinite(Number(extractedTargetGrade))
    ? String(Number(extractedTargetGrade))
    : null;
  const gradeMatch = normalizedTargetGrade && new RegExp(String.raw`(?:^|[^0-9])(?:q|afa)?\s*${normalizedTargetGrade.replace('.', '\\.')}(?:\.0+)?(?:$|[^0-9])`, 'i').test(title) ? 1_000 : 0;
  const targetGrader = targetMetadata.match(/(?:^|;)\s*certificationCompany=([^;]+)/i)?.[1]?.trim();
  const normalizedTargetGrader = targetGrader && !/^(?:unknown|none|raw|ungraded|n\/a)$/i.test(targetGrader)
    ? targetGrader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : null;
  const graderMatch = normalizedTargetGrader && new RegExp(`\\b${normalizedTargetGrader}\\b`, 'i').test(title) ? 100 : 0;
  const issueMatch = /(?:#|issue\s*)\d+[a-z]?/i.test(targetTitle) && /(?:#|issue\s*)\d+[a-z]?/i.test(title) ? 20 : 0;
  return overlap + gradeMatch + graderMatch + issueMatch;
}

function visualQueryTierPriority<T extends VisualSourceCandidate>(item: T): number {
  return Number((item as any).__tradebiliaQueryTier) === 0 ? 1 : 0;
}

export function prioritizeVisualSourceCandidates<T extends VisualSourceCandidate>(
  candidates: Array<{ item: T; candidateIndex: number; imageUrl: string; imageUrls: string[] }>,
  targetMetadata: string,
  declaredReviews: VisualSourceReview[],
) {
  const declaredConflicts = new Set(declaredReviews.filter(review => review.verdict === "mismatch").map(review => review.candidateIndex));
  return candidates
    .filter(candidate => !declaredConflicts.has(candidate.candidateIndex))
    // An explicit matching grader and numeric grade in the marketplace title
    // are the strongest available pre-vision identity signals. They must reach
    // vision before merely exact-tier rows; otherwise a clearly graded match
    // can remain outside the bounded review window behind weaker results.
    .sort((a, b) => visualPriorityScore(b.item, targetMetadata) - visualPriorityScore(a.item, targetMetadata) || visualQueryTierPriority(b.item) - visualQueryTierPriority(a.item) || a.candidateIndex - b.candidateIndex)
    .slice(0, VISUAL_REVIEW_MAX_CANDIDATES);
}

export function applyDeclaredIdentityFilter<T extends VisualSourceCandidate>(
  listings: T[],
  targetMetadata: string,
) {
  const declaredReviews = buildDeclaredIdentityReviews(listings, targetMetadata);
  const conflictIndexes = new Set(declaredReviews.map((review) => review.candidateIndex));
  const contextListings = listings.filter((_, index) => conflictIndexes.has(index));
  return {
    listings: listings.filter((_, index) => !conflictIndexes.has(index)),
    contextListings,
    declaredReviews,
    removedCount: contextListings.length,
  };
}

export function buildVisualSourceFilterNote(
  sourceLabel: string,
  result: {
    reviewedCount: number;
    removedCount: number;
    retainedUnreviewedCount: number;
  }
): string {
  return `${sourceLabel}: ${result.reviewedCount} candidate image${result.reviewedCount === 1 ? "" : "s"} reviewed; high-confidence visual flags are retained as manual-review provenance, never removed by vision alone${result.retainedUnreviewedCount ? `; ${result.retainedUnreviewedCount} reviewed-window candidate${result.retainedUnreviewedCount === 1 ? "" : "s"} received no decisive visual result` : ""}.`;
}

export async function filterVisualSourceCandidates<
  T extends VisualSourceCandidate,
>(args: {
  sourceLabel: string;
	  targetImageUrl?: string | null;
	  targetMetadata: string;
	  listings: T[];
	  reviewDeadlineAt?: number;
	}): Promise<VisualSourceFilterResult<T>> {
  const target = safeHttps(args.targetImageUrl);
  if (!target)
    return {
      listings: args.listings,
      status: "skipped_no_target_image",
      reviewedCount: 0,
      removedCount: 0,
      retainedUnreviewedCount: 0,
      reviews: [],
      note: `No target listing image was supplied; ${args.sourceLabel} candidates were not visually filtered.`,
    };
  const candidates = args.listings
    .map((item, candidateIndex) => {
      const imageUrls = Array.from(new Set([
        ...(Array.isArray(item.imageUrls) ? item.imageUrls : []),
        item.imageUrl,
      ].map(promoteEbayImageUrl).filter((url): url is string => Boolean(url)))).slice(0, 8);
      return {
        item,
        candidateIndex,
        imageUrl: imageUrls[0] ?? null,
        imageUrls,
      };
    })
    .filter(
      (entry): entry is { item: T; candidateIndex: number; imageUrl: string; imageUrls: string[] } =>
        entry.imageUrls.length > 0
    );
  if (!candidates.length)
    return {
      listings: args.listings,
      status: "skipped_no_candidate_images",
      reviewedCount: 0,
      removedCount: 0,
      retainedUnreviewedCount: args.listings.length,
      reviews: [],
      note: `No ${args.sourceLabel.toLowerCase()} candidate images were available; all candidates were retained.`,
    };
  try {
    const strictResponseFormat = {
      type: "json_schema",
      json_schema: {
        name: "visual_source_filter",
        strict: true,
        schema: {
          type: "object",
          properties: {
            reviews: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  candidateIndex: { type: "integer" },
                  verdict: { type: "string", enum: ["match", "rough_match", "mismatch", "unreadable"] },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  rationale: { type: "string" },
                  visualEvidence: {
                    type: "object",
                    properties: {
                      slabVisible: { type: "boolean" },
                      gradingLabelVisible: { type: "boolean" },
                      graderVisible: { type: "boolean" },
                      numericGradeVisible: { type: "boolean" },
                      gradeMatches: { type: "boolean" },
                      rawOrLooseVisible: { type: "boolean" },
                    },
                    required: ["slabVisible", "gradingLabelVisible", "graderVisible", "numericGradeVisible", "gradeMatches", "rawOrLooseVisible"],
                    additionalProperties: false,
                  },
                },
                required: ["candidateIndex", "verdict", "confidence", "rationale", "visualEvidence"],
                additionalProperties: false,
              },
            },
          },
          required: ["reviews"],
          additionalProperties: false,
        },
      },
    } as const;
    // Preserve every candidate, but only send the strongest non-conflicting
    // candidates to vision in the first pass. This bounds latency without
    // turning an omitted image review into an implicit acceptance.
    const declaredReviews = buildDeclaredIdentityReviews(
      args.listings,
      args.targetMetadata,
    );
    const reviewQueue = prioritizeVisualSourceCandidates(candidates, args.targetMetadata, declaredReviews);
    const reviews: VisualSourceReview[] = [];
    let completedBatches = 0;
    let reviewedCandidateCount = 0;
    let timedOutCount = 0;
    let deadlineReached = false;
    let lastError: unknown;
	    const reviewDeadline = Math.min(
	      Date.now() + VISUAL_REVIEW_OVERALL_DEADLINE_MS,
	      Number.isFinite(args.reviewDeadlineAt) ? Number(args.reviewDeadlineAt) : Number.POSITIVE_INFINITY,
	    );
    // Keep each comparison one-to-one and run four at a time. A later explicit
    // review-more action can expand beyond this initial queue.
    for (let windowOffset = 0; windowOffset < reviewQueue.length; windowOffset += VISUAL_REVIEW_BATCH_SIZE) {
      const window = reviewQueue.slice(windowOffset, windowOffset + VISUAL_REVIEW_BATCH_SIZE);
      for (let offset = 0; offset < window.length; offset += 4) {
      if (Date.now() >= reviewDeadline) {
        deadlineReached = true;
        break;
      }
      const batch = window.slice(offset, offset + 4);
      const batchResults = await Promise.all(batch.map(async (candidate) => {
      const content: Array<TextContent | ImageContent> = [
        {
          type: "text",
          text: `You are a strict visual identity reviewer for ${args.sourceLabel}. You are reviewing exactly one candidate. First classify the TARGET and CANDIDATE as graded/slabbed or raw/ungraded from the images. A visible slab, certification label, encapsulation, or grading holder means graded; an exposed item without a slab means raw/ungraded. Graded-versus-raw status is a mandatory identity gate: if the target is graded and the candidate is visibly raw, mark mismatch with high confidence; if the target is raw and the candidate is visibly graded, mark mismatch with high confidence. Do not override this visual decision because the title, series, grade, or price looks similar. If either image is too obscured to determine graded/raw status, use unreadable or low-confidence manual review rather than accepting it. If the candidate title explicitly declares a grader or numeric grade but the primary image appears raw, loose, un-slabbed, or missing its label, this is a grading-evidence conflict: do not finalize a hard mismatch from the primary image alone. Use the additional gallery images and high-detail view to verify the slab, grader, and grade; if they remain unclear or contradictory, return unreadable/manual review. When the target is graded, the candidate numeric or descriptive grade is also mandatory: a holder or grader name alone is not enough. If the candidate grade is not clearly readable or cannot be confirmed to match the target, use unreadable/manual review and state that limitation in the rationale. Return visualEvidence booleans based only on visible pixels, never on title claims: slabVisible, gradingLabelVisible, graderVisible, numericGradeVisible, gradeMatches, and rawOrLooseVisible. A graded match requires the first five fields true and rawOrLooseVisible false; otherwise use unreadable/manual review rather than match. If structured target metadata names a grade qualifier, label designation, or comic certification label status, that is also a mandatory identity fact: confirm the same explicit label evidence in the candidate title or images, otherwise use unreadable/manual review rather than infer it. After that gate, compare the TARGET cover/front image to the CANDIDATE cover/front image. For comics, the same series or character is not enough: the visible cover art, title treatment, issue number, language, edition, printing, and variant must correspond. If the candidate cover art is materially different from the target cover, mark mismatch with high confidence, even if the title, slab, grade, or series appears similar. Candidate title text is evidence: Mexican, foil, reprint, fifth printing, first appearance, variant, sketch, signed, edition, or a different issue are conflicts unless the target metadata explicitly supports them. Do not call a candidate a match merely because it is the same series, slab type, or grade. Use rough_match only when the cover is plausibly the same but cropped, obscured, or low quality. Use unreadable only when the image cannot be inspected.${explicitUngradedTargetInstruction(args.targetMetadata)}${gradedCoinInstruction(args.targetMetadata)}${sportsCardSetInstruction(args.targetMetadata)}${vintageToyPackagingInstruction(args.targetMetadata)}${videoGameFormInstruction(args.targetMetadata)} Return exactly one JSON review for candidate ${candidate.candidateIndex}: {"reviews":[{"candidateIndex":${candidate.candidateIndex},"verdict":"match|rough_match|mismatch|unreadable","confidence":"high|medium|low","rationale":"...","visualEvidence":{"slabVisible":true,"gradingLabelVisible":true,"graderVisible":true,"numericGradeVisible":true,"gradeMatches":true,"rawOrLooseVisible":false}}]}. Target metadata: ${args.targetMetadata}`,
        },
        { type: "text", text: "TARGET LISTING IMAGE:" },
        { type: "image_url", image_url: { url: target, detail: "high" } },
      ];
      content.push({ type: "text", text: `CANDIDATE ${candidate.candidateIndex}: title=${candidate.item.title ?? "unknown"}` });
      content.push({ type: "image_url", image_url: { url: promoteEbayImageUrl(candidate.imageUrl) ?? candidate.imageUrl, detail: "high" } });
      let text = "";
      let candidateError: unknown;
      for (const responseFormat of [strictResponseFormat, { type: "json_object" as const }]) {
        try {
          const response = await invokeVisualReview({ model: "gpt-5-mini", messages: [{ role: "user", content }], maxCompletionTokens: 1800, temperature: 0, response_format: responseFormat }, VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS);
          const raw = response.choices[0]?.message?.content;
          text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.filter((part): part is TextContent => part.type === "text").map(part => part.text).join("\n") : "";
          if (text.trim()) break;
          throw new Error("The vision model returned no structured content");
        } catch (error) {
          candidateError = error;
        }
      }
      if (!text.trim()) return { reviews: [] as VisualSourceReview[], error: candidateError };
      const primaryReviews = normalizeSingleCandidateVisualReview(
        parseAnalyzerResponse(text),
        args.listings.length,
        candidate.candidateIndex,
      );
      const primaryReview = primaryReviews.find((review) => review.candidateIndex === candidate.candidateIndex);
      const needsGalleryReview = shouldReviewAdditionalVisualImages({
        imageCount: candidate.imageUrls.length,
        review: primaryReview,
        title: String(candidate.item.title ?? ""),
        targetMetadata: args.targetMetadata,
      });
      const needsFocusedGradeEscalation = hasTitleDeclaredGradeVisualRawConflict({
        review: primaryReview,
        title: String(candidate.item.title ?? ""),
        targetMetadata: args.targetMetadata,
      });
      const embeddedFocusedCandidateImage = needsFocusedGradeEscalation
        ? await embedPromotedEbayImageForReview(candidate.imageUrl)
        : null;
      const focusedCandidateImage = embeddedFocusedCandidateImage ?? promoteEbayImageUrl(candidate.imageUrl) ?? candidate.imageUrl;
      const initialAudit: NonNullable<VisualSourceReview["visualAudit"]> = {
        imageCount: candidate.imageUrls.length,
        initialVerdict: primaryReview?.verdict ?? "no_decision" as const,
        initialConfidence: primaryReview?.confidence ?? "no_decision" as const,
        retryStatus: needsGalleryReview ? "performed" as const : "not_needed" as const,
        retryReason: needsGalleryReview
          ? needsFocusedGradeEscalation
            ? `The preliminary mismatch involved a graded target, so an independent high-resolution grader check was performed before finalizing the decision${embeddedFocusedCandidateImage ? " using the exact promoted eBay image bytes" : " using the promoted provider image URL"}.`
            : "The first pass found an image-evidence uncertainty or a title/visual grading conflict."
          : undefined,
        finalPass: "initial" as const,
        initialEvidence: primaryReview?.visualEvidence,
        finalEvidence: primaryReview?.visualEvidence,
      };
      if (!needsGalleryReview) {
        return {
          reviews: primaryReviews.map((review) => review.candidateIndex === candidate.candidateIndex
            ? { ...review, visualAudit: initialAudit }
            : review),
          error: null,
        };
      }

      const galleryContent: Array<TextContent | ImageContent> = needsFocusedGradeEscalation
        ? [
            {
              type: "text",
              text: `INDEPENDENT HIGH-RESOLUTION GRADING ADJUDICATION: Compare exactly two images at high detail: first image is TARGET; second image is CANDIDATE ${candidate.candidateIndex}. Do not rely on or repeat any preliminary verdict. First read and reconcile the visible holder-label facts for BOTH images: slab/holder present, grader, numeric grade, and any printed form designation. Then decide item identity. A visible transparent slab plus a grading label and readable grade is graded—not raw—even if the item inside is a cartridge, card, coin, comic, toy, or game. Only call the candidate raw/loose when those visible slab and label signals are absent. The candidate image is supplied as the exact promoted provider image bytes when available; inspect it rather than a displayed thumbnail.${focusedVideoGameLabelInstruction(args.targetMetadata)} Then independently compare the actual product identity, front artwork/cover, packaging, and edition. Return exactly one JSON review for candidate ${candidate.candidateIndex} using the required visualEvidence object. If the grading evidence or identity remains truly unclear, return unreadable rather than guessing. Target metadata: ${args.targetMetadata}`,
            },
            { type: "text", text: "TARGET LISTING IMAGE:" },
            { type: "image_url", image_url: { url: target, detail: "high" } },
            { type: "text", text: `CANDIDATE ${candidate.candidateIndex} HIGH-RESOLUTION IMAGE:` },
            { type: "image_url", image_url: { url: focusedCandidateImage, detail: "high" } },
            ...candidate.imageUrls.slice(1).map((url) => ({ type: "image_url" as const, image_url: { url: promoteEbayImageUrl(url) ?? url, detail: "high" as const }, })),
          ]
        : [
            ...content,
            { type: "text", text: `HIGH-RESOLUTION ESCALATION: Reassess the candidate using the promoted high-resolution primary image${candidate.imageUrls.length > 1 ? " and the additional gallery images" : ""} before finalizing the decision. This second pass is mandatory when the title or metadata indicates a grade but the first image was interpreted as raw, loose, un-slabbed, or missing a visible label/grade. Verify whether a slab/holder, grader, and numeric grade are actually visible before calling graded-versus-raw mismatch. Use the clearest image as the deciding evidence. Do not ignore a clear contradiction; if the high-resolution review remains conflicting or insufficient, return unreadable/manual review and explain the conflict.` },
            ...candidate.imageUrls.slice(1).map((url) => ({ type: "image_url" as const, image_url: { url: promoteEbayImageUrl(url) ?? url, detail: "high" as const }, })),
          ];
      let galleryText = "";
      let galleryError: unknown;
      for (const responseFormat of [strictResponseFormat, { type: "json_object" as const }]) {
        try {
          const response = await invokeVisualReview({ model: needsFocusedGradeEscalation ? "gpt-5" : "gpt-5-mini", messages: [{ role: "user", content: galleryContent }], maxCompletionTokens: 1800, reasoning: needsFocusedGradeEscalation ? { effort: "low" } : undefined, temperature: 0, response_format: responseFormat }, VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS);
          const raw = response.choices[0]?.message?.content;
          galleryText = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.filter((part): part is TextContent => part.type === "text").map(part => part.text).join("\n") : "";
          if (galleryText.trim()) break;
          throw new Error("The gallery visual review returned no structured content");
        } catch (error) {
          galleryError = error;
        }
      }
      if (!galleryText.trim()) {
        return {
          reviews: primaryReviews.map((review) => review.candidateIndex === candidate.candidateIndex
            ? {
                ...review,
                visualAudit: {
                  ...initialAudit,
                  retryStatus: "failed",
                  retryReason: "The high-resolution retry did not return a usable structured decision; manual image review is required.",
                  finalPass: "initial",
                } satisfies NonNullable<VisualSourceReview["visualAudit"]>,
              }
            : review),
          error: galleryError ?? null,
        };
      }
      const galleryReviews = normalizeSingleCandidateVisualReview(
        parseAnalyzerResponse(galleryText),
        args.listings.length,
        candidate.candidateIndex,
      );
      const finalReviews = galleryReviews.length ? galleryReviews : primaryReviews;
      return {
        reviews: finalReviews.map((review) => review.candidateIndex === candidate.candidateIndex
          ? {
              ...review,
              visualAudit: {
                ...initialAudit,
                finalPass: galleryReviews.length ? "high_resolution_retry" : "initial",
                finalEvidence: review.visualEvidence,
              } satisfies NonNullable<VisualSourceReview["visualAudit"]>,
            }
          : review),
        error: null,
      };
      }));
      for (const result of batchResults) {
        reviews.push(...result.reviews);
        if (result.reviews.length) completedBatches += 1;
        if (result.error) {
          lastError = result.error;
          if (result.error instanceof VisualReviewTimeoutError) timedOutCount += 1;
        }
      }
      reviewedCandidateCount += batch.length;
      }
      if (deadlineReached) break;
      const acceptedMatches = normalizeExplicitUngradedVisualReviews(
          conservativeGradedVisualReviews(
          conservativeComicVisualReviews(reviews, args.listings, args.targetMetadata),
          args.listings,
          args.targetMetadata,
        ),
        args.targetMetadata,
      ).filter((review) => review.verdict === 'match' || review.verdict === 'rough_match').length;
      if (acceptedMatches >= VISUAL_REVIEW_TARGET_MATCHES) break;
    }
    if (!completedBatches && reviewQueue.length && !timedOutCount && !deadlineReached) {
      throw lastError instanceof Error ? lastError : new Error("The vision model returned no structured content");
    }
    const uniqueReviews = normalizeExplicitUngradedVisualReviews(
      conservativeGradedVisualReviews(
        conservativeComicVisualReviews(
          reviews.filter((review, index, all) => all.findIndex((other) => other.candidateIndex === review.candidateIndex) === index),
          args.listings,
          args.targetMetadata,
        ),
        args.listings,
        args.targetMetadata,
      ),
      args.targetMetadata,
    );
    const reviewByIndex = new Map(uniqueReviews.map((review) => [review.candidateIndex, review]));
    const declaredReviewByIndex = new Map(declaredReviews.map((review) => [review.candidateIndex, review]));
    // Never leave an image appearing implicitly accepted because a provider omitted
    // its row. An absent response is explicitly unreadable/needs manual review.
    const reviewedQueueIndexes = new Set(reviewQueue.slice(0, reviewedCandidateCount).map(candidate => candidate.candidateIndex));
    for (const candidate of reviewQueue.slice(0, reviewedCandidateCount)) {
      if (!reviewByIndex.has(candidate.candidateIndex)) {
        const fallback: VisualSourceReview = {
          candidateIndex: candidate.candidateIndex,
          verdict: "unreadable",
          confidence: "low",
          rationale: reviewedQueueIndexes.has(candidate.candidateIndex)
            ? "The visual model returned no usable decision for this candidate; manual image review is required."
            : "Candidate was retained outside the bounded adaptive review window; expanded manual or AI review is required.",
        };
        uniqueReviews.push(fallback);
        reviewByIndex.set(candidate.candidateIndex, fallback);
      }
    }
    const imageBearingIndexes = new Set(candidates.map((candidate) => candidate.candidateIndex));
    const reviewedIndexes = new Set([...uniqueReviews, ...declaredReviews].map((review) => review.candidateIndex));
    // A candidate with a usable target and candidate image must either receive a
    // visual verdict or remain explicit review-only. Do not let a later client
    // treat a missing model row as an implicit pass.
    const requirementAnnotatedListings = args.listings.map((listing, index) => {
      if (!imageBearingIndexes.has(index)) return listing;
      const declaredReview = declaredReviewByIndex.get(index);
      if (declaredReview) {
        return {
          ...listing,
          visualRequirement: "required",
          visualReviewStatus: declaredReview.verdict,
          visualReviewRationale: declaredReview.rationale,
          evidenceDisposition: "warning_review",
        } as T;
      }
      if (reviewedIndexes.has(index)) return { ...listing, visualRequirement: "required" } as T;
      return {
        ...listing,
        visualRequirement: "required",
        visualReviewStatus: "not_reviewed",
        visualReviewRationale: "Candidate image was not reached by the bounded adaptive review window; manual image review is required.",
        evidenceDisposition: "not_visually_reviewed_window",
      } as T;
    });
    const applied = applyVisualSourceReviews(requirementAnnotatedListings, uniqueReviews, reviewedCandidateCount);
    const declaredConflictIndexes = new Set(declaredReviews.map((review) => review.candidateIndex));
    const contextListings = applied.listings.filter((_, index) => declaredConflictIndexes.has(index));
    const visibleListings = applied.listings.filter((_, index) => !declaredConflictIndexes.has(index));
    const completedWithTimeout = timedOutCount > 0 || deadlineReached;
    return {
      ...applied,
      listings: visibleListings,
      contextListings,
      preVisualExcludedCount: contextListings.length,
      removedCount: contextListings.length,
      status: completedWithTimeout ? "completed_with_timeout" : "applied",
      reviews: uniqueReviews,
      timedOutCount,
      deadlineReached,
      note: `${buildVisualSourceFilterNote(args.sourceLabel, { ...applied, removedCount: contextListings.length })} Adaptive visual review sent ${reviewedCandidateCount} of ${candidates.length} image-bearing candidates in batches of ${VISUAL_REVIEW_BATCH_SIZE}, stopping after ${VISUAL_REVIEW_TARGET_MATCHES} accepted visual matches, the ${VISUAL_REVIEW_MAX_CANDIDATES}-image maximum, or the ${VISUAL_REVIEW_OVERALL_DEADLINE_MS / 1000}-second overall deadline; ${timedOutCount} candidate${timedOutCount === 1 ? "" : "s"} timed out; ${contextListings.length} explicit identity conflict${contextListings.length === 1 ? " was" : "s were"} excluded before vision and retained in context for audit.${completedWithTimeout ? " Remaining candidates are retained for manual review and cannot enter valuation implicitly." : ""}`,
    };
  } catch {
    return {
      listings: args.listings.map((listing, index) => candidates.some((candidate) => candidate.candidateIndex === index)
        ? {
            ...listing,
            visualRequirement: "required",
            visualReviewStatus: "not_reviewed",
            visualReviewRationale: "The visual provider was unavailable; manual image review is required.",
            evidenceDisposition: "warning_review",
          } as T
        : listing),
      status: "provider_unavailable",
      reviewedCount: 0,
      removedCount: 0,
      retainedUnreviewedCount: candidates.length,
      reviews: [],
      note: `The ${args.sourceLabel.toLowerCase()} visual filter was unavailable; all text-filtered candidates were retained.`,
    };
  }
}

export function visualSourceCandidateImage(item: any): string | null {
  return (
    item?.imageUrl ??
    item?.thumbnailUrl ??
    item?.image?.imageUrl ??
    item?.image_url ??
    null
  );
}
