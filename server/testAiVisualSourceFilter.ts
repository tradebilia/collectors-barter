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
  if (typeof value !== "string" || !value.trim()) return null;
  let url: string;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:") {
      if (!/(?:^|\.)ebayimg\.com$/i.test(parsed.hostname)) return null;
      parsed.protocol = "https:";
    } else if (parsed.protocol !== "https:") {
      return null;
    }
    url = parsed.toString();
  } catch {
    return null;
  }
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

type NormalizedVisualSourceCandidate = VisualSourceCandidate & {
  details: Record<string, unknown>;
  title: string;
  imageUrls: string[];
  providerReference: string | null;
  quantity: number | null;
  grade: string;
  grader: string;
  isGraded: string;
  condition: string;
  itemType: string;
};

function candidateText(value: unknown): string {
  return String(value ?? "").trim();
}

function firstCandidateText(...values: unknown[]): string {
  return values.map(candidateText).find(Boolean) ?? "";
}

function imageValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(imageValues);
  if (!value || typeof value !== "object") return [];
  const image = value as Record<string, unknown>;
  return [image.imageUrl, image.thumbnailUrl, image.url, image.src].flatMap(imageValues);
}

/**
 * Provider payloads use different aliases. This adapter deliberately normalizes
 * only source-neutral facts; missing data remains unknown and is never inferred.
 */
export function normalizeVisualSourceCandidate(listing: VisualSourceCandidate): NormalizedVisualSourceCandidate {
  const details = candidateStructuredDetails(listing);
  const rawImages = [
    listing.imageUrls,
    listing.imageUrl,
    listing.thumbnailUrl,
    listing.image,
    listing.images,
    listing.galleryImages,
    listing.image_url,
    details.imageUrls,
    details.imageUrl,
    details.thumbnailUrl,
    details.images,
  ].flatMap(imageValues);
  const imageUrls = Array.from(new Set(rawImages
    .map(promoteEbayImageUrl)
    .filter((url): url is string => Boolean(url))))
    .slice(0, 8);
  const providerReference = firstCandidateText(
    listing.saleId,
    listing.listingId,
    listing.itemId,
    listing.id,
    listing.itemUrl,
    listing.url,
    listing.itemWebUrl,
    listing.permalink,
    listing.link,
  );
  const quantityValue = [
    listing.lotQuantity,
    listing.itemCount,
    listing.numberOfItems,
    listing.quantity,
    details.lotQuantity,
    details.itemCount,
    details.numberOfItems,
    details.quantity,
  ].map((value) => Number(value)).find((value) => Number.isFinite(value) && value > 0);
  return {
    details,
    title: candidateText(listing.title),
    imageUrls,
    providerReference: providerReference || null,
    quantity: quantityValue ?? null,
    grade: firstCandidateText(listing.grade, details.grade),
    grader: firstCandidateText(listing.certificationCompany, listing.gradingCompany, listing.grader, details.certificationCompany, details.gradingCompany, details.grader),
    isGraded: firstCandidateText(listing.isGraded, details.isGraded, details.graded),
    condition: firstCandidateText(listing.condition, details.condition, details.mediaCondition),
    itemType: firstCandidateText(listing.itemType, listing.productType, listing.form, listing.saleForm, details.itemType, details.productType, details.form),
  };
}

function candidateStructuredDetails(listing: VisualSourceCandidate): Record<string, unknown> {
  return visualMetadataDetails(listing.fullItemDetails ?? listing.itemDetails ?? listing.details);
}

type ExplicitState = "yes" | "no" | "unknown";

function targetNumericQuantity(targetMetadata: string): number {
  const details = extractTargetItemDetails(targetMetadata);
  const quantity = [details.quantity, details.itemCount, details.numberOfItems, details.lotQuantity]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value > 0);
  return quantity ?? 1;
}

function explicitState(value: unknown, yesPattern: RegExp, noPattern: RegExp): ExplicitState {
  const text = candidateText(value);
  if (!text) return "unknown";
  if (yesPattern.test(text)) return "yes";
  if (noPattern.test(text)) return "no";
  return "unknown";
}

function sourceText(candidate: NormalizedVisualSourceCandidate): string {
  const detailText = Object.entries(candidate.details).map(([key, value]) => `${key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ")} ${candidateText(value)}`);
  return [candidate.title, candidate.condition, candidate.itemType, ...detailText]
    .filter(Boolean)
    .join(" ");
}

function targetText(metadata: string): string {
  const details = extractTargetItemDetails(metadata);
  const detailText = Object.entries(details).map(([key, value]) => `${key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ")} ${candidateText(value)}`);
  return [extractTargetTitle(metadata), metadataValue(metadata, "itemType"), metadataValue(metadata, "condition"), ...detailText]
    .filter(Boolean)
    .join(" ");
}

function sealedState(value: string): ExplicitState {
  if (/\b(?:sealed(?:\s+status)?\s+(?:no|false|0)|opened|open(?:ed)?\s+box|unsealed|not\s+sealed|used|pre[- ]?owned)\b/i.test(value)) return "no";
  if (/\b(?:sealed(?:\s+status)?\s+(?:yes|true|1)|factory\s+sealed|new\s*[/|]?\s*sealed|sealed|unopened|new\s+in\s+(?:shrink|box))\b/i.test(value)) return "yes";
  return "unknown";
}

function unusableState(value: string): ExplicitState {
  return explicitState(
    value,
    /\b(?:for\s+parts|parts\s+only|broken|damaged|incomplete|missing\s+(?:part|piece|accessory|disc|manual))\b/i,
    /\b(?:complete|working|tested|intact|mint|excellent|good|fair|new|sealed)\b/i,
  );
}

function signedState(value: string): ExplicitState {
  if (/\b(?:signed|autograph(?:ed)?|signature)(?:\s+(?:status|present))?\s+(?:no|false|0)|\b(?:unsigned|not\s+signed|no\s+autograph)\b/i.test(value)) return "no";
  if (/\b(?:signed|autograph(?:ed)?|signature)(?:\s+(?:status|present))?\s+(?:yes|true|1)|\b(?:signed|autograph(?:ed)?|signature)\b/i.test(value)) return "yes";
  return "unknown";
}

function originalState(value: string): ExplicitState {
  return explicitState(
    value,
    /\b(?:facsimile|reproduction|replica)\s+(?:no|false|0)|\b(?:original|first\s+print(?:ing)?|authentic)\b/i,
    /\b(?:facsimile|reproduction|replica)\s+(?:yes|true|1)|\b(?:reproduction|replica|facsimile|reprint)\b/i,
  );
}

type ComponentOnly = "manual" | "case" | "box" | "accessory" | "replacement_part" | null;

function componentOnlyState(value: string): ComponentOnly {
  if (/\b(?:instruction\s+)?manual\s+only\b/i.test(value)) return "manual";
  if (/\b(?:case|cassette\s+case|dvd\s+case)\s+only\b/i.test(value)) return "case";
  if (/\b(?:box|packaging)\s+only\b/i.test(value)) return "box";
  if (/\baccessor(?:y|ies)\s+only\b/i.test(value)) return "accessory";
  if (/\b(?:replacement\s+)?(?:part|piece)\s+only\b/i.test(value)) return "replacement_part";
  return null;
}

type ParsedComparableGrade = { numeric: string; designation: string | null } | null;

function parsedComparableGrade(value: unknown, options: { allowBareNumeric?: boolean } = {}): ParsedComparableGrade {
  const text = candidateText(value).trim();
  const withoutGrader = text
    .replace(/\b(?:PSA|AFA|CGC|CBCS|BGS|SGC|PCGS|NGC|WATA|VGA|HGA|CSG|ISA|GMA|PSE|ASG)\b/gi, " ");
  const designation = withoutGrader.match(/\b(MS|PR|PF|SP|AU|VG|VF|EX|NM|MT)\s*(\d{1,3}(?:\.\d+)?)/i);
  if (designation) return { numeric: String(Number(designation[2])), designation: designation[1].toUpperCase() };
  const graderAdjacent = text.match(/\b(?:PSA|AFA|CGC|CBCS|BGS|SGC|PCGS|NGC|WATA|VGA|HGA|CSG|ISA|GMA|PSE|ASG)\s+(?:graded\s+)?(?:[A-Z]{1,3}\s*)?(\d{1,3}(?:\.\d+)?)(?:\+)?\b/i)?.[1];
  if (graderAdjacent && Number.isFinite(Number(graderAdjacent))) return { numeric: String(Number(graderAdjacent)), designation: null };
  const labeled = text.match(/\b(?:grade|graded|score|rating)\s*(?:is|of|:)?\s*(\d{1,3}(?:\.\d+)?)(?:\+)?\b/i)?.[1];
  if (labeled && Number.isFinite(Number(labeled))) return { numeric: String(Number(labeled)), designation: null };
  const bare = options.allowBareNumeric ? text.match(/^\s*(\d{1,3}(?:\.\d+)?)(?:\+)?\s*$/)?.[1] : null;
  return bare && Number.isFinite(Number(bare)) ? { numeric: String(Number(bare)), designation: null } : null;
}

function universalGradeConflict(targetMetadata: string, candidate: NormalizedVisualSourceCandidate): string | null {
  if (normalizedChoice(metadataValue(targetMetadata, "category")) === "disney_pins") return null;
  if (targetExplicitGradingState(targetMetadata) !== "graded" || candidateExplicitGradingState(candidate) !== "graded") return null;
  const target = parsedComparableGrade(metadataValue(targetMetadata, "grade"), { allowBareNumeric: true });
  const source = parsedComparableGrade(candidate.grade, { allowBareNumeric: true }) ?? parsedComparableGrade(candidate.title);
  if (!target || !source) return null;
  if (target.numeric !== source.numeric || (target.designation && source.designation && target.designation !== source.designation)) {
    return `Grade differs: target explicitly declares ${target.designation ?? "grade"} ${target.numeric}, but the candidate explicitly declares ${source.designation ?? "grade"} ${source.numeric}.`;
  }
  return null;
}

function normalizedGrader(value: unknown): string {
  return candidateText(value).replace(/\s*(?:comics|cards|grading)$/i, "").trim().toUpperCase();
}

function targetGrader(targetMetadata: string): string {
  const details = extractTargetItemDetails(targetMetadata);
  const configured = normalizedGrader(metadataValue(targetMetadata, "certificationCompany"));
  const custom = normalizedGrader(details.customGradingCompany ?? details.customCertificationCompany ?? details.otherGradingCompany);
  return configured === "OTHER" ? custom : configured;
}

function candidateGrader(candidate: NormalizedVisualSourceCandidate): string {
  const structured = normalizedGrader(candidate.grader);
  if (structured) return structured;
  const title = candidate.title;
  const match = title.match(/\b(PSA|AFA|CGC|CBCS|BGS|SGC|PCGS|NGC|WATA|VGA|HGA|CSG|ISA|GMA|PSE|ASG)\b/i);
  if (!match) return "";
  const preceding = title.slice(Math.max(0, (match.index ?? 0) - 48), match.index ?? 0);
  return /\b(?:not|no|without|non)\b[^.!?;]{0,48}$/i.test(preceding) ? "" : match[1].toUpperCase();
}

function gradeCompanyConflict(targetMetadata: string, candidate: NormalizedVisualSourceCandidate): string | null {
  if (normalizedChoice(metadataValue(targetMetadata, "category")) === "disney_pins") return null;
  if (targetExplicitGradingState(targetMetadata) !== "graded") return null;
  const expected = targetGrader(targetMetadata);
  const actual = candidateGrader(candidate);
  if (!expected || !actual || expected === actual) return null;
  const videoGamePsaWataEquivalent = normalizedChoice(metadataValue(targetMetadata, "category")) === "video_games"
    && ((expected === "PSA" && actual === "WATA") || (expected === "WATA" && actual === "PSA"));
  if (videoGamePsaWataEquivalent) return null;
  return `Grading company differs: target explicitly declares ${expected}, but the candidate explicitly declares ${actual}.`;
}

function universalCandidateConflict(targetMetadata: string, candidate: NormalizedVisualSourceCandidate): string | null {
  const target = targetText(targetMetadata);
  const source = sourceText(candidate);
  const targetQuantity = targetNumericQuantity(targetMetadata);
  if (targetQuantity === 1 && (candidate.quantity ?? 1) > 1) {
    return `Universal quantity filter: candidate declares ${candidate.quantity} items while the target quantity is 1.`;
  }
  const gradingConflict = explicitGradingStateConflict(targetMetadata, candidate);
  if (gradingConflict) return gradingConflict;
  const graderConflict = gradeCompanyConflict(targetMetadata, candidate);
  if (graderConflict) return graderConflict;
  const gradeConflict = universalGradeConflict(targetMetadata, candidate);
  if (gradeConflict) return gradeConflict;
  const targetSealed = sealedState(target);
  const candidateSealed = sealedState(source);
  if (targetSealed !== "unknown" && candidateSealed !== "unknown" && targetSealed !== candidateSealed) {
    return `Material sealed state differs: target is explicitly ${targetSealed === "yes" ? "sealed" : "not sealed"}, but the candidate explicitly declares the opposite.`;
  }
  const targetUnusable = unusableState(target);
  const candidateUnusable = unusableState(source);
  if (targetUnusable !== "unknown" && candidateUnusable !== "unknown" && targetUnusable !== candidateUnusable) {
    return `Material condition differs: target is explicitly ${targetUnusable === "yes" ? "for parts, damaged, or incomplete" : "usable/complete"}, but the candidate explicitly declares the opposite.`;
  }
  const targetSigned = signedState(target);
  const candidateSigned = signedState(source);
  if (targetSigned !== "unknown" && candidateSigned !== "unknown" && targetSigned !== candidateSigned) {
    return `Signature state differs: target is explicitly ${targetSigned === "yes" ? "signed" : "unsigned"}, but the candidate explicitly declares the opposite.`;
  }
  const targetOriginal = originalState(target);
  const candidateOriginal = originalState(source);
  if (targetOriginal !== "unknown" && candidateOriginal !== "unknown" && targetOriginal !== candidateOriginal) {
    return `Original/reproduction state differs: target and candidate explicitly declare opposite authenticity states.`;
  }
  const targetComponent = componentOnlyState(target);
  const candidateComponent = componentOnlyState(source);
  if (candidateComponent && candidateComponent !== targetComponent) {
    return `Component-only mismatch: candidate is explicitly ${candidateComponent.replace(/_/g, " ")}-only, but the target is not explicitly the same component.`;
  }
  return null;
}

type UniversalPreparation<T extends VisualSourceCandidate> = {
  listings: T[];
  contextReasons: Map<number, string>;
};

/**
 * Runs before ranking and vision for every shared visual source. Only exact
 * provider references are deduplicated; titles, prices, and images are never
 * used as duplicate evidence because they can represent separate sales.
 */
export function prepareUniversalVisualCandidates<T extends VisualSourceCandidate>(listings: T[], targetMetadata: string): UniversalPreparation<T> {
  const normalized = listings.map(normalizeVisualSourceCandidate);
  const canonicalIndexByReference = new Map<string, number>();
  const mergedImages = normalized.map((candidate) => [...candidate.imageUrls]);
  const contextReasons = new Map<number, string>();
  normalized.forEach((candidate, index) => {
    if (candidate.providerReference) {
      const canonicalIndex = canonicalIndexByReference.get(candidate.providerReference);
      if (canonicalIndex !== undefined) {
        mergedImages[canonicalIndex] = Array.from(new Set([...mergedImages[canonicalIndex], ...candidate.imageUrls])).slice(0, 8);
        contextReasons.set(index, "Universal duplicate filter: same provider record reference as an earlier candidate; retained as context-only and not sent to visual review.");
        return;
      }
      canonicalIndexByReference.set(candidate.providerReference, index);
    }
    const conflict = universalCandidateConflict(targetMetadata, candidate);
    if (conflict) {
      contextReasons.set(index, `${conflict} Retained as context-only before visual review.`);
      return;
    }
  });
  return {
    listings: listings.map((listing, index) => ({
      ...listing,
      imageUrl: mergedImages[index][0] ?? normalizeVisualSourceCandidate(listing).imageUrls[0] ?? null,
      imageUrls: mergedImages[index],
    }) as T),
    contextReasons,
  };
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
  if (/\b(?:PSA|AFA|CGC|CBCS|BGS|SGC|PCGS|NGC|WATA|VGA)\s*(?:graded\s*)?(?:[A-Z]{1,3}\s*)?\d{1,3}(?:\.\d+)?\b|\b(?:graded|slabbed|encapsulated)\b/i.test(title)) return "graded";
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

type ProductForm = "set" | "single_card" | "unopened_product" | "sealed" | "cib" | "boxed_only" | "loose" | "parts_only" | "complete" | "incomplete" | null;

function sportsCardProductForm(value: unknown): ProductForm {
  const normalized = normalizedChoice(value);
  if (!normalized) return null;
  if (/unopened_product/.test(normalized)) return "unopened_product";
  if (/(?:^|_)(?:complete|factory|team|master|card)?_?set(?:$|_)/.test(normalized)) return "set";
  if (/(?:^|_)(?:single|individual)_?(?:card)?(?:$|_)/.test(normalized)) return "single_card";
  return null;
}

function sportsCardTitleProductForm(title: string): ProductForm {
  if (/\bunopened\s+product\b/i.test(title)) return "unopened_product";
  if (/\b(?:complete|factory|team|master)\s+set\b/i.test(title)) return "set";
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

type SportsCardBinaryState = "yes" | "no" | null;

function sportsCardBinaryState(value: unknown): SportsCardBinaryState {
  const normalized = normalizedChoice(value);
  if (["yes", "true", "1", "present", "included", "numbered", "rookie", "autograph", "autographed", "relic", "memorabilia"].includes(normalized)) return "yes";
  if (["no", "false", "0", "none", "not_numbered", "non_numbered", "un_numbered", "non_rookie", "not_rookie", "unsigned", "non_autograph", "non_relic"].includes(normalized)) return "no";
  return null;
}

function sportsCardExplicitState(
  listing: VisualSourceCandidate,
  field: "rookieCard" | "autograph" | "relicMemorabilia" | "serialNumbered",
): SportsCardBinaryState {
  const details = candidateStructuredDetails(listing);
  const structuredValue = field === "rookieCard"
    ? listing.rookieCard ?? details.rookieCard ?? details.rookieStatus
    : field === "autograph"
    ? listing.autograph ?? details.autograph ?? details.isAutographed
    : field === "relicMemorabilia"
    ? listing.relicMemorabilia ?? details.relicMemorabilia ?? details.relic ?? details.memorabilia
    : listing.serialNumbered ?? details.serialNumbered ?? details.isSerialNumbered
      ?? (details.serialNumber ?? details.printRun ? "yes" : undefined);
  const structured = sportsCardBinaryState(structuredValue);
  if (structured) return structured;
  const title = String(listing.title ?? "");
  if (field === "rookieCard") {
    if (/\b(?:non[-\s]?rookie|not\s+rookie|no\s+rookie|non[-\s]?rc)\b/i.test(title)) return "no";
    if (/\b(?:rookie|RC)\b/i.test(title)) return "yes";
  }
  if (field === "autograph") {
    if (/\b(?:non[-\s]?auto(?:graph)?|unsigned|no\s+(?:auto(?:graph)?|signature))\b/i.test(title)) return "no";
    if (/\b(?:autograph(?:ed)?|auto|signed|signature)\b/i.test(title)) return "yes";
  }
  if (field === "relicMemorabilia") {
    if (/\b(?:non[-\s]?relic|no\s+(?:relic|memorabilia)|base\s+card)\b/i.test(title)) return "no";
    if (/\b(?:relic|memorabilia|patch|jersey|bat|ball)\b/i.test(title)) return "yes";
  }
  if (field === "serialNumbered") {
    if (/\b(?:non[-\s]?numbered|un[-\s]?numbered|not\s+numbered|no\s+serial)\b/i.test(title)) return "no";
    if (/\b(?:serial(?:ly)?\s+numbered|numbered)\b|\b\d{1,4}\s*\/\s*\d{1,5}\b/i.test(title)) return "yes";
  }
  return null;
}

function sportsCardSingleCardConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (normalizedChoice(metadataValue(targetMetadata, "category")) !== "sports_cards") return null;
  if (targetProductForm(targetMetadata) !== "single_card") return null;
  const details = extractTargetItemDetails(targetMetadata);
  const fields = [
    ["rookieCard", "Rookie-card status"],
    ["autograph", "Autograph status"],
    ["relicMemorabilia", "Relic/memorabilia status"],
    ["serialNumbered", "Serial-numbered status"],
  ] as const;
  for (const [field, label] of fields) {
    const targetValue = field === "rookieCard"
      ? details.rookieCard ?? details.rookieStatus
      : field === "autograph"
      ? details.autograph ?? details.isAutographed
      : field === "relicMemorabilia"
      ? details.relicMemorabilia ?? details.relic ?? details.memorabilia
      : details.serialNumbered ?? details.isSerialNumbered ?? (details.serialNumber ?? details.printRun ? "yes" : undefined);
    const targetState = sportsCardBinaryState(targetValue);
    const candidateState = sportsCardExplicitState(listing, field);
    if (targetState && candidateState && targetState !== candidateState) {
      return `${label} differs: target explicitly declares ${targetState === "yes" ? "yes" : "no"}, but the candidate explicitly declares ${candidateState === "yes" ? "yes" : "no"}.`;
    }
  }
  return null;
}

function sportsCardSetConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (normalizedChoice(metadataValue(targetMetadata, "category")) !== "sports_cards") return null;
  if (targetProductForm(targetMetadata) !== "set") return null;

  const details = extractTargetItemDetails(targetMetadata);
  const title = String(listing.title ?? "");
  const candidateForm = candidateProductForm(targetMetadata, listing);
  // A set target must never send an explicitly individual card to vision. This
  // is intentionally conservative: only direct single-card evidence is gated;
  // unknown or ambiguous titles remain eligible for visual confirmation.
  const individualCardEvidence =
    candidateForm === "single_card"
    || /\b(?:single|individual)\s+(?:sports\s+)?card\b/i.test(title)
    || /\b(?:rookie|rc)\s+card\b/i.test(title)
    || /(?:^|[^\w])#\s*\d+[A-Za-z]?(?:\s*\/\s*\d+)?\b/i.test(title)
    || /\b(?:card|rc)\b[^\n]{0,48}\b(?:PSA|AFA|CGC|CBCS|BGS|SGC|graded|gem\s+mint)\b/i.test(title)
    || (/\bcard\b/i.test(title) && !/\b(?:complete|factory|master|team|partial|unopened)\s+set\b/i.test(title));
  if (individualCardEvidence) {
    return "Sports Cards / Set filter: candidate is an individual card, but the target is a set. Retained as context-only before visual review.";
  }

  const targetSetType = normalizedChoice(details.setType);
  const targetMissingCards = normalizedChoice(details.missingCards);
  const candidateIncomplete = /\b(?:partial\s+set|incomplete\s+set|missing\s+(?:cards?|pieces?)|less\s+than\s+(?:a\s+)?complete\s+set)\b/i.test(title);
  const candidateComplete = /\b(?:complete|factory|master|team)\s+set\b/i.test(title);

  if ((targetMissingCards === "no" || /^(?:factory_set|complete_hand_collated_set)$/.test(targetSetType)) && candidateIncomplete) {
    return "Sports Cards / Set filter: candidate is explicitly incomplete or missing cards, but the target is a complete set. Retained as context-only before visual review.";
  }
  if (targetMissingCards === "yes" && candidateComplete) {
    return "Sports Cards / Set filter: candidate is explicitly a complete set, but the target is a partial/missing-card set. Retained as context-only before visual review.";
  }

  const targetFactorySealed = normalizedChoice(details.factorySealed);
  const candidateSealed = /\b(?:factory\s+sealed|sealed|unopened)\b/i.test(title);
  const candidateOpened = /\b(?:opened|open\s+box|unsealed)\b/i.test(title);
  if (targetFactorySealed === "yes" && candidateOpened) {
    return "Sports Cards / Set filter: candidate is explicitly opened/unsealed, but the target is factory sealed. Retained as context-only before visual review.";
  }
  if (targetFactorySealed === "no" && candidateSealed) {
    return "Sports Cards / Set filter: candidate is explicitly sealed, but the target is not factory sealed. Retained as context-only before visual review.";
  }

  // Avoid treating a generic word such as “cards” in an otherwise ambiguous
  // listing as proof of a single card. The normalized set/product metadata and
  // explicit title evidence above are the only hard gates.
  return null;
}

type SportsCardUnopenedState = "yes" | "no" | null;
type SportsCardUnopenedFormat = "pack" | "rack_pack" | "box" | "case" | null;

function sportsCardUnopenedState(value: unknown): SportsCardUnopenedState {
  const normalized = normalizedChoice(value);
  if (["yes", "true", "1", "sealed", "factory_sealed", "authenticated", "fasc"].includes(normalized)) return "yes";
  if (["no", "false", "0", "opened", "unsealed", "unauthenticated"].includes(normalized)) return "no";
  return null;
}

function sportsCardUnopenedFormat(value: unknown, title = ""): SportsCardUnopenedFormat {
  const normalized = normalizedChoice(value);
  if (/rack_pack|rack/.test(normalized)) return "rack_pack";
  if (/^pack$|cello|hanger/.test(normalized)) return "pack";
  if (/^case$|sealed_case/.test(normalized)) return "case";
  if (/^box$|hobby|jumbo|retail|blaster|mega/.test(normalized)) return "box";
  if (/\brack\s*pack\b/i.test(title)) return "rack_pack";
  if (/\b(?:sealed\s+)?case\b/i.test(title) && !/\bnot\s+from\s+(?:a\s+)?sealed\s+case\b/i.test(title)) return "case";
  if (/\b(?:hobby|jumbo|retail|blaster|mega)\s+box\b|\bbox\b/i.test(title)) return "box";
  if (/\b(?:cello|hanger|rack\s*pack|pack)\b/i.test(title)) return /rack\s*pack/i.test(title) ? "rack_pack" : "pack";
  return null;
}

function sportsCardUnopenedCompany(value: unknown, title = ""): string | null {
  const normalized = normalizedChoice(value);
  if (normalized) return normalized.replace(/_+/g, " ").trim();
  const match = title.match(/\b(BBCE|PSA|iCert|RVP)\b/i);
  return match?.[1].toLowerCase() ?? (/(?:not\s+authenticated|unauthenticated|no\s+authentication)/i.test(title) ? "none" : null);
}

function sportsCardUnopenedProductType(value: unknown, title = ""): string | null {
  const normalized = normalizedChoice(value);
  if (normalized) return normalized;
  const match = title.match(/\b(hobby|jumbo|retail|blaster|mega|hanger|cello|rack)\b/i);
  return match?.[1].toLowerCase() ?? null;
}

function sportsCardUnopenedProductConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (normalizedChoice(metadataValue(targetMetadata, "category")) !== "sports_cards") return null;
  if (targetProductForm(targetMetadata) !== "unopened_product") return null;

  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidateDetails = candidateStructuredDetails(listing);
  const title = String(listing.title ?? "");
  const targetFormat = sportsCardUnopenedFormat(targetDetails.productFormat);
  const candidateFormat = sportsCardUnopenedFormat(candidateDetails.productFormat ?? candidateDetails.format ?? listing.productFormat ?? listing.format, title);
  if (targetFormat && candidateFormat && targetFormat !== candidateFormat) {
    return `Sports Cards / Unopened Product filter: product format differs; target is ${targetFormat.replace(/_/g, " ")}, but the candidate is explicitly ${candidateFormat.replace(/_/g, " ")}.`;
  }

  const targetProductType = sportsCardUnopenedProductType(targetDetails.productType);
  const candidateProductType = sportsCardUnopenedProductType(candidateDetails.productType ?? listing.productType, title);
  if (targetProductType && candidateProductType && targetProductType !== candidateProductType) {
    return `Sports Cards / Unopened Product filter: product type differs; target is ${targetProductType.replace(/_/g, " ")}, but the candidate is explicitly ${candidateProductType.replace(/_/g, " ")}.`;
  }

  const targetSealed = sportsCardUnopenedState(targetDetails.factorySealed);
  const candidateSealed = sportsCardUnopenedState(candidateDetails.factorySealed ?? candidateDetails.sealedStatus ?? listing.factorySealed)
    ?? (/\b(?:opened|open\s+box|unsealed|resealed|box\s+break|pack\s+break|loose\s+pack|empty\s+box|searched\s+pack)\b/i.test(title) ? "no" : /\b(?:factory\s+sealed|unopened|original\s+shrink|wax\s+sealed)\b/i.test(title) ? "yes" : null);
  if (targetSealed && candidateSealed && targetSealed !== candidateSealed) {
    return `Sports Cards / Unopened Product filter: sealed status differs; target is ${targetSealed === "yes" ? "factory sealed" : "not factory sealed"}, but the candidate explicitly declares ${candidateSealed === "yes" ? "sealed" : "opened or unsealed"}.`;
  }

  const targetAuthenticated = sportsCardUnopenedState(targetDetails.authenticated);
  const candidateAuthenticated = sportsCardUnopenedState(candidateDetails.authenticated ?? listing.authenticated)
    ?? (/(?:not\s+authenticated|unauthenticated|no\s+authentication)/i.test(title) ? "no" : sportsCardUnopenedCompany(undefined, title) ? "yes" : null);
  const targetCompany = sportsCardUnopenedCompany(targetDetails.authenticationCompany);
  const candidateCompany = sportsCardUnopenedCompany(candidateDetails.authenticationCompany ?? listing.authenticationCompany, title);
  if (targetAuthenticated && candidateAuthenticated && targetAuthenticated !== candidateAuthenticated) {
    return `Sports Cards / Unopened Product filter: authentication status differs; target is ${targetAuthenticated}, but the candidate explicitly declares ${candidateAuthenticated}.`;
  }
  if (targetAuthenticated === "yes" && targetCompany && candidateCompany && candidateCompany !== targetCompany) {
    return `Sports Cards / Unopened Product filter: authentication company differs; target is ${targetCompany.toUpperCase()}, but the candidate is explicitly ${candidateCompany.toUpperCase()}.`;
  }

  const targetFasc = sportsCardUnopenedState(targetDetails.fromASealedCase);
  const candidateFasc = sportsCardUnopenedState(candidateDetails.fromASealedCase ?? listing.fromASealedCase)
    ?? (/\b(?:not\s+FASC|not\s+from\s+(?:a\s+)?sealed\s+case)\b/i.test(title) ? "no" : /\b(?:FASC|from\s+(?:a\s+)?sealed\s+case)\b/i.test(title) ? "yes" : null);
  if (targetFasc && candidateFasc && targetFasc !== candidateFasc) {
    return `Sports Cards / Unopened Product filter: FASC status differs; target is ${targetFasc === "yes" ? "from a sealed case" : "not from a sealed case"}, but the candidate explicitly declares the opposite.`;
  }
  if (targetAuthenticated === "yes" && targetCompany === "bbce" && targetFasc === "yes" && ((candidateCompany && candidateCompany !== "bbce") || candidateFasc === "no")) {
    return "Sports Cards / Unopened Product filter: target is BBCE and FASC, but the candidate does not explicitly match both BBCE authentication and FASC status.";
  }

  const nonProductEvidence = /\b(?:single|individual|loose)\s+(?:sports\s+)?card\b|(?:^|[^\w])#\s*\d+[A-Za-z]?(?:\s*\/\s*\d+)?\b|\b(?:PSA|AFA|CGC|CBCS|BGS|SGC)\s*\d(?:\.\d+)?\b|\b(?:complete|partial|master|team)\s+set\b|\b(?:collection|lot)\b/i.test(title);
  if (nonProductEvidence) {
    return "Sports Cards / Unopened Product filter: candidate is an individual card, set, collection, or lot rather than unopened product. Retained as context-only before visual review.";
  }
  return null;
}

type MusicMediaCondition = "sealed" | "excellent" | "good" | "fair" | "for_parts" | null;

function musicMediaCondition(value: unknown): MusicMediaCondition {
  const normalized = normalizedChoice(value).replace(/[\/|]+/g, "_").replace(/_+/g, "_");
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

function isSingleComicTarget(targetMetadata: string): boolean {
  if (normalizedChoice(metadataValue(targetMetadata, "category")) !== "comics") return false;
  const details = extractTargetItemDetails(targetMetadata);
  const itemType = normalizedChoice(metadataValue(targetMetadata, "itemType") || details.itemType || details.productType || details.form);
  return itemType === "single_comic" || itemType === "single_issue" || itemType === "comic";
}
function comicComparableValue(value: unknown): string {
  return candidateText(value).toLowerCase().replace(/[“”"']/g, "").replace(/\s+/g, " ").trim();
}
function comicIssueNumber(value: unknown): string | null {
  const match = candidateText(value).match(/(?:^|#|\bissue\s*)(\d{1,6}[a-z]?)(?:\b|$)/i);
  return match?.[1]?.toLowerCase() ?? null;
}
function comicDistribution(value: unknown): "direct" | "newsstand" | null {
  const normalized = comicComparableValue(value);
  if (/\bnewsstand\b/.test(normalized)) return "newsstand";
  if (/\bdirect(?:\s+market|\s+edition)?\b/.test(normalized)) return "direct";
  return null;
}
function isSingleCoinTarget(targetMetadata: string): boolean {
  return normalizedChoice(metadataValue(targetMetadata, "category")) === "coins"
    && normalizedChoice(metadataValue(targetMetadata, "itemType")) === "single_coin";
}
function isCoinSetTarget(targetMetadata: string): boolean {
  return normalizedChoice(metadataValue(targetMetadata, "category")) === "coins"
    && normalizedChoice(metadataValue(targetMetadata, "itemType")) === "coin_set";
}
function isPaperMoneyTarget(targetMetadata: string): boolean {
  const category = normalizedChoice(metadataValue(targetMetadata, "category"));
  const itemType = normalizedChoice(metadataValue(targetMetadata, "itemType"));
  return category === "coins" && (itemType === "paper_money" || itemType.includes("paper_money") || itemType.includes("banknote"));
}
function coinComparable(value: unknown): string {
  return normalizedChoice(value).replace(/[^a-z0-9]+/g, " ").trim();
}
function coinExplicitValue(listing: VisualSourceCandidate, aliases: string[], titlePatterns: RegExp[] = []): string {
  const details = candidateStructuredDetails(listing);
  const structured = aliases.map((key) => listing[key] ?? details[key]).find((value) => String(value ?? "").trim());
  if (structured != null) return String(structured).trim();
  for (const pattern of titlePatterns) {
    const match = String(listing.title ?? "").match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}
function coinFieldConflict(targetValue: unknown, candidateValue: unknown, label: string): string | null {
  const target = coinComparable(targetValue);
  const candidate = coinComparable(candidateValue);
  if (!target || !candidate || target === candidate || candidate.includes(target) || target.includes(candidate)) return null;
  return `Coin ${label} differs: target explicitly declares ${String(targetValue)}, but the candidate explicitly declares ${String(candidateValue)}.`;
}
function coinSingleIdentityConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (!isSingleCoinTarget(targetMetadata)) return null;
  const target = extractTargetItemDetails(targetMetadata);
  const checks: Array<[unknown, string, string[], RegExp[]]> = [
    [target.country ?? target.issuingCountry, "country/issuing authority", ["country", "issuingCountry"], [/\b(United States|Canada|Mexico|Australia|United Kingdom|Great Britain)\b/i]],
    [target.year ?? target.date ?? target.issueYear, "year/date", ["year", "date", "issueYear"], [/(?:^|[^0-9])((?:17|18|19|20)\d{2})(?:[^0-9]|$)/i]],
    [target.denomination ?? target.coinDenomination, "denomination", ["denomination", "coinDenomination"], [/\b(half dollar|quarter dollar|dollar|half dime|dime|nickel|penny|cent)\b/i]],
    [target.mintMark ?? target.mint, "mintMark", ["mintMark", "mint"], [/(?:mint\s*mark|\b(?:19|20)\d{2})[-\s]*([PDSO])\b/i]],
    [target.composition ?? target.metal, "composition", ["composition", "metal"], [/\b(silver|gold|copper|bronze|clad|nickel)\b/i]],
    [target.strike ?? target.finish ?? target.designation, "strike/finish", ["strike", "finish", "designation"], [/\b(reverse proof|proof|business strike|uncirculated|commemorative)\b/i]],
    [target.variety ?? target.varietyName, "variety", ["variety", "varietyName"], [/\b(VAM\s*\d+|doubled die|double die|overdate|wide|narrow)\b/i]],
  ];
  for (const [targetValue, label, aliases, patterns] of checks) {
    const conflict = coinFieldConflict(targetValue, coinExplicitValue(listing, aliases, patterns), label);
    if (conflict) return conflict;
  }
  const targetOriginal = normalizedChoice(target.isOriginal ?? target.authenticity ?? target.restrike ?? target.restruck);
  const title = String(listing.title ?? "");
  if (targetOriginal === "yes" && /\b(?:replica|copy|counterfeit|facsimile|reproduction)\b/i.test(title)) return "Coin authenticity differs: target is original/authentic, but the candidate explicitly declares a replica, copy, counterfeit, or facsimile.";
  if (targetOriginal === "no" && /\brestrike\b/i.test(title)) return "Coin restrike status differs from the target.";
  return null;
}
function coinSetPackagingValue(listing: VisualSourceCandidate): string {
  const structured = coinExplicitValue(listing, ["originalPackagingIncluded", "originalPackaging", "packaging"]);
  if (structured) return structured;
  const title = String(listing.title ?? "");
  if (/\b(?:without|no)\s+(?:original\s+)?(?:packaging|box|ケース)\b/i.test(title)) return "No";
  if (/\b(?:original\s+packaging|original\s+box|with\s+(?:the\s+)?box)\b/i.test(title)) return "Yes";
  return "";
}
function coinSetIdentityConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (!isCoinSetTarget(targetMetadata)) return null;
  const target = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateDetails = candidateStructuredDetails(listing);
  const title = String(listing.title ?? "");
  const setLanguage = /\b(?:coin\s+set|mint\s+set|proof\s+set|commemorative\s+set|type\s+set|set\s+of\s+\d+)\b/i.test(title);
  const individualCoinLanguage = /\b(?:single\s+coin|coin\s+only|one\s+coin)\b/i.test(title)
    || (Boolean(candidateGrader(candidate)) && !setLanguage && !/\b(?:set|collection|lot)\b/i.test(title));
  if (individualCoinLanguage) {
    return "Coins / Coin Set filter: candidate is an individual coin, but the target is a coin set. Retained as context-only before visual review.";
  }
  const targetSetName = firstMeaningfulValue(target.setName, target.series, target.coinSeries, target.coinType);
  const candidateSetName = firstMeaningfulValue(candidateDetails.setName, candidateDetails.series, candidateDetails.coinSeries, candidateDetails.coinType);
  if (targetSetName && candidateSetName) {
    const conflict = coinFieldConflict(targetSetName, candidateSetName, "set name/series");
    if (conflict) return conflict;
  }
  const checks: Array<[unknown, string, string[], RegExp[]]> = [
    [target.country ?? target.issuingCountry, "country/issuing authority", ["country", "issuingCountry"], [/\b(United States|Canada|Mexico|Australia|United Kingdom|Great Britain)\b/i]],
    [target.year ?? target.date ?? target.issueYear, "year/date", ["year", "date", "issueYear"], [/(?:^|[^0-9])((?:17|18|19|20)\d{2})(?:[^0-9]|$)/i]],
    [target.setType, "set type", ["setType", "type"], [/\b((?:proof|mint|commemorative|type)\s+set)\b/i]],
  ];
  for (const [targetValue, label, aliases, patterns] of checks) {
    const conflict = coinFieldConflict(targetValue, coinExplicitValue(listing, aliases, patterns), label);
    if (conflict) return conflict;
  }
  const targetCount = Number(firstMeaningfulValue(target.numberOfCoins, target.numberOfCoinsInSet, target.coinCount));
  const candidateCountText = coinExplicitValue(listing, ["numberOfCoins", "numberOfCoinsInSet", "coinCount", "quantity"], [/(?:set\s+of|contains?|includes?)\s*(\d+)\s+coins?/i, /\b(\d+)\s*[- ]?coin\s+set\b/i]);
  const candidateCount = Number(candidateCountText);
  if (Number.isFinite(targetCount) && targetCount > 0 && Number.isFinite(candidateCount) && candidateCount > 0 && targetCount !== candidateCount) {
    return `Coin set size differs: target declares ${targetCount} coins, but the candidate explicitly declares ${candidateCount}.`;
  }
  const targetPackaging = normalizedChoice(target.originalPackagingIncluded ?? target.originalPackaging ?? target.packaging);
  const candidatePackaging = normalizedChoice(coinSetPackagingValue(listing));
  if (targetPackaging && candidatePackaging && /^(?:yes|no)$/.test(targetPackaging) && /^(?:yes|no)$/.test(candidatePackaging) && targetPackaging !== candidatePackaging) {
    return `Coin set packaging differs: target declares original packaging ${targetPackaging}, but the candidate explicitly declares ${candidatePackaging}.`;
  }
  return null;
}
function paperMoneyIdentityConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (!isPaperMoneyTarget(targetMetadata)) return null;
  const target = extractTargetItemDetails(targetMetadata);
  const checks: Array<[unknown, string, string[], RegExp[]]> = [
    [target.country ?? target.issuingCountry, "country", ["country", "issuingCountry"], [/\b(United States|USA|Canada|Mexico|Australia|United Kingdom|Great Britain|France|Germany|Japan)\b/i]],
    [target.denomination ?? target.noteDenomination ?? target.value, "denomination", ["denomination", "noteDenomination", "value"], [/\b(?:\$|£|€|\d+\s*(?:dollars?|cents?|cents?|pounds?|euros?))\b/i]],
    [target.year ?? target.date ?? target.issueYear, "year/date", ["year", "date", "issueYear"], [/(?:^|[^0-9])((?:16|17|18|19|20)\d{2})(?:[^0-9]|$)/i]],
  ];
  for (const [targetValue, label, aliases, patterns] of checks) {
    const conflict = coinFieldConflict(targetValue, coinExplicitValue(listing, aliases, patterns), label);
    if (conflict) return `Paper Money ${conflict}`;
  }
  return null;
}
function comicSingleIdentityConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (!isSingleComicTarget(targetMetadata)) return null;
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidateDetails = candidateStructuredDetails(listing);
  const targetTitle = extractTargetTitle(targetMetadata);
  const candidateTitle = String(listing.title ?? "");

  const targetIssue = comicIssueNumber(targetDetails.issueNumber ?? targetDetails.issue ?? targetTitle);
  const candidateIssue = comicIssueNumber(candidateDetails.issueNumber ?? candidateDetails.issue ?? candidateTitle);
  if (targetIssue && candidateIssue && targetIssue !== candidateIssue) {
    return `Comic issue number differs: target is #${targetIssue}, but the candidate explicitly declares #${candidateIssue}.`;
  }

  const targetPublisher = comicComparableValue(targetDetails.publisher);
  const candidatePublisher = comicComparableValue(candidateDetails.publisher);
  if (targetPublisher && candidatePublisher && targetPublisher !== candidatePublisher) {
    return `Comic publisher differs: target is ${targetDetails.publisher}, but the candidate explicitly declares ${candidateDetails.publisher}.`;
  }

  const targetDistribution = comicDistribution(targetDetails.distributionType ?? targetDetails.distribution ?? targetTitle);
  const candidateDistribution = comicDistribution(candidateDetails.distributionType ?? candidateDetails.distribution ?? candidateTitle);
  if (targetDistribution && candidateDistribution && targetDistribution !== candidateDistribution) {
    return `Comic distribution type differs: target is ${targetDistribution === "direct" ? "Direct" : "Newsstand"}, but the candidate explicitly declares ${candidateDistribution === "direct" ? "Direct" : "Newsstand"}.`;
  }

  const targetVariant = comicComparableValue(targetDetails.variantDescription ?? targetDetails.variantCover ?? targetDetails.variant);
  const candidateVariant = comicComparableValue(candidateDetails.variantDescription ?? candidateDetails.variantCover ?? candidateDetails.variant);
  if (targetVariant && candidateVariant && targetVariant !== candidateVariant) {
    return `Comic variant differs: target declares “${targetVariant}”, but the candidate declares “${candidateVariant}”.`;
  }

  const targetFacsimile = normalizedChoice(targetDetails.facsimile);
  const candidateFacsimile = normalizedChoice(candidateDetails.facsimile);
  if (targetFacsimile && candidateFacsimile && targetFacsimile !== candidateFacsimile) {
    return `Comic original/facsimile status differs: target declares ${targetFacsimile}, but the candidate declares ${candidateFacsimile}.`;
  }

  const targetSignedValue = targetDetails.signed ?? targetDetails.isSigned;
  const candidateSignedValue = candidateDetails.signed ?? candidateDetails.isSigned;
  const targetSigned = targetSignedValue != null && String(targetSignedValue).trim()
    ? signedState(`signed ${targetSignedValue}`)
    : signedState(targetTitle);
  const candidateSigned = candidateSignedValue != null && String(candidateSignedValue).trim()
    ? signedState(`signed ${candidateSignedValue}`)
    : signedState(candidateTitle);
  if (targetSigned !== "unknown" && candidateSigned !== "unknown" && targetSigned !== candidateSigned) {
    return `Comic signature state differs: target is explicitly ${targetSigned === "yes" ? "signed" : "unsigned"}, but the candidate explicitly declares the opposite.`;
  }
  return null;
}

/**
 * Marketplace titles sometimes declare a different printing or regional edition
 * more clearly than the thumbnail. These are transparent identity warnings, not
 * silent deletions and not a replacement for the AI image comparison.
 */
export function buildDeclaredIdentityReviews<T extends VisualSourceCandidate>(
  listings: T[],
  targetMetadata: string,
  options: { ignoreSubjectiveConditionDifferences?: boolean } = {},
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
    const sportsCardConflict = sportsCardSingleCardConflict(targetMetadata, listing);
    const sportsCardSetConflictReason = sportsCardSetConflict(targetMetadata, listing);
    const sportsCardUnopenedProductConflictReason = sportsCardUnopenedProductConflict(targetMetadata, listing);
    const mediaConditionConflict = musicMediaConditionConflict(targetMetadata, listing);
    const completenessConflict = vintageToyCompletenessConflict(targetMetadata, listing);
    const compoundNumberConflict = explicitCompoundNumberConflict(targetMetadata, listing);
    const comicSingleIdentityConflictReason = comicSingleIdentityConflict(targetMetadata, listing);
    const coinSingleIdentityConflictReason = coinSingleIdentityConflict(targetMetadata, listing);
    const coinSetIdentityConflictReason = coinSetIdentityConflict(targetMetadata, listing);
    const paperMoneyIdentityConflictReason = paperMoneyIdentityConflict(targetMetadata, listing);
    const materialConflicts = findMaterialMetadataConflicts(targetMetadata, listing, options);
    const fieldConflict = distributionConflict || facsimileConflict || Boolean(packagingConflict) || Boolean(gradingStateConflict) || Boolean(productFormConflict) || Boolean(sportsCardConflict) || Boolean(sportsCardSetConflictReason) || Boolean(sportsCardUnopenedProductConflictReason) || Boolean(mediaConditionConflict) || Boolean(completenessConflict) || Boolean(compoundNumberConflict) || Boolean(comicSingleIdentityConflictReason) || Boolean(coinSingleIdentityConflictReason) || Boolean(coinSetIdentityConflictReason) || Boolean(paperMoneyIdentityConflictReason) || materialConflicts.length > 0;
    if (!conflict && !fieldConflict) return [];
    const reason = gradingStateConflict ?? sportsCardUnopenedProductConflictReason ?? sportsCardSetConflictReason ?? productFormConflict ?? sportsCardConflict ?? mediaConditionConflict ?? completenessConflict ?? compoundNumberConflict ?? comicSingleIdentityConflictReason ?? coinSingleIdentityConflictReason ?? coinSetIdentityConflictReason ?? paperMoneyIdentityConflictReason ?? packagingConflict ?? (materialConflicts.length > 0
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
export function universalMetadataScore(listing: VisualSourceCandidate, targetMetadata: string): { score: number; matched: string[] } {
  const targetTitle = extractTargetTitle(targetMetadata).toLowerCase();
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = sourceText(candidate).toLowerCase();
  const targetTokens = [...new Set(targetTitle.split(/[^a-z0-9]+/).filter((token) => token.length >= 2))];
  const matchedTokens = targetTokens.filter((token) => candidateText.includes(token));
  const matched = matchedTokens.length ? [`title overlap (${matchedTokens.length}/${targetTokens.length})`] : [];
  let score = targetTokens.length ? Math.round((matchedTokens.length / targetTokens.length) * 60) : 0;
  const targetGrade = normalizedGrade(metadataValue(targetMetadata, "grade"));
  const candidateGrade = normalizedGrade(candidate.grade || candidateText.match(/\b(?:PSA|BGS|SGC|CGC|BCCG|CGA)\s*(\d+(?:\.\d+)?)\b/i)?.[1] || "");
  if (targetGrade && candidateGrade && Number(targetGrade) === Number(candidateGrade)) { score += 25; matched.push("grade"); }
  const targetGrader = normalizedChoice(metadataValue(targetMetadata, "certificationCompany"));
  if (targetGrader && candidate.grader && normalizedChoice(candidate.grader) === targetGrader) { score += 15; matched.push("grading company"); }
  return { score: Math.min(100, score), matched };
}
function annotateUniversalScores<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string): Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }> {
  return candidates
    .map((candidate) => {
      const scoring = universalMetadataScore(candidate.item, targetMetadata);
      return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched } as T };
    })
    .sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate, index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index + 1 } as T }));
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

const SPORTS_CARD_SCORE_FIELDS = [
  ['player', 20],
  ['year', 15],
  ['manufacturerOrSet', 15],
  ['cardNumber', 15],
  ['gradingCompany', 10],
  ['grade', 10],
  ['singleCardForm', 5],
  ['rookieStatus', 3],
  ['autographStatus', 3],
  ['relicStatus', 2],
  ['serialNumberedStatus', 2],
] as const;
const COMICS_SINGLE_SCORE_FIELDS = [
  ['comicTitle', 20],
  ['issueNumber', 20],
  ['grade', 15],
  ['gradingCompany', 10],
  ['variant', 10],
  ['publisher', 10],
  ['publicationYear', 5],
  ['distributionType', 5],
  ['facsimile', 3],
  ['signed', 2],
] as const;
const PAPER_MONEY_SCORE_FIELDS = [
  ['country', 20],
  ['denomination', 20],
  ['yearDate', 15],
  ['titleSeries', 15],
  ['numericGrade', 12],
  ['gradingCompany', 8],
  ['signature', 5],
  ['condition', 5],
] as const;
function paperMoneyTextMatches(targetValue: unknown, candidateText: string): boolean | null {
  const target = coinComparable(targetValue);
  if (!target) return null;
  const tokens = target.split(' ').filter(token => token.length > 1 && !/^\d{4}$/.test(token));
  if (!tokens.length) return null;
  const candidate = coinComparable(candidateText);
  return tokens.every(token => candidate.includes(token));
}
function paperMoneyBooleanMatches(targetValue: unknown, candidateText: string, yesPattern: RegExp, noPattern: RegExp): boolean | null {
  const target = normalizedChoice(targetValue);
  if (!target) return null;
  const targetYes = /^(?:yes|true|1|signed|autographed|present|mint|near_mint|excellent|very_good|good|fair|poor)$/.test(target);
  const targetNo = /^(?:no|false|0|unsigned|none|not_signed)$/.test(target);
  if (!targetYes && !targetNo) return null;
  const candidateYes = yesPattern.test(candidateText);
  const candidateNo = noPattern.test(candidateText);
  if (!candidateYes && !candidateNo) return null;
  return targetYes ? candidateYes : candidateNo;
}
export function paperMoneyVisualScore(listing: VisualSourceCandidate, targetMetadata: string): { score: number; matched: string[]; unknown: string[] } {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = sourceText(candidate);
  const matched: string[] = [];
  const unknown: string[] = [];
  let score = 0;
  const add = (field: typeof PAPER_MONEY_SCORE_FIELDS[number][0], points: number, result: boolean | null) => {
    if (result === true) { score += points; matched.push(field); }
    else if (result === null) unknown.push(field);
  };
  add('country', 20, coinScoreValueMatches(firstMeaningfulValue(targetDetails.country, targetDetails.issuingCountry), listing, ['country', 'issuingCountry'], [/\b(United States|USA|Canada|Mexico|Australia|United Kingdom|Great Britain|France|Germany|Japan)\b/i]));
  add('denomination', 20, coinScoreValueMatches(firstMeaningfulValue(targetDetails.denomination, targetDetails.noteDenomination, targetDetails.value), listing, ['denomination', 'noteDenomination', 'value'], [/\b(?:\$|£|€|\d+\s*(?:dollars?|cents?|pounds?|euros?))\b/i]));
  add('yearDate', 15, coinScoreValueMatches(firstMeaningfulValue(targetDetails.year, targetDetails.date, targetDetails.issueYear), listing, ['year', 'date', 'issueYear'], [/(?:^|[^0-9])((?:16|17|18|19|20)\d{2})(?:[^0-9]|$)/i]));
  add('titleSeries', 15, paperMoneyTextMatches(firstMeaningfulValue(targetDetails.series, targetDetails.noteType, targetDetails.design, targetDetails.subject, targetDetails.title, extractTargetTitle(targetMetadata)), candidateText));
  add('numericGrade', 12, coinNumericGradeMatches(targetMetadata, candidate));
  add('gradingCompany', 8, coinGradingCompanyMatches(targetMetadata, candidate));
  add('signature', 5, paperMoneyBooleanMatches(firstMeaningfulValue(targetDetails.signature, targetDetails.signed, targetDetails.isSigned), candidateText, /\b(?:signed|signature|autograph(?:ed)?)\b/i, /\b(?:unsigned|not\s+signed|no\s+signature)\b/i));
  add('condition', 5, paperMoneyTextMatches(firstMeaningfulValue(targetDetails.condition, metadataValue(targetMetadata, 'condition')), candidate.condition || candidateText));
  return { score, matched, unknown };
}
export function paperMoneyVisualCap(score: number): number {
  if (score >= 90) return 8;
  if (score >= 80) return 6;
  if (score >= 70) return 4;
  if (score >= 60) return 2;
  return 0;
}
const COIN_SINGLE_SCORE_FIELDS = [
  ['coinTitleSeriesType', 20],
  ['yearDate', 15],
  ['denomination', 15],
  ['mintMark', 10],
  ['variety', 10],
  ['numericGrade', 12],
  ['gradingCompany', 8],
  ['designationStrikeFinish', 5],
  ['compositionMetal', 3],
  ['countryIssuingAuthority', 2],
] as const;
function comicsSingleTarget(targetMetadata: string): boolean {
  return normalizedChoice(metadataValue(targetMetadata, 'category')) === 'comics'
    && normalizedChoice(metadataValue(targetMetadata, 'itemType')).includes('single');
}
function coinScoreTargetValue(targetDetails: Record<string, unknown>, aliases: string[], fallback?: unknown): unknown {
  return firstMeaningfulValue(...aliases.map((alias) => targetDetails[alias]), fallback);
}
function coinScoreExplicitValue(
  listing: VisualSourceCandidate,
  aliases: string[],
  titlePatterns: RegExp[] = [],
): string | null {
  const value = coinExplicitValue(listing, aliases, titlePatterns);
  return value || null;
}
function coinScoreValueMatches(
  targetValue: unknown,
  listing: VisualSourceCandidate,
  aliases: string[],
  titlePatterns: RegExp[] = [],
  normalizer: (value: unknown) => string = coinComparable,
): boolean | null {
  const target = normalizer(targetValue);
  if (!target) return null;
  const candidateValue = coinScoreExplicitValue(listing, aliases, titlePatterns);
  if (!candidateValue) return null;
  const candidate = normalizer(candidateValue);
  return Boolean(candidate && (candidate === target || candidate.includes(target) || target.includes(candidate)));
}
function coinDenominationComparable(value: unknown): string {
  const normalized = coinComparable(value).replace(/usd|us dollars?/g, 'dollar');
  if (/\bhalf dollar\b|\b50 cents?\b/.test(normalized)) return 'half dollar';
  if (/\bquarter\b|\b25 cents?\b/.test(normalized)) return 'quarter';
  if (/\bdime\b|\b10 cents?\b/.test(normalized)) return 'dime';
  if (/\bnickel\b|\b5 cents?\b/.test(normalized)) return 'nickel';
  if (/\bcent\b|\bpenny\b|\b1 cent\b/.test(normalized)) return 'cent';
  if (/\$\s*1\b|\b1 dollar\b|\bone dollar\b|\bdollar\b/.test(normalized)) return 'dollar';
  return normalized;
}
function coinTitleSeriesTypeMatches(targetValue: unknown, candidateText: string): boolean | null {
  const targetTokens = coinComparable(targetValue)
    .split(' ')
    .filter((token) => token && !/^\d{4}$/.test(token) && !/^(?:coin|coins|graded|pcgs|ngc)$/.test(token));
  if (!targetTokens.length) return null;
  const candidate = coinComparable(candidateText);
  return targetTokens.every((token) => candidate.includes(token));
}
function coinNumericGradeMatches(targetMetadata: string, candidate: NormalizedVisualSourceCandidate): boolean | null {
  const target = parsedComparableGrade(metadataValue(targetMetadata, 'grade'), { allowBareNumeric: true });
  if (!target) return null;
  const source = parsedComparableGrade(candidate.grade, { allowBareNumeric: true })
    ?? parsedComparableGrade(candidate.title, { allowBareNumeric: false });
  if (!source) return null;
  return target.numeric === source.numeric;
}
function coinGradingCompanyMatches(targetMetadata: string, candidate: NormalizedVisualSourceCandidate): boolean | null {
  const target = targetGrader(targetMetadata);
  if (!target || /^(?:UNKNOWN|NONE|RAW|UNGRADED|N\/A)$/i.test(target)) return null;
  const source = candidateGrader(candidate);
  if (!source) return null;
  return source === target;
}
export function coinsSingleVisualScore(listing: VisualSourceCandidate, targetMetadata: string): { score: number; matched: string[]; unknown: string[] } {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = sourceText(candidate);
  const matched: string[] = [];
  const unknown: string[] = [];
  let score = 0;
  const add = (field: typeof COIN_SINGLE_SCORE_FIELDS[number][0], points: number, result: boolean | null) => {
    if (result === true) { score += points; matched.push(field); }
    else if (result === null) unknown.push(field);
  };
  add('coinTitleSeriesType', 20, coinTitleSeriesTypeMatches(
    coinScoreTargetValue(targetDetails, ['series', 'coinSeries', 'coinType', 'type', 'name', 'subject'], extractTargetTitle(targetMetadata)),
    candidateText,
  ));
  add('yearDate', 15, coinScoreValueMatches(
    coinScoreTargetValue(targetDetails, ['year', 'date', 'issueYear', 'mintYear']), listing,
    ['year', 'date', 'issueYear', 'mintYear'], [/(?:^|[^0-9])((?:17|18|19|20)\d{2})(?:[^0-9]|$)/i],
  ));
  add('denomination', 15, coinScoreValueMatches(
    coinScoreTargetValue(targetDetails, ['denomination', 'coinDenomination']), listing,
    ['denomination', 'coinDenomination'], [/\b(half dollar|quarter dollar|dollar|half dime|dime|nickel|penny|cent|\$\s*\d+(?:\.\d+)?)\b/i], coinDenominationComparable,
  ));
  add('mintMark', 10, coinScoreValueMatches(
    coinScoreTargetValue(targetDetails, ['mintMark', 'mint']), listing,
    ['mintMark', 'mint'], [/(?:mint\s*mark|\b(?:17|18|19|20)\d{2})[-\s]*([PDSO])\b/i],
  ));
  add('variety', 10, coinScoreValueMatches(
    coinScoreTargetValue(targetDetails, ['variety', 'varietyName', 'series', 'coinSeries']), listing,
    ['variety', 'varietyName', 'series', 'coinSeries', 'coinType'], [/\b(VAM\s*\d+|doubled die|double die|overdate|wide|narrow|morgan|peace|eagle|buffalo|mercury)\b/i],
  ));
  add('numericGrade', 12, coinNumericGradeMatches(targetMetadata, candidate));
  add('gradingCompany', 8, coinGradingCompanyMatches(targetMetadata, candidate));
  add('designationStrikeFinish', 5, coinScoreValueMatches(
    coinScoreTargetValue(targetDetails, ['designation', 'strike', 'finish']), listing,
    ['designation', 'strike', 'finish'], [/\b(reverse proof|proof|business strike|first strike|first releases|first day of issue|early releases|deep cameo|cameo)\b/i],
  ));
  add('compositionMetal', 3, coinScoreValueMatches(
    coinScoreTargetValue(targetDetails, ['composition', 'metal']), listing,
    ['composition', 'metal'], [/\b(silver|gold|copper|bronze|clad|nickel)\b/i],
  ));
  add('countryIssuingAuthority', 2, coinScoreValueMatches(
    coinScoreTargetValue(targetDetails, ['country', 'issuingCountry', 'issuingAuthority']), listing,
    ['country', 'issuingCountry', 'issuingAuthority'], [/\b(United States|USA|US|Canada|Mexico|Australia|United Kingdom|Great Britain)\b/i],
  ));
  return { score, matched, unknown };
}
export function coinsSingleVisualCap(score: number): number {
  if (score >= 90) return 8;
  if (score >= 80) return 6;
  if (score >= 70) return 4;
  if (score >= 60) return 2;
  return 0;
}
const COIN_SET_SCORE_FIELDS = [
  ['setNameSeries', 25],
  ['yearDate', 20],
  ['countryIssuingAuthority', 15],
  ['setType', 15],
  ['numberOfCoins', 15],
  ['originalPackagingIncluded', 10],
] as const;
function coinSetScoreTargetValue(targetDetails: Record<string, unknown>, aliases: string[], fallback?: unknown): unknown {
  return firstMeaningfulValue(...aliases.map((alias) => targetDetails[alias]), fallback);
}
function coinSetNumberMatches(targetValue: unknown, listing: VisualSourceCandidate): boolean | null {
  const target = Number(targetValue);
  if (!Number.isFinite(target) || target <= 0) return null;
  const candidate = Number(coinExplicitValue(listing, ["numberOfCoins", "numberOfCoinsInSet", "coinCount", "quantity"], [/(?:set\s+of|contains?|includes?)\s*(\d+)\s+coins?/i, /\b(\d+)\s*[- ]?coin\s+set\b/i]));
  return Number.isFinite(candidate) && candidate > 0 ? candidate === target : null;
}
function coinSetPackagingMatches(targetValue: unknown, listing: VisualSourceCandidate): boolean | null {
  const target = normalizedChoice(targetValue);
  if (!/^(?:yes|no)$/.test(target)) return null;
  const candidate = normalizedChoice(coinSetPackagingValue(listing));
  return /^(?:yes|no)$/.test(candidate) ? candidate === target : null;
}
export function coinsSetVisualScore(listing: VisualSourceCandidate, targetMetadata: string): { score: number; matched: string[]; unknown: string[] } {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = sourceText(candidate);
  const matched: string[] = [];
  const unknown: string[] = [];
  let score = 0;
  const add = (field: typeof COIN_SET_SCORE_FIELDS[number][0], points: number, result: boolean | null) => {
    if (result === true) { score += points; matched.push(field); }
    else if (result === null) unknown.push(field);
  };
  const setName = coinSetScoreTargetValue(targetDetails, ['setName', 'series', 'coinSeries', 'coinType'], extractTargetTitle(targetMetadata));
  add('setNameSeries', 25, coinTitleSeriesTypeMatches(setName, candidateText));
  add('yearDate', 20, coinScoreValueMatches(coinSetScoreTargetValue(targetDetails, ['year', 'date', 'issueYear']), listing, ['year', 'date', 'issueYear'], [/(?:^|[^0-9])((?:17|18|19|20)\d{2})(?:[^0-9]|$)/i]));
  add('countryIssuingAuthority', 15, coinScoreValueMatches(coinSetScoreTargetValue(targetDetails, ['country', 'issuingCountry', 'issuingAuthority']), listing, ['country', 'issuingCountry', 'issuingAuthority'], [/\b(United States|USA|US|Canada|Mexico|Australia|United Kingdom|Great Britain)\b/i]));
  add('setType', 15, coinScoreValueMatches(targetDetails.setType, listing, ['setType', 'type'], [/\b((?:proof\s+set|mint\s+set|commemorative\s+set|type\s+set))\b/i]));
  add('numberOfCoins', 15, coinSetNumberMatches(coinSetScoreTargetValue(targetDetails, ['numberOfCoins', 'numberOfCoinsInSet', 'coinCount']), listing));
  add('originalPackagingIncluded', 10, coinSetPackagingMatches(coinSetScoreTargetValue(targetDetails, ['originalPackagingIncluded', 'originalPackaging', 'packaging']), listing));
  return { score, matched, unknown };
}
export function coinsSetVisualCap(score: number): number {
  if (score >= 90) return 8;
  if (score >= 80) return 6;
  if (score >= 70) return 4;
  if (score >= 60) return 2;
  return 0;
}
function comicScoreText(value: unknown): string {
  return normalizedChoice(value).replace(/[_-]+/g, ' ');
}
function comicValueMatches(targetValue: unknown, candidateText: string): boolean | null {
  const target = comicScoreText(targetValue);
  if (!target) return null;
  return candidateText.includes(target);
}
function comicTitleComparable(value: unknown): string {
  return comicScoreText(value)
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function comicTitleMatches(targetValue: unknown, candidateTitle: string): boolean | null {
  const target = comicTitleComparable(targetValue);
  const candidate = comicTitleComparable(candidateTitle);
  if (!target) return null;
  return candidate.includes(target);
}
function comicGradeMatches(targetMetadata: string, candidate: NormalizedVisualSourceCandidate): boolean | null {
  const target = parsedComparableGrade(metadataValue(targetMetadata, 'grade'), { allowBareNumeric: true });
  if (!target) return null;
  const source = parsedComparableGrade(candidate.grade, { allowBareNumeric: true }) ?? parsedComparableGrade(candidate.title, { allowBareNumeric: false });
  if (!source) return null;
  return target.numeric === source.numeric && (!target.designation || !source.designation || target.designation === source.designation);
}
function comicGradingCompanyMatches(targetMetadata: string, candidate: NormalizedVisualSourceCandidate): boolean | null {
  const target = targetGrader(targetMetadata);
  if (!target || /^(?:UNKNOWN|NONE|RAW|UNGRADED|N\/A)$/i.test(target)) return null;
  const source = candidateGrader(candidate);
  if (!source) return null;
  return source === target;
}
function comicIssueMatches(targetValue: unknown, candidateText: string): boolean | null {
  const target = String(targetValue ?? '').trim();
  if (!target) return null;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^0-9])(?:#|issue\\s*)?${escaped}(?:[a-z])?(?:[^0-9]|$)`, 'i').test(candidateText);
}
function comicBoolean(value: unknown, candidateText: string, positive: RegExp, negative: RegExp): boolean | null {
  const target = comicScoreText(value);
  if (!target) return null;
  const targetPositive = /^(?:yes|true|signed|original)$/i.test(target);
  const targetNegative = /^(?:no|false|unsigned|facsimile|reprint)$/i.test(target);
  if (!targetPositive && !targetNegative) return null;
  return targetPositive ? positive.test(candidateText) : negative.test(candidateText);
}
const ORIGINAL_ART_SCORE_FIELDS = [
  ['artistName', 30],
  ['artworkTitleCharacter', 20],
  ['artType', 20],
  ['comicTitle', 15],
  ['issueNumber', 10],
  ['publisher', 5],
] as const;
function originalArtFieldMatches(targetValue: unknown, candidate: NormalizedVisualSourceCandidate, candidateText: string, aliases: string[] = []): boolean | null {
  const target = comicTitleComparable(targetValue);
  if (!target) return null;
  const candidateValues = [
    ...aliases.map((key) => candidate.details[key]),
    candidate.title,
    candidateText,
  ].map(comicTitleComparable).filter(Boolean);
  return candidateValues.some((value) => value.includes(target));
}
export function originalArtMarketRelevanceScore(listing: VisualSourceCandidate, targetMetadata: string): { score: number; matched: string[]; unknown: string[] } {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = comicScoreText(sourceText(candidate));
  const matched: string[] = [];
  const unknown: string[] = [];
  let score = 0;
  const add = (field: typeof ORIGINAL_ART_SCORE_FIELDS[number][0], points: number, result: boolean | null) => {
    if (result === true) { score += points; matched.push(field); }
    else if (result === null) unknown.push(field);
  };
  add('artistName', 30, originalArtFieldMatches(firstMeaningfulValue(targetDetails.artistName, targetDetails.artist, targetDetails.creator), candidate, candidateText, ['artistName', 'artist', 'creator']));
  add('artworkTitleCharacter', 20, originalArtFieldMatches(firstMeaningfulValue(targetDetails.artworkTitle, targetDetails.character, targetDetails.artworkTitleCharacter), candidate, candidateText, ['artworkTitle', 'character', 'artworkTitleCharacter']));
  add('artType', 20, originalArtFieldMatches(targetDetails.artType, candidate, candidateText, ['artType']));
  add('comicTitle', 15, originalArtFieldMatches(firstMeaningfulValue(targetDetails.coverSketchComicTitle, targetDetails.comicTitle, targetDetails.series, targetDetails.comicSeries), candidate, candidateText, ['coverSketchComicTitle', 'comicTitle', 'series', 'comicSeries']));
  add('issueNumber', 10, comicIssueMatches(firstMeaningfulValue(targetDetails.coverSketchIssueNumber, targetDetails.issueNumber, targetDetails.issueNo, targetDetails.number), candidateText));
  add('publisher', 5, originalArtFieldMatches(targetDetails.publisher, candidate, candidateText, ['publisher']));
  return { score, matched, unknown };
}
export function annotateOriginalArtMarketCandidates<T extends VisualSourceCandidate>(listings: T[], targetMetadata: string): T[] {
  return listings.map((item, index) => {
    const scoring = originalArtMarketRelevanceScore(item, targetMetadata);
    return { ...item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataMatchRank: index + 1, metadataMatchLabel: 'Market Relevance Score' };
  }).sort((a, b) => Number(b.metadataMatchScore ?? 0) - Number(a.metadataMatchScore ?? 0))
    .map((item, index) => ({ ...item, metadataMatchRank: index + 1 }));
}
export function originalArtMarketRelevanceBand(score: number): string {
  if (score >= 85) return 'highly relevant';
  if (score >= 70) return 'strong';
  if (score >= 55) return 'useful broader';
  if (score >= 40) return 'weak';
  return 'limited';
}
export function comicsSingleVisualScore(listing: VisualSourceCandidate, targetMetadata: string): { score: number; matched: string[]; unknown: string[] } {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = comicScoreText(sourceText(candidate));
  const matched: string[] = [];
  const unknown: string[] = [];
  let score = 0;
  const add = (field: typeof COMICS_SINGLE_SCORE_FIELDS[number][0], points: number, result: boolean | null) => {
    if (result === true) { score += points; matched.push(field); }
    else if (result === null) unknown.push(field);
  };
  add('comicTitle', 20, comicTitleMatches(firstMeaningfulValue(targetDetails.comicTitle, targetDetails.series, targetDetails.title, extractTargetTitle(targetMetadata)), candidate.title));
  add('issueNumber', 20, comicIssueMatches(firstMeaningfulValue(targetDetails.issueNumber, targetDetails.issueNo, targetDetails.number), candidateText));
  add('grade', 15, comicGradeMatches(targetMetadata, candidate));
  add('gradingCompany', 10, comicGradingCompanyMatches(targetMetadata, candidate));
  add('variant', 10, comicValueMatches(firstMeaningfulValue(targetDetails.variantDescription, targetDetails.variantCover, targetDetails.variant), candidateText));
  add('publisher', 10, comicValueMatches(targetDetails.publisher, candidateText));
  add('publicationYear', 5, comicValueMatches(firstMeaningfulValue(targetDetails.publicationYear, targetDetails.year), candidateText));
  add('distributionType', 5, comicValueMatches(targetDetails.distributionType, candidateText));
  add('facsimile', 3, comicBoolean(firstMeaningfulValue(targetDetails.facsimile, targetDetails.original), candidateText, /\b(?:facsimile|facsimile\s*edition|reprint)\b/i, /\b(?:original|first\s*print)\b/i));
  add('signed', 2, comicBoolean(targetDetails.signed, candidateText, /\b(?:signed|autograph(?:ed)?)\b/i, /\b(?:unsigned|not\s*signed)\b/i));
  return { score, matched, unknown };
}
export function comicsSingleVisualCap(score: number): number {
  if (score >= 90) return 10;
  if (score >= 80) return 8;
  if (score >= 70) return 6;
  if (score >= 60) return 4;
  if (score >= 50) return 2;
  return 0;
}
function sportsCardSingleTarget(targetMetadata: string): boolean {
  const category = normalizedChoice(metadataValue(targetMetadata, 'category'));
  const itemType = normalizedChoice(metadataValue(targetMetadata, 'itemType'));
  return category === 'sports_cards' && !itemType.includes('set') && !itemType.includes('collection') && !itemType.includes('lot') && !itemType.includes('unopened');
}

function sportsCardText(value: unknown): string {
  return normalizedChoice(value).replace(/_/g, ' ');
}

function sportsCardExplicitNumber(value: unknown, title: string): boolean {
  const target = String(value ?? '').trim();
  if (!target) return false;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^0-9])(?:#|card(?:\s*(?:no|number))?\s*)?${escaped}(?:[^0-9]|$)`, 'i').test(title)
    || new RegExp(`(?:^|[^0-9])${escaped}(?:[^0-9]|$)`, 'i').test(title);
}

function sportsCardBooleanSignal(target: string, candidate: string, positive: RegExp): 'match' | 'mismatch' | 'unknown' {
  const targetPositive = positive.test(target);
  const targetNegative = /\b(?:no|false|none|unsigned|not\s+signed|non[- ]?relic|base|non[- ]?numbered)\b/i.test(target);
  const candidatePositive = positive.test(candidate);
  const candidateNegative = /\b(?:no|false|none|unsigned|not\s+signed|non[- ]?relic|base|non[- ]?numbered)\b/i.test(candidate);
  if (!targetPositive && !targetNegative) return 'unknown';
  if (targetPositive === candidatePositive && targetNegative === candidateNegative) return 'match';
  if (candidatePositive || candidateNegative) return 'mismatch';
  return 'unknown';
}

export function sportsCardSingleVisualScore(listing: VisualSourceCandidate, targetMetadata: string): { score: number; matched: string[]; unknown: string[] } {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const targetTitle = extractTargetTitle(targetMetadata);
  const targetTextValue = targetText(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateTextValue = sourceText(candidate);
  const matched: string[] = [];
  const unknown: string[] = [];
  let score = 0;
  const add = (field: typeof SPORTS_CARD_SCORE_FIELDS[number][0], points: number, isMatch: boolean, isKnown = true) => {
    if (isMatch) { score += points; matched.push(field); }
    else if (!isKnown) unknown.push(field);
  };

  const player = firstMeaningfulValue(targetDetails.player, targetDetails.athlete, targetDetails.subject);
  const playerSurname = String(player ?? '').trim().split(/\s+/).filter(Boolean).slice(-1)[0] ?? '';
  add('player', 20, Boolean(playerSurname && new RegExp(`\\b${playerSurname.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(candidate.title)), Boolean(player));

  const year = String(firstMeaningfulValue(targetDetails.year, targetDetails.releaseYear, targetDetails.issueYear) ?? '').trim();
  add('year', 15, Boolean(year && new RegExp(`\\b${year.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`).test(candidateTextValue)), Boolean(year));

  const manufacturer = String(firstMeaningfulValue(targetDetails.manufacturer, targetDetails.customManufacturer, targetDetails.brand) ?? '').trim();
  const setName = String(firstMeaningfulValue(targetDetails.setName, targetDetails.series, targetDetails.cardSet) ?? '').trim();
  const manufacturerOrSet = [manufacturer, setName].filter(Boolean);
  add('manufacturerOrSet', 15, manufacturerOrSet.some((value) => sportsCardText(candidateTextValue).includes(sportsCardText(value))), manufacturerOrSet.length > 0);

  const cardNumber = String(firstMeaningfulValue(targetDetails.cardNumber, targetDetails.cardNo, targetDetails.number) ?? '').trim();
  add('cardNumber', 15, sportsCardExplicitNumber(cardNumber, candidate.title), Boolean(cardNumber));

  const targetGrader = String(firstMeaningfulValue(metadataValue(targetMetadata, 'certificationCompany'), targetDetails.gradingCompany, targetDetails.grader) ?? '').trim();
  add('gradingCompany', 10, Boolean(targetGrader && sportsCardText(candidate.grader) === sportsCardText(targetGrader)), Boolean(targetGrader));

  const targetGrade = normalizedGrade(String(firstMeaningfulValue(metadataValue(targetMetadata, 'grade'), targetDetails.grade) ?? ''));
  const candidateGrade = normalizedGrade((candidate.grade || candidateTextValue.match(/\b(?:PSA|BGS|SGC|CGC|BCCG|CGA)\s*(\d+(?:\.\d+)?)\b/i)?.[1]) ?? '');
  add('grade', 10, Boolean(targetGrade && candidateGrade && Number(targetGrade) === Number(candidateGrade)), Boolean(targetGrade));

  const singleForm = !/\b(?:complete|factory|master|team)\s+set\b|\b(?:lot|bundle|collection|multipack|\d+\s+cards?)\b/i.test(candidateTextValue);
  add('singleCardForm', 5, singleForm, true);

  const targetRookie = `${targetTextValue} ${JSON.stringify(targetDetails)}`;
  const targetAutograph = `${targetTextValue} ${JSON.stringify(targetDetails)}`;
  const targetRelic = `${targetTextValue} ${JSON.stringify(targetDetails)}`;
  const targetSerial = `${targetTextValue} ${JSON.stringify(targetDetails)}`;
  const candidateIdentityText = `${candidateTextValue} ${JSON.stringify(candidate.details)}`;
  add('rookieStatus', 3, sportsCardBooleanSignal(targetRookie, candidateIdentityText, /\b(?:rookie|rc)\b/i) === 'match', sportsCardBooleanSignal(targetRookie, candidateIdentityText, /\b(?:rookie|rc)\b/i) !== 'unknown');
  add('autographStatus', 3, sportsCardBooleanSignal(targetAutograph, candidateIdentityText, /\b(?:autograph(?:ed)?|signed|auto)\b/i) === 'match', sportsCardBooleanSignal(targetAutograph, candidateIdentityText, /\b(?:autograph(?:ed)?|signed|auto)\b/i) !== 'unknown');
  add('relicStatus', 2, sportsCardBooleanSignal(targetRelic, candidateIdentityText, /\b(?:relic|memorabilia|patch|jersey)\b/i) === 'match', sportsCardBooleanSignal(targetRelic, candidateIdentityText, /\b(?:relic|memorabilia|patch|jersey)\b/i) !== 'unknown');
  add('serialNumberedStatus', 2, sportsCardBooleanSignal(targetSerial, candidateIdentityText, /\b(?:\d+\/\d+|serial(?:ized)?|numbered|print\s*run)\b/i) === 'match', sportsCardBooleanSignal(targetSerial, candidateIdentityText, /\b(?:\d+\/\d+|serial(?:ized)?|numbered|print\s*run)\b/i) !== 'unknown');

  return { score, matched, unknown };
}

export function sportsCardSingleVisualCap(score: number): number {
  if (score >= 90) return 10;
  if (score >= 80) return 8;
  if (score >= 70) return 6;
  if (score >= 60) return 4;
  if (score >= 50) return 2;
  return 0;
}

const SPORTS_CARD_SET_SCORE_FIELDS = [
  ['setName', 25],
  ['year', 15],
  ['manufacturer', 15],
  ['setType', 15],
  ['missingCards', 15],
  ['factorySealed', 10],
  ['sport', 5],
] as const;

function sportsCardSetTarget(targetMetadata: string): boolean {
  const category = normalizedChoice(metadataValue(targetMetadata, 'category'));
  const itemType = normalizedChoice(metadataValue(targetMetadata, 'itemType'));
  return category === 'sports_cards' && itemType.includes('set') && !itemType.includes('collection') && !itemType.includes('lot');
}

function sportsCardSetSignal(value: unknown, candidateText: string, patterns: RegExp[]): boolean | null {
  const normalized = normalizedChoice(value);
  if (!normalized) return null;
  return patterns.some((pattern) => pattern.test(candidateText));
}

export function sportsCardSetVisualScore(listing: VisualSourceCandidate, targetMetadata: string): { score: number; matched: string[]; unknown: string[] } {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = sourceText(candidate);
  const matched: string[] = [];
  const unknown: string[] = [];
  let score = 0;
  const add = (field: typeof SPORTS_CARD_SET_SCORE_FIELDS[number][0], points: number, result: boolean | null) => {
    if (result === true) { score += points; matched.push(field); }
    else if (result === null) unknown.push(field);
  };

  const setName = firstMeaningfulValue(targetDetails.setName, targetDetails.series, targetDetails.cardSet);
  add('setName', 25, setName ? sportsCardText(candidateText).includes(sportsCardText(setName)) : null);

  const year = String(firstMeaningfulValue(targetDetails.year, targetDetails.releaseYear, targetDetails.issueYear) ?? '').trim();
  add('year', 15, year ? new RegExp(`\\b${year.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`).test(candidateText) : null);

  const manufacturer = firstMeaningfulValue(targetDetails.manufacturer, targetDetails.customManufacturer, targetDetails.brand);
  add('manufacturer', 15, manufacturer ? sportsCardText(candidateText).includes(sportsCardText(manufacturer)) : null);

  const setType = normalizedChoice(targetDetails.setType);
  const setTypePatterns: Record<string, RegExp[]> = {
    factory_set: [/\bfactory\s+set\b/i, /\bfactory\s+sealed\b/i],
    complete_hand_collated_set: [/\bcomplete(?:ly)?\s+(?:hand[- ]?collated\s+)?set\b/i, /\bcomplete\s+set\b/i],
    partial_set: [/\bpartial\s+set\b/i, /\bincomplete\s+set\b/i],
  };
  add('setType', 15, setType ? sportsCardSetSignal(setType, candidateText, setTypePatterns[setType] ?? [new RegExp(`\\b${setType.replace(/_/g, '[ -]')}\\b`, 'i')]) : null);

  const missingCards = normalizedChoice(targetDetails.missingCards);
  add('missingCards', 15, missingCards
      ? missingCards === 'yes'
      ? /\b(?:partial|incomplete|missing\s+(?:cards?|pieces?))\b/i.test(candidateText)
      : /\b(?:complete|factory|master|team)(?:\s+(?:factory|sealed|hand[- ]?collated))*\s+set\b/i.test(candidateText)
    : null);

  const factorySealed = normalizedChoice(targetDetails.factorySealed);
  add('factorySealed', 10, factorySealed
    ? factorySealed === 'yes'
      ? /\b(?:factory\s+sealed|sealed|unopened)\b/i.test(candidateText)
      : /\b(?:opened|open\s+box|unsealed)\b/i.test(candidateText)
    : null);

  const sport = firstMeaningfulValue(targetDetails.sport);
  add('sport', 5, sport ? sportsCardText(candidateText).includes(sportsCardText(sport)) : null);
  return { score, matched, unknown };
}

export function sportsCardSetVisualCap(score: number): number {
  if (score >= 85) return 10;
  if (score >= 70) return 6;
  if (score >= 60) return 3;
  if (score >= 50) return 2;
  return 0;
}

const SPORTS_CARD_UNOPENED_SCORE_FIELDS = [
  ['productName', 20],
  ['productFormat', 20],
  ['productType', 15],
  ['manufacturerOrSet', 15],
  ['year', 10],
  ['authenticationCompany', 10],
  ['factorySealed', 5],
  ['fromASealedCase', 5],
] as const;

function sportsCardUnopenedTarget(targetMetadata: string): boolean {
  const category = normalizedChoice(metadataValue(targetMetadata, 'category'));
  const itemType = normalizedChoice(metadataValue(targetMetadata, 'itemType'));
  return category === 'sports_cards' && itemType.includes('unopened');
}

export function sportsCardUnopenedVisualScore(listing: VisualSourceCandidate, targetMetadata: string): { score: number; matched: string[]; unknown: string[] } {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = sourceText(candidate);
  const candidateDetails = candidateStructuredDetails(candidate);
  const matched: string[] = [];
  const unknown: string[] = [];
  let score = 0;
  const add = (field: typeof SPORTS_CARD_UNOPENED_SCORE_FIELDS[number][0], points: number, result: boolean | null) => {
    if (result === true) { score += points; matched.push(field); }
    else if (result === null) unknown.push(field);
  };

  const productName = firstMeaningfulValue(targetDetails.productName, targetDetails.productTitle, targetDetails.name, targetDetails.itemName);
  add('productName', 20, productName ? sportsCardText(candidateText).includes(sportsCardText(productName)) : null);
  const targetFormat = sportsCardUnopenedFormat(targetDetails.productFormat);
  const candidateFormat = sportsCardUnopenedFormat(candidateDetails.productFormat ?? candidateDetails.format ?? candidate.productFormat ?? candidate.format, candidate.title);
  add('productFormat', 20, targetFormat ? (candidateFormat ? candidateFormat === targetFormat : null) : null);
  const targetProductType = sportsCardUnopenedProductType(targetDetails.productType);
  const candidateProductType = sportsCardUnopenedProductType(candidateDetails.productType ?? candidate.productType, candidate.title);
  add('productType', 15, targetProductType ? (candidateProductType ? candidateProductType === targetProductType : null) : null);

  const manufacturer = firstMeaningfulValue(targetDetails.manufacturer, targetDetails.customManufacturer, targetDetails.brand);
  const setName = firstMeaningfulValue(targetDetails.setName, targetDetails.series, targetDetails.cardSet);
  const manufacturerOrSet = [manufacturer, setName].filter(Boolean);
  add('manufacturerOrSet', 15, manufacturerOrSet.length ? manufacturerOrSet.some((value) => sportsCardText(candidateText).includes(sportsCardText(value))) : null);
  const year = String(firstMeaningfulValue(targetDetails.year, targetDetails.releaseYear, targetDetails.issueYear) ?? '').trim();
  add('year', 10, year ? new RegExp(`\\b${year.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`).test(candidateText) : null);

  const targetCompany = sportsCardUnopenedCompany(targetDetails.authenticationCompany);
  const candidateCompany = sportsCardUnopenedCompany(candidateDetails.authenticationCompany ?? candidate.authenticationCompany, candidate.title);
  add('authenticationCompany', 10, targetCompany ? (candidateCompany ? candidateCompany === targetCompany : null) : null);
  const targetSealed = sportsCardUnopenedState(targetDetails.factorySealed);
  const candidateSealed = sportsCardUnopenedState(candidateDetails.factorySealed ?? candidateDetails.sealedStatus ?? candidate.factorySealed)
    ?? (/\b(?:factory\s+sealed|unopened|original\s+shrink|wax\s+sealed)\b/i.test(candidate.title) ? 'yes' : /\b(?:opened|open\s+box|unsealed|resealed)\b/i.test(candidate.title) ? 'no' : null);
  add('factorySealed', 5, targetSealed ? (candidateSealed ? candidateSealed === targetSealed : null) : null);
  const targetFasc = sportsCardUnopenedState(targetDetails.fromASealedCase);
  const candidateFasc = sportsCardUnopenedState(candidateDetails.fromASealedCase ?? candidate.fromASealedCase)
    ?? (/\b(?:FASC|from\s+(?:a\s+)?sealed\s+case)\b/i.test(candidate.title) ? 'yes' : /\bnot\s+from\s+(?:a\s+)?sealed\s+case\b/i.test(candidate.title) ? 'no' : null);
  add('fromASealedCase', 5, targetFasc ? (candidateFasc ? candidateFasc === targetFasc : null) : null);
  return { score, matched, unknown };
}

export function sportsCardUnopenedVisualCap(score: number): number {
  if (score >= 90) return 10;
  if (score >= 75) return 6;
  if (score >= 65) return 3;
  if (score >= 55) return 2;
  return 0;
}

function selectSportsCardUnopenedVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string) {
  const ranked = candidates.map((candidate) => {
    const scoring = sportsCardUnopenedVisualScore(candidate.item, targetMetadata);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown } as T };
  }).sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate, index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index + 1 } as T }));
  const highestScore = Number(ranked[0]?.item.metadataMatchScore ?? 0);
  const cap = sportsCardUnopenedVisualCap(highestScore);
  const selected = ranked.filter((candidate) => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 55).slice(0, cap);
  const selectedKeys = new Set(selected.map((candidate) => candidate.candidateIndex));
  const excluded = ranked.filter((candidate) => !selectedKeys.has(candidate.candidateIndex)).map((candidate) => ({
    ...candidate.item,
    evidenceDisposition: 'pre_vision_score_excluded',
    visualReviewStatus: 'not_reviewed',
    visualReviewRationale: Number(candidate.item.metadataMatchScore ?? 0) < 55
      ? `Sports Card unopened-product metadata score ${Number(candidate.item.metadataMatchScore ?? 0)}/100 is below the visual-review minimum of 55.`
      : `Sports Card unopened-product visual cap reached (${cap}); higher-scoring candidates were selected first.`,
    evidenceReasons: [candidate.imageUrls.length === 0 ? 'no candidate image available; retained as context-only' : Number(candidate.item.metadataMatchScore ?? 0) < 55 ? 'metadata score below minimum (55)' : `visual-review cap reached (${cap})`],
  } as T));
  return { selected, excluded, cap, ranked };
}

function selectSportsCardSetVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string) {
  const ranked = candidates.map((candidate) => {
    const scoring = sportsCardSetVisualScore(candidate.item, targetMetadata);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown } as T };
  }).sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate, index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index + 1 } as T }));
  const highestScore = Number(ranked[0]?.item.metadataMatchScore ?? 0);
  const cap = sportsCardSetVisualCap(highestScore);
  const selected = ranked.filter((candidate) => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 50).slice(0, cap);
  const selectedKeys = new Set(selected.map((candidate) => candidate.candidateIndex));
  const excluded = ranked.filter((candidate) => !selectedKeys.has(candidate.candidateIndex)).map((candidate) => ({
    ...candidate.item,
    evidenceDisposition: 'pre_vision_score_excluded',
    visualReviewStatus: 'not_reviewed',
    visualReviewRationale: Number(candidate.item.metadataMatchScore ?? 0) < 50
      ? `Sports Card set metadata score ${Number(candidate.item.metadataMatchScore ?? 0)}/100 is below the visual-review minimum of 50.`
      : `Sports Card set visual cap reached (${cap}); higher-scoring candidates were selected first.`,
    evidenceReasons: [candidate.imageUrls.length === 0
      ? 'no candidate image available; retained as context-only'
      : Number(candidate.item.metadataMatchScore ?? 0) < 50
        ? 'metadata score below minimum (50)'
        : `visual-review cap reached (${cap})`],
  } as T));
  return { selected, excluded, cap, ranked };
}

function selectSportsCardSingleVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string) {
  const ranked = candidates.map((candidate, index) => {
    const scoring = sportsCardSingleVisualScore(candidate.item, targetMetadata);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataMatchRank: index + 1 } as T };
  }).sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate, index) => ({
      ...candidate,
      item: { ...candidate.item, metadataMatchRank: index + 1 } as T,
    }));
  const highestScore = Number(ranked[0]?.item.metadataMatchScore ?? 0);
  const cap = sportsCardSingleVisualCap(highestScore);
  const selected = ranked
    .filter((candidate) => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 50)
    .slice(0, cap);
  const selectedKeys = new Set(selected.map((candidate) => candidate.candidateIndex));
  const excluded = ranked.filter((candidate) => !selectedKeys.has(candidate.candidateIndex)).map((candidate) => ({
    ...candidate.item,
    evidenceDisposition: 'pre_vision_score_excluded',
    visualReviewStatus: 'not_reviewed',
    visualReviewRationale: Number(candidate.item.metadataMatchScore ?? 0) < 50
      ? `Sports Card single-card metadata score ${Number(candidate.item.metadataMatchScore ?? 0)}/100 is below the visual-review minimum of 50.`
      : `Sports Card single-card visual cap reached (${cap}); higher-scoring candidates were selected first.`,
    evidenceReasons: [candidate.imageUrls.length === 0
      ? 'no candidate image available; retained as context-only'
      : Number(candidate.item.metadataMatchScore ?? 0) < 50
        ? 'metadata score below minimum (50)'
        : `visual-review cap reached (${cap})`],
  } as T));
  return { selected, excluded, cap, ranked };
}

function selectComicsSingleVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string) {
  const ranked = candidates.map((candidate) => {
    const scoring = comicsSingleVisualScore(candidate.item, targetMetadata);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown } as T };
  }).sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate, index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index + 1 } as T }));
  const highestScore = Number(ranked[0]?.item.metadataMatchScore ?? 0);
  const cap = comicsSingleVisualCap(highestScore);
  const selected = ranked.filter((candidate) => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 50).slice(0, cap);
  const selectedKeys = new Set(selected.map((candidate) => candidate.candidateIndex));
  const excluded = ranked.filter((candidate) => !selectedKeys.has(candidate.candidateIndex)).map((listing) => ({
    ...listing.item,
    evidenceDisposition: 'pre_vision_score_excluded',
    visualReviewStatus: 'not_reviewed',
    visualReviewRationale: Number(listing.item.metadataMatchScore ?? 0) < 50
      ? `Comics / Single Comic metadata score ${Number(listing.item.metadataMatchScore ?? 0)}/100 is below the visual-review minimum of 50.`
      : `Comics / Single Comic visual cap reached (${cap}); higher-scoring candidates were selected first.`,
    evidenceReasons: [listing.imageUrls.length === 0
      ? 'no candidate image available; retained as context-only'
      : Number(listing.item.metadataMatchScore ?? 0) < 50
        ? 'metadata score below minimum (50)'
        : `visual-review cap reached (${cap})`],
  } as T));
  return { selected, excluded, cap, ranked };
}

function selectPaperMoneyVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string) {
  const ranked = candidates.map((candidate) => {
    const scoring = paperMoneyVisualScore(candidate.item, targetMetadata);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown } as T };
  }).sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate, index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index + 1 } as T }));
  const highestScore = Number(ranked[0]?.item.metadataMatchScore ?? 0);
  const cap = paperMoneyVisualCap(highestScore);
  const selected = ranked.filter((candidate) => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 60).slice(0, cap);
  const selectedKeys = new Set(selected.map((candidate) => candidate.candidateIndex));
  const excluded = ranked.filter((candidate) => !selectedKeys.has(candidate.candidateIndex)).map((listing) => ({
    ...listing.item,
    evidenceDisposition: 'pre_vision_score_excluded',
    visualReviewStatus: 'not_reviewed',
    visualReviewRationale: Number(listing.item.metadataMatchScore ?? 0) < 60
      ? `Coins / Paper Money metadata score ${Number(listing.item.metadataMatchScore ?? 0)}/100 is below the visual-review minimum of 60.`
      : `Coins / Paper Money visual cap reached (${cap}); higher-scoring candidates were selected first.`,
    evidenceReasons: [listing.imageUrls.length === 0 ? 'no candidate image available; retained as context-only' : Number(listing.item.metadataMatchScore ?? 0) < 60 ? 'metadata score below minimum (60)' : `visual-review cap reached (${cap})`],
  } as T));
  return { selected, excluded, cap, ranked };
}
function selectCoinsSingleVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string) {
  const ranked = candidates.map((candidate) => {
    const scoring = coinsSingleVisualScore(candidate.item, targetMetadata);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown } as T };
  }).sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate, index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index + 1 } as T }));
  const highestScore = Number(ranked[0]?.item.metadataMatchScore ?? 0);
  const cap = coinsSingleVisualCap(highestScore);
  const selected = ranked.filter((candidate) => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 60).slice(0, cap);
  const selectedKeys = new Set(selected.map((candidate) => candidate.candidateIndex));
  const excluded = ranked.filter((candidate) => !selectedKeys.has(candidate.candidateIndex)).map((listing) => ({
    ...listing.item,
    evidenceDisposition: 'pre_vision_score_excluded',
    visualReviewStatus: 'not_reviewed',
    visualReviewRationale: Number(listing.item.metadataMatchScore ?? 0) < 60
      ? `Coins / Single Coin metadata score ${Number(listing.item.metadataMatchScore ?? 0)}/100 is below the visual-review minimum of 60.`
      : `Coins / Single Coin visual cap reached (${cap}); higher-scoring candidates were selected first.`,
    evidenceReasons: [listing.imageUrls.length === 0
      ? 'no candidate image available; retained as context-only'
      : Number(listing.item.metadataMatchScore ?? 0) < 60
        ? 'metadata score below minimum (60)'
        : `visual-review cap reached (${cap})`],
  } as T));
  return { selected, excluded, cap, ranked };
}
function selectCoinsSetVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string) {
  const ranked = candidates.map((candidate) => {
    const scoring = coinsSetVisualScore(candidate.item, targetMetadata);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown } as T };
  }).sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate, index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index + 1 } as T }));
  const highestScore = Number(ranked[0]?.item.metadataMatchScore ?? 0);
  const cap = coinsSetVisualCap(highestScore);
  const selected = ranked.filter((candidate) => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 60).slice(0, cap);
  const selectedKeys = new Set(selected.map((candidate) => candidate.candidateIndex));
  const excluded = ranked.filter((candidate) => !selectedKeys.has(candidate.candidateIndex)).map((listing) => ({
    ...listing.item,
    evidenceDisposition: 'pre_vision_score_excluded',
    visualReviewStatus: 'not_reviewed',
    visualReviewRationale: Number(listing.item.metadataMatchScore ?? 0) < 60
      ? `Coins / Coin Set metadata score ${Number(listing.item.metadataMatchScore ?? 0)}/100 is below the visual-review minimum of 60.`
      : `Coins / Coin Set visual cap reached (${cap}); higher-scoring candidates were selected first.`,
    evidenceReasons: [listing.imageUrls.length === 0
      ? 'no candidate image available; retained as context-only'
      : Number(listing.item.metadataMatchScore ?? 0) < 60
        ? 'metadata score below minimum (60)'
        : `visual-review cap reached (${cap})`],
  } as T));
  return { selected, excluded, cap, ranked };
}

function annotateSportsCardScoresWithoutImages<T extends VisualSourceCandidate>(listings: T[], targetMetadata: string): T[] {
  return listings
    .map((item, index) => {
      const scoring = sportsCardSingleVisualScore(item, targetMetadata);
      return { item: { ...item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown } as T, index };
    })
    .sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.index - b.index)
    .map((entry, rank) => ({ ...entry.item, metadataMatchRank: rank + 1 } as T));
}

export async function filterVisualSourceCandidates<
  T extends VisualSourceCandidate,
>(args: {
	  /** Marketplace/eBay candidates only. Grading and reference sources use separate evidence contracts. */
	  sourceRole: 'marketplace' | 'ebay';
	  sourceLabel: string;
	  targetImageUrl?: string | null;
	  targetMetadata: string;
		  listings: T[];
		  ignoreSubjectiveConditionDifferences?: boolean;
		  reviewDeadlineAt?: number;
	}): Promise<VisualSourceFilterResult<T>> {
		  const targetMetadata = canonicalVisualTargetMetadata(args.targetMetadata);
	  const universalPreparation = prepareUniversalVisualCandidates(args.listings, targetMetadata);
	  const preparedListings = universalPreparation.listings;
	  const isOriginalArtTarget = /(?:^|;\s*)category=comics(?:;|$)/i.test(targetMetadata)
	    && /(?:^|;\s*)itemType=original_art(?:;|$)/i.test(targetMetadata);
	  if (isOriginalArtTarget) {
	    const rankedOriginalArtListings = annotateOriginalArtMarketCandidates(preparedListings, targetMetadata);
	    const contextListings = rankedOriginalArtListings.map((listing, index) => ({
	      ...listing,
	      visualRequirement: 'not_required_original_art',
	      visualReviewStatus: 'not_reviewed',
	      visualReviewRationale: 'Original Art uses broad market context; different artworks are not exact visual comparables.',
	      evidenceDisposition: 'context_only',
	      evidenceReasons: [
	        ...(universalPreparation.contextReasons.get(index) ? [universalPreparation.contextReasons.get(index)!] : []),

	        'Original Art market-context workflow does not use visual analysis.',
	      ],
	    } as T));
	    return {
	      listings: [],
	      contextListings,
	      preVisualExcludedCount: contextListings.length,
	      status: 'skipped_no_target_image',
	      reviewedCount: 0,
	      removedCount: 0,
	      retainedUnreviewedCount: contextListings.length,
	      reviews: [],
	      note: 'Original Art market context only: candidates are not sent to visual analysis because different artworks are not exact matches.',
	    };
	  }
	  const preVisualUniversalReasons = universalPreparation.contextReasons;
  const preVisualLotReasons = new Map<number, string>();
	  preparedListings.forEach((listing, index) => {
    const reason = multiItemLotReason(listing, targetMetadata);
    if (reason) preVisualLotReasons.set(index, reason);
  });
	  const declaredReviews = buildDeclaredIdentityReviews(preparedListings, targetMetadata, {
    ignoreSubjectiveConditionDifferences: args.ignoreSubjectiveConditionDifferences,
  });
  const declaredReviewByIndex = new Map(declaredReviews.map((review) => [review.candidateIndex, review]));
  const preVisualExcludedIndexes = new Set([
	    ...preVisualUniversalReasons.keys(),
    ...preVisualLotReasons.keys(),
    ...declaredReviewByIndex.keys(),
  ]);
	  const preVisualContextListings: T[] = preparedListings.flatMap<T>((listing, originalIndex) => {
    if (!preVisualExcludedIndexes.has(originalIndex)) return [] as T[];
    const declaredReview = declaredReviewByIndex.get(originalIndex);
	    const reason = preVisualUniversalReasons.get(originalIndex)
	      ?? preVisualLotReasons.get(originalIndex)
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
  let eligibleListings = preparedListings.filter((_, index) => !preVisualExcludedIndexes.has(index));
  let preVisualScoreExcludedListings: T[] = [];
  let preVisualScoreExcludedIndexes = new Set<number>();
  let itemTypeRankedItems = new Map<number, T>();
  let allCandidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }> = preparedListings
    .map((item, candidateIndex) => {
      const imageUrls = normalizeVisualSourceCandidate(item).imageUrls;
      return { item, candidateIndex, imageUrl: imageUrls[0] ?? null, imageUrls };
    })
    .filter((entry) => !preVisualExcludedIndexes.has(entry.candidateIndex));
  allCandidates = annotateUniversalScores(allCandidates, targetMetadata);
  const rankedItems = new Map<number, T>(allCandidates.map((candidate) => [candidate.candidateIndex, candidate.item]));
  const sportsCardSelection = sportsCardUnopenedTarget(targetMetadata)
    ? selectSportsCardUnopenedVisualCandidates(allCandidates, targetMetadata)
    : sportsCardSingleTarget(targetMetadata)
    ? selectSportsCardSingleVisualCandidates(allCandidates, targetMetadata)
    : sportsCardSetTarget(targetMetadata)
      ? selectSportsCardSetVisualCandidates(allCandidates, targetMetadata)
      : null;
  const comicsSelection = comicsSingleTarget(targetMetadata)
    ? selectComicsSingleVisualCandidates(allCandidates, targetMetadata)
    : null;
  const coinsSelection = isSingleCoinTarget(targetMetadata)
    ? selectCoinsSingleVisualCandidates(allCandidates, targetMetadata)
    : null;
  const coinSetSelection = isCoinSetTarget(targetMetadata)
    ? selectCoinsSetVisualCandidates(allCandidates, targetMetadata)
    : null;
  const paperMoneySelection = isPaperMoneyTarget(targetMetadata)
    ? selectPaperMoneyVisualCandidates(allCandidates, targetMetadata)
    : null;
  const rankedSelection = sportsCardSelection ?? comicsSelection ?? coinsSelection ?? coinSetSelection ?? paperMoneySelection;
  if (rankedSelection) {
    const selectedCandidateIndexes = new Set(rankedSelection.selected.map((candidate) => candidate.candidateIndex));
    preVisualScoreExcludedIndexes = new Set<number>(
      rankedSelection.ranked
        .filter((candidate) => !selectedCandidateIndexes.has(candidate.candidateIndex))
        .map((candidate) => candidate.candidateIndex),
    );
    itemTypeRankedItems = new Map(rankedSelection.ranked.map((candidate) => [candidate.candidateIndex, candidate.item]));
    for (const [candidateIndex, item] of itemTypeRankedItems) rankedItems.set(candidateIndex, item);
    preVisualScoreExcludedListings = rankedSelection.excluded.map((listing) => ({
      ...listing,
      visualRequirement: "not_required_pre_visual",
      evidenceDisposition: "context_only",
    } as T));
    eligibleListings = eligibleListings.filter((listing) => {
      const candidateIndex = preparedListings.indexOf(listing);
      return candidateIndex >= 0 && !preVisualScoreExcludedIndexes.has(candidateIndex);
    });
  }
  const target = safeHttps(args.targetImageUrl);
  const remainingUnrankedEligible = rankedSelection ? [] : eligibleListings;
  if (!target)
    return {
      listings: [],
      contextListings: [...preVisualContextListings, ...preVisualScoreExcludedListings, ...remainingUnrankedEligible.map((listing) => ({
        ...listing,
        ...(rankedItems.get(preparedListings.indexOf(listing)) ?? {}),
        visualRequirement: "not_required_pre_visual",
        visualReviewStatus: "not_reviewed",
        visualReviewRationale: "No target image was supplied; ranked candidate retained as context-only and not sent to visual review.",
        evidenceDisposition: "context_only",
      } as T))],
      preVisualExcludedCount: preVisualContextListings.length + preVisualScoreExcludedListings.length + remainingUnrankedEligible.length,
      status: "skipped_no_target_image",
      reviewedCount: 0,
      removedCount: preVisualContextListings.length + preVisualScoreExcludedListings.length + remainingUnrankedEligible.length,
      retainedUnreviewedCount: 0,
      reviews: declaredReviews,
      note: `No target listing image was supplied; ${args.sourceLabel} candidates were not visually filtered. ${preVisualContextListings.length} explicit identity or multi-item listing${preVisualContextListings.length === 1 ? " was" : "s were"} excluded before vision and retained as context-only.`,
    };
  const candidates = allCandidates
    .filter(
      (entry): entry is { item: T; candidateIndex: number; imageUrl: string; imageUrls: string[] } =>
        !preVisualScoreExcludedIndexes.has(entry.candidateIndex) &&
        entry.imageUrls.length > 0
    );
  const imageLessIndexes = new Set(allCandidates.filter((candidate) => candidate.imageUrls.length === 0).map((candidate) => candidate.candidateIndex));
  if (!candidates.length) {
    return {
      listings: [],
      contextListings: [...preVisualContextListings, ...preVisualScoreExcludedListings, ...remainingUnrankedEligible.map((listing) => ({
        ...listing,
        ...(rankedItems.get(preparedListings.indexOf(listing)) ?? {}),
        visualRequirement: "not_required_pre_visual",
        visualReviewStatus: "not_reviewed",
        visualReviewRationale: "No candidate image was supplied; ranked candidate retained as context-only and not sent to visual review.",
        evidenceDisposition: "context_only",
      } as T))],
      preVisualExcludedCount: preVisualContextListings.length + preVisualScoreExcludedListings.length + remainingUnrankedEligible.length,
      status: "skipped_no_candidate_images",
      reviewedCount: 0,
      removedCount: preVisualContextListings.length + preVisualScoreExcludedListings.length + remainingUnrankedEligible.length,
      retainedUnreviewedCount: 0,
      reviews: declaredReviews,
      note: eligibleListings.length === 0
        ? `No ${args.sourceLabel.toLowerCase()} candidates remained after deterministic identity and multi-item filtering; ${preVisualContextListings.length} listing${preVisualContextListings.length === 1 ? " was" : "s were"} retained as context-only before vision.`
        : `No ${args.sourceLabel.toLowerCase()} candidate images were available; all eligible candidates were retained. ${preVisualContextListings.length} explicit identity or multi-item listing${preVisualContextListings.length === 1 ? " was" : "s were"} excluded before vision and retained as context-only.`,
    };
  }
  let reviewCandidates = candidates;
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
    reviewCandidates = rankedSelection
      ? rankedSelection.selected
        .filter((candidate) => candidate.imageUrls.length > 0)
        .map((candidate) => ({ ...candidate, imageUrl: candidate.imageUrl as string }))
      : candidates;
    const reviewQueue = prioritizeVisualSourceCandidates(reviewCandidates, targetMetadata, declaredReviews);
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
	        preparedListings.length,
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
            preparedListings.length,
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
          conservativeComicVisualReviews(reviews, preparedListings, targetMetadata),
          preparedListings,
          targetMetadata,
          ), preparedListings, targetMetadata),
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
          preparedListings,
          targetMetadata,
        ),
        preparedListings,
        targetMetadata,
      ), preparedListings, targetMetadata),
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
    const imageBearingIndexes = new Set(reviewCandidates.map((candidate) => candidate.candidateIndex));
    const reviewedIndexes = new Set([...uniqueReviews, ...declaredReviews].map((review) => review.candidateIndex));
    // A candidate with a usable target and candidate image must either receive a
    // visual verdict or remain explicit review-only. Do not let a later client
    // treat a missing model row as an implicit pass.
    const requirementAnnotatedListings = preparedListings.map((listing, index) => {
      const displayListing = rankedItems.has(index)
        ? { ...listing, ...rankedItems.get(index) } as T
        : listing;
      const universalReason = preVisualUniversalReasons.get(index);
	      if (universalReason) {
	        return {
          ...displayListing,
          visualRequirement: "not_required_pre_visual",
          visualReviewStatus: "not_reviewed",
          visualReviewRationale: universalReason,
	          evidenceDisposition: "context_only",
	        } as T;
	      }
      const preVisualReason = preVisualLotReasons.get(index);
      if (preVisualReason) {
        return {
          ...displayListing,
          visualRequirement: "not_required_pre_visual",
          visualReviewStatus: "not_reviewed",
          visualReviewRationale: preVisualReason,
          evidenceDisposition: "context_only",
        } as T;
      }
      const declaredReview = declaredReviewByIndex.get(index);
      if (declaredReview) {
        return {
          ...displayListing,
          visualRequirement: "not_required_pre_visual",
          visualReviewStatus: declaredReview.verdict,
          visualReviewRationale: declaredReview.rationale,
          evidenceDisposition: "context_only",
        } as T;
      }
      if (preVisualScoreExcludedIndexes.has(index)) {
        const scored = preVisualScoreExcludedListings.find((candidate) => candidate === listing || candidate.title === listing.title);
        return {
          ...displayListing,
          metadataMatchScore: scored?.metadataMatchScore,
          metadataMatchReasons: scored?.metadataMatchReasons,
          visualRequirement: "not_required_pre_visual",
          visualReviewStatus: "not_reviewed",
          visualReviewRationale: scored?.visualReviewRationale ?? "Candidate was omitted by the item-type visual-review score cap.",
          evidenceDisposition: "context_only",
        } as T;
      }
      if (imageLessIndexes.has(index)) {
        return {
          ...displayListing,
          visualRequirement: "not_required_pre_visual",
          visualReviewStatus: "not_reviewed",
          visualReviewRationale: "No usable candidate image was supplied; ranked candidate retained as context-only and not sent to visual review.",
          evidenceDisposition: "context_only",
        } as T;
      }
      if (!imageBearingIndexes.has(index)) return displayListing;
      if (reviewedIndexes.has(index)) return { ...displayListing, visualRequirement: "required" } as T;
      return {
        ...displayListing,
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
    const contextIndexes = new Set([...preVisualUniversalReasons.keys(), ...declaredConflictIndexes, ...preVisualLotReasons.keys(), ...preVisualScoreExcludedIndexes, ...imageLessIndexes]);
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
	      note: `${buildVisualSourceFilterNote(args.sourceLabel, { ...applied, removedCount: contextListings.length })} Adaptive visual review sent ${reviewedCandidateCount} of ${candidates.length} image-bearing candidates in batches of ${VISUAL_REVIEW_BATCH_SIZE}, stopping after ${VISUAL_REVIEW_TARGET_MATCHES} accepted visual matches, the ${VISUAL_REVIEW_MAX_CANDIDATES}-image maximum, or the ${VISUAL_REVIEW_OVERALL_DEADLINE_MS / 1000}-second overall deadline; ${timedOutCount} candidate${timedOutCount === 1 ? "" : "s"} timed out; ${preVisualUniversalReasons.size} universal duplicate, quantity, state, grade, component, or image-readiness record${preVisualUniversalReasons.size === 1 ? " was" : "s were"} retained as context-only; ${preVisualLotReasons.size} multi-item listing${preVisualLotReasons.size === 1 ? " was" : "s were"} excluded before vision and retained as context-only; ${declaredConflictIndexes.size} other explicit identity conflict${declaredConflictIndexes.size === 1 ? " was" : "s were"} excluded before vision and retained in context for audit.${completedWithTimeout ? " Remaining candidates are retained for manual review and cannot enter valuation implicitly." : ""}`,
    };
  } catch {
    const unavailableContextListings = [
      ...preVisualContextListings,
      ...preVisualScoreExcludedListings,
      ...preparedListings.flatMap((listing, index) => imageLessIndexes.has(index)
        ? [{
            ...listing,
            ...(rankedItems.get(index) ?? {}),
            visualRequirement: "not_required_pre_visual",
            visualReviewStatus: "not_reviewed",
            visualReviewRationale: "No usable candidate image was supplied; ranked candidate retained as context-only and not sent to visual review.",
            evidenceDisposition: "context_only",
          } as T]
        : []),
    ];
    return {
      listings: preparedListings.map((listing, index) => reviewCandidates.some((candidate) => candidate.candidateIndex === index)
        ? {
            ...listing,
            ...(rankedItems.get(index) ?? {}),
            visualRequirement: "required",
            visualReviewStatus: "not_reviewed",
            visualReviewRationale: "The visual provider was unavailable; manual image review is required.",
            evidenceDisposition: "warning_review",
          } as T
        : { ...listing, ...(rankedItems.get(index) ?? {}) }).filter((_, index) => !preVisualExcludedIndexes.has(index) && !imageLessIndexes.has(index)),
      contextListings: unavailableContextListings,
      preVisualExcludedCount: unavailableContextListings.length,
      status: "provider_unavailable",
      reviewedCount: 0,
      removedCount: unavailableContextListings.length,
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
