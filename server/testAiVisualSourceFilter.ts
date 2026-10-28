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
  characterMatches?: boolean;
  artworkMatches?: boolean;
  silhouetteMatches?: boolean;
  backingCardMatches?: boolean;
  setDesignMatches?: boolean;
  identityMatches?: boolean;
  dateMatches?: boolean;
  varietyMatches?: boolean;
  mintMarkMatches?: boolean;
  denominationMatches?: boolean;
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
    adjudicationStatus?: "confirmed" | "unavailable";
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
const ADJUDICATION_STATUSES = new Set(["confirmed", "unavailable"]);
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

export function isDisneyPinsMetadata(metadata: string): boolean {
  return metadataValue(metadata, "category").trim().toLowerCase().replace(/[\s-]+/g, "_") === "disney_pins";
}

export function isCoinMetadata(metadata: string): boolean {
  return normalizedChoice(metadataValue(metadata, "category")) === "coins";
}

function coinTargetRequiresMintMark(metadata: string): boolean {
  const details = metadataDetails(metadata);
  return Boolean(String(details.mintMark ?? details.mint ?? "").trim());
}

function titleConfirmsCoinGrade(title: string, targetMetadata: string): boolean {
  const targetGrade = normalizedGrade(metadataValue(targetMetadata, "grade") || "");
  const targetGrader = metadataValue(targetMetadata, "certificationCompany");
  if (!targetGrade || !targetGrader || /^(?:unknown|none|raw|ungraded|n\/a)$/i.test(targetGrader)) return false;
  const candidate = String(title ?? "");
  const escapedGrader = targetGrader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escapedGrader}\\b`, "i").test(candidate)
    && new RegExp(`(?:^|[^0-9])${targetGrade.replace(".", "\\.")}(?:\\.0+)?(?:$|[^0-9])`, "i").test(candidate)
    && !/\b(?:raw|ungraded|loose|no\s+(?:slab|holder|grade))\b/i.test(candidate);
}

function titleConfirmsCoinIdentity(title: string, targetMetadata: string): boolean {
  const details = metadataDetails(targetMetadata);
  const targetYear = String(details.year ?? details.issueYear ?? details.mintYear ?? "").trim()
    || extractTargetTitle(targetMetadata).match(/\b(?:17|18|19|20)\d{2}\b/)?.[0]
    || "";
  const targetVariety = String(details.variety ?? details.varietyName ?? details.coinType ?? details.series ?? "").trim();
  const candidate = String(title ?? "");
  if (!targetYear || !new RegExp(`\\b${targetYear}\\b`, "i").test(candidate)) return false;
  const escapedVariety = targetVariety.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Boolean(targetVariety && new RegExp(`\\b${escapedVariety}\\b`, "i").test(candidate));
}

function hasExplicitCoinRawConflict(title: string, rationale = ""): boolean {
  return /\b(?:raw|ungraded|loose)\s+(?:coin|item|listing)\b|\b(?:appears?|is|shown|identified|declared|labeled)\s+(?:as\s+)?(?:raw|ungraded|loose)\b|\bno\s+(?:slab|holder|grade)\b/i.test(`${title} ${rationale}`);
}

export function coinVisualEvidenceIsExact(review: VisualSourceReview, targetMetadata: string, candidateTitle = "", evidenceOverride?: VisualEvidence): boolean {
  if (!isCoinMetadata(targetMetadata) || review.verdict !== "match") return false;
  const evidence = evidenceOverride ?? review.visualEvidence;
  if (!evidence) return false;
  const titleIdentity = titleConfirmsCoinIdentity(candidateTitle, targetMetadata);
  if (!(evidence?.identityMatches || titleIdentity) || !(evidence?.dateMatches || titleIdentity) || !(evidence?.varietyMatches || titleIdentity)) return false;
  if (coinTargetRequiresMintMark(targetMetadata) && evidence.mintMarkMatches !== true) return false;
  const targetIsGraded = !hasExplicitlyUngradedTarget(targetMetadata)
    && Boolean(metadataValue(targetMetadata, "grade") || metadataValue(targetMetadata, "certificationCompany"));
  if (targetIsGraded) {
    // Mercari often supplies a close crop of the coin face rather than the
    // complete holder. The crop does not prove the item is raw; exact title
    // grade evidence may supplement absent holder pixels. An explicit raw
    // conflict still fails closed.
    const explicitRawConflict = evidence.rawOrLooseVisible === true && hasExplicitCoinRawConflict(candidateTitle, review.rationale);
    return Boolean(!explicitRawConflict && (evidence.gradeMatches || titleConfirmsCoinGrade(candidateTitle, targetMetadata)));
  }
  return evidence.rawOrLooseVisible === true;
}

export function enforceCoinExactEvidence(review: VisualSourceReview, targetMetadata: string, candidateTitle = ""): VisualSourceReview {
  if (!isCoinMetadata(targetMetadata)) return review;
  const titleIdentity = titleConfirmsCoinIdentity(candidateTitle, targetMetadata);
  const titleGrade = titleConfirmsCoinGrade(candidateTitle, targetMetadata);
  const explicitRawConflict = hasExplicitCoinRawConflict(candidateTitle, review.rationale);
  if ((review.verdict === "unreadable" || review.verdict === "rough_match") && review.visualEvidence && titleIdentity && titleGrade && !explicitRawConflict) {
    return {
      ...review,
      verdict: "match",
      confidence: "high",
      rationale: `${review.rationale} Exact coin identity, grader, and grade are confirmed by the completed-sale title; the holder crop is incomplete but does not conflict, so the result is admitted for the independent coin review.`,
    };
  }
  if (review.verdict !== "match" || coinVisualEvidenceIsExact(review, targetMetadata, candidateTitle)) return review;
  return {
    ...review,
    verdict: "unreadable",
    confidence: "low",
    rationale: `${review.rationale} Coin admission requires visible confirmation of the coin identity, date, variety, and raw/graded state; the required evidence was not complete, so this remains manual review.`,
  };
}

/**
 * Mercari commonly returns a close crop of a holder label and coin face. Apply
 * the narrowly scoped title reconciliation before deciding whether the required
 * independent coin adjudication should run. This is not admission by title:
 * the second visual pass remains mandatory and an explicit raw conflict still
 * fails closed.
 */
export function reconcileCoinPrimaryReviewForAdjudication(
  review: VisualSourceReview,
  targetMetadata: string,
  candidateTitle = "",
): VisualSourceReview {
  return enforceCoinExactEvidence(review, targetMetadata, candidateTitle);
}

export function hasCompletedCoinAdjudication(review: VisualSourceReview | undefined, targetMetadata: string, candidateTitle = ""): boolean {
  return Boolean(review?.visualAudit?.retryStatus === "performed"
    && review.visualAudit.finalPass === "high_resolution_retry"
    && review.visualAudit.adjudicationStatus === "confirmed"
    && coinVisualEvidenceIsExact(review, targetMetadata, candidateTitle, review.visualAudit.finalEvidence));
}

export function coinAdmissionReason(review: VisualSourceReview | undefined, targetMetadata: string, candidateTitle = ""): string | null {
  if (!review) return "No visual review result was returned for this coin.";
  if (review.verdict !== "match") return `Visual review did not confirm a match (${review.verdict}); retained for manual review.`;
  const audit = review.visualAudit;
  if (audit?.retryStatus === "failed") {
    return audit.retryReason
      ? `The required independent high-resolution coin review did not complete: ${audit.retryReason}`
      : "The required independent high-resolution coin review did not complete because it returned no usable decision.";
  }
  if (audit?.retryStatus !== "performed" || audit.finalPass !== "high_resolution_retry") {
    return `The required independent high-resolution coin review was not started after the first pass returned ${audit?.initialVerdict ?? review.verdict} (${audit?.initialConfidence ?? review.confidence}).`;
  }
  if (audit.adjudicationStatus !== "confirmed") return audit.retryReason
    ? `The independent high-resolution coin review was not confirmed: ${audit.retryReason}`
    : "The independent high-resolution coin review was not confirmed.";
  if (!coinVisualEvidenceIsExact(review, targetMetadata, candidateTitle, audit.finalEvidence)) {
    const evidence = audit.finalEvidence;
    const titleIdentity = titleConfirmsCoinIdentity(candidateTitle, targetMetadata);
    const missing = [
      !(evidence?.identityMatches || titleIdentity) && "coin identity",
      !(evidence?.dateMatches || titleIdentity) && "date",
      !(evidence?.varietyMatches || titleIdentity) && "variety",
      coinTargetRequiresMintMark(targetMetadata) && evidence?.mintMarkMatches !== true && "mint mark",
      !hasExplicitlyUngradedTarget(targetMetadata) && !(evidence?.gradeMatches || titleConfirmsCoinGrade(candidateTitle, targetMetadata)) && "grader and grade",
      hasExplicitCoinRawConflict(candidateTitle, review.rationale) && "graded-versus-raw state",
    ].filter((field): field is string => Boolean(field));
    return `The confirmed coin review is missing or conflicts on: ${missing.length ? missing.join(", ") : "required identity evidence"}.`;
  }
  return null;
}

export function disneyPinsVisualInstruction(metadata: string): string {
  return isDisneyPinsMetadata(metadata)
    ? " DISNEY PINS POLICY: Disney Pins are not graded collectibles in this workflow. Ignore grader, certification-company, slab, label, numeric-grade, and raw-versus-graded signals completely, including stale structured fields or title wording. Do not mark a Disney Pin mismatch or unreadable because a grading field is absent or inconsistent. Same character, similar colors, or a shared series is never sufficient. Treat character, exact artwork, pose, silhouette, backing card/backing logo, event or set design, edition markings, and pin count/form as mandatory identity gates. Return match only when every applicable visible identity detail is confirmed and the structured evidence booleans characterMatches, artworkMatches, silhouetteMatches, backingCardMatches, and setDesignMatches are all true. If any detail differs, is obscured, or cannot be independently confirmed, return rough_match, unreadable, or mismatch; those outcomes remain manual-review evidence and cannot enter analyzer valuation."
    : "";
}

function disneyPinsEvidenceIsExact(evidence?: VisualEvidence): boolean {
  return Boolean(
    evidence?.characterMatches === true &&
    evidence?.artworkMatches === true &&
    evidence?.silhouetteMatches === true &&
    evidence?.backingCardMatches === true &&
    evidence?.setDesignMatches === true,
  );
}

export function enforceDisneyPinsExactEvidence(review: VisualSourceReview, targetMetadata: string): VisualSourceReview {
  if (!isDisneyPinsMetadata(targetMetadata) || review.verdict !== "match") return review;
  if (disneyPinsEvidenceIsExact(review.visualEvidence)) return review;
  return {
    ...review,
    verdict: "unreadable",
    confidence: "low",
    rationale: `${review.rationale} Disney Pins require independent confirmation of character, exact artwork, silhouette, backing card, and set/event design; the structured visual evidence did not confirm every required detail, so this remains manual review.`,
  };
}

/** A Disney Pin may reach analyzer evidence after confirmed adjudication or a complete primary match whose independent retry was unavailable. */
export function hasCompletedDisneyPinsAdjudication(review: VisualSourceReview | undefined): boolean {
  return Boolean(
    review?.verdict === "match"
    && review.confidence === "high"
    && review.visualAudit?.retryStatus === "performed"
    && review.visualAudit.finalPass === "high_resolution_retry"
    && disneyPinsEvidenceIsExact(review.visualAudit.finalEvidence),
  );
}

/**
 * A provider/model failure is not an identity mismatch. Preserve a complete,
 * high-confidence primary Disney match as provisional evidence, while keeping
 * the unavailable adjudication visible in the audit trail for manual review.
 */
export function hasUnavailableDisneyPinsAdjudication(review: VisualSourceReview | undefined): boolean {
  return Boolean(
    review?.verdict === "match"
    && review.confidence === "high"
    && review.visualAudit?.retryStatus === "failed"
    && review.visualAudit.adjudicationStatus === "unavailable"
    && review.visualAudit.finalPass === "initial"
    && disneyPinsEvidenceIsExact(review.visualAudit.initialEvidence)
    && disneyPinsEvidenceIsExact(review.visualEvidence),
  );
}

export function hasTitleDeclaredGradeVisualRawConflict(args: Omit<GradingConflictArgs, "imageCount">): boolean {
  if (!args.review) return false;
  if (isDisneyPinsMetadata(args.targetMetadata)) return false;
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
  if (isDisneyPinsMetadata(args.targetMetadata)) {
    return args.review.verdict === "unreadable" || args.review.confidence === "low";
  }
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
            characterMatches: row.visualEvidence.characterMatches === true,
            artworkMatches: row.visualEvidence.artworkMatches === true,
            silhouetteMatches: row.visualEvidence.silhouetteMatches === true,
            backingCardMatches: row.visualEvidence.backingCardMatches === true,
            setDesignMatches: row.visualEvidence.setDesignMatches === true,
            identityMatches: row.visualEvidence.identityMatches === true,
            dateMatches: row.visualEvidence.dateMatches === true,
            varietyMatches: row.visualEvidence.varietyMatches === true,
            mintMarkMatches: row.visualEvidence.mintMarkMatches === true,
            denominationMatches: row.visualEvidence.denominationMatches === true,
          }
        : undefined,
      visualAudit: row?.visualAudit && typeof row.visualAudit === "object" && RETRY_STATUSES.has(row.visualAudit.retryStatus) && FINAL_PASSES.has(row.visualAudit.finalPass)
        ? {
            imageCount: Number.isInteger(row.visualAudit.imageCount) && row.visualAudit.imageCount >= 0 ? row.visualAudit.imageCount : 0,
            initialVerdict: VERDICTS.has(row.visualAudit.initialVerdict) ? row.visualAudit.initialVerdict : "no_decision",
            initialConfidence: CONFIDENCES.has(row.visualAudit.initialConfidence) ? row.visualAudit.initialConfidence : "no_decision",
            retryStatus: row.visualAudit.retryStatus,
            adjudicationStatus: ADJUDICATION_STATUSES.has(row.visualAudit.adjudicationStatus) ? row.visualAudit.adjudicationStatus : undefined,
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
                  characterMatches: row.visualAudit.initialEvidence.characterMatches === true,
                  artworkMatches: row.visualAudit.initialEvidence.artworkMatches === true,
                  silhouetteMatches: row.visualAudit.initialEvidence.silhouetteMatches === true,
                  backingCardMatches: row.visualAudit.initialEvidence.backingCardMatches === true,
                  setDesignMatches: row.visualAudit.initialEvidence.setDesignMatches === true,
                  identityMatches: row.visualAudit.initialEvidence.identityMatches === true,
                  dateMatches: row.visualAudit.initialEvidence.dateMatches === true,
                  varietyMatches: row.visualAudit.initialEvidence.varietyMatches === true,
                  mintMarkMatches: row.visualAudit.initialEvidence.mintMarkMatches === true,
                  denominationMatches: row.visualAudit.initialEvidence.denominationMatches === true,
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
                  characterMatches: row.visualAudit.finalEvidence.characterMatches === true,
                  artworkMatches: row.visualAudit.finalEvidence.artworkMatches === true,
                  silhouetteMatches: row.visualAudit.finalEvidence.silhouetteMatches === true,
                  backingCardMatches: row.visualAudit.finalEvidence.backingCardMatches === true,
                  setDesignMatches: row.visualAudit.finalEvidence.setDesignMatches === true,
                  identityMatches: row.visualAudit.finalEvidence.identityMatches === true,
                  dateMatches: row.visualAudit.finalEvidence.dateMatches === true,
                  varietyMatches: row.visualAudit.finalEvidence.varietyMatches === true,
                  mintMarkMatches: row.visualAudit.finalEvidence.mintMarkMatches === true,
                  denominationMatches: row.visualAudit.finalEvidence.denominationMatches === true,
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

/**
 * Some vision-model second passes have returned a compact coin adjudication
 * object (`{ candidate, visualEvidence, notes }`) rather than the requested
 * `reviews` array. Accept that shape only for a coin when it independently
 * confirms every exact coin identity fact and the listing title separately
 * confirms the target's year/variety, grader, and grade. This is deliberately
 * not a general loose JSON parser and never overrides a raw/loose conflict.
 */
export function normalizeCompactCoinAdjudicationReview(
  payload: unknown,
  expectedCandidateIndex: number,
  targetMetadata: string,
  candidateTitle: string,
): VisualSourceReview[] {
  if (!isCoinMetadata(targetMetadata) || !payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const row = payload as Record<string, unknown>;
  const evidenceSource = row.visualEvidence;
  if (!evidenceSource || typeof evidenceSource !== "object" || Array.isArray(evidenceSource)) return [];
  const evidence = evidenceSource as Record<string, unknown>;
  const titleIdentity = titleConfirmsCoinIdentity(candidateTitle, targetMetadata);
  const titleGrade = titleConfirmsCoinGrade(candidateTitle, targetMetadata);
  const exactIdentity = evidence.identityMatches === true
    && evidence.dateMatches === true
    && evidence.varietyMatches === true
    && evidence.denominationMatches === true
    && (!coinTargetRequiresMintMark(targetMetadata) || evidence.mintMarkMatches === true);
  if (!exactIdentity || !titleIdentity || !titleGrade) return [];
  const notes = typeof evidence.notes === "string" && evidence.notes.trim()
    ? evidence.notes.trim()
    : typeof row.notes === "string" && row.notes.trim()
    ? row.notes.trim()
    : "The independent coin review returned complete matching identity evidence.";
  return [{
    candidateIndex: expectedCandidateIndex,
    verdict: "match",
    confidence: "high",
    rationale: notes,
    visualEvidence: {
      slabVisible: evidence.slabVisible === true,
      gradingLabelVisible: evidence.gradingLabelVisible === true,
      graderVisible: evidence.graderVisible === true,
      numericGradeVisible: evidence.numericGradeVisible === true,
      gradeMatches: evidence.gradeMatches === true,
      rawOrLooseVisible: evidence.rawOrLooseVisible === true,
      identityMatches: true,
      dateMatches: true,
      varietyMatches: true,
      mintMarkMatches: evidence.mintMarkMatches === true,
      denominationMatches: true,
    },
  }];
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
  const raw = metadataValue(metadata, "fullItemDetails") || metadataValue(metadata, "itemDetails") || metadataValue(metadata, "details") || metadataValue(metadata, "catalog");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

type VisualTargetMetadataInput = {
  title?: unknown;
  category?: unknown;
  condition?: unknown;
  itemType?: unknown;
  grade?: unknown;
  certificationCompany?: unknown;
  grader?: unknown;
  isGraded?: unknown;
  fullItemDetails?: unknown;
  itemDetails?: unknown;
  details?: unknown;
  catalog?: unknown;
};

function metadataText(value: unknown, fallback = "unknown"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function visualMetadataDetails(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim() || /^unknown$/i.test(value.trim())) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    // Several legacy source contracts allow free-text details. Preserve that
    // text for the visual prompt rather than silently deleting it; deterministic
    // guards still require an explicit structured conflict.
    return { rawDetails: value.trim() };
  }
}

function firstMeaningfulValue(...values: unknown[]): unknown {
  return values.find((value) => String(value ?? "").trim() !== "");
}

function normalizedVisualCategory(value: unknown): string {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return normalized || "unknown";
}

/**
 * Every visual caller uses this target contract. It keeps source-specific
 * aliases from silently disabling shared deterministic guards, while treating
 * missing fields as unknown rather than fabricating identity evidence.
 */
export function buildVisualTargetMetadata(input: VisualTargetMetadataInput): string {
  const details = {
    ...visualMetadataDetails(
    input.fullItemDetails ?? input.itemDetails ?? input.details ?? input.catalog,
    ),
  };
  const topLevelCondition = firstMeaningfulValue(input.condition);
  if (topLevelCondition !== undefined && firstMeaningfulValue(details.condition, details.mediaCondition) === undefined) {
    details.condition = topLevelCondition;
  }
  const itemType = metadataText(firstMeaningfulValue(input.itemType, details.itemType, details.productType, details.form));
  const grade = metadataText(firstMeaningfulValue(input.grade, details.grade));
  const certificationCompany = metadataText(
    firstMeaningfulValue(
      input.certificationCompany,
      input.grader,
      details.certificationCompany,
      details.gradingCompany,
      details.grader,
    ),
  );
  const isGraded = metadataText(firstMeaningfulValue(input.isGraded, details.isGraded, details.graded));
  return [
    `title=${metadataText(input.title, "structured item")}`,
    `category=${normalizedVisualCategory(input.category)}`,
    `itemType=${itemType}`,
    `grade=${grade}`,
    `certificationCompany=${certificationCompany}`,
    `isGraded=${isGraded}`,
    `fullItemDetails=${JSON.stringify(details)}`,
  ].join("; ");
}

function directMetadataFields(metadata: string): Record<string, unknown> {
  const standardKeys = new Set([
    "title",
    "category",
    "itemtype",
    "grade",
    "certificationcompany",
    "grader",
    "isgraded",
    "fullitemdetails",
    "itemdetails",
    "details",
    "catalog",
  ]);
  const fields: Record<string, unknown> = {};
  for (const match of metadata.matchAll(/(?:^|;)\s*([A-Za-z][A-Za-z0-9_]*)=([^;]*)/g)) {
    const [, key, value] = match;
    if (!standardKeys.has(key.toLowerCase()) && value.trim() && !/^unknown$/i.test(value.trim())) fields[key] = value.trim();
  }
  return fields;
}

function canonicalVisualTargetMetadata(metadata: string): string {
  const legacyCatalog = metadataValue(metadata, "catalog");
  const serializedDetails = metadataValue(metadata, "fullItemDetails") || metadataValue(metadata, "itemDetails") || metadataValue(metadata, "details") || legacyCatalog;
  const details = {
    ...visualMetadataDetails(serializedDetails),
    ...directMetadataFields(metadata),
  };
  if (legacyCatalog && !/^\s*[{[]/.test(legacyCatalog) && !details.catalogNumber) details.catalogNumber = legacyCatalog;
  return buildVisualTargetMetadata({
    title: metadataValue(metadata, "title"),
    category: metadataValue(metadata, "category"),
    itemType: metadataValue(metadata, "itemType"),
    grade: metadataValue(metadata, "grade"),
    certificationCompany: metadataValue(metadata, "certificationCompany"),
    grader: metadataValue(metadata, "grader"),
    isGraded: metadataValue(metadata, "isGraded"),
    fullItemDetails: details,
  });
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

function isVideoGamePsaWataEquivalent(targetMetadata: string, candidateText: string): boolean {
  const category = metadataValue(targetMetadata, "category").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (category !== "video_games") return false;
  const targetGrader = metadataValue(targetMetadata, "certificationCompany").trim().toUpperCase();
  const candidateGraders = [...candidateText.matchAll(/\b(PSA|WATA)\b/gi)].map((match) => match[1].toUpperCase());
  return (targetGrader === "PSA" && candidateGraders.includes("WATA")) || (targetGrader === "WATA" && candidateGraders.includes("PSA"));
}

function hasVideoGameVisualIdentityConflict(rationale: string): boolean {
  return /\b(?:different game|different title|different artwork|different cover|different edition|different variant|does not match the (?:game|cover|artwork)|sealed\s+(?:versus|vs\.?|rather than)\s+(?:cib|complete in box|loose|raw)|(?:cib|complete in box|loose|raw)\s+(?:versus|vs\.?|rather than)\s+sealed|(?:appears?|is|looks?|visibly)\s+(?:raw|ungraded|loose))\b/i.test(rationale);
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
  if (isDisneyPinsMetadata(targetMetadata)) return reviews;
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
    const equivalentVideoGameGrader = isVideoGamePsaWataEquivalent(targetMetadata, `${title} ${review.rationale}`);
    const equivalentVideoGameReview = equivalentVideoGameGrader && Boolean(structuredEvidence &&
      structuredEvidence.slabVisible &&
      structuredEvidence.gradingLabelVisible &&
      structuredEvidence.graderVisible &&
      structuredEvidence.numericGradeVisible &&
      structuredEvidence.gradeMatches &&
      !structuredEvidence.rawOrLooseVisible) &&
      /\b(?:same|match(?:es)?|identical|correspond(?:s|ing)|cover art|game identity)\b/i.test(review.rationale) &&
      !hasVideoGameVisualIdentityConflict(review.rationale);
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
    if (review.verdict === "unreadable" && equivalentVideoGameReview) {
      return {
        ...review,
        verdict: "match",
        confidence: review.confidence === "low" ? "medium" : review.confidence,
        rationale: `${review.rationale} For video games, PSA and WATA labels are accepted as equivalent grader evidence; the visible grader label is preserved, while the numeric grade, slab, item form, and visual identity remain mandatory.` ,
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

export function conservativeCoinVisualReviews(
  reviews: VisualSourceReview[],
  listings: VisualSourceCandidate[],
  targetMetadata: string,
): VisualSourceReview[] {
  if (!isCoinMetadata(targetMetadata)) return reviews;
  return reviews.map((review) => enforceCoinExactEvidence(review, targetMetadata, String(listings[review.candidateIndex]?.title ?? "")));
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
  // Disney Pins are intentionally visual-only. Their exact-match policy must
  // never be overwritten by the generic raw/ungraded reconciliation below.
  if (isDisneyPinsMetadata(targetMetadata)) return reviews;
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
  reviewedCandidateCount: number,
  options?: { requireExactMatch?: boolean; requireCoinExactMatch?: boolean; targetMetadata?: string },
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
        ...((review.verdict === "mismatch" || (options?.requireExactMatch && !hasCompletedDisneyPinsAdjudication(review) && !hasUnavailableDisneyPinsAdjudication(review)) || (options?.requireCoinExactMatch && options.targetMetadata && !hasCompletedCoinAdjudication(review, options.targetMetadata, String(listing.title ?? ""))))
          ? {
              evidenceDisposition: "warning_review",
              ...(options?.requireCoinExactMatch && options.targetMetadata
                ? { visualAdmissionReason: coinAdmissionReason(review, options.targetMetadata, String(listing.title ?? "")) }
                : {}),
            }
          : {}),
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

export function gradedIdentifierInstruction(): string {
  return " For every graded or certified item, certificate numbers, certification IDs, serial numbers, grading-holder barcodes, QR codes, and other holder tracking numbers identify the individual specimen, not the collectible type. Ignore differences in those identifiers completely: never require them to match and never mark an otherwise compatible item as a mismatch because they differ. Compare the collectible's actual identity, date/year, variety/series, visible grading company, grade, and graded-versus-raw status instead. This rule applies to every marketplace and data source using this shared visual review.";
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

function coinVisualInstruction(metadata: string): string {
  if (!isCoinMetadata(metadata)) return "";
  const mintMarkRule = coinTargetRequiresMintMark(metadata)
    ? " The target declares a mint mark, so mintMarkMatches must also be true; if it is not visible or does not match, use unreadable/manual review."
    : "";
  return ` COIN IDENTITY POLICY: A coin visual match requires exact visible identity confirmation, not merely a similar-looking round coin or a matching marketplace title. Set identityMatches, dateMatches, varietyMatches, and denominationMatches only from visible image evidence. Date and variety/series are mandatory. Compare raw-versus-graded status exactly. A close crop showing only the coin face does not prove the item is raw; set rawOrLooseVisible true only when the image explicitly shows an exposed raw/loose coin or clearly states there is no holder. For a graded target, a visible grade match or an exact grader-and-grade marketplace title may supplement a holder cropped out of frame, but an explicit raw conflict must fail. For a raw target, rawOrLooseVisible must be true and no slab/holder may be visible.${mintMarkRule} Generic stock photos, unreadable dates, obscured varieties, or ambiguous identity evidence are unreadable/manual review, never match.`;
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

function videoGameGraderEquivalenceInstruction(metadata: string): string {
  const category = normalizedChoice(metadataValue(metadata, "category"));
  const grader = metadataValue(metadata, "certificationCompany").trim().toUpperCase();
  if (category !== "video_games" || !["PSA", "WATA"].includes(grader)) return "";
  return " VIDEO-GAME GRADER EQUIVALENCE: PSA and WATA are accepted as equivalent grader evidence for video games because WATA transitioned into PSA. A visible PSA label and a visible WATA label may therefore match when the numeric grade, sealed/CIB/loose form, and actual game identity match. Preserve the exact visible label in the rationale; do not treat PSA/WATA as interchangeable for other categories, and do not relax the form or numeric-grade gates.";
}

type ExplicitGradingState = "graded" | "raw" | null;

function explicitGradingState(value: unknown): ExplicitGradingState {
  const normalized = normalizedChoice(value);
  if (["yes", "true", "1", "graded", "slabbed", "certified"].includes(normalized)) return "graded";
  if (["no", "false", "0", "raw", "ungraded"].includes(normalized)) return "raw";
  return null;
}

function candidateStructuredDetails(listing: VisualSourceCandidate): Record<string, unknown> {
  return visualMetadataDetails(listing.fullItemDetails ?? listing.itemDetails ?? listing.details);
}

function targetExplicitGradingState(targetMetadata: string): ExplicitGradingState {
  const details = extractTargetItemDetails(targetMetadata);
  const structured = explicitGradingState(metadataValue(targetMetadata, "isGraded") || details.isGraded || details.graded);
  if (structured) return structured;
  const grade = metadataValue(targetMetadata, "grade");
  const grader = metadataValue(targetMetadata, "certificationCompany");
  return grade && !/^(?:unknown|raw|ungraded|none|n\/?a)$/i.test(grade) || grader && !/^(?:unknown|raw|ungraded|none|n\/?a)$/i.test(grader)
    ? "graded"
    : null;
}

function candidateExplicitGradingState(listing: VisualSourceCandidate): ExplicitGradingState {
  const details = candidateStructuredDetails(listing);
  const structured = explicitGradingState(listing.isGraded ?? details.isGraded ?? details.graded);
  if (structured) return structured;
  const candidateGrade = metadataText(listing.grade ?? details.grade, "");
  const candidateGrader = metadataText(listing.certificationCompany ?? listing.gradingCompany ?? listing.grader ?? details.certificationCompany ?? details.gradingCompany ?? details.grader, "");
  if (candidateGrade && candidateGrader && !/^(?:raw|ungraded|unknown|none|n\/?a)$/i.test(candidateGrade) && !/^(?:raw|ungraded|unknown|none|n\/?a)$/i.test(candidateGrader)) return "graded";
  const title = String(listing.title ?? "");
  if (/\b(?:PSA|AFA|CGC|CBCS|BGS|SGC|PCGS|NGC|WATA|VGA)\s*(?:graded\s*)?\d{1,3}(?:\.\d+)?\b|\b(?:graded|slabbed|encapsulated)\b/i.test(title)) return "graded";
  if (/\b(?:raw|ungraded|un[- ]slabbed|no\s+(?:slab|holder))\b/i.test(title)) return "raw";
  return null;
}

function explicitGradingStateConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (isDisneyPinsMetadata(targetMetadata)) return null;
  const targetState = targetExplicitGradingState(targetMetadata);
  const candidateState = candidateExplicitGradingState(listing);
  if (!targetState || !candidateState || targetState === candidateState) return null;
  return `Grading state differs: target is explicitly ${targetState}, but the candidate explicitly declares ${candidateState}.`;
}

type ProductForm = "set" | "single_card" | "sealed" | "cib" | "boxed_only" | "loose" | "parts_only" | "complete" | "incomplete" | null;

function sportsCardProductForm(value: unknown): ProductForm {
  const normalized = normalizedChoice(value);
  if (!normalized) return null;
  if (/(?:^|_)(?:complete|factory|team|master|card)?_?set(?:$|_)/.test(normalized) || /unopened_product/.test(normalized)) return "set";
  if (/(?:^|_)(?:single|individual)_?(?:card)?(?:$|_)/.test(normalized)) return "single_card";
  return null;
}

function sportsCardTitleProductForm(title: string): ProductForm {
  if (/\b(?:complete|factory|team|master)\s+set\b|\bunopened\s+product\b/i.test(title)) return "set";
  if (/\b(?:single|individual)\s+(?:trading\s+)?card\b/i.test(title)) return "single_card";
  if (/(?:^|[^\w])#\s*\d+[A-Za-z]?(?:\s*\/\s*\d+)?\b[^\n]{0,80}\b(?:PSA|AFA|CGC|CBCS|BGS|SGC|graded|gem\s+mint)\b/i.test(title)) return "single_card";
  return null;
}

function videoGameProductForm(value: unknown): ProductForm {
  const normalized = normalizedChoice(value);
  if (!normalized) return null;
  if (/^(?:yes|true|1|factory_sealed|sealed)$/.test(normalized) || /factory_sealed/.test(normalized)) return "sealed";
  if (/^(?:yes|true|1|cib|complete_in_box)$/.test(normalized) || /complete_in_box|\bcib\b/.test(normalized)) return "cib";
  if (/boxed_only|box_only/.test(normalized)) return "boxed_only";
  if (/loose|cartridge_only|disc_only/.test(normalized)) return "loose";
  if (/parts_only|for_parts/.test(normalized)) return "parts_only";
  return null;
}

function videoGameTitleProductForm(title: string): ProductForm {
  if (/\b(?:factory\s+)?sealed(?:\s+[A-Z])?\b/i.test(title)) return "sealed";
  if (/\b(?:CIB|complete\s+in\s+box)\b/i.test(title)) return "cib";
  if (/\b(?:boxed|box)\s+only\b/i.test(title)) return "boxed_only";
  if (/\b(?:loose|cartridge\s+only|disc\s+only)\b/i.test(title)) return "loose";
  if (/\b(?:parts\s+only|for\s+parts)\b/i.test(title)) return "parts_only";
  return null;
}

function vintageToyProductForm(value: unknown): ProductForm {
  const normalized = normalizedChoice(value);
  if (!normalized) return null;
  if (/^(?:no|false|0|incomplete)$/.test(normalized) || /incomplete|missing_parts/.test(normalized)) return "incomplete";
  if (/^(?:yes|true|1|sealed|factory_sealed)$/.test(normalized) || /factory_sealed/.test(normalized)) return "sealed";
  if (/^(?:no|false|0|opened)$/.test(normalized) || /opened/.test(normalized)) return "loose";
  if (/^(?:yes|true|1|complete)$/.test(normalized) || /complete/.test(normalized)) return "complete";
  return null;
}

function vintageToyTitleProductForm(title: string): ProductForm {
  if (/\bfactory\s+sealed\b/i.test(title)) return "sealed";
  if (/\b(?:opened|previously\s+opened)\b/i.test(title)) return "loose";
  if (/\bcomplete\b/i.test(title)) return "complete";
  if (/\b(?:incomplete|missing\s+(?:parts|piece|accessory))\b/i.test(title)) return "incomplete";
  return null;
}

function targetProductForm(targetMetadata: string): ProductForm {
  const category = normalizedChoice(metadataValue(targetMetadata, "category"));
  const details = extractTargetItemDetails(targetMetadata);
  const targetType = metadataValue(targetMetadata, "itemType") || details.itemType || details.productType || details.form;
  if (category === "sports_cards") return sportsCardProductForm(targetType);
  if (category === "video_games") {
    if (normalizedChoice(details.sealed ?? details.factorySealed) === "yes") return "sealed";
    if (normalizedChoice(details.completeInBox) === "yes") return "cib";
    return videoGameProductForm(details.sealedStatus ?? details.packageStatus ?? details.packaging ?? targetType);
  }
  if (category === "vintage_toys") return vintageToyProductForm(details.sealedStatus ?? details.packagingType ?? details.packageType ?? details.complete ?? details.isComplete);
  return null;
}

function candidateProductForm(targetMetadata: string, listing: VisualSourceCandidate): ProductForm {
  const category = normalizedChoice(metadataValue(targetMetadata, "category"));
  const details = candidateStructuredDetails(listing);
  const structured = listing.itemType ?? listing.productType ?? listing.form ?? listing.saleForm ?? details.itemType ?? details.productType ?? details.form;
  const title = String(listing.title ?? "");
  if (category === "sports_cards") return sportsCardProductForm(structured) ?? sportsCardTitleProductForm(title);
  if (category === "video_games") return videoGameProductForm(details.sealedStatus ?? details.packageStatus ?? details.packaging ?? structured) ?? videoGameTitleProductForm(title);
  if (category === "vintage_toys") return vintageToyProductForm(details.sealedStatus ?? details.packagingType ?? details.packageType ?? details.complete ?? details.isComplete ?? structured) ?? vintageToyTitleProductForm(title);
  return null;
}

function explicitProductFormConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  const targetForm = targetProductForm(targetMetadata);
  const candidateForm = candidateProductForm(targetMetadata, listing);
  if (!targetForm || !candidateForm || targetForm === candidateForm) return null;
  return `Product form differs: target is explicitly ${targetForm.replace(/_/g, " ")}, but the candidate explicitly declares ${candidateForm.replace(/_/g, " ")}.`;
}

type MusicMediaCondition = "sealed" | "excellent" | "good" | "fair" | "for_parts" | null;

function musicMediaCondition(value: unknown): MusicMediaCondition {
  const normalized = normalizedChoice(value);
  if (!normalized) return null;
  if (/^(?:sealed|new_sealed|factory_sealed)$/.test(normalized)) return "sealed";
  if (normalized === "excellent") return "excellent";
  if (normalized === "good") return "good";
  if (normalized === "fair") return "fair";
  if (/^(?:for_parts|parts_only)$/.test(normalized)) return "for_parts";
  return null;
}

function musicCandidateMediaCondition(listing: VisualSourceCandidate): MusicMediaCondition {
  const details = candidateStructuredDetails(listing);
  const structured = musicMediaCondition(listing.condition ?? details.condition ?? details.mediaCondition);
  if (structured) return structured;
  const title = String(listing.title ?? "");
  if (/\b(?:factory\s+sealed|new\s*[/|]?\s*sealed|sealed)\b/i.test(title)) return "sealed";
  if (/\bfor\s+parts\b|\bparts\s+only\b/i.test(title)) return "for_parts";
  if (/\bexcellent\b/i.test(title)) return "excellent";
  if (/\bgood\s+condition\b/i.test(title)) return "good";
  if (/\bfair\s+condition\b/i.test(title)) return "fair";
  return null;
}

function musicMediaConditionConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (normalizedChoice(metadataValue(targetMetadata, "category")) !== "music") return null;
  const details = extractTargetItemDetails(targetMetadata);
  const targetCondition = musicMediaCondition(details.condition ?? details.mediaCondition ?? metadataValue(targetMetadata, "condition"));
  const candidateCondition = musicCandidateMediaCondition(listing);
  if (!targetCondition || !candidateCondition || targetCondition === candidateCondition) return null;
  // Marketplace condition labels such as Excellent, Good, and Fair are
  // subjective and frequently inconsistent across sellers. They should be
  // evidence for the visual reviewer, not hard pre-vision exclusions. Sealed
  // and For Parts are material product-state contradictions and remain gated.
  const materialConflict =
    (targetCondition === "sealed" && candidateCondition !== "sealed")
    || (candidateCondition === "sealed" && targetCondition !== "sealed")
    || (targetCondition === "for_parts" && candidateCondition !== "for_parts")
    || (candidateCondition === "for_parts" && targetCondition !== "for_parts");
  if (!materialConflict) return null;
  return `Music media condition differs: target is explicitly ${targetCondition.replace(/_/g, " ")}, but the candidate explicitly declares ${candidateCondition.replace(/_/g, " ")}.`;
}

function vintageToyCompleteness(value: unknown): "complete" | "incomplete" | null {
  const normalized = normalizedChoice(value);
  if (!normalized) return null;
  if (/^(?:no|false|0|incomplete)$/.test(normalized) || /incomplete|missing_(?:parts|piece|accessory)/.test(normalized)) return "incomplete";
  if (/^(?:yes|true|1|complete)$/.test(normalized) || /\bcomplete\b/.test(normalized)) return "complete";
  return null;
}

function vintageToyCompletenessConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (normalizedChoice(metadataValue(targetMetadata, "category")) !== "vintage_toys") return null;
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidateDetails = candidateStructuredDetails(listing);
  const targetCompleteness = vintageToyCompleteness(targetDetails.completeness ?? targetDetails.isComplete ?? targetDetails.complete ?? extractTargetTitle(targetMetadata));
  const candidateCompleteness = vintageToyCompleteness(candidateDetails.completeness ?? candidateDetails.isComplete ?? candidateDetails.complete ?? String(listing.title ?? ""));
  if (!targetCompleteness || !candidateCompleteness || targetCompleteness === candidateCompleteness) return null;
  return `Vintage-toy completeness differs: target is explicitly ${targetCompleteness}, but the candidate explicitly declares ${candidateCompleteness}.`;
}

function compoundNumber(value: unknown): { numerator: string; denominator: string } | null {
  const match = String(value ?? "").match(/\b(\d{1,6}[A-Za-z]?)\s*\/\s*(\d{1,7})\b/);
  return match ? { numerator: match[1].toLowerCase(), denominator: match[2] } : null;
}

function explicitCompoundNumberConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  const details = extractTargetItemDetails(targetMetadata);
  const target = compoundNumber(details.cardNumber ?? details.catalogNumber);
  if (!target) return null;
  const candidate = String(listing.title ?? "").match(/(?:\b(?:card(?:\s*(?:no\.?|number))?|catalog(?:\s*(?:no\.?|number))?|cat\.?)\s*#?|#\s*)(\d{1,6}[A-Za-z]?)\s*\/\s*(\d{1,7})\b/i);
  if (!candidate) return null;
  const candidateNumber = { numerator: candidate[1].toLowerCase(), denominator: candidate[2] };
  if (candidateNumber.numerator !== target.numerator || candidateNumber.denominator === target.denominator) return null;
  return `Card/catalog number differs: target is ${target.numerator}/${target.denominator}, but the candidate title explicitly declares ${candidateNumber.numerator}/${candidateNumber.denominator}.`;
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
    const gradingStateConflict = explicitGradingStateConflict(targetMetadata, listing);
    const productFormConflict = explicitProductFormConflict(targetMetadata, listing);
    const mediaConditionConflict = musicMediaConditionConflict(targetMetadata, listing);
    const completenessConflict = vintageToyCompletenessConflict(targetMetadata, listing);
    const compoundNumberConflict = explicitCompoundNumberConflict(targetMetadata, listing);
    const materialConflicts = findMaterialMetadataConflicts(targetMetadata, listing);
    const fieldConflict = distributionConflict || facsimileConflict || Boolean(packagingConflict) || Boolean(gradingStateConflict) || Boolean(productFormConflict) || Boolean(mediaConditionConflict) || Boolean(completenessConflict) || Boolean(compoundNumberConflict) || materialConflicts.length > 0;
    if (!conflict && !fieldConflict) return [];
    const reason = gradingStateConflict ?? productFormConflict ?? mediaConditionConflict ?? completenessConflict ?? compoundNumberConflict ?? packagingConflict ?? (materialConflicts.length > 0
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

const MULTI_ITEM_TITLE_PATTERNS = [
  /\b(?:mixed\s+)?(?:lot|bundle|group|collection|assortment)\b/i,
  /\b(?:set|pair|duo|trio|multipack|multi[-\s]?pack|box\s+of|pack\s+of)\b/i,
  /\b(?:\d+)\s*(?:coin|coins|card|cards|comic|comics|figure|figures|item|items|piece|pieces)\b/i,
  /\b(?:coins?|cards?|comics?|issues?|figures?)\s+\d+\s*[-–]\s*\d+\b/i,
  /#?\d+\s*(?:\+|,|\/)\s*#?\d+(?:\s*(?:\+|,|\/)\s*#?\d+)+/i,
];

function targetDescribesMultipleItems(targetMetadata: string): boolean {
  const title = extractTargetTitle(targetMetadata);
  const details = extractTargetItemDetails(targetMetadata);
  const detailText = [
    details.itemType,
    details.productType,
    details.form,
    details.setType,
    details.setName,
    details.quantity,
    details.itemCount,
    details.numberOfItems,
    details.lotQuantity,
    details.isSet,
    details.isLot,
    details.bundle,
  ].filter(value => value != null).map(String).join(" ");
  const combined = `${title} ${detailText}`;
  if (MULTI_ITEM_TITLE_PATTERNS.some(pattern => pattern.test(combined))) return true;
  if (/\b(?:set|lot|bundle|group|collection|assortment)\b/i.test(String(details.itemType ?? details.productType ?? details.form ?? ""))) return true;
  if ([details.quantity, details.itemCount, details.numberOfItems, details.lotQuantity].some(value => Number(value) > 1)) return true;
  if (details.isSet === true || details.isLot === true || details.bundle === true) return true;
  return Array.isArray(details.items) && details.items.length > 1;
}

function candidateMultiItemReason<T extends VisualSourceCandidate>(listing: T): string | null {
  const title = String(listing.title ?? "").trim();
  const structuredQuantity = [listing.lotQuantity, listing.itemCount, listing.numberOfItems, listing.quantity]
    .map(value => Number(value))
    .find(value => Number.isFinite(value) && value > 1);
  if (structuredQuantity) {
    return `Pre-visual lot filter: listing declares ${structuredQuantity} items, but the target is a single item.`;
  }
  const details = [listing.saleForm, listing.itemType, listing.productType, listing.form]
    .filter(value => value != null).map(String).join(" ");
  const text = `${title} ${details}`.trim();
  const matchedPattern = MULTI_ITEM_TITLE_PATTERNS.find(pattern => pattern.test(text));
  if (matchedPattern) {
    const label = /\b(?:lot|bundle|group|collection|assortment)\b/i.test(text) ? "lot or collection language" : "multi-item language";
    return `Pre-visual lot filter: title or listing metadata contains ${label}; retained as context-only because the target is a single item.`;
  }
  const years = new Set(text.match(/\b(?:17|18|19|20)\d{2}\b/g) ?? []);
  if (years.size > 1 && /(?:\+|\/|,|\band\b|\bthrough\b|\-)/i.test(text)) {
    return `Pre-visual lot filter: listing names multiple issue years (${[...years].join(", ")}); retained as context-only because the target is a single item.`;
  }
  return null;
}

export function isMultiItemLot<T extends VisualSourceCandidate>(listing: T, targetMetadata: string): boolean {
  return !targetDescribesMultipleItems(targetMetadata) && Boolean(candidateMultiItemReason(listing));
}

export function multiItemLotReason<T extends VisualSourceCandidate>(listing: T, targetMetadata: string): string | null {
  return isMultiItemLot(listing, targetMetadata) ? candidateMultiItemReason(listing) : null;
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
		  const targetMetadata = canonicalVisualTargetMetadata(args.targetMetadata);
  const preVisualLotReasons = new Map<number, string>();
  args.listings.forEach((listing, index) => {
    const reason = multiItemLotReason(listing, targetMetadata);
    if (reason) preVisualLotReasons.set(index, reason);
  });
  const declaredReviews = buildDeclaredIdentityReviews(args.listings, targetMetadata);
  const declaredReviewByIndex = new Map(declaredReviews.map((review) => [review.candidateIndex, review]));
  const preVisualExcludedIndexes = new Set([
    ...preVisualLotReasons.keys(),
    ...declaredReviewByIndex.keys(),
  ]);
  const preVisualContextListings: T[] = args.listings.flatMap<T>((listing, originalIndex) => {
    if (!preVisualExcludedIndexes.has(originalIndex)) return [] as T[];
    const declaredReview = declaredReviewByIndex.get(originalIndex);
    const reason = preVisualLotReasons.get(originalIndex)
      ?? declaredReview?.rationale
      ?? "Pre-visual identity filter excluded this listing from visual review.";
      return {
        ...listing,
        visualRequirement: "not_required_pre_visual",
        visualReviewStatus: declaredReview?.verdict ?? "not_reviewed",
        visualReviewRationale: reason,
        evidenceDisposition: "context_only",
      } as T;
  });
  const eligibleListings = args.listings.filter((_, index) => !preVisualExcludedIndexes.has(index));
  const target = safeHttps(args.targetImageUrl);
  if (!target)
    return {
      listings: eligibleListings,
      contextListings: preVisualContextListings,
      preVisualExcludedCount: preVisualContextListings.length,
      status: "skipped_no_target_image",
      reviewedCount: 0,
      removedCount: preVisualContextListings.length,
      retainedUnreviewedCount: 0,
      reviews: declaredReviews,
      note: `No target listing image was supplied; ${args.sourceLabel} candidates were not visually filtered. ${preVisualContextListings.length} explicit identity or multi-item listing${preVisualContextListings.length === 1 ? " was" : "s were"} excluded before vision and retained as context-only.`,
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
    .filter((entry) => !preVisualExcludedIndexes.has(entry.candidateIndex))
    .filter(
      (entry): entry is { item: T; candidateIndex: number; imageUrl: string; imageUrls: string[] } =>
        entry.imageUrls.length > 0
    );
  if (!candidates.length)
    return {
      listings: eligibleListings,
      contextListings: preVisualContextListings,
      preVisualExcludedCount: preVisualContextListings.length,
      status: "skipped_no_candidate_images",
      reviewedCount: 0,
      removedCount: preVisualContextListings.length,
      retainedUnreviewedCount: eligibleListings.length,
      reviews: declaredReviews,
      note: `No ${args.sourceLabel.toLowerCase()} candidate images were available; all eligible candidates were retained. ${preVisualContextListings.length} explicit identity or multi-item listing${preVisualContextListings.length === 1 ? " was" : "s were"} excluded before vision and retained as context-only.`,
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
              minItems: 1,
              maxItems: 1,
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
                      characterMatches: { type: "boolean" },
                      artworkMatches: { type: "boolean" },
                      silhouetteMatches: { type: "boolean" },
                      backingCardMatches: { type: "boolean" },
                      setDesignMatches: { type: "boolean" },
                      identityMatches: { type: "boolean" },
                      dateMatches: { type: "boolean" },
                      varietyMatches: { type: "boolean" },
                      mintMarkMatches: { type: "boolean" },
                      denominationMatches: { type: "boolean" },
                    },
                    required: ["slabVisible", "gradingLabelVisible", "graderVisible", "numericGradeVisible", "gradeMatches", "rawOrLooseVisible", "identityMatches", "dateMatches", "varietyMatches", "mintMarkMatches", "denominationMatches"],
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
    const reviewQueue = prioritizeVisualSourceCandidates(candidates, targetMetadata, declaredReviews);
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
          text: `You are a strict visual identity reviewer for ${args.sourceLabel}. You are reviewing exactly one candidate. First classify the TARGET and CANDIDATE as graded/slabbed or raw/ungraded from the images. A visible slab, certification label, encapsulation, or grading holder means graded; an exposed item without a slab means raw/ungraded. Graded-versus-raw status is a mandatory identity gate: if the target is graded and the candidate is visibly raw, mark mismatch with high confidence; if the target is raw and the candidate is visibly graded, mark mismatch with high confidence. Do not override this visual decision because the title, series, grade, or price looks similar. If either image is too obscured to determine graded/raw status, use unreadable or low-confidence manual review rather than accepting it. If the candidate title explicitly declares a grader or numeric grade but the primary image appears raw, loose, un-slabbed, or missing its label, this is a grading-evidence conflict: do not finalize a hard mismatch from the primary image alone. Use the additional gallery images and high-detail view to verify the slab, grader, and grade; if they remain unclear or contradictory, return unreadable/manual review. When the target is graded, the candidate numeric or descriptive grade is also mandatory: a holder or grader name alone is not enough. If the candidate grade is not clearly readable or cannot be confirmed to match the target, use unreadable/manual review and state that limitation in the rationale. Return visualEvidence booleans based only on visible pixels, never on title claims: slabVisible, gradingLabelVisible, graderVisible, numericGradeVisible, gradeMatches, rawOrLooseVisible, characterMatches, artworkMatches, silhouetteMatches, backingCardMatches, setDesignMatches, identityMatches, dateMatches, varietyMatches, mintMarkMatches, and denominationMatches. A graded match requires the first five fields true and rawOrLooseVisible false; otherwise use unreadable/manual review rather than match. If structured target metadata names a grade qualifier, label designation, or comic certification label status, that is also a mandatory identity fact: confirm the same explicit label evidence in the candidate title or images, otherwise use unreadable/manual review rather than infer it. After that gate, compare the TARGET cover/front image to the CANDIDATE cover/front image. For comics, the same series or character is not enough: the visible cover art, title treatment, issue number, language, edition, printing, and variant must correspond. If the candidate cover art is materially different from the target cover, mark mismatch with high confidence, even if the title, slab, grade, or series appears similar. Candidate title text is evidence: Mexican, foil, reprint, fifth printing, first appearance, variant, sketch, signed, edition, or a different issue are conflicts unless the target metadata explicitly supports them. Do not call a candidate a match merely because it is the same series, slab type, or grade. Use rough_match only when the cover is plausibly the same but cropped, obscured, or low quality. Use unreadable only when the image cannot be inspected.${gradedIdentifierInstruction()}${disneyPinsVisualInstruction(targetMetadata)}${explicitUngradedTargetInstruction(targetMetadata)}${gradedCoinInstruction(targetMetadata)}${coinVisualInstruction(targetMetadata)}${sportsCardSetInstruction(targetMetadata)}${vintageToyPackagingInstruction(targetMetadata)}${videoGameFormInstruction(targetMetadata)}${videoGameGraderEquivalenceInstruction(targetMetadata)} Return exactly one JSON review for candidate ${candidate.candidateIndex}: {"reviews":[{"candidateIndex":${candidate.candidateIndex},"verdict":"match|rough_match|mismatch|unreadable","confidence":"high|medium|low","rationale":"...","visualEvidence":{"slabVisible":true,"gradingLabelVisible":true,"graderVisible":true,"numericGradeVisible":true,"gradeMatches":true,"rawOrLooseVisible":false,"characterMatches":true,"artworkMatches":true,"silhouetteMatches":true,"backingCardMatches":true,"setDesignMatches":true,"identityMatches":true,"dateMatches":true,"varietyMatches":true,"mintMarkMatches":true,"denominationMatches":true}}]}. Target metadata: ${targetMetadata}`,
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
      // Reconcile a holder-cropped coin result with an exact completed-sale
      // title before calculating the retry. The reconciliation only unlocks
      // the independent second visual pass; it does not itself admit a sale.
      const reconciledPrimaryReviews = primaryReviews.map((review) => review.candidateIndex === candidate.candidateIndex
        ? reconcileCoinPrimaryReviewForAdjudication(review, targetMetadata, String(candidate.item.title ?? ""))
        : review);
      const primaryReview = reconciledPrimaryReviews.find((review) => review.candidateIndex === candidate.candidateIndex);
      const needsDisneyAdjudication = isDisneyPinsMetadata(targetMetadata) && primaryReview?.verdict === "match";
      // Every image-bearing coin candidate must receive the independent
      // high-resolution identity pass. The first pass is preliminary evidence
      // only; its normalized verdict must never be able to skip adjudication.
      const needsCoinAdjudication = isCoinMetadata(targetMetadata);
      const needsGalleryReview = shouldReviewAdditionalVisualImages({
        imageCount: candidate.imageUrls.length,
        review: primaryReview,
        title: String(candidate.item.title ?? ""),
        targetMetadata: targetMetadata,
      }) || needsDisneyAdjudication || needsCoinAdjudication;
      const needsFocusedGradeEscalation = hasTitleDeclaredGradeVisualRawConflict({
        review: primaryReview,
        title: String(candidate.item.title ?? ""),
        targetMetadata: targetMetadata,
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
          ? needsDisneyAdjudication
            ? "Disney Pins require an independent second visual adjudication for every apparent match before analyzer admission."
            : needsCoinAdjudication
            ? "Coins require an independent second visual adjudication of date, variety, identity, and raw/graded state before analyzer admission."
            : needsFocusedGradeEscalation
            ? `The preliminary mismatch involved a graded target, so an independent high-resolution grader check was performed before finalizing the decision${embeddedFocusedCandidateImage ? " using the exact promoted eBay image bytes" : " using the promoted provider image URL"}.`
            : "The first pass found an image-evidence uncertainty or a title/visual grading conflict."
          : undefined,
        finalPass: "initial" as const,
        initialEvidence: primaryReview?.visualEvidence,
        finalEvidence: primaryReview?.visualEvidence,
      };
      if (!needsGalleryReview) {
        return {
          reviews: reconciledPrimaryReviews.map((review) => review.candidateIndex === candidate.candidateIndex
            ? { ...review, visualAudit: initialAudit }
            : review),
          error: null,
        };
      }

      const galleryContent: Array<TextContent | ImageContent> = needsDisneyAdjudication
        ? [
            {
              type: "text",
              text: `INDEPENDENT DISNEY PINS IDENTITY ADJUDICATION: Ignore every preliminary verdict and independently compare exactly two images at high detail: first image is TARGET; second image is CANDIDATE ${candidate.candidateIndex}. Disney Pins have no grading-company, slab, numeric-grade, or raw-versus-graded identity gate. Same character, similar colors, or the same series is not enough. Confirm every visible identity detail independently: character, exact artwork, pose, silhouette, pin shape, colors, backing card/backing logo, event or set design, edition markings, and pin count/form. Any material artwork, silhouette, backing, set-design, pose, or edition conflict is mismatch with high confidence. If any required detail is obscured or the images disagree, return unreadable/manual review rather than match. Return match only if all five structured Disney identity booleans are true: characterMatches, artworkMatches, silhouetteMatches, backingCardMatches, and setDesignMatches. Return exactly one JSON review for candidate ${candidate.candidateIndex} using the required visualEvidence object. Target metadata: ${targetMetadata}`,
            },
            { type: "text", text: "TARGET LISTING IMAGE:" },
            { type: "image_url", image_url: { url: target, detail: "high" } },
            { type: "text", text: `CANDIDATE ${candidate.candidateIndex} INDEPENDENT HIGH-RESOLUTION IMAGE:` },
            { type: "image_url", image_url: { url: focusedCandidateImage, detail: "high" } },
            ...candidate.imageUrls.slice(1).map((url) => ({ type: "image_url" as const, image_url: { url: promoteEbayImageUrl(url) ?? url, detail: "high" as const }, })),
          ]
        : needsCoinAdjudication
        ? [
            {
              type: "text",
              text: `INDEPENDENT COIN IDENTITY ADJUDICATION: Ignore the preliminary verdict and compare exactly two images at high detail: first image is TARGET; second image is CANDIDATE ${candidate.candidateIndex}. Confirm the exact visible coin identity, date, denomination, variety/series, and any required mint mark. A close crop of the coin face does not prove the item is raw or ungraded. For a graded target, confirm the matching grader and grade from visible pixels when available or from the exact marketplace title when the holder label is cropped out; only an explicit raw, loose, ungraded, or no-holder conflict should fail the graded-state check. For a raw target, the candidate must visibly be raw/ungraded with no slab or holder. Certificate numbers, serial numbers, barcodes, QR codes, and other holder tracking identifiers do not need to match. Generic stock imagery, unreadable dates or varieties, ambiguous identity, or any disagreement is unreadable/manual review. Return exactly one JSON review for candidate ${candidate.candidateIndex} using the required visualEvidence object with identityMatches, dateMatches, varietyMatches, mintMarkMatches, and denominationMatches.`
            },
            { type: "text", text: "TARGET COIN IMAGE:" },
            { type: "image_url", image_url: { url: target, detail: "high" } },
            { type: "text", text: `CANDIDATE ${candidate.candidateIndex} INDEPENDENT HIGH-RESOLUTION COIN IMAGE:` },
            { type: "image_url", image_url: { url: focusedCandidateImage, detail: "high" } },
            ...candidate.imageUrls.slice(1).map((url) => ({ type: "image_url" as const, image_url: { url: promoteEbayImageUrl(url) ?? url, detail: "high" as const }, })),
          ]
        : needsFocusedGradeEscalation
        ? [
            {
              type: "text",
              text: `INDEPENDENT HIGH-RESOLUTION GRADING ADJUDICATION: Compare exactly two images at high detail: first image is TARGET; second image is CANDIDATE ${candidate.candidateIndex}. Do not rely on or repeat any preliminary verdict. First read and reconcile the visible holder-label facts for BOTH images: slab/holder present, grader, numeric grade, and any printed form designation. Then decide item identity. A visible transparent slab plus a grading label and readable grade is graded—not raw—even if the item inside is a cartridge, card, coin, comic, toy, or game. Only call the candidate raw/loose when those visible slab and label signals are absent. The candidate image is supplied as the exact promoted provider image bytes when available; inspect it rather than a displayed thumbnail.${focusedVideoGameLabelInstruction(targetMetadata)}${videoGameGraderEquivalenceInstruction(targetMetadata)} Then independently compare the actual product identity, front artwork/cover, packaging, and edition. Return exactly one JSON review for candidate ${candidate.candidateIndex} using the required visualEvidence object. If the grading evidence or identity remains truly unclear, return unreadable rather than guessing. Target metadata: ${targetMetadata}`,
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
      let galleryReviews: VisualSourceReview[] = [];
      let galleryError: unknown;
      for (const responseFormat of [strictResponseFormat, { type: "json_object" as const }]) {
        try {
          const response = await invokeVisualReview({ model: needsFocusedGradeEscalation ? "gpt-5" : "gpt-5-mini", messages: [{ role: "user", content: galleryContent }], maxCompletionTokens: 1800, reasoning: needsFocusedGradeEscalation ? { effort: "low" } : undefined, temperature: 0, response_format: responseFormat }, VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS);
          const raw = response.choices[0]?.message?.content;
          const galleryText = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.filter((part): part is TextContent => part.type === "text").map(part => part.text).join("\n") : "";
          if (!galleryText.trim()) throw new Error("The gallery visual review returned no structured content");
          galleryReviews = normalizeSingleCandidateVisualReview(
            parseAnalyzerResponse(galleryText),
            args.listings.length,
            candidate.candidateIndex,
          );
          if (!galleryReviews.length && needsCoinAdjudication) {
            galleryReviews = normalizeCompactCoinAdjudicationReview(
              parseAnalyzerResponse(galleryText),
              candidate.candidateIndex,
              targetMetadata,
              String(candidate.item.title ?? ""),
            );
          }
          if (galleryReviews.length) break;
          galleryError = new Error("The high-resolution visual-review call returned a structured reply without the required review decision.");
        } catch (error) {
          galleryError = error;
        }
      }
      if (!galleryReviews.length) {
        return {
          reviews: reconciledPrimaryReviews.map((review) => review.candidateIndex === candidate.candidateIndex
            ? {
                ...enforceCoinExactEvidence(enforceDisneyPinsExactEvidence(review, targetMetadata), targetMetadata, String(candidate.item.title ?? "")),
                visualAudit: {
                  ...initialAudit,
                  retryStatus: "failed",
                  adjudicationStatus: "unavailable",
                  retryReason: galleryError instanceof VisualReviewTimeoutError
                    ? "The high-resolution visual-review call timed out before returning a structured decision."
                    : galleryError instanceof Error && galleryError.message.includes("required review decision")
                    ? "The high-resolution visual-review call returned a reply without the required decision, so its fallback format was tried but also did not return a usable decision."
                    : "The high-resolution visual-review call returned no usable structured decision.",
                  finalPass: "initial",
                } satisfies NonNullable<VisualSourceReview["visualAudit"]>,
              }
            : review),
          error: galleryError ?? null,
        };
      }
      const finalReviews = galleryReviews;
      return {
        reviews: finalReviews.map((review) => review.candidateIndex === candidate.candidateIndex
          ? {
              ...enforceCoinExactEvidence(enforceDisneyPinsExactEvidence(review, targetMetadata), targetMetadata, String(candidate.item.title ?? "")),
              visualAudit: {
                ...initialAudit,
                adjudicationStatus: needsDisneyAdjudication || needsCoinAdjudication ? (galleryReviews.length ? "confirmed" : "unavailable") : undefined,
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
          conservativeCoinVisualReviews(
          conservativeGradedVisualReviews(
          conservativeComicVisualReviews(reviews, args.listings, targetMetadata),
          args.listings,
          targetMetadata,
          ), args.listings, targetMetadata),
          targetMetadata,
        ).filter((review) => review.verdict === 'match' || review.verdict === 'rough_match').length;
      if (acceptedMatches >= VISUAL_REVIEW_TARGET_MATCHES) break;
    }
    if (!completedBatches && reviewQueue.length && !timedOutCount && !deadlineReached) {
      throw lastError instanceof Error ? lastError : new Error("The vision model returned no structured content");
    }
    const uniqueReviews = normalizeExplicitUngradedVisualReviews(
      conservativeCoinVisualReviews(
      conservativeGradedVisualReviews(
        conservativeComicVisualReviews(
          reviews.filter((review, index, all) => all.findIndex((other) => other.candidateIndex === review.candidateIndex) === index),
          args.listings,
          targetMetadata,
        ),
        args.listings,
        targetMetadata,
      ), args.listings, targetMetadata),
      targetMetadata,
    );
    const reviewByIndex = new Map(uniqueReviews.map((review) => [review.candidateIndex, review]));
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
      const preVisualReason = preVisualLotReasons.get(index);
      if (preVisualReason) {
        return {
          ...listing,
          visualRequirement: "not_required_pre_visual",
          visualReviewStatus: "not_reviewed",
          visualReviewRationale: preVisualReason,
          evidenceDisposition: "context_only",
        } as T;
      }
      const declaredReview = declaredReviewByIndex.get(index);
      if (declaredReview) {
        return {
          ...listing,
          visualRequirement: "not_required_pre_visual",
          visualReviewStatus: declaredReview.verdict,
          visualReviewRationale: declaredReview.rationale,
          evidenceDisposition: "context_only",
        } as T;
      }
      if (!imageBearingIndexes.has(index)) return listing;
      if (reviewedIndexes.has(index)) return { ...listing, visualRequirement: "required" } as T;
      return {
        ...listing,
        visualRequirement: "required",
        visualReviewStatus: "not_reviewed",
        visualReviewRationale: "Candidate image was not reached by the bounded adaptive review window; manual image review is required.",
        evidenceDisposition: "not_visually_reviewed_window",
      } as T;
    });
    const applied = applyVisualSourceReviews(
      requirementAnnotatedListings,
      uniqueReviews,
      reviewedCandidateCount,
      { requireExactMatch: isDisneyPinsMetadata(targetMetadata), requireCoinExactMatch: isCoinMetadata(targetMetadata), targetMetadata: targetMetadata },
    );
    const declaredConflictIndexes = new Set(declaredReviews.map((review) => review.candidateIndex));
    const contextIndexes = new Set([...declaredConflictIndexes, ...preVisualLotReasons.keys()]);
    const contextListings = applied.listings.filter((_, index) => contextIndexes.has(index));
    const visibleListings = applied.listings.filter((_, index) => !contextIndexes.has(index));
    const completedWithTimeout = timedOutCount > 0 || deadlineReached;
    return {
      ...applied,
      listings: visibleListings,
      contextListings,
      preVisualExcludedCount: preVisualContextListings.length,
      removedCount: contextListings.length,
      status: completedWithTimeout ? "completed_with_timeout" : "applied",
      reviews: uniqueReviews,
      timedOutCount,
      deadlineReached,
      note: `${buildVisualSourceFilterNote(args.sourceLabel, { ...applied, removedCount: contextListings.length })} Adaptive visual review sent ${reviewedCandidateCount} of ${candidates.length} image-bearing candidates in batches of ${VISUAL_REVIEW_BATCH_SIZE}, stopping after ${VISUAL_REVIEW_TARGET_MATCHES} accepted visual matches, the ${VISUAL_REVIEW_MAX_CANDIDATES}-image maximum, or the ${VISUAL_REVIEW_OVERALL_DEADLINE_MS / 1000}-second overall deadline; ${timedOutCount} candidate${timedOutCount === 1 ? "" : "s"} timed out; ${preVisualLotReasons.size} multi-item listing${preVisualLotReasons.size === 1 ? " was" : "s were"} excluded before vision and retained as context-only; ${declaredConflictIndexes.size} other explicit identity conflict${declaredConflictIndexes.size === 1 ? " was" : "s were"} excluded before vision and retained in context for audit.${completedWithTimeout ? " Remaining candidates are retained for manual review and cannot enter valuation implicitly." : ""}`,
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
        : listing).filter((_, index) => !preVisualExcludedIndexes.has(index)),
      contextListings: preVisualContextListings,
      preVisualExcludedCount: preVisualContextListings.length,
      status: "provider_unavailable",
      reviewedCount: 0,
      removedCount: preVisualContextListings.length,
      retainedUnreviewedCount: candidates.length,
      reviews: declaredReviews,
      note: `The ${args.sourceLabel.toLowerCase()} visual filter was unavailable; all eligible text-filtered candidates were retained. ${preVisualContextListings.length} explicit identity or multi-item listing${preVisualContextListings.length === 1 ? " was" : "s were"} excluded before vision and retained as context-only.`,
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
