import { invokeLLM, type ImageContent, type TextContent, type LlmProvider } from "./_core/llm";
import { parseAnalyzerResponse } from "./testAiResponse";
import { diagnoseVisualResponse } from "../shared/testAiVisualFailure";
import { autographAuthenticationCompaniesEquivalent, findMaterialMetadataConflicts, metadataConflictReviewReason } from "../shared/testAiMetadataConflict";
import { findAutographAuthenticatorInText, normalizeAutographAuthenticator } from "../shared/testAiAutographAuthentication";
import { buildSoldReviewBudget } from "../shared/testAiSalesEvidencePolicy";
import {
  buildMarketplaceTitleEvidence,
  classifyMarketplaceProductRole,
  titleContainsValue,
  titleCompletenessState,
  titlePackagingState,
} from "../shared/testAiTitleEvidence";
import { classifyStampFormat, stampFormatsCompatible } from "./stampFormat";
import { autographReplicaReasonFromText } from "../shared/testAiAutographEvidence";
import { extractMarketplaceLotQuantity, isExplicitMultiItemListing } from "../shared/testAiMarketplaceCandidate";
import { parseTestAiDetails, resolveTestAiDetailValue } from "../shared/testAiCriteria";
import { canonicalVideoGameGrader, videoGameGradersEquivalent } from "../shared/videoGameGraderEquivalence";
import { normalizeVideoGameMetadata } from "../shared/videoGameMetadata";
import { meaningfulMetadataText, readMetadataValue, extractCandidateStructuredMetadata, metadataBooleanState } from "../shared/testAiMetadataValues";
import type { MetadataScoreResult, RankingAward, RankingAwardEvidence } from "../shared/testAiRankingAwards";
import { rankingAwardContribution, rankingAwardFieldKey } from "../shared/testAiRankingAwards";
import { randomUUID } from "node:crypto";
import { freezeMetadataRankingPopulation, bindMetadataRankingPopulation, overlayMetadataRankingPopulation, type MetadataRankingPopulation, type MetadataRankingBinding } from "../shared/testAiRankingPopulation";
import { parsePokemonCardNumber, comparePokemonCardNumbers, readPokemonCardNumbersFromTitle } from "../shared/testAiPokemonCardNumber";
import { parseToyNumericValue, readToyNumericTitleEvidence, extractToyNumericTitleEvidence, type ToyNumericField } from "../shared/testAiToyNumericEvidence";
import { determineExplicitGradingState, type ExplicitGradingState as ObservedExplicitGradingState } from "../shared/testAiExplicitGradingState";
import { compareComparableGrades, parseComparableGrade, parseSourceGradeFromTitle, findStructuredGradeConflict, type ComparableGrade, type ComparableGradeOptions } from "../shared/testAiGradeComparison";
import { summarizeVisualExecutionOccurrences, type VisualExecution, type VisualExecutionAttempt, type VisualExecutionCounts, type VisualExecutionReasonCode, type VisualExecutionStage, type VisualExecutionFormat } from "../shared/testAiVisualExecution";
export type VisualSourceCandidate = {
  title?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[];
  metadataFieldComparisons?: MetadataFieldComparison[];
  metadataScoreAwards?: RankingAward[];
  metadataRanking?: MetadataRankingBinding;
  metadataOriginOccurrenceKey?: string;
  visualExecution?: VisualExecution;
  [key: string]: unknown;
};
export type MetadataFieldComparison = {
  fieldKey?: string;
	targetField: string;
	targetValue: string;
	candidateField: string;
	candidateValue: string;
  status: "match" | "different" | "soft_difference" | "unknown";
	titleDerivedField: string;
	titleDerivedValue: string;
  titleDerivedStatus: "match" | "different" | "soft_difference" | "unknown";
  rankingContribution?: {
    matched: boolean;
    structured: boolean;
    titleDerived: boolean;
    potentialPoints?: number;
    reasons: string[];
    awards?: RankingAward[];
    awardedPoints?: number;
    sources?: RankingAward['source'][];
    /** Exact selected witnesses, not reconstructed candidate field values. */
    scoringEvidence?: Array<{
      awardField: string;
      source: RankingAward['source'];
      awardedPoints: number;
      shared: boolean;
      evidence: RankingAwardEvidence[];
    }>;
  };
};
export type VisualDifference = {
  field: string;
  targetObservation: string;
  candidateObservation: string;
  impact: string;
};
export type VisualEvidence = {
  slabVisible?: boolean;
  gradingLabelVisible?: boolean;
  graderVisible?: boolean;
  numericGradeVisible?: boolean;
  gradeMatches?: boolean;
  rawOrLooseVisible?: boolean;
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
  visualDifferences?: VisualDifference[];
  visualEvidence?: VisualEvidence;
  visualAudit?: {
    imageCount: number;
    provider?: LlmProvider;
    initialModel?: string;
    finalModel?: string;
    initialVerdict: VisualSourceReview["verdict"] | "no_decision";
    initialConfidence: VisualSourceReview["confidence"] | "no_decision";
    initialRationale?: string;
    decidingRationale?: string;
    retryVerdict?: VisualSourceReview["verdict"];
    retryConfidence?: VisualSourceReview["confidence"];
    retryRationale?: string;
    normalizations?: Array<{
      rule: string;
      verdictBefore: VisualSourceReview["verdict"];
      confidenceBefore: VisualSourceReview["confidence"];
      rationaleBefore: string;
      verdictAfter: VisualSourceReview["verdict"];
    }>;
    retryStatus: "not_needed" | "performed" | "failed";
    adjudicationStatus?: "confirmed" | "unavailable";
    retryReason?: string;
    finalPass: "initial" | "high_resolution_retry";
    initialEvidence?: VisualEvidence;
    finalEvidence?: VisualEvidence;
  };
};

/** Preserve missing observations as unknown, including legacy JSON fallbacks. */
function normalizeVisualEvidence(value: unknown): VisualEvidence | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const observed = value as Record<string, unknown>;
  const keys: Array<keyof VisualEvidence> = [
    "slabVisible", "gradingLabelVisible", "graderVisible", "numericGradeVisible",
    "gradeMatches", "rawOrLooseVisible", "characterMatches", "artworkMatches",
    "silhouetteMatches", "backingCardMatches", "setDesignMatches", "identityMatches",
    "dateMatches", "varietyMatches", "mintMarkMatches", "denominationMatches",
  ];
  return Object.fromEntries(keys.filter((key) => typeof observed[key] === "boolean")
    .map((key) => [key, observed[key]])) as VisualEvidence;
}

/** A later deciding pass must never borrow positive evidence from an older pass. */
export function decidingVisualEvidence(item: {
  visualEvidence?: VisualEvidence;
  visualAudit?: VisualSourceReview["visualAudit"] | null;
}): VisualEvidence | undefined {
  const audit = item.visualAudit;
  if (audit?.finalPass === "high_resolution_retry") return audit.finalEvidence ?? item.visualEvidence;
  return audit?.finalEvidence ?? item.visualEvidence ?? audit?.initialEvidence;
}

/** Normalizer commentary must never supply its own missing confirmation. */
function decidingVisualRationale(review: VisualSourceReview): string {
  const audit = review.visualAudit;
  return audit?.decidingRationale
    ?? (audit?.finalPass === "high_resolution_retry" ? audit.retryRationale : audit?.initialRationale)
    ?? review.rationale;
}

export function gradedVisualEvidenceIsConfirmed(evidence: VisualEvidence | undefined): boolean {
  return evidence?.slabVisible === true && evidence.gradingLabelVisible === true
    && evidence.graderVisible === true && evidence.numericGradeVisible === true
    && evidence.gradeMatches === true && evidence.rawOrLooseVisible === false;
}

function withVisualNormalization(
  review: VisualSourceReview,
  patch: Pick<VisualSourceReview, "verdict" | "confidence" | "rationale">,
  rule: string,
): VisualSourceReview {
  return {
    ...review,
    ...patch,
    visualAudit: {
      imageCount: 1,
      initialVerdict: review.verdict,
      initialConfidence: review.confidence,
      initialRationale: review.rationale,
      decidingRationale: review.rationale,
      retryStatus: "not_needed",
      finalPass: "initial",
      ...review.visualAudit,
      normalizations: [...(review.visualAudit?.normalizations ?? []), {
        rule,
        verdictBefore: review.verdict,
        confidenceBefore: review.confidence,
        rationaleBefore: review.rationale,
        verdictAfter: patch.verdict,
      }],
    },
  };
}

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
  visualExecutionCounts?: VisualExecutionCounts;
  /** Review opportunity only; never completed-sale, identity or pricing authority. */
  reviewBudget?: ReturnType<typeof buildSoldReviewBudget> & { targetItemType: string; existingScoreBandCap: number; minimumMetadataScore: number;
    queuedCount: number; dispatchedCount: number; deadlineHeldCount: number };
  note: string;
};

export function isAutographSignedItemTarget(targetMetadata: string): boolean {
  return normalizedChoice(metadataValue(targetMetadata, "category")) === "autographs"
    && targetItemTypeValue(targetMetadata) === "signed_item";
}

function autographMarketValue(value: unknown): string {
  return normalizedChoice(value).replace(/\bautograph(?:ed|s)?\b/g, "").replace(/\bsigned\b/g, "").trim();
}
function autographAuthenticationState(value: unknown): "yes" | "no" | "" {
  const normalized = normalizedChoice(value);
  if (["yes", "true", "1", "authenticated", "authentic", "verified"].includes(normalized)) return "yes";
  if (["no", "false", "0", "unauthenticated", "unverified", "not_authenticated", "not_verified", "none", "without"].includes(normalized)) return "no";
  return normalized && !["unknown", "n/a", "na", "not_applicable"].includes(normalized) ? "yes" : "";
}
function autographTargetAuthenticationState(details: Record<string, unknown>): "yes" | "no" | "" {
  const explicit = [details.authenticationIncluded, details.authenticated, details.authenticationStatus, details.isAuthenticated]
    .map(autographAuthenticationState).find(Boolean);
  if (explicit) return explicit;
  return meaningfulMetadataText(details.authenticationCompany ?? details.customAuthenticationCompany ?? details.authenticator) ? "yes" : "";
}
function autographTargetValue(targetMetadata: string, details: Record<string, unknown>, aliases: string[]): string {
  return autographMarketValue(aliases.map((key) => metadataValue(targetMetadata, key) || details[key]).find((value) => String(value ?? "").trim()));
}

function autographSignerCount(value: unknown): number | null {
  const text = autographMarketValue(value);
  if (!text) return null;
  const names = text
    .replace(/\s+(?:and|with)\s+/gi, "|")
    .split(/[|,&/+;]+/)
    .map((name) => name.trim())
    .filter((name) => name.length >= 2);
  return names.length > 0 ? names.length : null;
}

function explicitCandidateSignerCount(listing: VisualSourceCandidate): number | null {
  const details = candidateStructuredDetails(listing);
  const structuredSigner = listing.signer ?? details.signer ?? listing.autographSigner ?? details.autographSigner;
  const structuredCount = autographSignerCount(structuredSigner);
  const title = String(listing.title ?? "");
  const numbered = title.match(/\bsigned\s*\(\s*(\d+)\s*\)|\b(\d+)\s+(?:signatures?|autographs?)\b/i);
  if (numbered) return Number(numbered[1] ?? numbered[2]);
  const plusCount = title.match(/\+\s*(\d+)\s*(?:w\/|with)\s*(?:character|signer|autograph)/i);
  if (plusCount) return Number(plusCount[1]) + 1;
  if (/\b(?:multi[-\s]?signed|dual[-\s]?signed|double[-\s]?signed)\b/i.test(title)) return 2;
  return structuredCount;
}

export function autographMultiSignatureReason(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  const details = extractTargetItemDetails(targetMetadata);
  const targetSigner = autographTargetValue(targetMetadata, details, ["signer"]);
  const targetCount = autographSignerCount(targetSigner) ?? (targetSigner ? 1 : null);
  const candidateCount = explicitCandidateSignerCount(listing);
  if (!targetCount || !candidateCount || targetCount === candidateCount) return null;
  return `Autograph candidate identifies ${candidateCount} signers while the target identifies ${targetCount}; multi-signed and single-signed items are not interchangeable for valuation. Retained as context-only.`;
}

function autographCandidateValue(listing: VisualSourceCandidate, aliases: string[], titlePatterns: RegExp[] = []): string {
  const candidate = normalizeVisualSourceCandidate(listing);
  const structured = aliases.flatMap((key) => [listing[key], candidate.details[key]]).find((value) => meaningfulMetadataText(value));
  if (structured != null) return autographMarketValue(structured);
  for (const pattern of titlePatterns) {
    const match = candidate.title.match(pattern);
    if (match?.[1]) return autographMarketValue(match[1]);
  }
  return "";
}

function autographSignerFromTitle(title: string, targetSigner = ""): string {
  // An explicit named signer outranks a subject name mentioned in the title.
  const explicit = title.match(/\b(?:signed|autographed)\s+(?:(?:baseball|basketball|football|ball|boxing\s+glove|glove|jersey|helmet|puck|photo(?:graph)?|paper|cut|document|poster|book|card|guitar)\s+)?by\s+([^,|;()]+?)(?=\s+(?:on|a|an|the)\s+|[,|;()]|$)/i);
  if (explicit?.[1]) return autographMarketValue(explicit[1]);
  const normalizedTarget = autographMarketValue(targetSigner);
  // A title may mention a famous person without being signed by that person.
  // Strip only leading authenticator labels, not arbitrary subject/context text.
  // PSA DNA Babe Ruth Autographed Baseball therefore retains Babe Ruth as the
  // leading signer; a Baseball signed by another person still does not match.
  if (normalizedTarget) {
    const normalizedTitle = normalizedChoice(title.replace(/\s*\/\s*/g, "_")).replace(
      /^(?:(?:psa(?:[/_]dna)?|psadna|jsa|bas|beckett(?:_authentication(?:_services)?)?|uda|upper_deck(?:_authenticated)?|fanatics|steiner|tristar|mlb)(?:_(?:authenticated|certified))?_)+/,
      "",
    );
    const distinctSuffixes = ["jr", "sr", "ii", "iii", "iv"];
    const followingToken = normalizedTitle.startsWith(`${normalizedTarget}_`)
      ? normalizedTitle.slice(normalizedTarget.length + 1).split("_")[0].replace(/\.$/, "") : "";
    if (distinctSuffixes.includes(followingToken)) return "";
    // Promotional wording may precede the signer: "Unmatched and Spectacular
    // Babe Ruth Single Signed Baseball" still names Babe Ruth as the signer.
    // Require the complete target name at token boundaries immediately before
    // signing wording; a famous subject merely mentioned elsewhere is not enough.
    const escapedTarget = normalizedTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const signingPosition = normalizedTitle.match(new RegExp(
      `(?:^|_)${escapedTarget}_(?:single_|hand_)?(?:signed|autographed)(?:_|$)`,
    ));
    if (signingPosition) {
      const preceding = normalizedTitle.slice(0, signingPosition.index ?? 0);
      if (!/(?:^|_)(?:not|no|without)(?:_(?:a|an|the|by))?$/.test(preceding)) return normalizedTarget;
    }
    if (normalizedTitle === normalizedTarget || normalizedTitle.startsWith(`${normalizedTarget}_`)) return normalizedTarget;
  }
  return "";
}

function autographCandidateSigner(listing: VisualSourceCandidate, targetSigner = ""): string {
  const structured = autographCandidateValue(listing, ["signer", "autographSigner"]);
  if (structured) return structured;
  return autographSignerFromTitle(canonicalCandidateTitle(listing), targetSigner);
}

export function autographReplicaReason(listing: VisualSourceCandidate): string | null {
  const details = candidateStructuredDetails(listing);
  const explicitValues = [
    listing.replica,
    listing.isReplica,
    listing.reproduction,
    listing.isReproduction,
    listing.facsimile,
    listing.isFacsimile,
    details.replica,
    details.isReplica,
    details.reproduction,
    details.isReproduction,
    details.facsimile,
    details.isFacsimile,
    details.authenticity,
  ].filter((value) => String(value ?? "").trim()).map((value) => normalizedChoice(value));
  // eBay/Mercari adapters may carry the authoritative title in
  // normalizedListingTitle or another provider alias. Replica wording is an
  // objective exclusion, so use the same canonical title used by scoring.
  const title = canonicalCandidateTitle(listing);
  const explicitReplica = explicitValues.some((value) => /^(?:yes|true|1|replica|reproduction|facsimile|reprint|copy|counterfeit)$/.test(value));
  const titleReason = autographReplicaReasonFromText(title);
  if (!explicitReplica && !titleReason) return null;
  if (titleReason) return titleReason;
  const declared = explicitValues.find((value) => /replica|reproduction|facsimile|reprint|copy|counterfeit/.test(value)) ?? "replica";
  return `Autograph candidate explicitly declares ${declared}; replica or reproduction signed objects are excluded from market-range evidence.`;
}

function autographObjectType(value: unknown): string {
  const text = String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!text || /^(?:other|unknown|n\/a|not applicable)$/.test(text)) return "";
  // Envelope is the signed surface (Paper), even in a "baseball envelope"
  // title. Theme words, dimensions and COA-card mentions do not change it.
  if (/\benvelopes?\b/.test(text)) return "paper";
  if (/\b(?:trading\s+card|sports\s+card|baseball\s+card|card)\b/.test(text)) return "card";
  if (/\b(?:8\s*[x×]\s*10|8x10|photographs?|photos?|pictures?)\b/.test(text)) return "photo";
  if (/\b(?:baseball\s+(?:glove|mitt)|catcher(?:'s)?\s+mitt|first\s+baseman(?:'s)?\s+mitt)\b/.test(text)) return "baseball glove";
  if (/\bboxing\s+glove\b/.test(text)) return "boxing glove";
  if (/\b(?:baseball|softball)\s+bat\b/.test(text)) return "baseball bat";
  if (/\b(?:baseball|softball)\s+(?:jersey|uniform)\b/.test(text)) return "baseball jersey";
  if (/\bfootball\s+(?:jersey|uniform)\b/.test(text)) return "football jersey";
  if (/\bbasketball\s+(?:jersey|uniform)\b/.test(text)) return "basketball jersey";
  if (/\bhockey\s+(?:jersey|sweater)\b/.test(text)) return "hockey jersey";
  if (/\b(?:football|baseball|hockey|basketball)\s+helmet\b/.test(text)) return text.match(/\b(?:football|baseball|hockey|basketball)\s+helmet\b/)![0];
  // Physical nouns outrank sport/theme words: a baseball poster is a poster,
  // not a physical baseball. The actual Mercari run contains such art listings.
  if (/\bposter\b/.test(text)) return "poster";
  if (/\b(?:art\s+print|illustrated\s+print|lithograph)\b/.test(text)) return "print";
  if (/\bprogram\b/.test(text)) return "program";
  if (/\bticket\b/.test(text)) return "ticket";
  // In autograph markets, a cut or cut signature is a signed piece of paper.
  if (/\b(?:signed[\s-]+)?cut(?:[\s-]+(?:signature|autograph))?\b/.test(text) || /\bpaper\b/.test(text)) return "paper";
  if (/\b(?:book|novel|paperback|hardcover)\b/.test(text)) return "book";
  if (/\bdocument\b/.test(text)) return "document";
  // A possessive/theme phrase such as “Baseball’s Greatest Players” does not
  // identify a physical baseball. Card wording was handled above first.
  if (/\bbaseball\b(?!['’]s\b)/.test(text)) return "baseball";
  if (/\bfootball\b/.test(text)) return "football";
  if (/\bbasketball\b/.test(text)) return "basketball";
  if (/\bhockey\s+puck|\bpuck\b/.test(text)) return "hockey puck";
  if (/\bjersey\b/.test(text)) return "jersey";
  if (/\bhelmet\b/.test(text)) return "helmet";
  if (/\bbat\b/.test(text)) return "bat";
  if (/\bglove\b/.test(text)) return "glove";
  return "";
}

function autographCategoryFromTitle(title: string): string {
  const sportsEvidence = /\b(?:sports?|baseball|softball|football|basketball|hockey|jersey|bat|glove|helmet|ball)\b/i.test(title)
    || /\bsports?\s+memorabilia\b/i.test(title);
  // Physical object nouns (Paper, Photo, Cut, Book, etc.) identify the signed
  // object, not the autograph category. A Marlon Brando signed paper must not
  // become Sports merely because Paper is a recognized object type.
  return sportsEvidence ? "sports" : "";
}

function autographTargetObjectType(targetMetadata: string, details: Record<string, unknown>): string {
  const structuredType = metadataValue(targetMetadata, "signedItemType") || String(details.signedItemType ?? "");
  return autographObjectType(structuredType) || autographObjectType(extractTargetTitle(targetMetadata));
}

export function autographIdentityConflictReason(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  const targetTitle = extractTargetTitle(targetMetadata);
  const candidateTitle = canonicalCandidateTitle(listing);
  const versionPattern = /\b(?:japanese|korean|chinese|taiwanese|foreign|international|european|mexican|canadian|australian|country)\s+(?:version|edition|variant|release|issue)\b|\b(?:version|edition|variant)\s+(?:of\s+)?(?:the\s+)?(?:japanese|korean|chinese|taiwanese|foreign|international|european|mexican|canadian|australian|country)\b/i;
  const candidateMatch = candidateTitle.match(versionPattern);
  if (!candidateMatch || versionPattern.test(targetTitle)) return null;
  return `Autograph candidate declares a ${candidateMatch[0]} identity variant that is not present on the target; retained as context-only rather than valuation evidence.`;
}

function autographCandidateAuthentication(listing: VisualSourceCandidate, structuredValue: string): string {
  if (structuredValue) return normalizeAutographAuthenticator(structuredValue) || structuredValue;
  const title = canonicalCandidateTitle(listing);
  if (/\b(?:no|without|missing)\s+(?:a\s+)?COAs?\b/i.test(title)) return "unauthenticated";
  const company = findAutographAuthenticatorInText(title);
  if (company) return company;
  if (/\bCOAs?\b|\bcertificates?\s+of\s+authenticity\b/i.test(title)) return "authenticated";
  return /\b(?:authenticated|authentic(?:ated|ity)?)\b/i.test(title) ? "authenticated" : "";
}

function autographAuthenticationTypeFromTitle(title: string): string {
  // A generic letter is not proof of authentication. Require an explicit LOA,
  // a letter-of-authenticity phrase, or an authenticator's letter description.
  const letterEvidence = String.raw`(?:LOAs?|letters?\s+of\s+(?:authenticity|authentication)|(?:PSA(?:[\s/_-]*DNA)?|JSA|BAS|Beckett)\s+(?:full\s+)?letter)`;
  const absentBefore = new RegExp(String.raw`\b(?:no|without|missing)\s+(?:an?\s+)?${letterEvidence}\b`, "i");
  const absentAfter = new RegExp(String.raw`\b${letterEvidence}\b\s+(?:(?:is|was|are|were)\s+)?(?:missing|absent|unavailable|not\s+(?:included|provided|available|present)|(?:isn['’]t|wasn['’]t|aren['’]t|weren['’]t)\s+(?:included|provided|available|present))\b`, "i");
  if (absentBefore.test(title) || absentAfter.test(title)) return "";
  return new RegExp(String.raw`\b${letterEvidence}\b`, "i").test(title) ? "LOA (Letter)" : "";
}

export const AUTOGRAPH_VALUATION_MIN_SCORE = 70;

function autographCandidateObjectType(listing: VisualSourceCandidate): string {
  // An explicit envelope title outranks broad/stale provider type metadata.
  if (/\benvelopes?\b/i.test(canonicalCandidateTitle(listing))) return "paper";
  const details = candidateStructuredDetails(listing);
  const structuredType = labeledCandidateValue(details, ["signedItemType", "autographItemType", "itemType", "productType", "form"])
    ?? [listing.signedItemType, listing.autographItemType, listing.itemType, listing.productType, listing.form]
      .find((value) => String(value ?? "").trim());
  return autographObjectType(structuredType) || autographObjectType(canonicalCandidateTitle(listing));
}

export function autographValuationEligibility(listing: VisualSourceCandidate, targetMetadata: string): { eligible: boolean; reasons: string[] } {
  const details = extractTargetItemDetails(targetMetadata);
  const targetSigner = autographTargetValue(targetMetadata, details, ["signer"]);
  const candidateSigner = autographCandidateSigner(listing, targetSigner);
  const targetObjectType = autographTargetObjectType(targetMetadata, details);
  const candidateObjectType = autographCandidateObjectType(listing);
  const scoring = autographMarketRelevanceScore(listing, targetMetadata);
  const reasons: string[] = [];
  const signerMatches = Boolean(targetSigner && candidateSigner && targetSigner === candidateSigner);
  if (!signerMatches) reasons.push("signer is missing or does not match the target");
  if (!targetObjectType || !candidateObjectType || targetObjectType !== candidateObjectType) {
    reasons.push("signed object type is missing or does not match the target");
  }
  const identityConflictReason = autographIdentityConflictReason(targetMetadata, listing);
  if (identityConflictReason) reasons.push(identityConflictReason);
  const multiSignatureReason = autographMultiSignatureReason(targetMetadata, listing);
  if (multiSignatureReason) reasons.push(multiSignatureReason);
  const replicaReason = autographReplicaReason(listing);
  if (replicaReason) reasons.push(replicaReason);
  if (scoring.score < AUTOGRAPH_VALUATION_MIN_SCORE) reasons.push(`market relevance score ${scoring.score}/100 is below the Autographs valuation minimum of ${AUTOGRAPH_VALUATION_MIN_SCORE}/100`);
  return { eligible: reasons.length === 0, reasons };
}

export function autographObjectTypeMismatchReason(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const targetType = autographTargetObjectType(targetMetadata, targetDetails);
  if (!targetType) return null;
  const candidateType = autographCandidateObjectType(listing);
  if (!candidateType || candidateType === targetType) return null;
  if (/\benvelopes?\b/i.test(canonicalCandidateTitle(listing))) {
    return `This listing is a signed envelope (Paper), but your item is a signed ${targetType}. A signed envelope cannot be used to value a different signed object.`;
  }
  return `Autograph candidate is a signed ${candidateType}, but the target is a signed ${targetType}; different signed object types are excluded from market-range evidence.`;
}

export function autographAuthenticationConflictReason(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  if (autographTargetAuthenticationState(targetDetails) !== "no") return null;
  const candidateDetails = candidateStructuredDetails(listing);
  const candidateCompany = autographCandidateAuthentication(listing, "");
  const candidateState = autographAuthenticationState(
    candidateDetails.authenticationIncluded
      ?? candidateDetails.authenticated
      ?? candidateDetails.authenticationStatus
      ?? candidateCompany,
  );
  if (candidateState !== "yes") return null;
  const company = candidateCompany && !/^(?:authenticated|yes)$/i.test(candidateCompany)
    ? ` (${candidateCompany})` : "";
  return `Autograph candidate is certified/authenticated${company}, but the target explicitly says Authentication Included = No; hard exclusion.`;
}

export function autographMarketExclusionReason(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  return autographReplicaReason(listing)
    ?? autographAuthenticationConflictReason(targetMetadata, listing)
    ?? autographObjectTypeMismatchReason(targetMetadata, listing)
    ?? multiItemLotReason(listing, targetMetadata);
}

export function autographMarketRelevanceScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const details = extractTargetItemDetails(targetMetadata);
  const targetValue = (aliases: string[]) => autographMarketValue(firstMeaningfulValue(...aliases.map((key) => meaningfulMetadataText(metadataValue(targetMetadata, key)) || meaningfulMetadataText(details[key]))));
  const targetSigner = targetValue(["signer"]);
  const targetItemType = autographTargetObjectType(targetMetadata, details);
  const targetCategory = targetValue(["autographCategory", "signatureCategory"]);
  const targetAuth = targetValue(["authenticationCompany", "customAuthenticationCompany", "certificationCompany"]);
  const targetAuthState = autographTargetAuthenticationState(details);
  const targetInscription = targetValue(["inscription", "inscriptionText", "inscriptionPresent", "personalization"]);
  const candidate = normalizeVisualSourceCandidate(listing);
  const signerRead = scoreCandidateEvidence(listing, ['signer', 'autographSigner']);
  const signerWitness = signerRead ?? { value: autographCandidateSigner(listing, targetSigner), source: 'title' as const, field: 'signer' };
  const candidateSigner = autographMarketValue(signerWitness.value);
  const objectRead = scoreCandidateEvidence(listing, ['signedItemType', 'autographItemType', 'itemType', 'productType', 'form']);
  const structuredObject = autographObjectType(objectRead?.value);
  const candidateItemType = autographCandidateObjectType(listing);
  const envelopeTitle = /\benvelopes?\b/i.test(candidate.title);
  const objectWitness: ScoreEvidence = !envelopeTitle && structuredObject && objectRead ? objectRead : { value: candidate.title, source: 'title', field: 'signedItemType' };
  const categoryRead = scoreCandidateEvidence(listing, ['autographCategory', 'category', 'sport', 'entertainmentType']);
  const categoryWitness: ScoreEvidence = categoryRead ?? { value: candidate.title, source: 'title', field: 'autographCategory' };
  const candidateCategory = categoryRead
    ? autographMarketValue(categoryRead.value)
    : autographCategoryFromTitle(candidate.title);
  const authRead = scoreCandidateEvidence(listing, ['authenticationCompany', 'customAuthenticationCompany', 'certificationCompany', 'authenticator', 'gradingCompany']);
  const candidateAuth = autographCandidateAuthentication(listing, authRead ? autographMarketValue(authRead.value) : '');
  const candidateDetails = candidateStructuredDetails(listing);
  const candidateAuthState = autographAuthenticationState(
    candidateDetails.authenticationIncluded
      ?? candidateDetails.authenticated
      ?? candidateDetails.authenticationStatus
      ?? candidateAuth,
  );
  const authWitness: ScoreEvidence = authRead ?? { value: candidateAuth, source: 'title', field: 'authenticationCompany' };
  const inscriptionRead = scoreCandidateEvidence(listing, ['inscription', 'inscriptionText', 'inscriptionPresent', 'personalization']);
  const candidateInscription = autographMarketValue(inscriptionRead?.value);
  const matched: string[] = [];
  const unknown: string[] = [];
  const awards: RankingAward[] = [];
  let score = 0;
  const compare = (target: string, candidateValue: string, points: number, label: string, field: string, witness: ScoreEvidence) => {
    target = meaningfulMetadataText(target);
    if (!target || !candidateValue) { unknown.push(label); return; }
    const matches = label === "signer"
      ? target === candidateValue
      : target === candidateValue || target.includes(candidateValue) || candidateValue.includes(target);
    if (matches) { score += points; matched.push(label); awards.push(scoreAward(field, points, scoreMatch(true, witness))); }
  };
  compare(targetSigner, candidateSigner, 35, "signer", 'signer', signerWitness);
  compare(targetItemType, candidateItemType || autographMarketValue(candidate.title), 25, "signed item type", 'signedItemType', objectWitness);
  compare(targetCategory, candidateCategory || autographMarketValue(candidate.title), 10, "autograph category", 'autographCategory', categoryWitness);
  if (targetAuthState && candidateAuthState && targetAuthState === candidateAuthState) {
    score += 10;
    matched.push("authenticated");
    awards.push(scoreAward('authenticated', 10, scoreMatch(true, authWitness)));
  } else {
    unknown.push("authenticated");
  }
  const normalizedCandidateCompany = normalizedChoice(candidateAuth);
  if (meaningfulMetadataText(targetAuth) && candidateAuthState === "yes" && targetAuthState === "yes"
    && normalizedCandidateCompany && (autographAuthenticationCompaniesEquivalent(targetAuth, normalizedCandidateCompany)
      || targetAuth === normalizedCandidateCompany || targetAuth.includes(normalizedCandidateCompany) || normalizedCandidateCompany.includes(targetAuth))) {
    score += 10;
    matched.push("authentication company");
    awards.push(scoreAward('authenticationCompany', 10, scoreMatch(true, authWitness)));
  } else if (!targetAuth || !candidateAuth || candidateAuthState !== "yes" || targetAuthState !== "yes") {
    unknown.push("authentication company");
  }
  if (!meaningfulMetadataText(targetInscription) || !candidateInscription) unknown.push("inscription");
  else if (targetInscription === candidateInscription || targetInscription.includes(candidateInscription) || candidateInscription.includes(targetInscription)) { score += 10; matched.push("inscription"); awards.push(scoreAward('inscription', 10, scoreMatch(true, inscriptionRead))); }
  return { score, matched, unknown, awards };
}

function annotateAutographMarketCandidates<T extends VisualSourceCandidate>(listings: T[], targetMetadata: string): T[] {
  return listings
    .map((item, index) => {
      const scoring = autographMarketRelevanceScore(item, targetMetadata);
      return { item: { ...item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T, index };
    })
    .sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.index - b.index)
    .map((entry, rank) => {
      const eligibility = autographValuationEligibility(entry.item, targetMetadata);
      return {
        ...entry.item,
        metadataMatchRank: rank + 1,
        visualRequirement: 'not_required_autograph_market_context',
        evidenceDisposition: eligibility.eligible ? 'valuation_eligible' : 'context_only',
        evidenceReasons: eligibility.eligible ? ['Autographs / Signed Item passed the signer, object-type, and 70-point valuation gate.'] : eligibility.reasons,
      } as T;
    });
}

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

function safeRemoteImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:" ? value.trim() : null;
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

function undispatchedVisualExecution(reasonCode: VisualExecutionReasonCode, hardExclusion = false): VisualExecution {
  return { version: 1, state: "not_dispatched", reasonCode, selectedForReview: false,
    hardExclusion, identity: { result: "not_established", origin: "none" }, attempts: [] };
}

/** Operational terminal state is independent of any retained deciding identity. */
function terminalVisualExecution(receipt: VisualExecution): VisualExecution {
  const attempts = receipt.attempts.map((attempt) => ({ ...attempt }));
  const last = attempts[attempts.length - 1];
  if (!last) return { ...receipt, attempts };
  const state = last.outcome === "usable_review" ? "completed"
    : last.outcome === "timed_out" ? "timed_out" : "dispatched_inconclusive";
  const reasonCode = last.outcome === "usable_review" ? "review_returned"
    : last.outcome === "timed_out" ? "candidate_timeout"
    : last.outcome === "no_decision" ? "no_usable_decision" : "provider_error";
  return { ...receipt, state, reasonCode, attempts };
}

function recordVisualExecutionError(attempt: VisualExecutionAttempt, error: unknown): void {
  // Empty/invalid replies already settled at the existing parser boundary.
  if (attempt.outcome !== "started") return;
  attempt.outcome = error instanceof VisualReviewTimeoutError ? "timed_out" : "error";
  attempt.errorCode = error instanceof VisualReviewTimeoutError ? "candidate_timeout" : "provider_error";
  attempt.failureCode = error instanceof VisualReviewTimeoutError ? "candidate_timeout" : "provider_request_failed";
}

async function invokeVisualReview(
  params: Parameters<typeof invokeLLM>[0],
  timeoutMs: number,
): Promise<Awaited<ReturnType<typeof invokeLLM>>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    try {
      return await invokeLLM({ ...params, signal: controller.signal });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (params.provider !== "openai" || !/\b400\b/.test(message)) throw error;
      const inlineMessages = await inlineRemoteImagesForOpenAi(params.messages, controller.signal);
      if (!inlineMessages) throw error;
      return await invokeLLM({ ...params, messages: inlineMessages, signal: controller.signal });
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new VisualReviewTimeoutError(`Visual review exceeded the ${timeoutMs / 1000}-second per-candidate limit.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const OPENAI_INLINE_IMAGE_MAX_BYTES = 4_000_000;
const OPENAI_INLINE_IMAGE_TIMEOUT_MS = 8_000;
async function inlineRemoteImagesForOpenAi(
  messages: Parameters<typeof invokeLLM>[0]["messages"],
  parentSignal: AbortSignal,
): Promise<Parameters<typeof invokeLLM>[0]["messages"] | null> {
  let replaced = false;
  const inlineUrl = async (value: string): Promise<string> => {
    if (!/^https?:\/\//i.test(value)) return value;
    const controller = new AbortController();
    const abort = () => controller.abort();
    parentSignal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => controller.abort(), OPENAI_INLINE_IMAGE_TIMEOUT_MS);
    try {
      const response = await fetch(value, { signal: controller.signal, redirect: "error" });
      if (!response.ok) return value;
      const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
      if (!/^image\/(?:jpeg|jpg|png|webp|gif)$/i.test(contentType)) return value;
      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (Number.isFinite(declaredLength) && declaredLength > OPENAI_INLINE_IMAGE_MAX_BYTES) return value;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length || bytes.byteLength > OPENAI_INLINE_IMAGE_MAX_BYTES) return value;
      replaced = true;
      return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
    } catch {
      return value;
    } finally {
      clearTimeout(timer);
      parentSignal.removeEventListener("abort", abort);
    }
  };
  const transformed = await Promise.all(messages.map(async (message) => ({
    ...message,
    content: Array.isArray(message.content)
      ? await Promise.all(message.content.map(async (part) => typeof part !== "string" && part.type === "image_url"
        ? { ...part, image_url: { ...part.image_url, url: await inlineUrl(part.image_url.url) } }
        : part))
      : message.content,
  })));
  return replaced ? transformed : null;
}

function visualReviewModel(provider: LlmProvider | undefined, pass: "initial" | "retry", focusedGradeEscalation = false): string {
  if (provider === "openai") return "gpt-6-luna";
  if (pass === "retry" && focusedGradeEscalation) return "gpt-5";
  return "gpt-5-mini";
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

function disneyPinsTargetItemType(targetMetadata: string): "individual_pin" | "pin_set" | "collection_lot" | "" {
  if (!isDisneyPinsMetadata(targetMetadata)) return "";
  const details = extractTargetItemDetails(targetMetadata);
  const value = normalizedChoice(metadataValue(targetMetadata, "itemType") || details.itemType || details.productType || details.form);
  if (/individual_pin|single_pin/.test(value)) return "individual_pin";
  if (/pin_set|set/.test(value) && !/collection|lot/.test(value)) return "pin_set";
  if (/collection|lot/.test(value)) return "collection_lot";
  return "";
}

function disneyPinsCandidateItemType(listing: VisualSourceCandidate): "individual_pin" | "pin_set" | "collection_lot" | "" {
  const details = candidateStructuredDetails(listing);
  const value = normalizedChoice(listing.itemType ?? listing.productType ?? listing.form ?? listing.saleForm ?? details.itemType ?? details.productType ?? details.form);
  const title = canonicalCandidateTitle(listing);
  const structuredQuantity = [listing.lotQuantity, listing.itemCount, listing.numberOfPins, listing.quantity, details.lotQuantity, details.itemCount, details.numberOfPins, details.quantity]
    .map((candidate) => Number(candidate))
    .find((candidate) => Number.isFinite(candidate) && candidate > 1);
  const broadProviderCollectionLotLabel = /^collection(?:\s*[/_-]\s*lot)?$/i.test(value);
  const explicitMultiItemStructuredType = !broadProviderCollectionLotLabel && /(?:lot|bundle|mixed|assortment|group\s+of|multipack|multi\s*pack)/i.test(value);
  const explicitMultiItemTitle = /\b(?:mixed\s+)?(?:lot|bundle|multipack|multi[-\s]?pack|assortment|group\s+of|set\s+of\s+\d+|(?:[2-9]|[1-9]\d|[1-9]\d{2})\s+pins?)\b/i.test(title)
    || /\bcollection\s+(?:of\s+)?\d+\s+pins?\b/i.test(title)
    || /\bcollection\s+lot\b/i.test(title);
  // eBay sometimes supplies the broad Collection/Lot product label for a
  // single named pin. Treat that label, and the word “collection” in a title,
  // as ambiguous unless quantity or stronger multi-item wording confirms it.
  if (structuredQuantity || explicitMultiItemStructuredType || explicitMultiItemTitle) return "collection_lot";
  if (/pin_set|set/.test(value) || /(?:pin|pins)\s+(?:set|collection)|set\s+of\s+(?:pins?|\d+)/i.test(title)) return "pin_set";
  if (/individual_pin|single_pin/.test(value) || /(?:single|individual|one)\s+pin\b/i.test(title)) return "individual_pin";
  return "";
}

function disneyPinsComparableValue(value: unknown): string {
  return candidateText(value).toLowerCase().replace(/[’']/g, "").replace(/[_-]+/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
}

function disneyPinsValuesConflict(targetValue: unknown, candidateValue: unknown): boolean {
  const target = disneyPinsComparableValue(targetValue);
  const candidate = disneyPinsComparableValue(candidateValue);
  if (!target || !candidate || /^(?:unknown|n ?a|not specified|not provided|none|null|undefined)$/.test(target) || target === candidate) return false;
  return !target.includes(candidate) && !candidate.includes(target);
}

function disneyPinsPinNameValuesConflict(targetValue: unknown, candidateValue: unknown, targetCharacter?: unknown): boolean {
  const genericWords = new Set(["disney", "trading", "pin", "pins"]);
  const meaningfulWords = (value: unknown) => disneyPinsComparableValue(value)
    .split(" ")
    .filter((word) => word && !genericWords.has(word));
  const targetWords = meaningfulWords(targetValue);
  const candidateWords = meaningfulWords(candidateValue);
  if (!targetWords.length || !candidateWords.length || targetWords.every((word) => /^(?:unknown|n ?a|not specified|not provided|none|null|undefined)$/.test(word))) return false;
  // Marketplace titles often use a catalog, event, pose, or film-franchise
  // description instead of repeating the inventory pin's full display name.
  // For a single-pin target, a clear match on the declared character is
  // enough to defer the remaining name/pose distinction to image review.
  const characterWords = meaningfulWords(targetCharacter);
  if (characterWords.length && characterWords.every((word) => candidateWords.includes(word))) return false;
  return !targetWords.every((word) => candidateWords.includes(word));
}

function disneyPinsExplicitValue(listing: VisualSourceCandidate, aliases: string[], titlePatterns: RegExp[] = []): string {
  const details = candidateStructuredDetails(listing);
  const structured = aliases.filter((key) => key !== "title").map((key) => listing[key] ?? details[key]).find((value) => String(value ?? "").trim());
  if (structured != null) return String(structured).trim();
  if (aliases.includes("title")) {
    const title = String(listing.title ?? "").trim();
    if (title && !/^(?:disney\s+)?pins?$/i.test(title)) return title;
  }
  for (const pattern of titlePatterns) {
    const match = String(listing.title ?? "").match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function disneyPinsBooleanState(value: unknown): "yes" | "no" | null {
  const normalized = normalizedChoice(value);
  if (!normalized || /unknown|n_a|not_specified/.test(normalized)) return null;
  if (/^(?:yes|true|1|limited|open|artist_proof|pre_production)$/.test(normalized)) return "yes";
  if (/^(?:no|false|0|none|standard|regular)$/.test(normalized)) return "no";
  return null;
}

function disneyPinsBooleanConflict(targetValue: unknown, candidateValue: unknown, label: string): string | null {
  const target = disneyPinsBooleanState(targetValue);
  const candidateChoice = normalizedChoice(candidateValue);
  const candidate = label.includes("limited") && candidateChoice === "open"
    ? "no"
    : label.includes("open") && candidateChoice === "limited"
      ? "no"
      : disneyPinsBooleanState(candidateValue);
  if (!target || !candidate || target === candidate) return null;
  return `Disney Pins ${label} differs: target is explicitly ${target}, but the candidate explicitly declares ${candidate}.`;
}

function disneyPinsCharacterTitleConflict(targetValue: unknown, listing: VisualSourceCandidate): string | null {
  const target = disneyPinsMeaningfulTokens(targetValue);
  const declared = disneyPinsCharactersFromTitle(canonicalCandidateTitle(listing));
  if (!target.length || !declared) return null;
  const candidate = disneyPinsMeaningfulTokens(declared);
  if (!target.some((token) => candidate.includes(token))) return null;
  if (target.length === candidate.length && target.every((token) => candidate.includes(token))) return null;
  return `Disney Pins character differs: target explicitly declares ${String(targetValue)}, but the candidate title explicitly declares ${declared}.`;
}

function disneyPinsIdentityConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  const targetType = disneyPinsTargetItemType(targetMetadata);
  if (!targetType || targetType === "collection_lot") return null;
  const candidateType = disneyPinsCandidateItemType(listing);
  if (candidateType === "collection_lot") return "Disney Pins filter: candidate is a collection, lot, bundle, or mixed group, but the target is a single comparable item.";
  if (candidateType && candidateType !== targetType) {
    return `Disney Pins item type differs: target is ${targetType === "individual_pin" ? "an individual pin" : "a pin set"}, but the candidate is explicitly ${candidateType === "individual_pin" ? "an individual pin" : "a pin set"}.`;
  }
  const target = extractTargetItemDetails(targetMetadata);
  const checks: Array<[string, unknown, string[], RegExp[]]> = targetType === "individual_pin"
    ? [
        ["pin name", target.pinName ?? extractTargetTitle(targetMetadata), ["pinName", "name", "title"], []],
        ["character", target.character, ["character", "characterName"], []],
        ["series", target.series, ["series", "seriesName"], []],
        ["year", target.year, ["year", "releaseYear"], [/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/i]],
        ["event", target.pinTradingEvent, ["pinTradingEvent", "event", "eventName"], []],
        ["backstamp", target.backstampInformation, ["backstampInformation", "backstamp", "backstampLogo"], []],
      ]
    : [
        ["set name", target.setName ?? extractTargetTitle(targetMetadata), ["setName", "series", "seriesName", "title"], []],
        ["series", target.series, ["series", "seriesName"], []],
        ["characters included", target.charactersIncluded, ["charactersIncluded", "characters", "characterList"], []],
  ];
  if (targetType === "individual_pin") {
    const characterConflict = disneyPinsCharacterTitleConflict(target.character, listing);
    if (characterConflict) return characterConflict;
  }
  for (const [label, targetValue, aliases, titlePatterns] of checks) {
    const candidateValue = disneyPinsExplicitValue(listing, aliases, titlePatterns);
    const conflicts = label === "pin name"
      ? disneyPinsPinNameValuesConflict(targetValue, candidateValue, target.character)
      : disneyPinsValuesConflict(targetValue, candidateValue);
    if (conflicts) return `Disney Pins ${label} differs: target explicitly declares ${String(targetValue)}, but the candidate explicitly declares ${candidateValue}.`;
  }
  if (targetType === "individual_pin") {
    for (const [label, targetValue, aliases] of [
      ["limited-edition status", target.limitedEdition, ["limitedEdition", "limited", "limitedEditionStatus"]],
      ["open-edition status", target.openEdition, ["openEdition", "openEditionStatus"]],
      ["artist-proof status", target.artistProof, ["artistProof", "artistProofStatus"]],
      ["pre-production status", target.preProduction, ["preProduction", "preProductionStatus"]],
      ["backer-card status", target.backerCardIncluded, ["backerCardIncluded", "backerCard", "backerCardStatus"]],
    ] as Array<[string, unknown, string[]]>) {
      const titlePatterns = label.includes("limited") || label.includes("open")
        ? [/\b(limited|open)\s+edition\b/i]
        : label.includes("artist")
          ? [/\b(artist[’']?s?\s+proof|ap|pp)\b/i]
          : label.includes("pre-production")
            ? [/\b(pre[-\s]?production|prototype)\b/i]
            : [];
      const conflict = disneyPinsBooleanConflict(targetValue, disneyPinsExplicitValue(listing, aliases, titlePatterns), label);
      if (conflict) return conflict;
    }
  } else {
    const targetComplete = disneyPinsBooleanState(target.completeSet);
    const candidateTitle = String(listing.title ?? "");
    const candidateComplete = disneyPinsBooleanState(disneyPinsExplicitValue(listing, ["completeSet", "complete", "completeness"], [
      /\b(complete|full)\s+(?:pin\s+)?set\b/i,
      /\b(partial|incomplete)\s+(?:pin\s+)?set\b/i,
    ]));
    if (targetComplete && candidateComplete && targetComplete !== candidateComplete) return `Disney Pins complete-set status differs: target is explicitly ${targetComplete}, but the candidate explicitly declares ${candidateComplete}.`;
    const limitedConflict = disneyPinsBooleanConflict(target.limitedEdition, disneyPinsExplicitValue(listing, ["limitedEdition", "limited", "limitedEditionStatus"], [/\b(limited|open)\s+edition\b/i]), "limited-edition status");
    if (limitedConflict) return limitedConflict;
    const targetCount = Number(target.numberOfPins);
    const candidateCount = Number(disneyPinsExplicitValue(listing, ["numberOfPins", "pinCount", "quantity"], [/\b(?:set\s+of|contains?|includes?)\s*(\d+)\s+pins?\b/i]));
    if (Number.isFinite(targetCount) && targetCount > 0 && Number.isFinite(candidateCount) && candidateCount > 0 && targetCount !== candidateCount) return `Disney Pins set size differs: target declares ${targetCount} pins, but the candidate explicitly declares ${candidateCount}.`;
    if (targetComplete === "no" && /\b(?:complete|full)\s+(?:pin\s+)?set\b/i.test(candidateTitle)) return "Disney Pins set completeness differs: target is incomplete, but the candidate explicitly declares a complete set.";
  }
  return null;
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

function coinVisualEvidenceConflicts(review: VisualSourceReview, evidence: VisualEvidence): boolean {
  return [evidence.identityMatches, evidence.dateMatches, evidence.varietyMatches,
    evidence.denominationMatches, evidence.artworkMatches].some((value) => value === false)
    || (evidence.gradeMatches === false && evidence.numericGradeVisible === true)
    || /\b(?:date|year|variety|denomination|coin identity)\b[^.]{0,80}\b(?:differs?|different|mismatch|does not match)\b|\bdifferent\s+(?:coin|date|year|variety|denomination)\b/i.test(review.rationale)
    || (review.visualDifferences ?? []).some((difference) =>
      /identity|date|year|variety|denomination|mint|grade/i.test(difference.field)
      && /material|hard|conflict|mismatch/i.test(difference.impact)
      && normalizedChoice(difference.targetObservation) !== normalizedChoice(difference.candidateObservation));
}

export function coinVisualEvidenceIsExact(review: VisualSourceReview, targetMetadata: string, candidateTitle = "", evidenceOverride?: VisualEvidence): boolean {
  if (!isCoinMetadata(targetMetadata) || review.verdict !== "match") return false;
  const evidence = evidenceOverride ?? decidingVisualEvidence(review);
  if (!evidence || coinVisualEvidenceConflicts(review, evidence)) return false;
  const rationale = decidingVisualRationale(review);
  if (hasExplicitNumericGradeConflict(rationale, metadataValue(targetMetadata, "grade"))
    || hasExplicitGraderConflict(rationale, targetMetadata)) return false;
  const titleIdentity = titleConfirmsCoinIdentity(candidateTitle, targetMetadata);
  // Require actual coin imagery, not merely an evidence object plus a title.
  if (evidence.identityMatches !== true || evidence.denominationMatches !== true) return false;
  if (!(evidence.dateMatches === true || (evidence.dateMatches === undefined && titleIdentity))
    || !(evidence.varietyMatches === true || (evidence.varietyMatches === undefined && titleIdentity))) return false;
  if (coinTargetRequiresMintMark(targetMetadata) && evidence.mintMarkMatches !== true) return false;
  const targetIsGraded = !hasExplicitlyUngradedTarget(targetMetadata)
    && Boolean(metadataValue(targetMetadata, "grade") || metadataValue(targetMetadata, "certificationCompany"));
  if (targetIsGraded) {
    // Missing holder pixels may be supplemented by exact title evidence. Visible
    // raw state, a readable contrary grade, or contrary identity may not.
    if (evidence.rawOrLooseVisible === true || hasExplicitCoinRawConflict(candidateTitle, review.rationale)) return false;
    return evidence.gradeMatches === true
      || (evidence.numericGradeVisible !== true && titleConfirmsCoinGrade(candidateTitle, targetMetadata));
  }
  return evidence.rawOrLooseVisible === true;
}

export function enforceCoinExactEvidence(review: VisualSourceReview, targetMetadata: string, candidateTitle = ""): VisualSourceReview {
  if (!isCoinMetadata(targetMetadata)) return review;
  const titleIdentity = titleConfirmsCoinIdentity(candidateTitle, targetMetadata);
  const titleGrade = titleConfirmsCoinGrade(candidateTitle, targetMetadata);
  const candidateMatch = { ...review, verdict: "match" as const };
  if ((review.verdict === "unreadable" || review.verdict === "rough_match")
    && titleIdentity && titleGrade && coinVisualEvidenceIsExact(candidateMatch, targetMetadata, candidateTitle)) {
    return withVisualNormalization(review, {
      verdict: "match",
      confidence: "high",
      rationale: `${review.rationale} Visible coin identity and denomination agree; exact title evidence supplements only unknown cropped holder/date/variety facts, without overriding observed disagreement. The independent coin review remains required.`,
    }, "coin_unknown_crop_supplement");
  }
  if (review.verdict !== "match" || coinVisualEvidenceIsExact(review, targetMetadata, candidateTitle)) return review;
  return withVisualNormalization(review, {
    verdict: "unreadable",
    confidence: "low",
    rationale: `${review.rationale} Coin admission requires matching visible identity and denomination with no contrary date, variety, grade, or raw/graded observation; the required evidence was incomplete or contradictory, so this remains manual review.`,
  }, "coin_confirmation_incomplete_or_conflicting");
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
    ? " DISNEY PINS POLICY: Disney Pins are not graded collectibles in this workflow. Ignore grader, certification-company, slab, label, numeric-grade, and raw-versus-graded signals completely, including stale structured fields or title wording. Do not mark a Disney Pin mismatch or unreadable because a grading field is absent or inconsistent. The primary job is exact image comparison: decide whether the pictured target and candidate are the same specific pin, not merely the same character, franchise, series, or backing-card family. Primary pin identity is authoritative: character, exact artwork, pose, silhouette, pin shape, colors, visible design details, and pin count/form must correspond. A different character, artwork, pose, silhouette, shape, or pin layout is a high-confidence mismatch even when the series is the same. Backing card, backing logo, event/set branding, and packaging are secondary evidence: a different generic backing card or packaging variation alone is a soft difference and must not be treated as a hard mismatch when the primary pin artwork matches. Only treat secondary backing/set evidence as a hard identity conflict when the target metadata explicitly identifies a backing-card-specific, event-specific, set-specific, or edition-specific release; in that case, require the corresponding visible secondary evidence. Return visualEvidence booleans based on visible pixels, including characterMatches, artworkMatches, silhouetteMatches, backingCardMatches, and setDesignMatches; the last two remain diagnostic for generic targets and are mandatory only when the target explicitly identifies that secondary release detail. If primary identity is obscured or cannot be independently confirmed, return unreadable/manual review rather than guessing. The independent high-resolution adjudication is authoritative; if it does not complete, the initial result is provisional audit evidence only and cannot enter valuation."
    : "";
}

function disneyPinsSecondaryIdentityRequired(targetMetadata: string): boolean {
  const details = extractTargetItemDetails(targetMetadata);
  const explicitSecondaryValues = [
    details.backingCard,
    details.backingCardDesign,
    details.backingLogo,
    details.event,
    details.eventName,
    details.eventSet,
    details.setDesign,
    details.edition,
    details.editionName,
    details.release,
    details.releaseType,
    details.variant,
  ];
  return details.limitedEdition === true || explicitSecondaryValues.some((value) => {
    const normalized = normalizedChoice(value);
    return Boolean(normalized) && !/^(?:unknown|n\/?a|none|no|false|not applicable|standard|regular|open edition)$/.test(normalized);
  });
}

export function disneyPinsEvidenceIsExact(evidence?: VisualEvidence, targetMetadata = ""): boolean {
  const primaryIdentityMatches = Boolean(
    evidence?.characterMatches === true &&
    evidence?.artworkMatches === true &&
    evidence?.silhouetteMatches === true &&
    evidence?.identityMatches !== false,
  );
  if (!primaryIdentityMatches) return false;
  if (!targetMetadata || !isDisneyPinsMetadata(targetMetadata)) return true;
  if (!disneyPinsSecondaryIdentityRequired(targetMetadata)) return true;
  return Boolean(
    evidence?.backingCardMatches === true &&
    evidence?.setDesignMatches === true,
  );
}

export function enforceDisneyPinsExactEvidence(review: VisualSourceReview, targetMetadata: string): VisualSourceReview {
  // Compatibility helper retained for existing callers. Structured evidence
  // remains diagnostic provenance; it must not downgrade a completed visual
  // match or create a second admission gate after adjudication.
  void targetMetadata;
  return review;
}

/**
 * Legacy diagnostic classifier for whether a Disney Pin also received the
 * optional high-resolution retry. It is retained for audit compatibility;
 * explicit visual matches no longer require this retry for admission.
 */
export function isCompletedDisneyPinsAdjudication(
  verdict: unknown,
  visualAudit: VisualSourceReview["visualAudit"] | null | undefined,
): boolean {
  return Boolean(
    verdict === "match"
    && visualAudit?.retryStatus === "performed"
    && visualAudit.finalPass === "high_resolution_retry"
    && visualAudit.adjudicationStatus === "confirmed",
  );
}

/** Backward-compatible audit helper; not used as the valuation admission gate. */
export function hasCompletedDisneyPinsAdjudication(review: VisualSourceReview | undefined): boolean {
  return Boolean(review && isCompletedDisneyPinsAdjudication(review.verdict, review.visualAudit));
}

/**
 * This remains an audit classifier only. An unavailable independent review is
 * never an admission path and must remain context-only.
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
      visualDifferences: Array.isArray(row?.visualDifferences)
        ? row.visualDifferences
          .map((difference: any) => ({
            field: typeof difference?.field === "string" ? difference.field.trim() : "",
            targetObservation: typeof difference?.targetObservation === "string" ? difference.targetObservation.trim() : "",
            candidateObservation: typeof difference?.candidateObservation === "string" ? difference.candidateObservation.trim() : "",
            impact: typeof difference?.impact === "string" ? difference.impact.trim() : "",
          }))
          .filter((difference: VisualDifference) => difference.field && difference.targetObservation && difference.candidateObservation && difference.impact)
          .slice(0, 20)
        : undefined,
      visualEvidence: normalizeVisualEvidence(row?.visualEvidence),
      visualAudit: row?.visualAudit && typeof row.visualAudit === "object" && RETRY_STATUSES.has(row.visualAudit.retryStatus) && FINAL_PASSES.has(row.visualAudit.finalPass)
        ? {
            imageCount: Number.isInteger(row.visualAudit.imageCount) && row.visualAudit.imageCount >= 0 ? row.visualAudit.imageCount : 0,
            provider: row.visualAudit.provider === "openai" || row.visualAudit.provider === "manus_forge" ? row.visualAudit.provider : undefined,
            initialModel: typeof row.visualAudit.initialModel === "string" ? row.visualAudit.initialModel.trim() : undefined,
            finalModel: typeof row.visualAudit.finalModel === "string" ? row.visualAudit.finalModel.trim() : undefined,
            initialVerdict: VERDICTS.has(row.visualAudit.initialVerdict) ? row.visualAudit.initialVerdict : "no_decision",
            initialConfidence: CONFIDENCES.has(row.visualAudit.initialConfidence) ? row.visualAudit.initialConfidence : "no_decision",
            retryStatus: row.visualAudit.retryStatus,
            adjudicationStatus: ADJUDICATION_STATUSES.has(row.visualAudit.adjudicationStatus) ? row.visualAudit.adjudicationStatus : undefined,
            retryReason: typeof row.visualAudit.retryReason === "string" ? row.visualAudit.retryReason.trim() : undefined,
            finalPass: row.visualAudit.finalPass,
            initialEvidence: normalizeVisualEvidence(row.visualAudit.initialEvidence),
            finalEvidence: normalizeVisualEvidence(row.visualAudit.finalEvidence),
            initialRationale: typeof row.visualAudit.initialRationale === "string" ? row.visualAudit.initialRationale : undefined,
            decidingRationale: typeof row.visualAudit.decidingRationale === "string" ? row.visualAudit.decidingRationale : undefined,
            retryVerdict: VERDICTS.has(row.visualAudit.retryVerdict) ? row.visualAudit.retryVerdict : undefined,
            retryConfidence: CONFIDENCES.has(row.visualAudit.retryConfidence) ? row.visualAudit.retryConfidence : undefined,
            retryRationale: typeof row.visualAudit.retryRationale === "string" ? row.visualAudit.retryRationale : undefined,
            normalizations: Array.isArray(row.visualAudit.normalizations)
              ? row.visualAudit.normalizations.filter((entry: any) => typeof entry?.rule === "string"
                && typeof entry?.rationaleBefore === "string" && VERDICTS.has(entry?.verdictBefore)
                && CONFIDENCES.has(entry?.confidenceBefore) && VERDICTS.has(entry?.verdictAfter))
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
  const payloadRecord = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null;
  const wrappedRows = Array.isArray(payloadRecord?.reviews)
    ? payloadRecord.reviews
    : null;
  // The json_object fallback is allowed to return the one review directly
  // instead of wrapping it in { reviews: [...] }. Accept only a recognizable
  // review object; all other shapes remain rejected and fail closed.
  const singleReview = wrappedRows
    ? null
    : payloadRecord
      && typeof payloadRecord.verdict === "string"
      && typeof payloadRecord.confidence === "string"
      && typeof payloadRecord.rationale === "string"
      ? payloadRecord
      : null;
  const rawRows = wrappedRows ?? (singleReview ? [singleReview] : []);
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
      ...normalizeVisualEvidence(evidence),
      identityMatches: true,
      dateMatches: true,
      varietyMatches: true,
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
    if ((review.verdict === "match" || review.verdict === "rough_match")
      && !(decidingVisualEvidence(review)?.identityMatches === true && decidingVisualEvidence(review)?.artworkMatches === true)
      && !/\b(?:exact(?:ly)?|same issue|issue number matches|cover art corresponds|identical cover)\b/i.test(rationale)) {
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
  if (value && typeof value === "object" && !Array.isArray(value)) return parseTestAiDetails(value);
  if (typeof value !== "string" || !value.trim() || /^unknown$/i.test(value.trim())) return {};
  try {
    return parseTestAiDetails(value);
  } catch {
    // Several legacy source contracts allow free-text details. Preserve that
    // text for the visual prompt rather than silently deleting it; deterministic
    // guards still require an explicit structured conflict.
    return { rawDetails: value.trim() };
  }
}

function firstMeaningfulValue(...values: unknown[]): unknown {
  return values.find((value) => meaningfulMetadataText(value) !== "");
}

function resolvedVisualFieldValue(value: unknown, details: Record<string, unknown>, key: string): unknown {
  const resolved = readMetadataValue({ ...details, [key]: value ?? details[key] }, [key]);
  return resolved || readMetadataValue(details, [key]) || undefined;
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
  let details = {
    ...visualMetadataDetails(
    input.fullItemDetails ?? input.itemDetails ?? input.details ?? input.catalog,
    ),
  };
  details = { ...details, ...extractCandidateStructuredMetadata({ fullItemDetails: details }) };
  if (normalizedVisualCategory(input.category) === "video_games") {
    details = normalizeVideoGameMetadata(details);
  }
  const topLevelCondition = resolvedVisualFieldValue(input.condition, details, "condition");
  if (topLevelCondition !== undefined && firstMeaningfulValue(details.condition, details.mediaCondition) === undefined) {
    details.condition = topLevelCondition;
  }
  const itemType = metadataText(firstMeaningfulValue(resolvedVisualFieldValue(input.itemType, details, "itemType"), details.itemType, details.productType, details.form));
  const grade = metadataText(firstMeaningfulValue(resolvedVisualFieldValue(input.grade, details, "grade"), details.grade));
  const certificationCompany = metadataText(
    firstMeaningfulValue(
      resolvedVisualFieldValue(input.certificationCompany, details, "certificationCompany"),
      resolvedVisualFieldValue(input.grader, details, "grader"),
      details.certificationCompany,
      details.gradingCompany,
      details.grader,
    ),
  );
  const isGraded = metadataText(firstMeaningfulValue(resolvedVisualFieldValue(input.isGraded, details, "isGraded"), details.isGraded, details.graded));
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
  const gradeMentioned = /\b(?:grade|graded|score|rating)\b/i.test(candidateText) || Boolean(grader && new RegExp(`\\b${grader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(candidateText));
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

function hasVideoGameVisualIdentityConflict(rationale: string, targetMetadata?: string): boolean {
  if (targetMetadata) rationale = normalizeVideoGameReviewRationale(rationale, targetMetadata);
  return /\b(?:different game|different title|different artwork|different cover|different edition|different variant|different platform|platform[^.]{0,60}(?:differs|different|difference|mismatch|conflict)|does not match the (?:game|cover|artwork)|target[- ]form conflict|(?:appears?|is|looks?|visibly)\s+(?:raw|ungraded|loose))\b/i.test(rationale)
    || /\bsealed\b[^.]{0,70}\b(?:versus|vs\.?|rather than|while|whereas)\b[^.]{0,70}\b(?:cib|complete[- ]in[- ]box|loose|raw)\b|\b(?:cib|complete[- ]in[- ]box|loose|raw)\b[^.]{0,70}\b(?:versus|vs\.?|rather than|while|whereas)\b[^.]{0,70}\bsealed\b/i.test(rationale);
}
function normalizeVideoGameReviewRationale(rationale: string, targetMetadata: string): string {
  const targetDetails = metadataDetails(targetMetadata);
  const targetIsSealed = /^(?:yes|true|1)$/i.test(String(targetDetails.sealed ?? targetDetails.factorySealed ?? "").trim());
  return targetIsSealed
    ? rationale.replace(/target[^.]{0,120}(?:structured|details)[^.]{0,120}(?:complete[- ]in[- ]box|cib)[^.]{0,120}\bsealed\b[^.]*\.?/gi,
      (clause) => /\bcandidate\b/i.test(clause) ? clause : "")
    : rationale;
}
function hasVideoGameSoftLabelOnlyConflict(rationale: string, targetMetadata?: string): boolean {
  if (hasVideoGameVisualIdentityConflict(rationale, targetMetadata)) return false;
  const text = String(rationale ?? "");
  const labelConflict = /\b(?:grading|grade)\s+label(?:\s+(?:designation|suffix))?\b[^\n]{0,220}\b(?:differs?|different|difference|differences|mismatch|conflict)\b|\blabel\s+designation\b[^\n]{0,220}\b(?:differs?|different|difference|differences|mismatch|conflict)\b/i.test(text);
  if (!labelConflict || !/\bsealed\s+A\+{1,3}(?!\+)/i.test(text)) return false;
  return !/\b(?:numeric\s+grade|grader|certification\s+company|game|title|artwork|cover|edition)\b[^.]{0,100}\b(?:differs?|different|mismatch|conflict)\b/i.test(text);
}
function hasVideoGameIdenticalLabelEvidence(rationale: string): boolean {
  const text = String(rationale ?? "");
  const match = text.match(/target[^\n]{0,140}?label\s+reads?\s*["“']([^"”'\n]+)["”']\s+(?:vs\.?|versus)\s+candidate[^\n]{0,140}?label\s+reads?\s*["“']([^"”'\n]+)["”']/i);
  if (!match) return false;
  const normalize = (value: string) => value
    .replace(/^the\s+candidate\s+label\s+reads?\s+/i, "")
    .replace(/["“”'’.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return normalize(match[1]) === normalize(match[2]);
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
  const field = new RegExp(`\\b${escaped}\\b`, 'i');
  const clauses = rationale.split(/[;\n]|\.(?!\d)/);
  const candidateNegative = clauses.some((clause) => field.test(clause) && /\bcandidate\b/i.test(clause)
    && /\b(?:not|no|cannot|can't|unable|missing|absent|without|unreadable|unverified|unknown|lacks?)\b/i.test(clause));
  const observedAbsence = new RegExp(`\\b(?:no|without|lacks?|not)\\s+(?:an?\\s+)?${escaped}\\b|\\b${escaped}\\b[^;]{0,40}\\b(?:absent|missing)\\b`, 'i');
  if (clauses.some((clause) => /\bcandidate\b/i.test(clause) && observedAbsence.test(clause)
    && !/\b(?:not visible|not readable|unreadable|unclear|unknown|cannot|can't|unable)\b/i.test(clause))) return false;
  if (field.test(title)) return true;
  if (candidateNegative) return false;
  return clauses.some((clause) => field.test(clause)
    && /\b(?:candidate|both|label)\b/i.test(clause)
    && /\b(?:visible|readable|matches|match|confirmed|same|reads)\b/i.test(clause)
    && !/\b(?:target|requires?|declares?|not|no|cannot|can't|unable|missing|absent|without|unreadable|unverified|unknown)\b/i.test(clause));
}

function hasExplicitNumericGradeConflict(rationale: string, targetGrade: string): boolean {
  const affirmative = rationale.replace(/\b(?:numeric\s+grade|grade|score)\b[^.;\n]{0,25}\b(?:does not|doesn't|do not|don't)\s+differ\b/gi, "");
  if (/\b(?:numeric\s+grade|grade|score)\b[^.;\n]{0,70}\b(?:differs?|different|mismatch|does not match)\b/i.test(affirmative)) return true;
  const candidateGrade = rationale.match(/\bcandidate\b[^.\n]{0,80}\b(?:numeric\s+grade|grade|score)\b[^0-9]{0,24}(\d{1,3}(?:\.\d+)?)/i)?.[1];
  const numericTarget = normalizedGrade(targetGrade);
  return Boolean(candidateGrade && numericTarget && Number(candidateGrade) !== Number(numericTarget));
}

function hasExplicitGraderConflict(rationale: string, targetMetadata: string): boolean {
  const targetGrader = metadataValue(targetMetadata, "certificationCompany");
  if (!targetGrader || /^(unknown|other|none|n\/?a)$/i.test(targetGrader)) return false;
  const candidateGrader = rationale.match(/\bcandidate\b[^.\n]{0,100}\b(PSA|AFA|CGC|CBCS|BGS|SGC|PCGS|NGC|WATA|VGA)\b/i)?.[1];
  return Boolean(candidateGrader && !videoGameGradersEquivalent(metadataValue(targetMetadata, "category"), targetGrader, candidateGrader));
}

function hasHardVisualIdentityConflict(review: VisualSourceReview, targetMetadata: string): boolean {
  const evidence = decidingVisualEvidence(review);
  if (evidence?.identityMatches === false || evidence?.artworkMatches === false) return true;
  const isVideoGame = normalizedChoice(metadataValue(targetMetadata, "category")) === "video_games";
  return (review.visualDifferences ?? []).some((difference) => {
    if (!/material|hard|mandatory|conflict|mismatch/i.test(difference.impact)) return false;
    const field = normalizedChoice(difference.field);
    if (/serial|barcode|qr_code|tracking|(?:certification|certificate|cert)[_-](?:id|number)|holder[_-]id/.test(field)) return false;
    if (!/identity|artwork|cover|game|platform|grade|grading|label|grader|certification|holder|slab|form|edition|variant|qualifier/.test(field)) return false;
    const target = difference.targetObservation.trim();
    const candidate = difference.candidateObservation.trim();
    if (normalizedChoice(target) === normalizedChoice(candidate)) return false;
    if (/^(?:numeric_grade|grade)$/.test(field) && /^\d+(?:\.\d+)?$/.test(target)
      && /^\d+(?:\.\d+)?$/.test(candidate) && Number(target) === Number(candidate)) return false;
    if (isVideoGame && /grader|certification/.test(field)
      && videoGameGradersEquivalent("video_games", target, candidate)) return false;
    if (isVideoGame && /label|designation|suffix/.test(field)) {
      const withoutSuffix = (value: string) => normalizedChoice(value.replace(/\b(?:sealed\s+)?A\+{1,3}(?!\+)/gi, ""));
      if (/\bsealed\s+A\+{1,3}(?!\+)/i.test(`${target} ${candidate}`)
        && withoutSuffix(target) === withoutSuffix(candidate)) return false;
    }
    return true;
  });
}

/** Reconcile required grading facts before issuing identity approval. */
export function conservativeGradedVisualReviews(
  reviews: VisualSourceReview[],
  listings: VisualSourceCandidate[],
  targetMetadata: string,
): VisualSourceReview[] {
  if (isDisneyPinsMetadata(targetMetadata) || hasExplicitlyUngradedTarget(targetMetadata)) return reviews;
  // Coins retain their independent, crop-aware confirmation contract.
  if (isCoinMetadata(targetMetadata)) return conservativeCoinVisualReviews(reviews, listings, targetMetadata);
  const targetGrade = metadataValue(targetMetadata, "grade");
  const targetGrader = metadataValue(targetMetadata, "certificationCompany");
  const targetLabelFields = explicitTargetLabelFields(targetMetadata);
  const targetIsGraded = Boolean(targetGrade && !/^(unknown|none|n\/?a)$/i.test(targetGrade))
    || Boolean(targetGrader && !/^(unknown|other|none|n\/?a)$/i.test(targetGrader));
  if (!targetIsGraded) return reviews;
  return reviews.map((review) => {
    const title = String(listings[review.candidateIndex]?.title ?? "");
    const evidence = decidingVisualEvidence(review);
    const visualGradeEvidence = gradedVisualEvidenceIsConfirmed(evidence);
    const isVideoGameTarget = normalizedChoice(metadataValue(targetMetadata, "category")) === "video_games";
    const rawRationale = decidingVisualRationale(review);
    const rationale = isVideoGameTarget ? normalizeVideoGameReviewRationale(rawRationale, targetMetadata) : rawRationale;
    const unresolvedLabelField = targetLabelFields.find((field) =>
      !(isVideoGameTarget && field.label === "grade qualifier / label designation")
      && !labelFieldEvidence(title, rationale, field.value));
    const hardIdentityConflict = hasHardVisualIdentityConflict(review, targetMetadata);
    const textIdentityConflict = isVideoGameTarget ? hasVideoGameVisualIdentityConflict(rawRationale, targetMetadata)
      : /\b(?:different (?:item|artwork|cover|edition|variant)|(?:artwork|identity|cover|numeric grade|grader)[^.]{0,60}(?:differs|mismatch))\b/i.test(rationale);
    const numericGradeConflict = hasExplicitNumericGradeConflict(rawRationale, targetGrade) || hasExplicitGraderConflict(rawRationale, targetMetadata);
    const safeEvidence = visualGradeEvidence && !hardIdentityConflict && !textIdentityConflict && !numericGradeConflict && !unresolvedLabelField;
    // A completed positive visual decision does not require particular prose.
    // Explicit contrary evidence still prevents a contradictory approval.
    if ((review.verdict === "match" || review.verdict === "rough_match") && safeEvidence) return review;
    const titleDeclaresGraded = /\b(?:PSA|AFA|CGC|CBCS|BGS|SGC|PCGS|NGC|WATA|VGA)\s*(?:graded\s*)?\d{1,3}(?:\.\d+)?\b|\b(?:graded|slabbed|encapsulated)\b/i.test(title);
    const imageClaimsRaw = /\b(?:raw|ungraded|loose|un[- ]slabbed|no slab|no holder|no certification|no grade|grade (?:is )?not visible)\b/i.test(review.rationale);
    if (review.verdict === "mismatch" && titleDeclaresGraded && imageClaimsRaw && evidence?.rawOrLooseVisible !== true) {
      return withVisualNormalization(review, {
        verdict: "unreadable", confidence: "low",
        rationale: `${review.rationale} The candidate title declares a graded item, but the image interpretation is uncertain; retained for additional-image/manual review rather than finalized as a graded-versus-raw mismatch.`,
      }, "graded_title_with_uncertain_image");
    }
    const confirmedVisualIdentity = evidence?.identityMatches === true || evidence?.artworkMatches === true;
    const canCorrect = (review.verdict === "mismatch" || review.verdict === "unreadable") && safeEvidence && confirmedVisualIdentity;
    if (canCorrect && isVideoGameTarget && hasVideoGameSoftLabelOnlyConflict(rawRationale, targetMetadata)) {
      const identical = hasVideoGameIdenticalLabelEvidence(rawRationale);
      return withVisualNormalization(review, {
        verdict: "match", confidence: review.confidence === "low" ? "medium" : review.confidence,
        rationale: identical
          ? `${review.rationale} The label designations are identical, so label wording is not a material difference. Confirmed graded game identity is eligible for valuation.`
          : `${review.rationale} The A+, A++, or A+++ sealed-label suffix is explicitly ignored; required grading evidence is confirmed and no hard image conflict remains. The visual match is eligible for valuation.`,
      }, identical ? "video_game_identical_sealed_label" : "video_game_soft_sealed_suffix");
    }
    if (canCorrect && isVideoGameTarget && rationale !== rawRationale) {
      return withVisualNormalization(review, {
        verdict: "match", confidence: review.confidence === "low" ? "medium" : review.confidence,
        rationale: `${review.rationale} Sealed=Yes logically implies Complete in Box=Yes for the target, so this target self-description is not a material form conflict. Required grading evidence is confirmed.`,
      }, "video_game_sealed_implies_cib_self_description");
    }
    const equivalentVideoGameGrader = isVideoGamePsaWataEquivalent(targetMetadata, `${title} ${rationale}`);
    const gradeEvidence = candidateGradeEvidence(title, rationale, targetGrade, targetGrader);
    const explicitGradeConfirmation = /\b(?:grade|numeric|descriptive)\b.{0,90}\b(?:clearly?\s+)?(?:readable|visible|confirmed|matches|match)\b/i.test(rationale);
    const explicitGradeConflict = /\b(?:not\s+(?:clearly\s+)?(?:readable|visible|verified)|unreadable|unclear|obscured|cannot|can't|unable|conflict(?:ing)?)\b/i.test(rationale);
    const visibleIdentityConfirmation = evidence?.identityMatches === true && evidence?.artworkMatches !== false;
    if (review.verdict === "unreadable" && safeEvidence && equivalentVideoGameGrader && confirmedVisualIdentity) {
      return withVisualNormalization(review, {
        verdict: "match", confidence: review.confidence === "low" ? "medium" : review.confidence,
        rationale: `${review.rationale} For video games, PSA and WATA labels are accepted as equivalent grader evidence; numeric grade, holder, form, and item identity remain confirmed.`,
      }, "video_game_psa_wata_equivalence");
    }
    const escapedGrader = targetGrader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchingGrader = !targetGrader || new RegExp(`\\b${escapedGrader}\\b`, "i").test(title)
      || new RegExp(`\\b(?:candidate|both)\\b[^.]{0,100}\\b${escapedGrader}\\b`, "i").test(rationale);
    if (review.verdict === "unreadable" && safeEvidence && gradeEvidence && matchingGrader
      && explicitGradeConfirmation && !explicitGradeConflict && visibleIdentityConfirmation) {
      return withVisualNormalization(review, {
        verdict: "match", confidence: review.confidence === "low" ? "medium" : review.confidence,
        rationale: `${review.rationale} Required final grading and item-identity evidence independently confirm this visual match.`,
      }, "graded_final_evidence_confirmation");
    }
    if (review.verdict !== "match" && review.verdict !== "rough_match") return review;
    return withVisualNormalization(review, {
      verdict: "unreadable", confidence: "low",
      rationale: unresolvedLabelField
        ? `${review.rationale} The target declares ${unresolvedLabelField.label} “${unresolvedLabelField.value}”, but the candidate title or image review does not explicitly verify it; retained for manual review.`
        : `${review.rationale} The target is graded, but the numeric or descriptive grade is not clearly verified or structured visual evidence is incomplete or contradictory; retained for manual review rather than sent as a confirmed visual match.`,
    }, hardIdentityConflict || textIdentityConflict ? "graded_conflicting_final_evidence" : "graded_incomplete_final_evidence");
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
    if (rawMentions < 2 || !identityMatch || unresolvedConflict
      || hasHardVisualIdentityConflict(review, targetMetadata)) return review;
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
  options?: { requireExactMatch?: boolean; requireCoinExactMatch?: boolean; targetMetadata?: string;
    /** Invocation-owned executor receipts, never reconstructed from attached review/audit fields. */
    executionReceipts?: ReadonlyMap<number, VisualExecution> },
) {
  const reviewsByIndex = new Map(reviews.map(review => [review.candidateIndex, review]));
  return {
    // Visual review is deliberately non-destructive. A model flag provides
    // review provenance; only a separately established objective identity
    // conflict may exclude the candidate from deterministic valuation.
    listings: listings.map((listing, index) => {
      const review = reviewsByIndex.get(index);
      if (!review) return { ...listing, visualExecution: options?.executionReceipts?.get(index)
        ?? { ...undispatchedVisualExecution("legacy_unknown"), state: "unknown" as const } } as T;
      // Once a Disney candidate has reached vision and received an explicit
      // match, the visual stage has already done its job. Do not require a
      // second redundant structured-evidence gate before valuation.
      const confirmedDisneyMatch = options?.requireExactMatch === true && review.verdict === "match";
      const staleDisneyAdmissionReason = String((listing as any)?.visualAdmissionReason ?? '').trim()
        === "The independent Disney Pin image comparison did not complete; the initial AI result is retained for context only and cannot enter valuation.";
      const cleanConfirmedDisneyListing = confirmedDisneyMatch && staleDisneyAdmissionReason
        ? (() => {
            const { visualAdmissionReason: _visualAdmissionReason, evidenceDisposition: _evidenceDisposition, ...cleanListing } = listing as any;
            return cleanListing as T;
          })()
        : listing;
      const metadataDifferences = options?.targetMetadata
        ? visualMetadataDifferenceSummary(options.targetMetadata, listing)
        : [];
      const structuredDifferences = Array.isArray(review.visualDifferences) ? review.visualDifferences : [];
      const structuredDifferenceKeys = new Set(structuredDifferences.map((difference) => `${difference.field}|${difference.targetObservation}|${difference.candidateObservation}`));
      const metadataDifferenceRows: VisualDifference[] = metadataDifferences.map((difference) => {
        const match = difference.match(/^([^:]+): target “([^”]*)” vs candidate “([^”]*)” \(?(.*?)\)?$/);
        return match
          ? { field: match[1], targetObservation: match[2], candidateObservation: match[3], impact: match[4] || "detected metadata difference" }
          : { field: "metadata", targetObservation: "target metadata", candidateObservation: difference, impact: "detected metadata difference" };
      });
      const allDifferences = [...structuredDifferences, ...metadataDifferenceRows]
        .filter((difference, index) => {
          const key = `${difference.field}|${difference.targetObservation}|${difference.candidateObservation}`;
          return !structuredDifferenceKeys.has(key) || index < structuredDifferences.length;
        })
        .slice(0, 30);
      const differenceText = allDifferences.length > 0
        ? ` Differences found: ${allDifferences.map((difference) => `${difference.field}: target “${difference.targetObservation}” vs candidate “${difference.candidateObservation}” (${difference.impact})`).join("; ")}.`
        : "";
      // Evaluate the existing attachment predicate exactly once, preserving its short circuit.
      const warningReview = review.verdict === "mismatch" || (options?.requireExactMatch && review.verdict !== "match") || (options?.requireCoinExactMatch && options.targetMetadata && !hasCompletedCoinAdjudication(review, options.targetMetadata, String(listing.title ?? "")));
      const executorReceipt = options?.executionReceipts?.get(index);
      const actualResponse = executorReceipt?.attempts.some((attempt) => attempt.outcome === "usable_review") === true;
      const visualExecution: VisualExecution = {
        ...(executorReceipt ?? { ...undispatchedVisualExecution("legacy_unknown"), state: "unknown" as const }),
        identity: {
          result: !actualResponse && executorReceipt ? "manual_unknown"
            : review.verdict === "mismatch" ? "mismatch"
            : review.verdict === "match" && !warningReview ? "match" : "manual_unknown",
          origin: actualResponse ? "visual" : "unknown",
          reviewVerdict: review.verdict,
        },
      };
      if (executorReceipt) executorReceipt.identity = visualExecution.identity;
      return {
        ...cleanConfirmedDisneyListing,
        visualExecution,
        visualReviewStatus: review.verdict,
        visualReviewRationale: `${review.rationale}${differenceText}`,
        ...(allDifferences.length > 0 ? { visualDifferences: allDifferences } : {}),
        ...(review.visualAudit ? { visualAudit: review.visualAudit } : {}),
        ...(decidingVisualEvidence(review) ? { visualEvidence: decidingVisualEvidence(review) } : {}),
        ...(warningReview
          ? {
              evidenceDisposition: "warning_review",
              ...(options?.requireCoinExactMatch && options.targetMetadata
                ? { visualAdmissionReason: coinAdmissionReason(review, options.targetMetadata, String(listing.title ?? "")) }
                : options?.requireExactMatch && hasUnavailableDisneyPinsAdjudication(review)
                ? { visualAdmissionReason: "The independent Disney Pin image comparison did not complete; the initial AI result is retained for context only and cannot enter valuation." }
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
  /\b(?:variant|incentive|exclusive|virgin|blank cover|sketch cover)\b/i,
  /\b(?:signed|autographed|signature)\b/i,
];

function extractTargetTitle(metadata: string): string {
  return metadata.match(/(?:^|;)\s*title=([^;]*)/i)?.[1]?.trim() ?? "";
}

function extractTargetItemDetails(metadata: string): Record<string, unknown> {
  const raw = metadata.match(/(?:^|;)\s*(?:fullItemDetails|itemDetails|details|catalog)=(.*)$/i)?.[1]?.trim();
  if (!raw || raw.toLowerCase() === "unknown") return {};
  try {
    const parsed = parseTestAiDetails(raw);
    return { ...parsed, ...extractCandidateStructuredMetadata({ fullItemDetails: parsed }) };
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
function targetItemTypeValue(targetMetadata: string): string {
  const details = extractTargetItemDetails(targetMetadata);
  return normalizedChoice(
    metadataValue(targetMetadata, "itemType")
      || metadataValue(targetMetadata, "productType")
      || metadataValue(targetMetadata, "form")
      || details.itemType
      || details.productType
      || details.form,
  );
}
type VintageToyPackagingForm = "carded" | "loose" | "unknown";
function vintageToyPackagingFormEvidence(value: unknown): string {
  return String(value ?? "")
    // Marketplace presentation phrases do not establish whether the toy is
    // carded or loose. They must not become packaging-form evidence.
    .replace(/\b(?:w\/|with)\s+protector\b/gi, " ")
    .replace(/\bin\s+hand\b/gi, " ")
    .trim();
}
function vintageToyPackagingForm(value: unknown): VintageToyPackagingForm {
  const normalized = normalizedChoice(vintageToyPackagingFormEvidence(value));
  // MOC means Mint on Card and is the marketplace shorthand for a carded
  // figure, not a separate loose form.
  if (/carded|on_card|mint_on_card|moc|blister(?:_card|_pack)?/.test(normalized)) return "carded";
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
function vintageToyVisualInstruction(metadata: string): string {
  if (normalizedChoice(metadataValue(metadata, "category")) !== "vintage_toys") return "";
  return " VINTAGE-TOY VISUAL IDENTITY: Compare the two images first and distinguish the base toy/casting from release variants. For die-cast vehicles such as Hot Wheels, Matchbox, and similar toys, base casting identity means the same visible vehicle model/body shape, proportions, grille, hood, windows, wheels, and overall silhouette. Treasure Hunt or Super Treasure Hunt status, paint color, livery/decoration, wheel variation, tampo details, card art, protector, and release-year wording are variant or presentation evidence; they do not by themselves prove a different vehicle or justify a high-confidence mismatch. A model name such as Plymouth AAR Cuda is the vehicle identity; do not require the generic word car in the candidate title, and do not infer a different vehicle type merely because the title omits that generic word. Do not interpret a catalog or release year in a title as the vehicle model year unless the images or structured metadata clearly establish that distinction. If the images show the same base casting but a different variant, state the variant difference explicitly and use rough_match/manual review when exact variant identity affects comparability; do not describe it as a different vehicle type. Only return a high-confidence mismatch when the visible base casting/model is materially different, the target and candidate are different toy forms, or an explicit packaging/form gate conflicts. The image comparison remains authoritative after the candidate reaches visual review; title metadata can explain a variant but cannot override matching visible base-casting evidence.";
}
export function moviesVisualInstruction(metadata: string): string {
  if (normalizedChoice(metadataValue(metadata, "category")) !== "movies") return "";
  const itemType = movieTargetItemType(metadata);
  if (itemType !== "individual_movie" && itemType !== "box_set") return "";
  return " MOVIES PRODUCT IDENTITY VS PRESENTATION: Review a comparable copy of the same movie or season collection, not an identical physical copy or identical photograph. Primary identity is the recognizable movie/series title, included seasons or collection contents, cover artwork/title treatment, and media format (DVD, Blu-ray, UHD, VHS, etc.). Same franchise or actors alone are insufficient. Do not confuse number of seasons with number of discs or movies. Ordinary case color, a black plastic keep-case border, a clear outer edge, sleeve/slipcover presentation, protector, camera angle, crop, glare, and cosmetic wear are secondary observations. They do not by themselves establish a different product or edition. When primary identity is clear and compatible, return match even if these secondary details differ or an outer sleeve cannot be confirmed; record them in visualDifferences with impact 'secondary presentation difference — does not block product identity'. Do not downgrade to rough_match or unreadable merely because the image does not establish the exact case/sleeve relationship. For example, matching Moonlighting Seasons One and Two DVD cover artwork inside a black keep case versus a cover with a clear outer edge is not a product conflict by itself. Never invent a release/edition difference from 'appears to be a box or sleeve' or 'possible packaging or edition variation'. Packaging becomes material only when explicit target metadata identifies a particular collectible packaging/edition requirement AND candidate evidence confirms a conflicting product, or when the listing is demonstrably an empty case, incomplete content, or another product form. Preserve graded-versus-ungraded, numeric grade/grader, explicit sealed-versus-opened, format, region, actual edition and content conflicts; an ordinary retail case is not a grading slab. A material mismatch explanation must name the relevant field, the actual target and candidate observations, the evidence establishing the difference, and why it changes comparability. If primary identity or an explicitly required collectible edition detail is truly obscured, use rough_match/unreadable with the specific unresolved fact, not a vague packaging suspicion. This Movies-specific distinction governs presentation observations without relaxing any existing grading, product-form, or financial safeguards.";
}
function videoGameFormInstruction(metadata: string): string {
  if (normalizedChoice(metadataValue(metadata, "category")) !== "video_games") return "";
  const details = metadataDetails(metadata);
  const targetIsSealed = /^(?:yes|true|1)$/i.test(String(details.sealed ?? details.factorySealed ?? "").trim());
  const sealedCompletenessRule = targetIsSealed
    ? " When the target's structured Sealed field is Yes, Complete in Box is also Yes by definition; treat those two fields as consistent and treat the visible Sealed label as authoritative for the target form. Do not call this a target metadata conflict."
    : "";
  return ` For a video-game target, item form is a mandatory identity gate: sealed, CIB/complete-in-box, boxed-only, loose/raw, and parts-only are distinct comparable cohorts even when the title, cover, grader, and numeric grade match. A candidate label that visibly says CIB is not the same as a target label that visibly says Sealed. Inspect both labels and return a high-confidence mismatch for a confirmed sealed-versus-CIB or sealed-versus-raw difference.${sealedCompletenessRule} If the target's structured details say CIB or Complete in Box while its visible holder label says Sealed, and the target does not also have Sealed=Yes, do not guess which target form is authoritative: return unreadable/manual review because the target identity itself conflicts. Never call a candidate a visual match until the target form and candidate form are both explicit and equal.`;
}

function focusedVideoGameLabelInstruction(metadata: string): string {
  if (normalizedChoice(metadataValue(metadata, "category")) !== "video_games") return "";
  return " VIDEO-GAME LABEL CHECK: read the printed form designation on each visible grading label before deciding. Examples include Sealed, Sealed A, Sealed A+, Sealed A++, CIB, Complete in Box, Boxed, or Qualified. A clear PSA slab whose label says CIB is a graded CIB game—not a raw or loose cartridge. A clear PSA slab whose label says Sealed or Sealed A is a graded sealed game—not CIB. If both labels and 9.0 grade are visible but one says Sealed and the other says CIB, return mismatch because the forms differ; never call either image raw. IMPORTANT: if the target and candidate labels show the same designation, such as Sealed A++ on both labels, that is an exact label match, not a difference. Do not invent a label mismatch from explanatory wording such as ‘the candidate label reads’. Descriptive sealed-label suffixes such as A+, A++, or A+++ are soft evidence, not an automatic mismatch: if the numeric grade, grader/holder, game identity, and sealed form match, identical or different tiny suffix text must not by itself block a visual match.";
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
  titleSource: string;
  titleCandidates: string[];
  titleEvidence: Record<string, unknown>;
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
const COMPARABLE_NUMBER_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
};
const COMPARABLE_ROMAN_NUMERALS: Record<string, string> = {
  i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8",
  ix: "9", x: "10", xi: "11", xii: "12", xiii: "13", xiv: "14", xv: "15",
  xvi: "16", xvii: "17", xviii: "18", xix: "19", xx: "20",
};
function normalizeComparableNumberWords(value: string): string {
  return value
    .replace(/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi, (word) => COMPARABLE_NUMBER_WORDS[word.toLowerCase()] ?? word)
    .replace(/\b(?:xviii|xvii|xvi|xiv|xiii|xii|xi|xix|xx|viii|vii|vi|ix|iv|iii|ii|x|v|i)\b/gi, (roman) => COMPARABLE_ROMAN_NUMERALS[roman.toLowerCase()] ?? roman);
}
function canonicalCandidateTitle(listing: VisualSourceCandidate): string {
  return normalizeVisualSourceCandidate(listing).title;
}
function normalizedFieldKey(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function labeledCandidateValue(details: Record<string, unknown>, aliases: string[]): unknown {
  return readMetadataValue(details, aliases) || undefined;
}
function firstCandidateText(...values: unknown[]): string {
  return values.map(candidateText).find(Boolean) ?? "";
}

function candidateTitleList(...values: unknown[]): string[] {
  const titles = values.flatMap((value) => Array.isArray(value) ? value : [value])
    .map(candidateText)
    .filter(Boolean);
  return Array.from(new Set(titles));
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
  const presentation = candidatePresentationDetails(listing);
  const rawImages = [
    listing.imageUrls,
    listing.imageUrl,
    listing.thumbnailUrl,
    listing.image,
    listing.images,
    listing.galleryImages,
    listing.image_url,
    presentation.imageUrls,
    presentation.imageUrl,
    presentation.thumbnailUrl,
    presentation.images,
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
  const title = firstCandidateText(
    listing.normalizedListingTitle,
    listing.title,
    listing.itemTitle,
    listing.listingTitle,
    listing.name,
    listing.productName,
    presentation.title,
    presentation.itemTitle,
    presentation.listingTitle,
  );
  const suppliedTitleEvidence = listing.titleEvidence && typeof listing.titleEvidence === "object" && !Array.isArray(listing.titleEvidence)
    ? listing.titleEvidence as Record<string, unknown>
    : {};
  return {
    details,
    title,
    titleSource: firstCandidateText(listing.normalizedListingTitleSource, listing.titleSource) || "unknown",
    titleCandidates: candidateTitleList(
      listing.normalizedListingTitleCandidates,
      listing.normalizedListingTitle,
      listing.title,
      listing.itemTitle,
      listing.listingTitle,
      listing.name,
      listing.productName,
      presentation.title,
      presentation.itemTitle,
      presentation.listingTitle,
    ),
    titleEvidence: { ...buildMarketplaceTitleEvidence(title), ...suppliedTitleEvidence },
    imageUrls,
    providerReference: providerReference || null,
    quantity: quantityValue ?? null,
    grade: candidateMetadataValue(listing, details, ["grade", "numericGrade", "professionalGrade"]),
    grader: candidateMetadataValue(listing, details, ["certificationCompany", "gradingCompany", "grader"]),
    isGraded: candidateMetadataValue(listing, details, ["isGraded", "graded"]),
    condition: candidateMetadataValue(listing, details, ["condition", "mediaCondition"]),
    itemType: candidateMetadataValue(listing, details, ["itemType", "productType", "form", "saleForm"]),
  };
}

/** Legacy photos/title aliases stay presentation, never structured identity. */
function candidatePresentationDetails(listing: VisualSourceCandidate): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const value of [listing.normalizedStructuredMetadata, listing.fullItemDetails, listing.itemDetails, listing.details]) {
    const details = visualMetadataDetails(value);
    for (const key of ["imageUrls", "imageUrl", "thumbnailUrl", "images", "title", "itemTitle", "listingTitle"]) {
      if (result[key] === undefined && details[key] !== undefined) result[key] = details[key];
    }
  }
  return result;
}
function candidateStructuredDetails(listing: VisualSourceCandidate): Record<string, unknown> {
  return extractCandidateStructuredMetadata(listing);
}

/** A placeholder direct field must not hide the same fact in provider details. */
function candidateMetadataValue(listing: VisualSourceCandidate, details: Record<string, unknown>, aliases: string[]): string {
  return readMetadataValue(listing, aliases) || readMetadataValue(details, aliases);
}

function comparisonFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    gamePuzzleName: "Game or puzzle name",
    publisherBrand: "Publisher or brand",
    toyNameCharacter: "Toy name or character",
    vehicleName: "Vehicle name",
    packagingType: "Packaging type",
    completeness: "Completeness",
    complete: "Completeness",
    isComplete: "Completeness",
    releaseYear: "Year",
    itemType: "Item type",
    certificationCompany: "Certification company",
    authenticationIncluded: "Authentication included",
    authenticated: "Authentication included",
  };
  if (labels[key]) return labels[key];
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (value) => value.toUpperCase());
}
function comparisonValue(value: unknown): string {
  return meaningfulMetadataText(value) || "Unknown";
}
function comparisonComparable(value: string): string {
  return normalizeComparableNumberWords(value.toLowerCase()).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function comparisonMetadataAliases(key: string): string[] {
  const groups = [
    ["grade", "numericGrade", "professionalGrade", "finalGrade"],
    ["certificationCompany", "gradingCompany", "grader"],
    ["isGraded", "graded", "gradingStatus", "gradingState"],
    ["year", "releaseYear", "publicationYear", "manufactureYear"],
    ["platform", "console", "system"],
    ["completeness", "complete", "isComplete"],
    ["completeInBox", "completeBox", "cib"],
    ["sealed", "factorySealed", "sealedStatus"],
    ["publisherBrand", "brand", "manufacturer"],
    ["condition", "mediaCondition"],
    ["authenticationIncluded", "authenticated", "authenticationStatus", "isAuthenticated"],
    ["cardNumber", "cardNo", "number"],
    ["setNumber", "setNo"],
    ["pieceCount", "pieces", "numberOfPieces"],
  ];
  const normalized = normalizedFieldKey(key);
  const group = groups.find((aliases) => aliases.some((alias) => normalizedFieldKey(alias) === normalized));
  return group ? [key, ...group.filter((alias) => normalizedFieldKey(alias) !== normalized)] : [key];
}
function comparisonCandidateFieldValue(listing: VisualSourceCandidate, details: Record<string, unknown>, key: string): string {
	return comparisonValue(candidateMetadataValue(listing, details, comparisonMetadataAliases(key)));
}
function movieTitleDerivedValue(title: string, key: string): string {
  if (!/^(?:title|movieTitle|boxSetName|seriesName)$/i.test(key)) return "";
  const cleaned = title.replace(/[|•]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "Unknown";
  // Marketplace titles append format, packaging, condition, seller copy, and
  // box-set descriptors after the product identity. Keep only the identity
  // portion for the independent title-derived comparison column.
  const marker = cleaned.search(/\b(?:widescreen|fullscreen|laser\s*d(?:i|)sc|dvd|blu[- ]?ray|4k\s+uhd|vhs|seasons?\b|complete\s+(?:series|collection)|box\s*set|bundle|lot|factory\s+sealed|sealed|used|new|tested|good|very\s+good|like\s+new|region\s*[0-9a-c]|ntsc|pal)\b/i);
  const identity = (marker > 0 ? cleaned.slice(0, marker) : cleaned)
    .replace(/^\s*(?:new|used|pre[- ]owned)\s+/i, "")
    .replace(/[,:;\-]+\s*$/, "")
    .trim();
  return identity || "Unknown";
}
function titleGradeEvidence(title: string, category = ""): { grader: string; grade: string } | null {
  const observed = parseSourceGradeFromTitle(title, { category });
  if (!observed) return null;
  const comparable = observed.comparable;
  const grade = `${comparable.designation ?? ""}${comparable.numeric}${comparable.plus ? "+" : ""}${comparable.qualifiers.length ? ` ${comparable.qualifiers.join(" ")}` : ""}${comparable.qualifierUncertain ? " (unknown)" : ""}`;
  return { grader: observed.grader ?? "", grade };
}
const DISNEY_PINS_CHARACTER_STOP_WORDS = /^(?:disney|parks|easter|christmas|halloween|holiday|limited|exclusive|open|edition|single|trading|pin|pins|set|collection|series|portrait|portraits|black|white|red|blue|green|yellow|pink|purple|orange|\d{4})$/i;
/** Extract a character pair from the candidate title without borrowing target metadata. */
export function disneyPinsCharactersFromTitle(title: string): string | null {
  const text = String(title ?? "").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const pair = /([^&,]{1,48})\s*(?:&|and|with)\s*([^&,]{1,48})/gi;
  const matches = [...text.matchAll(pair)];
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const leftTokens = (matches[index]?.[1] ?? "").replace(/[^A-Za-z0-9'’ -]/g, " ").trim().split(/\s+/).filter((token) => /[A-Za-z0-9]/.test(token));
    const rightTokens = (matches[index]?.[2] ?? "").replace(/[^A-Za-z0-9'’ -]/g, " ").trim().split(/\s+/).filter((token) => /[A-Za-z0-9]/.test(token));
    while (leftTokens.length && DISNEY_PINS_CHARACTER_STOP_WORDS.test(leftTokens[0])) leftTokens.shift();
    const left = leftTokens.slice(-3).filter((token) => !DISNEY_PINS_CHARACTER_STOP_WORDS.test(token)).join(" ").trim();
    const rightStop = rightTokens.findIndex((token) => DISNEY_PINS_CHARACTER_STOP_WORDS.test(token));
    const right = rightTokens.slice(0, rightStop < 0 ? 3 : rightStop).join(" ").trim();
    if (!left || !right || DISNEY_PINS_CHARACTER_STOP_WORDS.test(left) || DISNEY_PINS_CHARACTER_STOP_WORDS.test(right)) continue;
    return `${left} & ${right}`;
  }
  return null;
}
const DISNEY_PINS_PIN_NAME_STOP_WORDS = new Set([
  "disney", "parks", "princess", "princesses", "series", "trading", "pin", "pins", "single", "limited", "edition",
  "exclusive", "open", "collection", "set", "mirror", "jumbo", "glitter", "le", "dangle", "fantasy", "wdw", "dlr",
]);
function disneyPinsPinNameTokens(value: unknown): string[] {
  return disneyPinsScoreText(value)
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .split(/\s+/)
    .map((token) => token.toLowerCase())
    .filter((token) => token.length >= 2 && !DISNEY_PINS_PIN_NAME_STOP_WORDS.has(token) && !/^\d+$/.test(token));
}
function disneyPinsPinNameTitleValue(targetValue: unknown, targetCharacter: unknown, title: string): string | null {
  const cleanTitle = String(title ?? "").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  if (!cleanTitle) return null;
  const targetTokens = disneyPinsPinNameTokens(targetValue);
  if (!targetTokens.length) return null;
  const titleTokens = new Set(disneyPinsPinNameTokens(cleanTitle));
  const declaredCharacters = disneyPinsCharactersFromTitle(cleanTitle);
  if (declaredCharacters) {
    const targetNameTokens = new Set(targetTokens);
    const targetCharacterTokens = disneyPinsMeaningfulTokens(targetCharacter);
    const declaredCharacterTokens = disneyPinsMeaningfulTokens(declaredCharacters);
    if (targetCharacterTokens.length && !targetCharacterTokens.every((token) => declaredCharacterTokens.includes(token))) return null;
    if (declaredCharacterTokens.some((token) => !targetNameTokens.has(token))) return null;
  } else if (!targetTokens.every((token) => titleTokens.has(token))) return null;
  const connector = cleanTitle.match(/\b([A-Za-z][A-Za-z'’ -]{1,40}?)\s+(?:with|and)\s+([A-Za-z][A-Za-z'’ -]{1,40}?)(?=\s*(?:[-|•]|$))/i);
  if (declaredCharacters) return declaredCharacters.replace(/\s*&\s*/g, " with ");
  if (connector) return `${connector[1].trim()} with ${connector[2].trim()}`;
  return targetTokens.map((token) => token).join(" ");
}

/**
 * Return the same validated title-derived Pin Name witness used by the scorer
 * and comparison table. This is evidence only; it must not populate the
 * candidate's structured provider metadata field.
 */
export function disneyPinsTitleDerivedPinNameEvidence(
  targetValue: unknown,
  targetCharacter: unknown,
  title: string,
): string | null {
  return disneyPinsPinNameTitleValue(targetValue, targetCharacter, title);
}

function comparisonTitleDerivedValue(listing: VisualSourceCandidate, key: string, targetValue: string, category = "", identityValues: readonly unknown[] = []): string {
  if (category === "music" && /^(?:condition|mediaCondition)$/i.test(key)) {
    const condition = musicTitleMediaCondition(listing, identityValues);
    return condition ? `${condition.replace(/_/g, " ")} (inferred from title)` : "Unknown";
  }
  const details = candidateStructuredDetails(listing);
  const title = firstCandidateText(
    listing.normalizedListingTitle,
  listing.title,
  listing.itemTitle,
  listing.listingTitle,
  listing.name,
  listing.productName,
  details.title,
  details.itemTitle,
  details.listingTitle,
	 ) || "";
		if (!title) return "Unknown";
		if (category === "movies" && /^(?:title|listingTitle|itemTitle|movieTitle|boxSetName|seriesName)$/i.test(key)) {
      const selectedTitle = (listing.metadataScoreAwards ?? [])
        .filter((award) => rankingAwardFieldKey(award.field, category, targetItemTypeValue('')) === rankingAwardFieldKey(key, category, targetItemTypeValue('')))
        .flatMap((award) => award.evidence ?? [])
        .filter((evidence) => evidence.source === 'title')
        .map((evidence) => String(evidence.value ?? '').trim()).find(Boolean);
      if (selectedTitle && selectedTitle !== title) return "Unknown";
      return movieTitleDerivedValue(title, key);
    }
		if (category === "movies" && /^(?:numberOfMovies|movieCount)$/i.test(key)) {
      const count = movieSeasonCountFromText(title);
      return count || "Unknown";
    }
		if (category === "movies" && /^(?:format|mediaFormat)$/i.test(key)) {
      const format = title.match(/\b(?:DVD|Blu[- ]?ray|4K\s+UHD|VHS|LaserDisc|Laserdic)\b/i)?.[0];
			return format ? `${format} (detected in title)` : "Unknown";
    }
		if (category === "movies" && /^(?:sealed|sealedStatus|packaging)$/i.test(key)) {
      const state = title.match(/\b(?:factory\s+sealed|sealed|opened|used)\b/i)?.[0];
      const value = state ? movieBoolean(state) : "";
      return value ? `${value === 'yes' ? 'Yes' : 'No'} (inferred from title)` : "Unknown";
    }
				if (category === "autographs") {
				if (/^(?:signer|autographSigner)$/i.test(key)) {
					const signer = autographSignerFromTitle(title, comparisonValue(targetValue));
					if (!signer) return "Unknown";
					const display = signer === autographMarketValue(targetValue)
						? comparisonValue(targetValue) : signer.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
					return `${display} (detected in title)`;
				}
				if (/^(?:signedItemType|autographItemType)$/i.test(key)) {
					const objectType = autographObjectType(title);
					return objectType ? `${objectType.replace(/\b\w/g, (letter) => letter.toUpperCase())} (detected in title)` : "Unknown";
			}
			if (/^(?:autographCategory|signatureCategory)$/i.test(key)) {
				const category = autographCategoryFromTitle(title);
				return category ? `${category.replace(/\b\w/g, (letter) => letter.toUpperCase())} (detected in title)` : "Unknown";
			}
			if (/^(?:authentication|authenticated|authenticationIncluded|authenticationStatus|isAuthenticated)$/i.test(key)) {
				const authentication = autographCandidateAuthentication(listing, "");
				const state = autographAuthenticationState(authentication);
				return state === "yes" ? "Yes (inferred from title)" : state === "no" ? "No (inferred from title)" : "Unknown";
			}
			if (/^(?:authenticationCompany|customAuthenticationCompany|certificationCompany|authenticator)$/i.test(key)) {
				const authentication = autographCandidateAuthentication(listing, "");
					return authentication && !/^(?:authenticated|yes)$/i.test(authentication)
						? `${authentication.replace(/\b\w/g, (letter) => letter.toUpperCase())} (detected in title)` : "Unknown";
				}
					if (/^authenticationType$/i.test(key)) {
						const type = autographAuthenticationTypeFromTitle(title);
						return type ? `${type} (detected in title)` : "Unknown";
					}
					}
			if (category === "disney_pins" && /^(?:character|characterName|characters)$/i.test(key)) {
							const characters = disneyPinsCharactersFromTitle(title);
							if (characters) return `${characters} (detected in title)`;
						}
						if (category === "disney_pins" && /^(?:pinName|name)$/i.test(key)) {
							const pinName = disneyPinsPinNameTitleValue(targetValue, identityValues[0], title);
							if (pinName) return `${pinName} (detected in title)`;
						}
					if (category === "original_art") {
					if (/^(?:artistName|artist|creator|artworkTitleCharacter|artworkTitle|character|artType|comicTitle|coverSketchComicTitle|issueNumber|issueNo|number|publisher)$/i.test(key)) {
					if (/^(?:issueNumber|issueNo|number)$/i.test(key)) {
						const issue = comparisonValue(targetValue).match(/\d+[A-Za-z]?/)?.[0];
						return issue && new RegExp(`(?:^|\\D)#?${issue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\D|$)`, "i").test(title)
							? `${issue} (detected in title)` : "Unknown";
					}
					const targetText = comparisonValue(targetValue);
					return targetText !== "Unknown" && titleContainsValue(title, targetText)
						? `${targetText} (detected in title)` : "Unknown";
				}
			}
			if (/^(?:title|listingTitle|itemTitle)$/i.test(key)) return comparisonValue(title);
	if (/^(?:year|releaseYear)$/i.test(key)) {
		return title.match(/\b(?:17|18|19|20)\d{2}\b/)?.[0] ?? "Unknown";
	}
	if (/^(?:grade|numericGrade|professionalGrade|finalGrade|gameGrade)$/i.test(key)) {
		return titleGradeEvidence(title, category)?.grade ?? "Unknown";
	}
		if (/^(?:certificationCompany|gradingCompany|grader)$/i.test(key)) {
			return titleGradeEvidence(title, category)?.grader ?? "Unknown";
		}
		if (/^(?:isGraded|graded|gradingStatus|gradingState)$/i.test(key)) {
			const state = determineExplicitGradingState({}, { category, title, identityValues });
			return state.state === 'graded' ? "Yes (inferred from title)" : state.state === 'raw' ? "No (inferred from title)" : "Unknown";
		}
		if (/^(?:complete|completeness|isComplete|completeInBox|completeBox|cib)$/i.test(key)) {
			const completeness = titleCompletenessState(title);
		if (completeness === "no") return "No (inferred from title)";
		if (completeness === "yes") return "Yes (inferred from title)";
		return "Unknown";
	}
	if (/^(?:sealed|factorySealed|sealedStatus|unopened|unopenedProduct)$/i.test(key)) {
		if (/\b(?:unsealed|opened|open\s+box)\b/i.test(title)) return "No (inferred from title)";
		if (/\b(?:factory\s+sealed|sealed|unopened)\b/i.test(title)) return "Yes (inferred from title)";
		return "Unknown";
	}
		if (category !== "pokemon" && /^(?:packagingType|packaging|form|saleForm)$/i.test(key)) {
			if (/\b(?:factory\s+sealed|sealed|moc|mint\s+on\s+card|carded)\b/i.test(title)) return "Sealed/Carded (inferred from title)";
			if (/\b(?:loose|no\s+box|boxless)\b/i.test(title)) return "Loose (inferred from title)";
			return "Unknown";
		}
    if (category === "pokemon" && /^(?:cardNumber|cardNo|number)$/i.test(key)) {
      return pokemonTitleNumber(title)?.raw ?? "Unknown";
    }
    if (category === "sports_cards" && /^(?:cardNumber|cardNo|number)$/i.test(key)) {
      const cardNumber = title.match(/(?:#|card\s*(?:no\.?|number)?\s*)(\d+[A-Za-z]?)(?:\b|\s*\/)/i)?.[1];
      return cardNumber ? `${cardNumber} (detected in title)` : "Unknown";
    }
    if (category === "sports_cards") {
      if (/^(?:productName|productTitle)$/i.test(key)) {
        return titleContainsValue(title, comparisonValue(targetValue)) ? `${comparisonValue(targetValue)} (detected in title)` : "Unknown";
      }
      if (/^(?:productFormat|format)$/i.test(key)) {
        const format = sportsCardUnopenedFormat(undefined, title);
        return format ? `${format.replace(/_/g, " ")} (detected in title)` : "Unknown";
      }
      if (/^(?:productType|productConfiguration)$/i.test(key)) {
        const productType = sportsCardUnopenedProductType(undefined, title);
        return productType ? `${productType.replace(/_/g, " ")} (detected in title)` : "Unknown";
      }
      if (/^(?:authenticationCompany|authenticator)$/i.test(key)) {
        const company = sportsCardUnopenedCompany(undefined, title);
        return company ? `${company.toUpperCase()} (detected in title)` : "Unknown";
      }
      if (/^(?:fromASealedCase|fromSealedCase)$/i.test(key)) {
        return /\b(?:FASC|from\s+(?:a\s+)?sealed\s+case)\b/i.test(title) ? "Yes (inferred from title)" : "Unknown";
      }
    }
    if (category === "pokemon" && /^(?:finish|finishVariant|rarity|editionEra|edition|era|setType|packaging|originalPackaging|productName|productTitle|productType|productConfiguration)$/i.test(key)) {
      const targetText = comparisonValue(targetValue);
      return titleContainsValue(title, targetText) ? `${targetText} (detected in title)` : "Unknown";
    }
    if (category === "pokemon" && /^(?:fromASealedCase|fromSealedCase)$/i.test(key)) {
      return /\b(?:FASC|from\s+(?:a\s+)?sealed\s+case)\b/i.test(title) ? "Yes (inferred from title)" : "Unknown";
    }
    if (category === "coins") {
      if (/^(?:denomination)$/i.test(key)) {
        const denomination = targetValue.match(/\$?\s*(?:1|one)\s*(?:dollar|usd)/i) && /\b(?:dollar|\$1)\b/i.test(title)
          ? targetValue : "";
        return denomination ? `${denomination} (detected in title)` : "Unknown";
      }
      if (/^(?:mintMark|mint)$/i.test(key)) {
        const mintMark = title.match(/\b(?:19|20)\d{2}\s*[-–—]\s*([A-Z])\b/)?.[1];
        return mintMark ? `${mintMark} (detected in title)` : "Unknown";
      }
      if (/^(?:variety|varietyType)$/i.test(key)) {
        return titleContainsValue(title, comparisonValue(targetValue)) ? `${comparisonValue(targetValue)} (detected in title)` : "Unknown";
      }
      if (/^(?:setType|setForm)$/i.test(key)) {
        return titleContainsValue(title, comparisonValue(targetValue)) ? `${comparisonValue(targetValue)} (detected in title)` : "Unknown";
      }
      if (/^(?:numberOfCoins|coinCount)$/i.test(key)) {
        const count = title.match(/\b(?:set\s+of\s+)?(\d+)\s+coins?\b/i)?.[1];
        return count ? `${count} (detected in title)` : "Unknown";
      }
      if (/^(?:originalPackagingIncluded|originalPackaging)$/i.test(key)) {
        return /\b(?:original\s+packaging|original\s+holder|in\s+original\s+packaging)\b/i.test(title)
          ? "Yes (inferred from title)" : "Unknown";
      }
    }
    if (category === "stamps") {
      if (/^(?:scottNumber|scottNo)$/i.test(key)) {
        const scott = title.match(/\bScott\s+([A-Z]?\d+[A-Z]?)\b/i)?.[1];
        return scott ? `${scott} (detected in title)` : "Unknown";
      }
      if (/^(?:denomination|faceValue)$/i.test(key)) {
        const denomination = title.match(/\b\d+(?:\.\d+)?c\b/i)?.[0];
        return denomination ? `${denomination} (detected in title)` : "Unknown";
      }
      if (/^(?:sheetType|setType|format)$/i.test(key)) {
        const sheetType = /\b(?:mint\s+set|sheet|block|set)\b/i.test(title) ? comparisonValue(targetValue) : "";
        return sheetType ? `${sheetType} (detected in title)` : "Unknown";
      }
      if (/^(?:numberOfStamps|stampCount)$/i.test(key)) {
        const count = title.match(/\b(\d+)\s+stamps?\b/i)?.[1];
        return count ? `${count} (detected in title)` : "Unknown";
      }
      if (/^(?:mintOrUsed|condition)$/i.test(key)) {
        const state = title.match(/\b(?:mint|used|unused|MNH|hinged)\b/i)?.[0];
        return state ? `${state} (detected in title)` : "Unknown";
      }
    }
    if (category === "video_games" && /^(?:workingCondition|functionality)$/i.test(key)) {
      const state = title.match(/\b(?:working|tested|untested|non[- ]?working|for\s+parts)\b/i)?.[0];
      return state ? `${state} (detected in title)` : "Unknown";
    }
    if (category === "disney_pins") {
      if (/^(?:pinTradingEvent|tradingEvent|event)$/i.test(key)) {
        const event = title.match(/\b(?:D23|Disneyland|Disney\s+World|EPCOT)\b/i)?.[0];
        return event ? `${event} (detected in title)` : "Unknown";
      }
      if (/^(?:backstampInformation|backstamp|backstampInfo)$/i.test(key)) {
        const backstamp = title.match(/\b(?:Disney\s+)?D23\b/i)?.[0];
        return backstamp ? `Disney ${backstamp.replace(/^Disney\s+/i, "")} (detected in title)` : "Unknown";
      }
      if (/^(?:numberOfPins|pinCount)$/i.test(key)) {
        const count = title.match(/\b(?:set\s+of\s+)?(\d+)\s+pins?\b/i)?.[1];
        return count ? `${count} (detected in title)` : "Unknown";
      }
    }
    if (category === "music" && /^(?:catalogNumber|catalogNo|catNo)$/i.test(key)) {
      const catalog = title.match(/\b[A-Z]{1,4}\s*\d{2,5}\b/i)?.[0];
      return catalog ? `${catalog} (detected in title)` : "Unknown";
    }
    if (category === "vintage_toys" && /^(?:setNumber|pieceCount|numberOfPieces)$/i.test(key)) {
      return readToyNumericTitleEvidence(title, key as ToyNumericField)?.raw ?? "Unknown";
    }
		// Generic target-token overlap is not a field parser. Only established
		// identity/text fields may retain the independent detected-in-title hint;
		// quantities, economics, unknown fields and other numbers need a real
		// parser or a separately labeled selected scoring witness below.
		if (!/^(?:gameTitle|movieTitle|boxSetName|seriesName|gamePuzzleName|toyName|toyNameCharacter|vehicleName|accessoryName|accessoryType|consoleName|cardName|pinName|comicTitle|releaseTitle|albumTitle|artist|performer|player|athlete|signer|setName|series|franchise|character|brand|manufacturer|publisherBrand|publisher|recordLabel|platform|console|system|compatiblePlatform|compatibleSystem|format|mediaFormat|edition|releaseType|region|regionCode|country|language)$/i.test(key)) return "Unknown";
			const normalizedTarget = comparisonValue(targetValue);
			return normalizedTarget !== "Unknown" && titleContainsValue(title, normalizedTarget)
					? `${normalizedTarget} (detected in title)`
			: "Unknown";
}
function normalizedRankingReason(value: unknown): string {
	return String(value ?? "")
		.toLowerCase()
		.replace(/\s*\(title-derived\)\s*$/, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}
function compactRankingReason(value: unknown): string {
	return normalizedRankingReason(value).replace(/\s+/g, "");
}
function rankingScoreFieldsForCategory(category: string, itemType: string): readonly (readonly [string, number])[] {
  const categoryKey = normalizedChoice(category);
  const typeKey = normalizedChoice(itemType);
  let fields: readonly (readonly [string, number])[] = [];
  if (categoryKey === 'autographs') fields = AUTOGRAPH_SCORE_FIELDS;
  else if (categoryKey === 'video_games') fields = typeKey === 'console' ? VIDEO_GAME_CONSOLE_SCORE_FIELDS : typeKey === 'accessory' ? VIDEO_GAME_ACCESSORY_SCORE_FIELDS : VIDEO_GAME_GAME_SCORE_FIELDS;
  else if (categoryKey === 'movies') fields = typeKey === 'box_set' ? MOVIES_BOX_SET_SCORE_FIELDS : MOVIES_INDIVIDUAL_SCORE_FIELDS;
  else if (categoryKey === 'sports_cards') fields = typeKey.includes('set') ? SPORTS_CARD_SET_SCORE_FIELDS : typeKey.includes('unopened') || typeKey.includes('sealed') ? SPORTS_CARD_UNOPENED_SCORE_FIELDS : SPORTS_CARD_SCORE_FIELDS;
  else if (categoryKey === 'pokemon') fields = POKEMON_SCORE_FIELDS[typeKey as keyof typeof POKEMON_SCORE_FIELDS] ?? [];
  else if (categoryKey === 'vintage_toys') {
    const toyType = Object.keys(VINTAGE_TOY_SCORE_FIELDS).find(key => normalizedChoice(key).replace(/[^a-z0-9]/g, '') === typeKey.replace(/[^a-z0-9]/g, ''));
    fields = toyType ? VINTAGE_TOY_SCORE_FIELDS[toyType as keyof typeof VINTAGE_TOY_SCORE_FIELDS] : [];
  } else if (categoryKey === 'disney_pins') fields = typeKey === 'pin_set' ? DISNEY_PINS_SET_SCORE_FIELDS : DISNEY_PINS_INDIVIDUAL_SCORE_FIELDS;
  else if (categoryKey === 'music') fields = MUSIC_SCORE_FIELDS;
  else if (categoryKey === 'coins') fields = typeKey.includes('set') ? COIN_SET_SCORE_FIELDS : COIN_SINGLE_SCORE_FIELDS;
  else if (categoryKey === 'paper_money') fields = PAPER_MONEY_SCORE_FIELDS;
  else if (categoryKey === 'stamps') fields = typeKey.includes('set') ? STAMPS_SET_SCORE_FIELDS : STAMPS_SINGLE_SCORE_FIELDS;
  else if (categoryKey === 'comics') fields = COMICS_SINGLE_SCORE_FIELDS;
  else if (categoryKey === 'original_art') fields = ORIGINAL_ART_SCORE_FIELDS;
  return fields;
}
function rankingPotentialPointsForField(category: string, itemType: string, field: string): number {
  const fields = rankingScoreFieldsForCategory(category, itemType);
  const fieldKey = rankingAwardFieldKey(field, category, itemType);
  return fields.filter(([candidateField]) => rankingAwardFieldKey(candidateField, category, itemType) === fieldKey)
    .reduce((sum, [, points]) => sum + points, 0);
}
function rankingContributionForField(listing: VisualSourceCandidate, key: string, _fieldLabel: string, candidateValue: string, titleDerivedValue: string, category = "", itemType = ""): MetadataFieldComparison["rankingContribution"] {
  const contribution = rankingAwardContribution(listing.metadataScoreAwards, key, category, itemType);
  const modelFields = rankingScoreFieldsForCategory(category, itemType);
  const modelPotentialPoints = rankingPotentialPointsForField(category, itemType, key);
  const fallbackPotentialPoints = contribution.awards.reduce((sum, award) => sum + award.awardedPoints, 0) || (contribution as { awardedPoints?: number }).awardedPoints || 0;
  // Once a category has a declared model, only its model rows can carry
  // potential points. Extra alias rows (for example generic Grade or Year)
  // remain visible for auditability but must not double-count the same award.
  const potentialPoints = modelFields.length ? modelPotentialPoints : fallbackPotentialPoints;
  if (/^(?:isgraded|graded|gradingstatus|gradingstate)$/.test(normalizedFieldKey(key)) && key !== 'isGraded') {
    return { ...contribution, matched: false, structured: false, titleDerived: false, potentialPoints, awardedPoints: 0, awards: [], sources: [], scoringEvidence: [] };
  }
  const rowKey = rankingAwardFieldKey(key, category, itemType);
  const scoringEvidence = contribution.awards.map((award) => {
    const shared = rankingAwardFieldKey(award.field, category, itemType) !== rowKey;
    return {
      awardField: award.field, source: award.source, awardedPoints: award.awardedPoints, shared,
      // A direct term can select a differently named alias (boxSetName/title,
      // numberOfMovies/quantity, isGraded/grade). Keep that actual witness.
      // A composite's child row may show only its own selected evidence.
      evidence: (award.evidence ?? []).filter((evidence) => !shared
        || rankingAwardFieldKey(evidence.field, category, itemType) === rowKey).map((evidence) => ({ ...evidence })),
    };
  });
  const columnAwarded = (source: "structured" | "title", value: string): boolean => {
      if (!meaningfulMetadataText(value)) return false;
      const displayed = value.replace(/\s*\((?:detected|inferred)\s+(?:in|from)\s+title\)\s*$/i, "");
      return contribution.awards.some((award) => (award.evidence ?? []).some((evidence) => {
      const evidenceKey = rankingAwardFieldKey(evidence.field, category, itemType);
      const movieIdentityTitleWitness = category === 'movies' && source === 'title'
        && /^(?:title|movieTitle|boxSetName|seriesName)$/i.test(rowKey)
        && /^(?:title|movieTitle|boxSetName|seriesName)$/i.test(rankingAwardFieldKey(award.field, category, itemType));
      if (evidence.source !== source || (evidenceKey !== rowKey && !movieIdentityTitleWitness)
        || !meaningfulMetadataText(evidence.value)) return false;
      if (rowKey === "grade") return compareComparableGrades(displayed, evidence.value, { allowBareNumeric: true, category }) === "match";
      if (category === "pokemon" && /^(?:cardNumber|cardNo|number)$/i.test(rowKey)) {
        return comparePokemonCardNumbers(displayed, evidence.value) === "match";
      }
      if (rowKey === "isgraded") {
        const a = determineExplicitGradingState({ isGraded: displayed }).state;
        const b = determineExplicitGradingState({ isGraded: evidence.value }).state;
        return a !== 'unknown' && a !== 'conflicted' && a === b;
      }
      if (category === 'movies' && source === 'title' && /^(?:title|movieTitle|boxSetName|seriesName)$/i.test(rowKey)) {
        return movieIdentityTitleWitness || movieValuesAgree(displayed, evidence.value);
      }
      const a = metadataBooleanState(displayed), b = metadataBooleanState(evidence.value);
      if (a && b) return a === b;
      const left = comparisonComparable(displayed), right = comparisonComparable(evidence.value!);
      return Boolean(left && right && (left === right || titleContainsValue(left, right) || titleContainsValue(right, left)));
    }));
  };
  const movieIdentityTitleAwarded = category === 'movies'
    && /^(?:title|movieTitle|boxSetName|seriesName)$/i.test(rowKey)
    && contribution.awards.some((award) => award.source === 'title');
  return { ...contribution,
    structured: contribution.structured && columnAwarded("structured", candidateValue),
    titleDerived: movieIdentityTitleAwarded || contribution.titleDerived && columnAwarded("title", titleDerivedValue),
    potentialPoints,
    awardedPoints: contribution.awards.reduce((sum, award) => sum + award.awardedPoints, 0),
    sources: [...new Set(contribution.awards.map((award) => award.source))],
    scoringEvidence,
  };
}
/** Preserve the transport's existing 40-row cap, retaining scored fields first. */
function boundedMetadataComparisonRows(rows: MetadataFieldComparison[]): MetadataFieldComparison[] {
  if (rows.length <= 40) return rows;
  const selected = new Set(rows.filter((row) => row.rankingContribution?.matched));
  selected.add(rows[0]);
  for (const row of rows) {
    if (selected.size >= 40) break;
    selected.add(row);
  }
  return rows.filter((row) => selected.has(row)).slice(0, 40);
}
function normalizeModelPotentialPoints(rows: MetadataFieldComparison[], category: string, itemType: string): MetadataFieldComparison[] {
  const modelFields = rankingScoreFieldsForCategory(category, itemType);
  if (!modelFields.length) return rows;
  const result = rows.map((row) => ({
    ...row,
    rankingContribution: row.rankingContribution
      ? { ...row.rankingContribution, potentialPoints: 0 }
      : row.rankingContribution,
  }));
  const semanticModelKey = (field: string): string => /^(?:gradingcompany|grader)$/i.test(normalizedFieldKey(field))
    ? 'certificationcompany' : normalizedFieldKey(field);
  for (const [field, points] of modelFields) {
    const modelKey = rankingAwardFieldKey(field, category, itemType);
    const exactIndex = result.findIndex((row) => semanticModelKey(row.fieldKey ?? row.targetField) === semanticModelKey(field));
    const canonicalIndex = result.findIndex((row) => rankingAwardFieldKey(row.fieldKey ?? row.targetField, category, itemType) === modelKey);
    const index = exactIndex >= 0 ? exactIndex : canonicalIndex;
    if (index >= 0 && result[index].rankingContribution) {
      result[index] = { ...result[index], rankingContribution: { ...result[index].rankingContribution!, potentialPoints: points } };
    }
  }
  return result;
}
function comparisonStatus(targetValue: string, candidateValue: string, category = "", key = ""): MetadataFieldComparison["status"] {
		if (!meaningfulMetadataText(targetValue) || !meaningfulMetadataText(candidateValue)) return "unknown";
		if (category === "disney_pins" && /^(?:pinName|name)$/i.test(key)) {
			const candidate = candidateValue.replace(/\s*\((?:detected|inferred)\s+(?:in|from)\s+title\)\s*$/i, "");
			return disneyPinsPinNameTitleValue(targetValue, undefined, candidate) ? "match" : "different";
		}
	if (category === "autographs" && /^authenticationType$/i.test(key)) {
		const normalizedType = (value: string) => {
			const bare = value.replace(/\s*\((?:detected|inferred)\s+(?:in|from)\s+title\)\s*$/i, "");
			const normalized = bare.toLowerCase().replace(/[^a-z0-9]/g, "");
			return /^(?:loa|letter|loaletter|letterofauthenticity|letterofauthentication)$/.test(normalized) ? "loa" : normalized;
		};
		return normalizedType(targetValue) === normalizedType(candidateValue) ? "match" : "different";
	}
	if (category === "movies" && /^(?:title|movieTitle|boxSetName|seriesName)$/i.test(key)) return movieValuesAgree(targetValue, candidateValue) ? "match" : "different";
	if (category === "movies" && /^(?:condition|mediaCondition)$/i.test(key)) {
		const targetComparable = comparisonComparable(targetValue);
		const candidateComparable = comparisonComparable(candidateValue.replace(/\s*\((?:detected|inferred)\s+(?:in|from)\s+title\)\s*$/i, ""));
		if (!targetComparable || !candidateComparable) return "unknown";
		if (targetComparable === candidateComparable) return "match";
		const targetUnusable = unusableState(targetValue);
		const candidateUnusable = unusableState(candidateValue);
		if (targetUnusable !== "unknown" && candidateUnusable !== "unknown" && targetUnusable !== candidateUnusable) return "different";
		const targetSealed = sealedState(targetValue);
		const candidateSealed = sealedState(candidateValue);
		if (targetSealed !== "unknown" && candidateSealed !== "unknown" && targetSealed !== candidateSealed) return "different";
		return "soft_difference";
	}
  if (category === "music" && /^(?:condition|mediaCondition)$/i.test(key)) {
    const target = musicMediaCondition(targetValue);
    const candidate = musicMediaCondition(candidateValue.replace(/\s*\((?:detected|inferred)\s+(?:in|from)\s+title\)\s*$/i, ""));
    return target && candidate ? target === candidate ? "match" : "different" : "unknown";
  }
  if (/^(?:isgraded|graded|gradingstatus|gradingstate)$/.test(normalizedFieldKey(key))) {
    const bare = (value: string) => value.replace(/\s*\((?:detected|inferred)\s+(?:in|from)\s+title\)\s*$/i, '');
    const a = determineExplicitGradingState({ isGraded: bare(targetValue) }).state;
    const b = determineExplicitGradingState({ isGraded: bare(candidateValue) }).state;
    return a === 'unknown' || b === 'unknown' || a === 'conflicted' || b === 'conflicted' ? 'unknown' : a === b ? 'match' : 'different';
  }
  if (category === "pokemon" && /^(?:cardNumber|cardNo|number)$/i.test(key)) {
    const compared = comparePokemonCardNumbers(targetValue, candidateValue);
    return compared === "partial" ? "unknown" : compared;
  }
  if (category === "vintage_toys" && /^(?:setNumber|pieceCount|numberOfPieces)$/i.test(key)) {
    const target = parseToyNumericValue(targetValue, key as ToyNumericField);
    const candidate = parseToyNumericValue(candidateValue, key as ToyNumericField);
    return target && candidate ? target.value === candidate.value ? "match" : "different" : "unknown";
  }
  if (/^(?:sealed|factorysealed|sealedstatus|sealstatus|complete|iscomplete|completeness|completeinbox|originalpackaging|originalboxincluded|isgraded|graded|authenticated|authenticationincluded|authenticationstatus|isauthenticated)$/.test(normalizedFieldKey(key))) {
    const a = metadataBooleanState(targetValue), b = metadataBooleanState(candidateValue);
    if (a && b) return a === b ? "match" : "different";
  }
  if (/^(?:grade|numericgrade|gamegrade)$/.test(normalizedFieldKey(key))) {
    return compareComparableGrades(targetValue, candidateValue, { allowBareNumeric: true, category });
  }
  const targetComparable = comparisonComparable(targetValue);
  const candidateComparable = comparisonComparable(candidateValue.replace(/\s*\((?:detected|inferred)\s+(?:in|from)\s+title\)\s*$/i, ""));
  // Autographs use Authentication Company (and, for legacy target records,
  // Custom Authentication Company). Keep these keys inside the company gate
  // so the category-specific UDA/Upper Deck equivalence below is reachable.
  return /^(?:certificationcompany|authenticationcompany|customauthenticationcompany|gradingcompany|grader)$/.test(normalizedFieldKey(key))
      && (videoGameGradersEquivalent(category, targetComparable, candidateComparable)
        || (category === 'autographs' && /^(?:authenticationcompany|customauthenticationcompany|certificationcompany)$/.test(normalizedFieldKey(key))
          && autographAuthenticationCompaniesEquivalent(targetComparable, candidateComparable)))
    ? "match" : targetComparable === candidateComparable ? "match" : "different";
}
export function buildMetadataFieldComparisons(targetMetadata: string, listing: VisualSourceCandidate): MetadataFieldComparison[] {
  const targetDetails = {
    ...extractTargetItemDetails(targetMetadata),
    ...parseTestAiDetails(metadataValue(targetMetadata, "fullItemDetails")),
  };
  const candidateDetails = candidateStructuredDetails(listing);
  const category = normalizedChoice(metadataValue(targetMetadata, "category"));
  const targetType = targetItemTypeValue(targetMetadata);
  const movieContext = category === 'movies' || normalizedFieldKey(targetType).includes('movie');
  const originalArtContext = category === 'comics' && /original(?:[_\s-]?art|artwork)/i.test(normalizedFieldKey(targetType));
  const comparisonCategory = originalArtContext ? 'original_art' : category;
  const isBoardGameTarget = category === "vintage_toys" && vintageToyTargetItemType(targetMetadata) === "board game/puzzle";
  const excluded = new Set(["image", "imageUrl", "imageUrls", "photos", "thumbnail", "titleEvidence", "normalizedStructuredMetadata"]);
  const isGradingField = (key: string) => /^(?:isgraded|graded|gradingstatus|gradingstate)$/.test(normalizedFieldKey(key));
  const keys = new Set<string>([
    ...(['video_games', 'movies', 'music', 'pokemon', 'vintage_toys', 'coins', 'paper_money', 'sports_cards', 'comics', 'stamps'].includes(category)
      || listing.metadataScoreAwards?.some(award => award.field === 'isGraded') ? ['isGraded'] : []),
    // Keep every field in the active Movie model visible, even when neither
    // side supplied it, so unavailable potential points are auditable.
    ...(category === 'movies' && movieTargetItemType(targetMetadata) === 'individual_movie'
      ? MOVIES_INDIVIDUAL_SCORE_FIELDS.map(([field]) => field) : []),
    ...(category === 'movies' && movieTargetItemType(targetMetadata) === 'box_set'
      ? MOVIES_BOX_SET_SCORE_FIELDS.map(([field]) => field) : []),
    ...rankingScoreFieldsForCategory(category, targetType).map(([field]) => field),
    ...Object.keys(targetDetails),
    ...Object.keys(candidateDetails),
    // Rule/composite terms may have no structured target/candidate key at all.
    // Their points still need a visible row without inventing a field value.
    ...(listing.metadataScoreAwards ?? []).filter((award) => award.awardedPoints > 0).map((award) => award.field),
    "itemType",
    "condition",
    "grade",
    "certificationCompany",
    "year",
  ]);
  if (isBoardGameTarget) {
    keys.add("gamePuzzleName");
    keys.add("completeness");
  }
  // Autographs use authenticationIncluded in the inventory form while the
  // scorer historically called the same fact authenticated. Keep one visible
  // row so an explicit target No cannot coexist with a second Unknown row.
  if (category === "autographs" && [...keys].some(key => /^(?:authenticationIncluded|authenticated|authenticationStatus|isAuthenticated)$/i.test(key))) {
    for (const key of [...keys]) {
      if (/^(?:authenticated|authenticationStatus|isAuthenticated)$/i.test(key)) keys.delete(key);
    }
    keys.add("authenticationIncluded");
  }
  // The listing title supplies evidence for specific metadata fields; it is
  // not itself a scored metadata field. Movie identity is the one deliberate
  // exception because the Movie model awards points on its canonical title row.
  if (!movieContext) keys.delete("title");
  // Movies expose the same product identity through both the generic listing
  // title and the category-specific movieTitle field. Prefer the canonical
  // movieTitle row so the comparison does not show the same value twice.
  if (category === 'movies' && [...keys].some(key => normalizedFieldKey(key) === 'movietitle')) keys.delete('title');
  // Certification company, grading company, and grader are the same semantic
  // field. Keep one canonical row so one recorded award is not rendered as a
  // MATCH with 0 points on a duplicate alias row.
  if ([...keys].some(key => /^(?:certificationcompany|gradingcompany|grader)$/i.test(normalizedFieldKey(key)))) {
    for (const key of [...keys]) {
      if (/^(?:gradingcompany|grader)$/i.test(normalizedFieldKey(key))) keys.delete(key);
    }
    keys.add('certificationCompany');
  }
  const rows: MetadataFieldComparison[] = [];
  const emittedFieldLabels = new Set<string>();
  for (const key of keys) {
    if (excluded.has(key) || /^(?:id|url|saleId|sourceId|providerReference|price|currency|date)$/i.test(key)) continue;
      const movieIdentity = movieContext && /^(?:title|movieTitle)$/i.test(key)
        && movieTargetItemType(targetMetadata) === 'individual_movie';
      const targetRaw = category === "autographs" && /^(?:authenticationIncluded|authenticated|authenticationStatus|isAuthenticated)$/i.test(key)
        ? autographTargetAuthenticationState(targetDetails)
        : movieIdentity
        ? firstMeaningfulValue(targetDetails.title, targetDetails.movieTitle, extractTargetTitle(targetMetadata))
        : originalArtContext && /^(?:artworkTitleCharacter|artworkTitle|character)$/i.test(key)
          ? firstMeaningfulValue(targetDetails.artworkTitleCharacter, targetDetails.artworkTitle, targetDetails.character)
        : firstMeaningfulValue(resolvedVisualFieldValue(metadataValue(targetMetadata, key), targetDetails, key), readMetadataValue(targetDetails, comparisonMetadataAliases(key)));
      const states = key === 'isGraded' ? explicitScoreGradingStates(targetMetadata, listing) : null;
      const stateDisplay = (state: ObservedExplicitGradingState | undefined, value: string) => state?.state === 'conflicted'
        ? `Conflicted (${state.observations.filter(observation => observation.state !== 'unknown').slice(0, 8)
          .map(observation => `${observation.field}=${observation.value.slice(0, 160)}`).join('; ')})` : value;
				const targetValue = stateDisplay(states?.target, comparisonValue(targetRaw));
      const candidateValue = stateDisplay(states?.candidate, movieIdentity
        ? comparisonValue(canonicalCandidateTitle(listing)) : comparisonCandidateFieldValue(listing, candidateDetails, key));
          const titleDerivedValue = isBoardGameTarget
          && /^(?:year|releaseYear)$/i.test(key)
          ? "Unknown" : comparisonTitleDerivedValue(listing, key, targetValue, comparisonCategory,
            /^(?:isgraded|graded|gradingstatus|gradingstate)$/.test(normalizedFieldKey(key)) ? explicitScoreGradingStates(targetMetadata, listing).candidateIdentityValues
              : category === "music" && /^(?:condition|mediaCondition)$/i.test(key) ? musicTargetConditionIdentityValues(targetMetadata) : []);
          const fieldLabel = movieContext && /^(?:title|movieTitle|boxSetName|seriesName)$/i.test(key)
            ? 'Movie title' : comparisonFieldLabel(key);
			const normalizedFieldLabel = fieldLabel.trim().toLowerCase();
				if (emittedFieldLabels.has(normalizedFieldLabel)) continue;
				emittedFieldLabels.add(normalizedFieldLabel);
              const rankingContributionBase = rankingContributionForField(listing, key, fieldLabel, candidateValue, titleDerivedValue, comparisonCategory, targetType);
                        const titleDerivedStatus = states?.candidate.state === 'conflicted' || states?.target.state === 'conflicted'
              ? 'unknown' : comparisonStatus(targetValue, titleDerivedValue, comparisonCategory, key);
						const rankingContribution = titleDerivedStatus === 'match' && rankingContributionBase?.matched && (rankingContributionBase.sources ?? []).includes('title')
              ? { ...rankingContributionBase, titleDerived: true } : rankingContributionBase;
						const structuredStatus = comparisonStatus(targetValue, candidateValue, category, key);
						const envelopeObject = category === 'autographs' && /^(?:signedItemType|autographItemType)$/i.test(key)
              && /\benvelopes?\b/i.test(canonicalCandidateTitle(listing));
            // Keep raw provider metadata visible, but compare the signed surface
            // identified by the envelope title, just as scoring/admission do.
					const finalStatus = envelopeObject ? titleDerivedStatus
	              : category === 'disney_pins' && /^(?:condition|mediaCondition)$/i.test(key) && structuredStatus === 'different'
	                ? 'soft_difference'
	                : structuredStatus === 'different' ? 'different' : titleDerivedStatus !== 'unknown' ? titleDerivedStatus : structuredStatus;
						rows.push({
						fieldKey: key,
          targetField: fieldLabel,
				targetValue,
				candidateField: fieldLabel,
			candidateValue,
							status: finalStatus,
							titleDerivedField: `${comparisonFieldLabel(key)} (from title)`,
							titleDerivedValue,
						titleDerivedStatus,
						rankingContribution,
				});
  }
			return boundedMetadataComparisonRows(normalizeModelPotentialPoints(rows, comparisonCategory, targetType));
}

/**
 * Final projection safeguard: every candidate sent to Test AI must carry a
 * comparison table. Existing non-empty rows are preserved; missing or empty
 * rows are rebuilt from structured metadata plus normalized title evidence.
 */
export function withMetadataFieldComparisons<T extends Record<string, any>>(targetMetadata: string, listing: T): T & { metadataFieldComparisons: MetadataFieldComparison[] } {
  const category = normalizedChoice(metadataValue(targetMetadata, "category"));
  const itemType = targetItemTypeValue(targetMetadata);
  const movieContext = category === 'movies' || category === 'movie' || normalizedFieldKey(itemType).includes('movie');
  // The live source payload can contain an older award snapshot even after the
  // title comparison rules have changed. Recompute Movie awards here, without
  // another provider/model call, so the final visible score and the candidate's
  // ranking payload come from the same deterministic scorer.
  const movieScoring = movieContext
    ? movieTargetItemType(targetMetadata) === 'box_set'
      ? moviesBoxSetVisualScore(listing as VisualSourceCandidate, targetMetadata)
      : moviesIndividualVisualScore(listing as VisualSourceCandidate, targetMetadata)
    : null;
  const existingAwards = Array.isArray(listing.metadataScoreAwards) ? listing.metadataScoreAwards : [];
  const existingAwardKeys = new Set(existingAwards.map((award: RankingAward) => rankingAwardFieldKey(award.field, category, itemType)));
  const missingMovieAwards = (movieScoring?.awards ?? []).filter((award) => !existingAwardKeys.has(rankingAwardFieldKey(award.field, category, itemType)));
  const mergedAwards = [...existingAwards, ...missingMovieAwards];
  const refreshedMovieScore = movieScoring
    ? existingAwards.length
      ? Number(listing.metadataMatchScore ?? 0) + missingMovieAwards.reduce((sum, award) => sum + award.awardedPoints, 0)
      : movieScoring.score
    : undefined;
  const projectionListing = movieScoring ? {
    ...listing,
    metadataMatchScore: refreshedMovieScore,
    metadataMatchReasons: [...new Set([...(listing.metadataMatchReasons ?? []), ...missingMovieAwards.map((award) => award.field)])],
    metadataUnknownFields: movieScoring.unknown ?? [],
    metadataScoreAwards: mergedAwards,
  } as T : listing;
  const fresh = buildMetadataFieldComparisons(targetMetadata, projectionListing as VisualSourceCandidate);
  const existing = Array.isArray(listing.metadataFieldComparisons) && listing.metadataFieldComparisons.length
    ? listing.metadataFieldComparisons as MetadataFieldComparison[] : fresh;
  const canonicalComparisonKey = (field: string): string => movieContext
    && /^(?:title|movieTitle|boxSetName|seriesName)$/i.test(field) ? 'movieTitle' : normalizedFieldKey(field);
  const comparisonQuality = (row: MetadataFieldComparison): number => [row.targetValue, row.candidateValue, row.titleDerivedStatus === 'match' ? row.titleDerivedValue : ''].filter(value => meaningfulMetadataText(value)).length;
  const freshByKey = new Map(fresh.map((row) => [normalizedFieldKey(row.fieldKey ?? row.targetField), row]));
  const freshByLabel = new Map(fresh.map((row) => [normalizedFieldKey(row.targetField), row]));
  const rows: MetadataFieldComparison[] = existing.map((previous) => {
    const key = previous.fieldKey ?? previous.targetField;
    const replacement = freshByKey.get(normalizedFieldKey(key)) ?? freshByLabel.get(normalizedFieldKey(previous.targetField));
    const row = replacement ? { ...previous, ...replacement } : { ...previous };
    return { ...row, rankingContribution: rankingContributionForField(projectionListing as VisualSourceCandidate,
      row.fieldKey ?? row.targetField, row.targetField, row.candidateValue, row.titleDerivedValue, category, itemType) };
  });
  const present = new Set(rows.map((row) => normalizedFieldKey(row.fieldKey ?? row.targetField)));
  for (const row of fresh) {
    if (!present.has(canonicalComparisonKey(row.fieldKey ?? row.targetField))) rows.push(row);
  }
  const deduplicated = rows.reduce<MetadataFieldComparison[]>((result, row) => {
    const canonical = canonicalComparisonKey(row.fieldKey ?? row.targetField);
    const duplicateIndex = result.findIndex(existingRow => canonicalComparisonKey(existingRow.fieldKey ?? existingRow.targetField) === canonical);
    if (duplicateIndex < 0) {
      result.push(row);
      return result;
    }
    // Keep the richer transport row (usually the one with the real target and
    // candidate values) so the single award is visible on the matched row,
    // rather than stranded on a synthetic alias row with Unknown values.
    if (comparisonQuality(row) > comparisonQuality(result[duplicateIndex])) result[duplicateIndex] = row;
    return result;
  }, []);
  const normalizedPotentialRows = normalizeModelPotentialPoints(deduplicated, category, itemType);
  return { ...projectionListing, metadataFieldComparisons: boundedMetadataComparisonRows(normalizedPotentialRows) } as T & { metadataFieldComparisons: MetadataFieldComparison[] };
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

type ParsedComparableGrade = ComparableGrade | null;
function parsedComparableGrade(value: unknown, options: ComparableGradeOptions = {}): ParsedComparableGrade {
  return parseComparableGrade(value, options);
}
function universalGradeConflict(targetMetadata: string, candidate: NormalizedVisualSourceCandidate): string | null {
  const category = normalizedChoice(metadataValue(targetMetadata, "category"));
  if (category === "disney_pins") return null;
  if (targetExplicitGradingState(targetMetadata) !== "graded" || candidateExplicitGradingState(candidate) !== "graded") return null;
  const targetValue = metadataValue(targetMetadata, "grade");
  const target = parsedComparableGrade(targetValue, { allowBareNumeric: true, category });
  const structured = parsedComparableGrade(candidate.grade, { allowBareNumeric: true, category });
  const title = parseSourceGradeFromTitle(candidate.title, { category });
  if (!target) return null;
  const opposingStructuredGrade = findStructuredGradeConflict(targetValue, candidate.details, { category });
  if (opposingStructuredGrade) return `Grade differs: target explicitly declares ${targetValue}, but the candidate explicitly declares ${opposingStructuredGrade}.`;
  // Both channels remain independent; matching title text cannot erase an
  // explicitly contrary provider grade and vice versa.
  for (const observed of [{ grade: structured, value: candidate.grade }, { grade: title?.comparable, value: title?.grade }]) {
    if (observed.grade && compareComparableGrades(target, observed.grade, { allowBareNumeric: true, category }) === "different") {
      return `Grade differs: target explicitly declares ${targetValue}, but the candidate explicitly declares ${observed.value}.`;
    }
  }
  return null;
}

function normalizedGrader(value: unknown): string {
  return meaningfulMetadataText(value).replace(/\s*(?:comics|cards|grading)$/i, "").trim().toUpperCase();
}

function targetGrader(targetMetadata: string): string {
  const details = extractTargetItemDetails(targetMetadata);
  const configured = normalizedGrader(metadataValue(targetMetadata, "certificationCompany"));
  const custom = normalizedGrader(readMetadataValue(details, ["customGradingCompany", "customCertificationCompany", "otherGradingCompany"]));
  return configured || normalizedGrader(readMetadataValue(details, ["certificationCompany", "gradingCompany", "grader"])) || custom;
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
  contextCodes: Map<number, "universal_duplicate_hold" | "universal_pre_visual_hold">;
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
  const contextCodes = new Map<number, "universal_duplicate_hold" | "universal_pre_visual_hold">();
  normalized.forEach((candidate, index) => {
    if (candidate.providerReference) {
      const canonicalIndex = canonicalIndexByReference.get(candidate.providerReference);
      if (canonicalIndex !== undefined) {
        mergedImages[canonicalIndex] = Array.from(new Set([...mergedImages[canonicalIndex], ...candidate.imageUrls])).slice(0, 8);
        contextReasons.set(index, "Universal duplicate filter: same provider record reference as an earlier candidate; retained as context-only and not sent to visual review.");
        contextCodes.set(index, "universal_duplicate_hold");
        return;
      }
      canonicalIndexByReference.set(candidate.providerReference, index);
    }
    const conflict = universalCandidateConflict(targetMetadata, candidate);
    if (conflict) {
      contextReasons.set(index, `${conflict} Retained as context-only before visual review.`);
      contextCodes.set(index, "universal_pre_visual_hold");
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
    contextCodes,
  };
}

function targetExplicitGradingState(targetMetadata: string): ExplicitGradingState {
  const details = extractTargetItemDetails(targetMetadata);
  const structured = explicitGradingState(metadataValue(targetMetadata, "isGraded") || readMetadataValue(details, ["isGraded", "graded", "gradingStatus"]));
  if (structured) return structured;
  const grade = metadataValue(targetMetadata, "grade");
  const grader = metadataValue(targetMetadata, "certificationCompany");
  return grade && !/^(?:unknown|raw|ungraded|none|n\/?a)$/i.test(grade) || grader && !/^(?:unknown|raw|ungraded|none|n\/?a)$/i.test(grader)
    ? "graded"
    : null;
}

function candidateExplicitGradingState(listing: VisualSourceCandidate): ExplicitGradingState {
  const details = candidateStructuredDetails(listing);
  const structured = explicitGradingState(readMetadataValue(details, ["isGraded", "graded", "gradingStatus"]));
  if (structured) return structured;
  const candidateGrade = readMetadataValue(details, ["grade", "numericGrade", "finalGrade", "professionalGrade"]);
  const candidateGrader = readMetadataValue(details, ["certificationCompany", "gradingCompany", "grader"]);
  if (candidateGrade && candidateGrader && !/^(?:raw|ungraded|unknown|none|n\/?a)$/i.test(candidateGrade) && !/^(?:raw|ungraded|unknown|none|n\/?a)$/i.test(candidateGrader)) return "graded";
  const title = canonicalCandidateTitle(listing);
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
  if (/unopened_product|box_set|sealed_box|bundle|product/.test(normalized)) return "unopened_product";
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
  if (/^(?:factory_sealed|sealed)$/.test(normalized) || /factory_sealed/.test(normalized)) return "sealed";
  if (/^(?:cib|complete_in_box)$/.test(normalized) || /complete_in_box|\bcib\b/.test(normalized)) return "cib";
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
  if (/incomplete|missing_parts/.test(normalized)) return "incomplete";
  if (/^(?:sealed|factory_sealed)$/.test(normalized) || /factory_sealed/.test(normalized)) return "sealed";
  if (/opened|loose/.test(normalized)) return "loose";
  if (/complete|cib/.test(normalized)) return "complete";
  return null;
}

function vintageToyTitleProductForm(title: string): ProductForm {
  if (/\bfactory\s+sealed\b/i.test(title)) return "sealed";
  if (/\b(?:opened|previously\s+opened)\b/i.test(title)) return "loose";
  const completeness = titleCompletenessState(title);
  if (completeness === "no") return "incomplete";
  if (completeness === "yes") return "complete";
  return null;
}

function affirmativeFormValue(value: unknown): boolean {
  return /^(?:yes|true|1)$/i.test(String(value ?? "").trim());
}
function negativeFormValue(value: unknown): boolean {
  return /^(?:no|false|0)$/i.test(String(value ?? "").trim());
}
function targetProductForm(targetMetadata: string): ProductForm {
  const category = normalizedChoice(metadataValue(targetMetadata, "category"));
  const details = extractTargetItemDetails(targetMetadata);
  const targetType = metadataValue(targetMetadata, "itemType") || readMetadataValue(details, ["itemType", "productType", "form"]);
  if (category === "sports_cards") return sportsCardProductForm(targetType);
  if (category === "video_games") {
    const sealed = readMetadataValue(details, ["sealed", "factorySealed", "sealedStatus"]);
    if (affirmativeFormValue(sealed)) return "sealed";
    const packageForm = videoGameProductForm(readMetadataValue(details, ["packageStatus", "packaging", "sealedStatus"]) || targetType);
    if (packageForm === "sealed" && !negativeFormValue(sealed)) return "sealed";
    if (affirmativeFormValue(readMetadataValue(details, ["completeInBox", "complete", "isComplete"]))) return "cib";
    return packageForm;
  }
  if (category === "vintage_toys") {
    const sealed = readMetadataValue(details, ["sealed", "factorySealed", "sealedStatus"]);
    if (affirmativeFormValue(sealed)) return "sealed";
    const completeness = readMetadataValue(details, ["complete", "isComplete", "completeness", "completeInBox"]);
    if (affirmativeFormValue(completeness)) return "complete";
    if (negativeFormValue(completeness)) return "incomplete";
    return vintageToyProductForm(readMetadataValue(details, ["sealedStatus", "packagingType", "packageType"]) || completeness);
  }
  return null;
}

function candidateProductForm(targetMetadata: string, listing: VisualSourceCandidate): ProductForm {
  const category = normalizedChoice(metadataValue(targetMetadata, "category"));
  const details = candidateStructuredDetails(listing);
  const structured = candidateMetadataValue(listing, details, ["itemType", "productType", "form", "saleForm"]);
  const title = canonicalCandidateTitle(listing);
  if (category === "sports_cards") return sportsCardProductForm(structured) ?? sportsCardTitleProductForm(title);
  if (category === "video_games") {
    const sealed = candidateMetadataValue(listing, details, ["sealed", "factorySealed", "sealedStatus"]);
    if (affirmativeFormValue(sealed)) return "sealed";
    const packageForm = videoGameProductForm(candidateMetadataValue(listing, details, ["packageStatus", "packaging", "sealedStatus"]) || structured);
    const titleForm = videoGameTitleProductForm(title);
    if (!negativeFormValue(sealed) && (packageForm === "sealed" || titleForm === "sealed")) return "sealed";
    const complete = candidateMetadataValue(listing, details, ["completeInBox", "complete", "isComplete", "completeness"]);
    if (affirmativeFormValue(complete)) return "cib";
    return videoGameProductForm(complete)
      ?? (negativeFormValue(sealed) && packageForm === "sealed" ? null : packageForm)
      ?? (negativeFormValue(sealed) && titleForm === "sealed" ? null : titleForm);
  }
  if (category === "vintage_toys") {
    const sealed = candidateMetadataValue(listing, details, ["sealed", "factorySealed", "sealedStatus"]);
    if (affirmativeFormValue(sealed)) return "sealed";
    const complete = candidateMetadataValue(listing, details, ["complete", "isComplete", "completeness", "completeInBox"]);
    if (affirmativeFormValue(complete)) return "complete";
    if (negativeFormValue(complete)) return "incomplete";
    return vintageToyProductForm(candidateMetadataValue(listing, details, ["sealedStatus", "packagingType", "packageType"]) || complete || structured) ?? vintageToyTitleProductForm(title);
  }
  return null;
}

function videoGameTargetItemType(targetMetadata: string): string {
  return targetItemTypeValue(targetMetadata);
}
function videoGameItemTypeLabel(value: string): string {
  if (/^(?:game|video_game|video_games_game)$/.test(value)) return "game";
  if (/box_set|bundle|multi_game|sealed_product|product/.test(value)) return "game";
  if (/^(?:console|video_game_console)$/.test(value)) return "console";
  if (/^(?:accessory|video_game_accessory)$/.test(value)) return "accessory";
  if (/collection|lot/.test(value)) return "collection/lot";
  return "";
}
/** Canonical Video Games target type ("game" | "console" | "accessory" | "collection/lot" | ""). */
export function videoGameTargetTypeLabel(targetMetadata: string): string {
  return videoGameItemTypeLabel(videoGameTargetItemType(targetMetadata));
}
function videoGameCandidateItemType(listing: VisualSourceCandidate): string {
  const details = candidateStructuredDetails(listing);
  const structured = videoGameItemTypeLabel(normalizedChoice(listing.itemType ?? listing.productType ?? listing.form ?? listing.saleForm ?? details.itemType ?? details.productType ?? details.form ?? ""));
  if (structured) return structured;
  const title = canonicalCandidateTitle(listing);
  if (/\b(?:manual|instruction booklet|box|case)\s+only\b/i.test(title)) return "accessory";
  if (/\b(?:console|system|hardware)\s+only\b/i.test(title)) return "console";
  if (/\b(?:controller|gamepad|memory card|power adapter|ac adapter|cable|cord)\b/i.test(title)) return "accessory";
  return "";
}
function videoGameCanonicalValue(value: unknown): string {
  return normalizedChoice(value)
    .replace(/^nintendo_/, "")
    .replace(/_system$/, "")
    .replace(/_console$/, "")
    .replace(/_edition$/, "");
}
function videoGameValuesAgree(targetValue: unknown, candidateValue: unknown, label: string): boolean {
  if (["sealed", "complete in box", "is graded"].includes(label.toLowerCase())) {
    const a = metadataBooleanState(targetValue), b = metadataBooleanState(candidateValue);
    if (a && b) return a === b;
  }
  const target = videoGameCanonicalValue(targetValue);
  const candidate = videoGameCanonicalValue(candidateValue);
  if (!target || !candidate) return true;
  if (target === candidate) return true;
  if (!(label.includes("title") || label.includes("name"))) return false;
  const targetTokens = target.split(/[^a-z0-9]+/).filter((token) => token.length > 1 && !["the", "game", "video"].includes(token));
  const candidateTokens = candidate.split(/[^a-z0-9]+/).filter(Boolean);
  return targetTokens.length > 0 && targetTokens.every((token) => candidateTokens.includes(token));
}
function videoGameCandidateValue(listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[] = []): string {
  const details = candidateStructuredDetails(listing);
  const structured = candidateMetadataValue(listing, details, aliases);
  if (structured) return structured;
  const title = canonicalCandidateTitle(listing);
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match?.[1]) return match[1];
    if (match?.[0]) return match[0];
  }
  return "";
}
function videoGameAccessoryMetadataKey(value: unknown): string {
  return String(value ?? "").trim().replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase().replace(/[^a-z0-9]+/g, "_");
}
function videoGameAccessoryDetails(listing: VisualSourceCandidate): Record<string, unknown> {
  const details: Record<string, unknown> = { ...candidateStructuredDetails(listing) };
  const add = (key: unknown, value: unknown) => {
    const normalizedKey = videoGameAccessoryMetadataKey(key);
    if (!normalizedKey || value == null || !String(value).trim()) return;
    if (details[normalizedKey] == null) details[normalizedKey] = value;
  };
  const collect = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (!entry || typeof entry !== "object") continue;
        const record = entry as Record<string, unknown>;
        const key = record.name ?? record.Name ?? record.key ?? record.label ?? record.propertyName;
        const fieldValue = record.value ?? record.Value ?? record.values ?? record.propertyValue;
        if (key != null && fieldValue != null) add(key, Array.isArray(fieldValue) ? fieldValue.join(", ") : fieldValue);
        else collect(entry);
      }
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (child && typeof child === "object") collect(child);
      else add(key, child);
    }
  };
  collect(listing.itemSpecifics ?? listing.item_specifics ?? listing.aspects ?? listing.specifics);
  for (const [key, value] of Object.entries(listing)) {
    if (!["itemSpecifics", "item_specifics", "aspects", "specifics"].includes(key)) add(key, value);
  }
  return details;
}
function videoGameAccessoryValue(listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[] = []): string {
  const details = videoGameAccessoryDetails(listing);
  for (const alias of aliases) {
    const value = listing[alias] ?? details[alias] ?? details[videoGameAccessoryMetadataKey(alias)];
    if (value != null && String(value).trim()) return String(value);
  }
  const title = canonicalCandidateTitle(listing);
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match?.[1]) return match[1];
    if (match?.[0]) return match[0];
  }
  return "";
}
function videoGameFunctionalConditionValue(listing: VisualSourceCandidate): string {
  const details = videoGameAccessoryDetails(listing);
  const raw = listing.condition ?? details.condition ?? details.itemCondition ?? details.item_condition;
  const normalized = videoGameAccessoryCanonicalValue(raw);
  return /^(?:working|not_working|untested)$/.test(normalized) ? String(raw) : "";
}
function videoGameAccessoryCanonicalValue(value: unknown): string {
  const normalized = videoGameCanonicalValue(value);
  if (/^(?:tested|tested_working|fully_tested|works|working_properly|functional|functional_working)$/.test(normalized)) return "working";
  if (/^(?:for_parts|for_parts_or_not_working|not_working|broken|nonworking|does_not_work)$/.test(normalized)) return "not_working";
  if (/^(?:untested|not_tested|as_is|as_is_untested)$/.test(normalized)) return "untested";
  if (/^(?:game_controller|video_game_controller|gamepad|joypad)$/.test(normalized)) return "controller";
  return normalized;
}
function videoGameAccessoryValuesAgree(targetValue: unknown, candidateValue: unknown, label: string): boolean {
  if (label === "original packaging") {
    const state = (value: unknown) => {
      const normalized = videoGameAccessoryCanonicalValue(value);
      if (/^(?:yes|true|1|original_packaging|original_box|included|with_packaging|with_box|open_box|boxed|complete_with_box|complete_with_manuals|with_manuals)$/.test(normalized)) return "yes";
      if (/^(?:no|false|0|no_packaging|no_box|missing|without_packaging|without_box)$/.test(normalized)) return "no";
      return normalized;
    };
    return state(targetValue) === state(candidateValue);
  }
  if (["accessory type", "accessory name", "manufacturer"].includes(label) && titleContainsValue(candidateValue, targetValue)) return true;
  const target = videoGameAccessoryCanonicalValue(targetValue);
  const candidate = videoGameAccessoryCanonicalValue(candidateValue);
  return target === candidate || videoGameValuesAgree(targetValue, candidateValue, label);
}
function videoGameItemTypeConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  const targetType = videoGameItemTypeLabel(videoGameTargetItemType(targetMetadata));
  if (!targetType || targetType === "collection/lot") return null;
  const candidateType = videoGameCandidateItemType(listing);
  if (candidateType && candidateType !== targetType) {
    return `Video Game item type differs: target is ${targetType}, but the candidate is explicitly ${candidateType}.`;
  }
  return null;
}

function videoGameProductRoleConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  const targetType = videoGameItemTypeLabel(videoGameTargetItemType(targetMetadata));
  if (!targetType || targetType === "collection/lot") return null;
  const candidate = normalizeVisualSourceCandidate(listing);
  const evidence = classifyMarketplaceProductRole(candidate.title);
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const targetIdentity = normalizedChoice(
    targetDetails.accessoryName
      ?? targetDetails.gameTitle
      ?? targetDetails.consoleName
      ?? extractTargetTitle(targetMetadata),
  );
  if (evidence.role === "replacement_part") {
    return `Video Game product role differs: the candidate title identifies a replacement or spare component (${evidence.matchedTerms.join(", ")}), not the complete target item.`;
  }
  if (evidence.role === "compatibility_only") {
    return `Video Game product role is unresolved: the candidate title describes compatibility with another product (${evidence.matchedTerms.join(", ")}) rather than clearly identifying the target item.`;
  }
  if (evidence.role === "packaging_only" && !/\b(?:box|case|packaging|package)\b/.test(targetIdentity)) {
    return `Video Game product role differs: the candidate title identifies packaging only (${evidence.matchedTerms.join(", ")}), not the target item.`;
  }
  if (evidence.role === "manual_only" && !/\b(?:manual|instruction|booklet|guide)\b/.test(targetIdentity)) {
    return `Video Game product role differs: the candidate title identifies a manual or instructions only (${evidence.matchedTerms.join(", ")}), not the target item.`;
  }
  if (evidence.role === "reproduction") {
    return `Video Game product role differs: the candidate title explicitly identifies a reproduction (${evidence.matchedTerms.join(", ")}).`;
  }
  return null;
}

function videoGameIdentityConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  const category = normalizedChoice(metadataValue(targetMetadata, "category"));
  if (category !== "video_games") return null;
  const targetType = videoGameItemTypeLabel(videoGameTargetItemType(targetMetadata));
  if (!targetType || targetType === "collection/lot") return null;
  const details = extractTargetItemDetails(targetMetadata);
  const typeConflict = videoGameItemTypeConflict(targetMetadata, listing);
  if (typeConflict) return typeConflict;
  const productRoleConflict = videoGameProductRoleConflict(targetMetadata, listing);
  if (productRoleConflict) return productRoleConflict;
  const checks: Array<[unknown, string, string[], RegExp[]]> = [];
  if (targetType === "game") {
    checks.push([details.gameTitle ?? extractTargetTitle(targetMetadata), "game title", ["gameTitle", "title"], []]);
    checks.push([details.platform, "platform", ["platform", "consoleName"], [/\b(NES|SNES|N64|GameCube|Wii(?:\s+U)?|Switch(?:\s+2)?|PlayStation|PS[1-5]|Xbox(?:\s+(?:360|One|Series\s+X\/S))?|Sega(?:\s+Master\s+System)?|Genesis|Saturn|Dreamcast|PC)\b/i]]);
    checks.push([details.releaseYear ?? details.year, "release year", ["releaseYear", "year"], [/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/]]);
    checks.push([details.region, "region", ["region"], [/\b(NTSC-U|NTSC-J|PAL|Region Free)\b/i]]);
    checks.push([details.edition, "edition", ["edition", "releaseType"], []]);
    checks.push([details.upc ?? details.ean, "UPC/EAN", ["upc", "ean", "barcode"], []]);
  } else if (targetType === "console") {
    checks.push([details.consoleName ?? extractTargetTitle(targetMetadata), "console name", ["consoleName", "platform"], [/\b(NES|SNES|N64|GameCube|Wii(?:\s+U)?|Switch(?:\s+2)?|Sega Genesis|Sega Saturn|Dreamcast|PS[1-5]|Xbox(?:\s+(?:360|One|Series\s+X\/S))?)\b/i]]);
    checks.push([details.modelNumber, "model number", ["modelNumber", "model", "sku"], []]);
    checks.push([details.region, "region", ["region"], [/\b(NTSC-U|NTSC-J|PAL|Region Free)\b/i]]);
    checks.push([details.workingCondition, "working condition", ["workingCondition", "functionality", "tested"], [/(\bWorking\b|\bNot Working\b|\bUntested\b)/i]]);
  } else if (targetType === "accessory") {
    checks.push([details.accessoryType, "accessory type", ["accessoryType", "type", "accessory_type", "itemType"], []]);
    checks.push([details.accessoryName, "accessory name", ["accessoryName", "name", "accessory_name", "modelName", "title"], []]);
    checks.push([details.platform, "compatible platform", ["platform", "compatiblePlatform", "compatibleSystem", "console", "system"], [/(?:NES|SNES|N64|GameCube|Wii(?:\s+U)?|Switch(?:\s+2)?|PlayStation|PS[1-5]|Xbox|Sega|PC)\b/i]]);
    checks.push([details.manufacturer, "manufacturer", ["manufacturer", "brand", "maker"], []]);
    checks.push([details.workingCondition, "working condition", ["workingCondition", "functionality", "tested", "working_status"], [/(\bWorking\b|\bTested\b|\bNot Working\b|\bFor Parts\b|\bUntested\b)/i]]);
    checks.push([details.originalPackaging, "original packaging", ["originalPackaging", "packaging", "packageType", "boxIncluded"], [/(\bOriginal Packaging\b|\bOriginal Box\b|\bOpen Box\b|\bWith Box\b|\bBoxed\b|\bComplete with (?:Box|Manuals?|Instructions?)\b|\bWith (?:Manuals?|Instructions?)\b|\bNo Packaging\b|\bNo Box\b)/i]]);
  }
  for (const [targetValue, label, aliases, patterns] of checks) {
    const targetComparable = videoGameCanonicalValue(targetValue);
    if (!targetComparable || /^(unknown|n_a|na|none|not_applicable)$/.test(targetComparable)) continue;
    const titleConfirmsSpecificAccessoryField = targetType === "accessory"
      && ["accessory type", "accessory name", "manufacturer"].includes(label)
      && titleContainsValue(normalizeVisualSourceCandidate(listing).title, targetValue);
    const candidateRawValue = targetType === "accessory"
      ? (titleConfirmsSpecificAccessoryField
        ? String(targetValue)
        : (videoGameAccessoryValue(listing, aliases, patterns) || (label === "working condition" ? videoGameFunctionalConditionValue(listing) : "")))
      : videoGameCandidateValue(listing, aliases, patterns);
    const candidateValue = targetType === "accessory" ? videoGameAccessoryCanonicalValue(candidateRawValue) : videoGameCanonicalValue(candidateRawValue);
    if (!candidateValue || /^(unknown|n_a|na|none|not_applicable)$/.test(candidateValue)) continue;
    const agrees = targetType === "accessory"
      ? videoGameAccessoryValuesAgree(targetValue, candidateRawValue, label)
      : videoGameValuesAgree(targetValue, candidateRawValue, label);
    if (!agrees) return `Video Game ${label} differs: target is ${String(targetValue)}, but the candidate explicitly declares ${String(candidateRawValue)}.`;
  }
  return null;
}
function explicitProductFormConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  const targetForm = targetProductForm(targetMetadata);
  const candidateForm = candidateProductForm(targetMetadata, listing);
  if (!targetForm || !candidateForm || targetForm === candidateForm) return null;
  // Toy completeness is independent of unopened/packaging form. A complete
  // target may also be sealed; incomplete versus complete remains blocking.
  if (normalizedChoice(metadataValue(targetMetadata, "category")) === "vintage_toys"
    && [targetForm, candidateForm].includes("complete")
    && ![targetForm, candidateForm].includes("incomplete")) return null;
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
  const title = canonicalCandidateTitle(listing);
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
  const title = canonicalCandidateTitle(listing);
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
  const title = canonicalCandidateTitle(listing);
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

function musicTargetConditionIdentityValues(targetMetadata: string): unknown[] {
  const details = extractTargetItemDetails(targetMetadata);
  return [details.artist, details.performer, details.artistName, details.releaseTitle, details.album, details.albumTitle,
    !readMetadataValue(details, ["releaseTitle", "album", "albumTitle"]) ? extractTargetTitle(targetMetadata) : ""];
}

function musicTitleMediaCondition(listing: VisualSourceCandidate, targetIdentityValues: readonly unknown[] = []): MusicMediaCondition {
  const details = candidateStructuredDetails(listing);
  const normalize = (value: unknown) => meaningfulMetadataText(value).toLowerCase()
    .replace(/\b(?:isn['’]t|aren['’]t|wasn['’]t|weren['’]t)\b/g, "not")
    .replace(/[^a-z0-9]+/g, " ").trim();
  let title = normalize(canonicalCandidateTitle(listing));
  // A known artist or album (e.g. "Sealed With a Kiss") is identity,
  // not a seller declaration. Mask one occurrence, leaving a separate
  // trailing condition declaration available as independent evidence.
  const identityKeys = ["artist", "performer", "artistName", "releaseTitle", "album", "albumTitle"];
  const identities = [...new Set([
    ...identityKeys.map((key) => details[key]), ...targetIdentityValues,
  ].map(normalize).filter((value) => /\b(?:sealed|excellent|good\s+condition|fair\s+condition|for\s+parts|parts\s+only)\b/.test(value)))].sort((a, b) => b.length - a.length);
  for (const identity of identities) {
    const pattern = new RegExp(`\\b${identity}\\b`, "g");
    for (const match of title.matchAll(pattern)) {
      const index = match.index ?? 0;
      // A bare album name "Sealed" must not consume "Factory Sealed".
      if (identity === "sealed" && /\b(?:factory|new)\s+$/.test(title.slice(0, index))) continue;
      title = title.slice(0, index) + " ".repeat(match[0].length) + title.slice(index + match[0].length);
      break;
    }
  }
  const declares = (pattern: RegExp) => [...title.matchAll(pattern)].some((match) => {
    const prefix = title.slice(0, match.index ?? 0);
    return !/\b(?:not|no|never|without|un|non|no\s+longer|not\s+for|not\s+(?:sold|selling|listed|intended|just|only|available)(?:\s+(?:as|for))?)\s+$/.test(prefix);
  });
  if (declares(/\b(?:factory\s+sealed|new\s+sealed|sealed)\b/g)) return "sealed";
  if (declares(/\b(?:for\s+parts|parts\s+only)\b/g)) return "for_parts";
  if (declares(/\bexcellent\b/g)) return "excellent";
  if (declares(/\bgood\s+condition\b/g)) return "good";
  if (declares(/\bfair\s+condition\b/g)) return "fair";
  return null;
}

function musicCandidateMediaCondition(listing: VisualSourceCandidate, targetMetadata = ""): MusicMediaCondition {
  const details = candidateStructuredDetails(listing);
  const structured = musicMediaCondition(candidateMetadataValue(listing, details, ["condition", "mediaCondition"]));
  // Keep an explicit structured hard state authoritative, including a
  // contradiction with the title. Only subjective grades yield to title states.
  if (structured === "sealed" || structured === "for_parts") return structured;
  const titleCondition = musicTitleMediaCondition(listing, targetMetadata ? musicTargetConditionIdentityValues(targetMetadata) : []);
  if (titleCondition === "sealed" || titleCondition === "for_parts") return titleCondition;
  return structured ?? titleCondition;
}

function musicMediaConditionConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (normalizedChoice(metadataValue(targetMetadata, "category")) !== "music") return null;
  const details = extractTargetItemDetails(targetMetadata);
  const targetCondition = musicMediaCondition(details.condition ?? details.mediaCondition ?? metadataValue(targetMetadata, "condition"));
  const candidateCondition = musicCandidateMediaCondition(listing, targetMetadata);
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

function musicItemTypeLabel(value: unknown): string {
  const normalized = normalizedChoice(value);
  if (/^(?:vinyl|vinyl_record|record|lp|ep)$/.test(normalized)) return "vinyl record";
  if (/^(?:cassette|cassette_tape|audio_cassette)$/.test(normalized)) return "cassette tape";
  if (/^(?:cd|compact_disc|compact_disk)$/.test(normalized)) return "compact disc";
  if (/^(?:8_track|eight_track|eight_track_tape|8_track_tape)$/.test(normalized)) return "8-track tape";
  if (/box_set|bundle|multi_disc|product/.test(normalized)) return "other music format";
  if (/other_music_format|other_format/.test(normalized)) return "other music format";
  if (/collection|lot/.test(normalized)) return "collection/lot";
  return "";
}

function musicCandidateFormat(listing: VisualSourceCandidate): string {
  const details = candidateStructuredDetails(listing);
  const explicit = musicItemTypeLabel(listing.itemType ?? listing.format ?? listing.productType ?? details.itemType ?? details.format ?? details.productType);
  if (explicit) return explicit;
  const title = canonicalCandidateTitle(listing);
  if (/\b(?:8[- ]?track|eight[- ]?track)\b/i.test(title)) return "8-track tape";
  if (/\b(?:compact disc|compact disk|audio CD|CD)\b/i.test(title)) return "compact disc";
  if (/\b(?:cassette|audio tape|tape)\b/i.test(title)) return "cassette tape";
  if (/\b(?:vinyl|LP|12-inch|10-inch|7-inch|45 RPM|33 RPM|78 RPM)\b/i.test(title)) return "vinyl record";
  return "";
}

function musicComparableValue(value: unknown): string {
  return normalizeComparableNumberWords(candidateText(value).toLowerCase()).replace(/[’']/g, "").replace(/[_-]+/g, " ").replace(/[^a-z0-9]+/g, "").trim();
}

function musicExplicitValue(details: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = details[key] ?? labeledCandidateValue(details, [key]);
    if (value !== undefined && value !== null && candidateText(value)) return candidateText(value);
  }
  return "";
}

function musicValuesConflict(targetValue: unknown, candidateValue: unknown): boolean {
  const target = musicComparableValue(targetValue);
  const candidate = musicComparableValue(candidateValue);
  if (!target || !candidate) return false;
  return target !== candidate && !target.includes(candidate) && !candidate.includes(target);
}

function musicIdentityConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (normalizedChoice(metadataValue(targetMetadata, "category")) !== "music") return null;
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const targetType = musicItemTypeLabel(targetItemTypeValue(targetMetadata) || targetDetails.format);
  if (!targetType || targetType === "collection/lot") return null;
  const candidateDetails = candidateStructuredDetails(listing);
  const candidateType = musicCandidateFormat(listing);
  if (candidateType && candidateType !== targetType && targetType !== "other music format") {
    return `Music format differs: target is ${targetType}, but the candidate explicitly indicates ${candidateType}.`;
  }
  const checks: Array<[string, string, string[]]> = [
    ["artist", "artist", ["artist", "performer", "artistName"]],
    ["release title", "releaseTitle", ["releaseTitle", "album", "albumTitle", "title"]],
    ["record label", "recordLabel", ["recordLabel", "label"]],
    ["catalog number", "catalogNumber", ["catalogNumber", "catalogNo", "catNo"]],
    ["country", "country", ["country", "countryOfRelease", "pressingCountry"]],
    ["release year", "releaseYear", ["releaseYear", "year"]],
    ["edition or variant", "edition", ["edition", "variant", "pressing"]],
    ["pressing details", "pressingDetails", ["pressingDetails", "matrixRunout", "matrix", "runout"]],
  ];
  for (const [label, targetKey, candidateKeys] of checks) {
    const targetValue = targetDetails[targetKey] ?? (targetKey === "releaseTitle" ? extractTargetTitle(targetMetadata) : metadataValue(targetMetadata, targetKey));
    const candidateValue = musicExplicitValue(candidateDetails, ...candidateKeys);
    if (musicValuesConflict(targetValue, candidateValue)) {
      return `Music ${label} differs: the candidate explicitly declares a different ${label}.`;
    }
  }
  return null;
}

function vintageToyItemTypeLabel(value: unknown): string {
  const normalized = normalizedChoice(value);
  if (/action_figure|doll/.test(normalized)) return "action figure/doll";
  if (/board_game|puzzle/.test(normalized)) return "board game/puzzle";
  if (/electronic_toy/.test(normalized)) return "electronic toy";
  if (/^lego$|lego_set/.test(normalized)) return "LEGO";
  if (/model(?:_|\/)?kit/.test(normalized)) return "model/kit";
  if (/playset/.test(normalized)) return "playset";
  if (/plush|stuffed_toy/.test(normalized)) return "plush/stuffed toy";
  if (/vehicle/.test(normalized)) return "vehicle";
  if (/collection|lot/.test(normalized)) return "collection/lot";
  return "";
}

function vintageToyTargetItemType(targetMetadata: string): string {
  const details = extractTargetItemDetails(targetMetadata);
  return vintageToyItemTypeLabel(metadataValue(targetMetadata, "itemType") || details.itemType || details.productType || details.form);
}

function vintageToyCandidateItemType(listing: VisualSourceCandidate): string {
  const details = candidateStructuredDetails(listing);
  const explicit = vintageToyItemTypeLabel(listing.itemType ?? listing.productType ?? listing.form ?? listing.saleForm ?? details.itemType ?? details.productType ?? details.form);
  if (explicit) return explicit;
  const title = canonicalCandidateTitle(listing);
  if (/\b(?:action\s+figure|doll)\b/i.test(title)) return "action figure/doll";
  if (/\b(?:board\s+game|puzzle)\b/i.test(title)) return "board game/puzzle";
  if (/\belectronic\s+toy\b/i.test(title)) return "electronic toy";
  if (/\b(?:LEGO|Lego)\b/i.test(title)) return "LEGO";
  if (/\b(?:model\s+kit|scale\s+model)\b/i.test(title)) return "model/kit";
  if (/\bplayset\b/i.test(title)) return "playset";
  if (/\b(?:plush|stuffed\s+toy)\b/i.test(title)) return "plush/stuffed toy";
  if (/\b(?:toy\s+car|toy\s+vehicle|die[- ]cast|vehicle)\b/i.test(title)) return "vehicle";
  if (/\b(?:collection|lot|assortment|bundle)\b/i.test(title)) return "collection/lot";
  return "";
}

function vintageToyComparableValue(value: unknown): string {
  return normalizeComparableNumberWords(candidateText(value).toLowerCase()).replace(/[’']/g, "").replace(/[_-]+/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, "").trim();
}

function vintageToyValuesConflict(targetValue: unknown, candidateValue: unknown, allowTokenSubset = true): boolean {
  const target = vintageToyComparableValue(targetValue);
  const candidate = vintageToyComparableValue(candidateValue);
  if (!target || !candidate || /^(?:unknown|n a|na|none|not applicable)$/.test(target) || /^(?:unknown|n a|na|none|not applicable)$/.test(candidate)) return false;
  if (target === candidate) return false;
  if (allowTokenSubset && (target.includes(candidate) || candidate.includes(target))) return false;
  return true;
}

function vintageToyIdentityComparable(value: unknown): string[] {
  return normalizeComparableNumberWords(candidateText(value).toLowerCase())
    .replace(/masters?\s+of\s+(?:the\s+)?universe|\bmotu\b/g, "masters universe")
    .replace(/\b(?:afa|cgc|psa)\s*\+?\s*\d+(?:\.\d+)?\b/g, " ")
    .replace(/\b(?:17|18|19|20)\d{2}\b/g, " ")
    .replace(/\b(?:mint|factory\s+sealed|sealed|unopened|board\s+game|puzzle|game|edition|moc|carded|on\s+card|blister(?:\s+card|\s+pack)?)\b/g, " ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token && !/^(?:the|of|a|an|and|at)$/i.test(token));
}

function vintageToyIdentityValuesConflict(targetValue: unknown, candidateValue: unknown): boolean {
  const target = new Set(vintageToyIdentityComparable(targetValue));
  const candidate = new Set(vintageToyIdentityComparable(candidateValue));
  if (!target.size || !candidate.size) return false;
  return ![...target].every((token) => candidate.has(token)) && ![...candidate].every((token) => target.has(token));
}

function vintageToyCandidateValue(listing: VisualSourceCandidate, aliases: string[]): string {
  const details = candidateStructuredDetails(listing);
  const title = canonicalCandidateTitle(listing);
  for (const alias of aliases) {
    const directValue = listing[alias as keyof VisualSourceCandidate];
    const structuredValue = resolveTestAiDetailValue(details, alias) || labeledCandidateValue(details, [alias]);
    const value = directValue ?? structuredValue;
    const identityAlias = /^(?:brand|manufacturer|maker)$/i.test(alias);
    const compactDirect = candidateText(directValue).toLowerCase().replace(/[^a-z0-9]+/g, "");
    const compactTitle = candidateText(title).toLowerCase().replace(/[^a-z0-9]+/g, "");
    // Some marketplace adapters copy the complete listing title into a
    // convenience Brand/Manufacturer field when no structured aspect exists.
    // That is title evidence, not explicit identity metadata.
    if (identityAlias && directValue != null && compactDirect && compactDirect === compactTitle) {
      if (structuredValue && candidateText(structuredValue).toLowerCase().replace(/[^a-z0-9]+/g, "") !== compactDirect) return candidateText(structuredValue);
      continue;
    }
    if (value != null && candidateText(value)) return candidateText(value);
  }
  return "";
}

function vintageToyCandidateIdentityValue(listing: VisualSourceCandidate, aliases: string[]): string {
  // Marketplace titles are evidence for the item's identity only. Missing
  // publisher, brand, year, and other structured fields remain unknown.
  return vintageToyCandidateValue(listing, aliases) || canonicalCandidateTitle(listing);
}

function vintageToyState(value: unknown): string {
  const normalized = normalizedChoice(value);
  if (!normalized || /unknown|n_a|na|none/.test(normalized)) return "";
  if (/^(?:yes|true|1|complete|working|tested|sealed|factory_sealed|original)$/.test(normalized)) return "yes";
  if (/^(?:no|false|0|incomplete|not_working|untested|opened|loose|missing)$/.test(normalized)) return "no";
  return normalized;
}
function vintageToyExplicitVehicleType(value: unknown): string {
  const text = normalizeComparableNumberWords(candidateText(value).toLowerCase())
    .replace(/[’']/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (/\b(?:aircraft|airplane|plane|jet)\b/.test(text)) return "aircraft";
  if (/\b(?:boat|ship|yacht)\b/.test(text)) return "boat";
  if (/\b(?:motorcycle|motorbike)\b/.test(text)) return "motorcycle";
  if (/\b(?:train|locomotive)\b/.test(text)) return "train";
  if (/\b(?:truck|pickup|semi)\b/.test(text)) return "truck";
  if (/\b(?:spaceship|space ship|rocket)\b/.test(text)) return "spaceship";
  if (/\b(?:car|coupe|sedan|roadster|automobile)\b/.test(text)) return "car";
  return "";
}
function vintageToyCanonicalVehicleType(value: unknown): string {
  return vintageToyExplicitVehicleType(value) || vintageToyComparableValue(value);
}
function vintageToyIdentityConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (normalizedChoice(metadataValue(targetMetadata, "category")) !== "vintage_toys") return null;
  const targetType = vintageToyTargetItemType(targetMetadata);
  if (!targetType || targetType === "collection/lot") return null;
  const categoryLabel = targetType === "board game/puzzle" ? "Vintage Toys / Board Games" : "Vintage Toys";
  const candidateType = vintageToyCandidateItemType(listing);
  if (candidateType && candidateType !== targetType) {
    return `${categoryLabel} item type differs: target is ${targetType}, but the candidate is explicitly ${candidateType}.`;
  }
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const checks: Array<[string, unknown, string[], "text" | "state" | "year"]> = [];
  const addText = (label: string, target: unknown, aliases: string[]) => checks.push([label, target, aliases, "text"]);
  const addState = (label: string, target: unknown, aliases: string[]) => checks.push([label, target, aliases, "state"]);
  const addYear = (label: string, target: unknown, aliases: string[]) => checks.push([label, target, aliases, "year"]);
  if (targetType === "action figure/doll") {
    addText("toy name or character", targetDetails.toyNameCharacter ?? extractTargetTitle(targetMetadata), ["toyNameCharacter", "toyName", "character", "name", "title"]);
    addText("brand", targetDetails.brand, ["brand", "manufacturer"]);
    addText("franchise", targetDetails.franchise, ["franchise", "series"]);
    addYear("year", targetDetails.year, ["year", "releaseYear"]);
    addText("packaging type", targetDetails.packagingType, ["packagingType", "packageType", "packaging"]);
    addState("complete status", targetDetails.complete, ["complete", "isComplete", "completeness"]);
    addState("accessories", targetDetails.accessoriesIncluded, ["accessoriesIncluded", "accessories"]);
  } else if (targetType === "board game/puzzle") {
    addText("game or puzzle name", targetDetails.gamePuzzleName ?? extractTargetTitle(targetMetadata), ["gamePuzzleName", "gameName", "puzzleName"]);
    addText("publisher or brand", targetDetails.publisherBrand ?? targetDetails.brand, ["publisherBrand", "publisher", "brand"]);
    addYear("year", targetDetails.year, ["year", "releaseYear"]);
    addState("complete status", targetDetails.complete, ["complete", "isComplete", "completeness"]);
    addState("instructions", targetDetails.instructionsIncluded, ["instructionsIncluded", "instructions"]);
    addState("box", targetDetails.boxIncluded, ["boxIncluded", "originalBoxIncluded"]);
  } else if (targetType === "electronic toy") {
    addText("toy name", targetDetails.toyName ?? extractTargetTitle(targetMetadata), ["toyName", "name", "title"]);
    addText("brand", targetDetails.brand, ["brand", "manufacturer"]);
    addYear("year", targetDetails.year, ["year", "releaseYear"]);
    addState("tested status", targetDetails.tested, ["tested"]);
    addText("working condition", targetDetails.workingCondition, ["workingCondition", "functionality"]);
    addText("battery compartment condition", targetDetails.batteryCompartmentCondition, ["batteryCompartmentCondition", "batteryCondition"]);
    addState("sound", targetDetails.soundWorks, ["soundWorks"]);
    addState("lights", targetDetails.lightsWork, ["lightsWork"]);
  } else if (targetType === "LEGO") {
    addText("set number", targetDetails.setNumber ?? extractTargetTitle(targetMetadata), ["setNumber", "setNo", "number"]);
    addText("theme", targetDetails.theme, ["theme"]);
    addYear("release year", targetDetails.releaseYear ?? targetDetails.year, ["releaseYear", "year"]);
    addState("complete status", targetDetails.complete, ["complete", "isComplete", "completeness"]);
    addText("packaging type", targetDetails.packagingType, ["packagingType", "packageType", "packaging"]);
    addState("retired status", targetDetails.retiredStatus, ["retiredStatus", "retired"]);
  } else if (targetType === "model/kit") {
    addText("model or kit name", targetDetails.modelKitName ?? extractTargetTitle(targetMetadata), ["modelKitName", "modelName", "kitName", "name", "title"]);
    addText("brand", targetDetails.brand, ["brand", "manufacturer"]);
    addText("scale", targetDetails.scale, ["scale"]);
    addText("built or unbuilt status", targetDetails.builtOrUnbuilt, ["builtOrUnbuilt", "buildStatus"]);
    addState("complete status", targetDetails.complete, ["complete", "isComplete", "completeness"]);
    addState("instructions", targetDetails.instructionsIncluded, ["instructionsIncluded", "instructions"]);
  } else if (targetType === "playset") {
    addText("playset name", targetDetails.playsetName ?? extractTargetTitle(targetMetadata), ["playsetName", "name", "title"]);
    addText("brand", targetDetails.brand, ["brand", "manufacturer"]);
    addText("franchise", targetDetails.franchise, ["franchise", "series"]);
    addYear("year", targetDetails.year, ["year", "releaseYear"]);
    addState("complete status", targetDetails.complete, ["complete", "isComplete", "completeness"]);
    addState("original box", targetDetails.originalBoxIncluded, ["originalBoxIncluded", "boxIncluded"]);
  } else if (targetType === "plush/stuffed toy") {
    // Prefer structured identity fields over the full display title. Display
    // titles can contain brand, year, grader, and grade text; treating that
    // entire string as the toy name falsely rejects descriptive listings.
    addText("toy name or character", targetDetails.toyNameCharacter ?? targetDetails.toyName ?? targetDetails.character ?? extractTargetTitle(targetMetadata), ["toyNameCharacter", "toyName", "character", "name", "title"]);
    addText("brand", targetDetails.brand, ["brand", "manufacturer"]);
    addYear("year", targetDetails.year, ["year", "releaseYear"]);
    addState("tags", targetDetails.tagsAttached, ["tagsAttached", "tags"]);
  } else if (targetType === "vehicle") {
    addText("vehicle name", targetDetails.vehicleName ?? extractTargetTitle(targetMetadata), ["vehicleName", "name", "title"]);
    addText("brand", targetDetails.brand, ["brand", "manufacturer"]);
    addText("franchise", targetDetails.franchise, ["franchise", "series"]);
    addYear("year", targetDetails.year, ["year", "releaseYear"]);
    addText("vehicle type", targetDetails.vehicleType, ["vehicleType", "type"]);
    addText("packaging type", targetDetails.packagingType, ["packagingType", "packageType", "packaging"]);
  }
  const title = canonicalCandidateTitle(listing);
  for (const [label, targetValue, aliases, kind] of checks) {
    if (targetValue == null || !candidateText(targetValue)) continue;
    const candidateValue = vintageToyCandidateValue(listing, aliases);
    if (kind === "year") {
      const year = String(targetValue).match(/\b(?:17|18|19|20)\d{2}\b/)?.[0];
      if (year && candidateValue && /\b(?:17|18|19|20)\d{2}\b/.test(candidateValue) && !new RegExp(`\\b${year}\\b`).test(candidateValue)) {
        return `${categoryLabel} ${label} differs: target is ${year}, but the candidate explicitly declares a different year.`;
      }
      continue;
    }
    if (kind === "state") {
      const targetState = vintageToyState(targetValue);
      const candidateState = vintageToyState(targetType === "board game/puzzle" ? candidateValue : candidateValue || title);
      if (targetState && candidateState && targetState !== candidateState) return `${categoryLabel} ${label} differs: target “${targetState}” vs candidate “${candidateState}”.`;
      continue;
    }
    if (label === "vehicle type") {
      // A missing generic word such as "car" is not an explicit conflict;
      // model names such as Cuda must reach image comparison.
      const explicitCandidateValue = vintageToyCandidateValue(listing, aliases);
      const candidateType = explicitCandidateValue
        ? vintageToyCanonicalVehicleType(explicitCandidateValue)
        : vintageToyExplicitVehicleType(title);
      if (!candidateType) continue;
      const targetType = vintageToyCanonicalVehicleType(targetValue);
      if (targetType && targetType !== candidateType) return `${categoryLabel} ${label} differs: the candidate explicitly declares a different ${label}.`;
      continue;
    }
    if (label === "packaging type") {
      // Packaging is a form comparison, not a token-subset comparison. A
      // title such as "w/ protector" or "in hand" does not declare carded
      // or loose form and must reach image review instead of conflicting with
      // the target merely because it omits the target's form word.
      const targetForm = vintageToyPackagingForm(targetValue);
      const candidateForm = vintageToyPackagingForm(candidateValue || title);
      if (targetForm !== "unknown" && candidateForm !== "unknown" && targetForm !== candidateForm) {
        return `${categoryLabel} packaging form differs: the candidate explicitly declares a different packaging form.`;
      }
      continue;
    }
    if (label === "set number" && !candidateValue) {
      const candidateSetNumber = title.match(/\b\d{4,6}\b/)?.[0];
      if (!candidateSetNumber) continue;
      if (vintageToyValuesConflict(targetValue, candidateSetNumber, false)) return `${categoryLabel} set number differs: target is ${targetValue}, but the candidate explicitly identifies a different set.`;
      continue;
    }
    const isIdentityField = ["toy name or character", "game or puzzle name", "model or kit name", "playset name", "vehicle name"].includes(label);
    const comparisonValue = isIdentityField ? vintageToyCandidateIdentityValue(listing, aliases) : candidateValue;
    const identityConflict = isIdentityField
      ? vintageToyIdentityValuesConflict(targetValue, comparisonValue)
      : vintageToyValuesConflict(targetValue, candidateValue || (label === "brand" ? "" : title));
    if (comparisonValue && identityConflict) return `${categoryLabel} ${label} differs: ${isIdentityField && !candidateValue ? "the candidate title explicitly identifies a different " : "the candidate explicitly declares a different "}${label}.`;
  }
  return null;
}

function visualMetadataDifferenceSummary(targetMetadata: string, listing: VisualSourceCandidate): string[] {
  const differences = findMaterialMetadataConflicts(targetMetadata, listing, { ignoreSubjectiveConditionDifferences: true })
    .map((conflict) => `${conflict.field}: target “${conflict.targetValue}” vs candidate “${conflict.candidateValue}” (${conflict.reason})`);
  if (normalizedChoice(metadataValue(targetMetadata, "category")) !== "vintage_toys") return differences.slice(0, 12);
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const vintageTargetType = vintageToyTargetItemType(targetMetadata);
  const identityField: [string, unknown, string[]] = vintageTargetType === "board game/puzzle"
    ? ["game or puzzle name", targetDetails.gamePuzzleName ?? extractTargetTitle(targetMetadata), ["gamePuzzleName", "gameName", "puzzleName"]]
    : vintageTargetType === "plush/stuffed toy" || vintageTargetType === "action figure/doll"
    ? ["toy name or character", targetDetails.toyNameCharacter ?? targetDetails.toyName ?? targetDetails.character ?? extractTargetTitle(targetMetadata), ["toyNameCharacter", "toyName", "character"]]
    : vintageTargetType === "model/kit"
    ? ["model or kit name", targetDetails.modelKitName ?? targetDetails.modelName ?? targetDetails.kitName ?? extractTargetTitle(targetMetadata), ["modelKitName", "modelName", "kitName"]]
    : vintageTargetType === "playset"
    ? ["playset name", targetDetails.playsetName ?? extractTargetTitle(targetMetadata), ["playsetName"]]
    : vintageTargetType === "LEGO"
    ? ["set number", targetDetails.setNumber ?? targetDetails.setNo ?? extractTargetTitle(targetMetadata), ["setNumber", "setNo", "number"]]
    : ["vehicle name", targetDetails.vehicleName ?? extractTargetTitle(targetMetadata), ["vehicleName"]];
  const isBoardGameTarget = vintageTargetType === "board game/puzzle";
  const vintageFields: Array<[string, unknown, string[]]> = [
    [isBoardGameTarget ? "publisher or brand" : "brand", isBoardGameTarget ? (targetDetails.publisherBrand ?? targetDetails.publisher ?? targetDetails.brand) : (resolveTestAiDetailValue(targetDetails, "brand") || resolveTestAiDetailValue(targetDetails, "manufacturer") || metadataValue(targetMetadata, "brand")), isBoardGameTarget ? ["publisherBrand", "publisher", "brand"] : ["brand", "manufacturer"]],
    ["franchise", targetDetails.franchise, ["franchise", "series"]],
    identityField,
    ["year", targetDetails.year, ["year", "releaseYear"]],
    ...(vintageTargetType === "vehicle" ? [["vehicle type", targetDetails.vehicleType, ["vehicleType", "type"]] as [string, unknown, string[]]] : []),
    ["packaging type", targetDetails.packagingType, ["packagingType", "packageType", "packaging"]],
  ];
  for (const [label, targetValue, aliases] of vintageFields) {
    if (!candidateText(targetValue)) continue;
    if (label === "packaging type") {
      const targetForm = vintageToyPackagingForm(targetValue);
      const candidateForm = vintageToyPackagingForm(canonicalCandidateTitle(listing));
      if (targetForm === "unknown" || candidateForm === "unknown" || targetForm === candidateForm) continue;
    }
    const candidateValue = label === "year"
      ? vintageToyCandidateValue(listing, aliases)
      : ["game or puzzle name", "toy name or character", "model or kit name", "playset name", "set number", "vehicle name"].includes(label)
      ? vintageToyCandidateIdentityValue(listing, aliases)
      : label === "brand" || label === "publisher or brand"
      ? vintageToyCandidateValue(listing, aliases)
      : label === "vehicle type"
      ? (vintageToyCandidateValue(listing, aliases) || vintageToyExplicitVehicleType(canonicalCandidateTitle(listing)))
      : vintageToyCandidateValue(listing, aliases) || canonicalCandidateTitle(listing);
    const conflict = ["game or puzzle name", "toy name or character", "model or kit name", "playset name", "vehicle name"].includes(label)
      ? vintageToyIdentityValuesConflict(targetValue, candidateValue)
      : vintageToyValuesConflict(targetValue, candidateValue);
    if (!candidateValue || !conflict) continue;
    if (differences.some((difference) => difference.toLowerCase().startsWith(`${label}:`))) continue;
    differences.push(`${label}: target “${candidateText(targetValue)}” vs candidate “${candidateValue}” (explicit metadata/title difference)`);
  }
  return [...new Set(differences)].slice(0, 12);
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
  // “Factory Sealed” is packaging evidence, not proof that every game piece
  // exists. Board Game completeness must come from structured metadata only;
  // preserve the established title-state safeguard for other toy types.
  const targetType = vintageToyTargetItemType(targetMetadata);
  const candidateCompleteness = vintageToyCompleteness(candidateDetails.completeness ?? candidateDetails.isComplete ?? candidateDetails.complete
    ?? (targetType === "board game/puzzle" ? undefined : canonicalCandidateTitle(listing)));
  if (!targetCompleteness || !candidateCompleteness || targetCompleteness === candidateCompleteness) return null;
  const label = targetType === "board game/puzzle" ? "Board Game completeness" : "Vintage-toy completeness";
  return `${label} differs: target is explicitly ${targetCompleteness}, but the candidate explicitly declares ${candidateCompleteness}.`;
}

function compoundNumber(value: unknown): { numerator: string; denominator: string } | null {
  const match = String(value ?? "").match(/\b(\d{1,6}[A-Za-z]?)\s*\/\s*(\d{1,7})\b/);
  return match ? { numerator: match[1].toLowerCase(), denominator: match[2] } : null;
}

function explicitCompoundNumberConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  const details = extractTargetItemDetails(targetMetadata);
  // Pokémon fractions and namespaces use the same bounded parser at every gate.
  if (normalizedChoice(metadataValue(targetMetadata, "category")) === "pokemon") return null;
  const target = compoundNumber(details.cardNumber ?? details.catalogNumber);
  if (!target) return null;
  const candidate = canonicalCandidateTitle(listing).match(/(?:\b(?:card(?:\s*(?:no\.?|number))?|catalog(?:\s*(?:no\.?|number))?|cat\.?)\s*#?|#\s*)(\d{1,6}[A-Za-z]?)\s*\/\s*(\d{1,7})\b/i);
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
  return normalizeComparableNumberWords(candidateText(value).toLowerCase()).replace(/[“”"']/g, "").replace(/\s+/g, " ").trim();
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
    && targetItemTypeValue(targetMetadata) === "single_coin";
}
function isCoinSetTarget(targetMetadata: string): boolean {
  return normalizedChoice(metadataValue(targetMetadata, "category")) === "coins"
    && targetItemTypeValue(targetMetadata) === "coin_set";
}
function isPaperMoneyTarget(targetMetadata: string): boolean {
  const category = normalizedChoice(metadataValue(targetMetadata, "category"));
  const itemType = targetItemTypeValue(targetMetadata);
  return category === "coins" && (itemType === "paper_money" || itemType.includes("paper_money") || itemType.includes("banknote"));
}
function coinComparable(value: unknown): string {
  return normalizedChoice(value).replace(/[^a-z0-9]+/g, " ").trim();
}
function coinExplicitValue(listing: VisualSourceCandidate, aliases: string[], titlePatterns: RegExp[] = []): string {
  const details = candidateStructuredDetails(listing);
  const structured = aliases.map((key) => listing[key] ?? details[key] ?? labeledCandidateValue(details, [key])).find((value) => String(value ?? "").trim());
  if (structured != null) return String(structured).trim();
  for (const pattern of titlePatterns) {
    const match = canonicalCandidateTitle(listing).match(pattern);
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
  const title = canonicalCandidateTitle(listing);
  if (targetOriginal === "yes" && /\b(?:replica|copy|counterfeit|facsimile|reproduction)\b/i.test(title)) return "Coin authenticity differs: target is original/authentic, but the candidate explicitly declares a replica, copy, counterfeit, or facsimile.";
  if (targetOriginal === "no" && /\brestrike\b/i.test(title)) return "Coin restrike status differs from the target.";
  return null;
}
function coinSetPackagingValue(listing: VisualSourceCandidate): string {
  const structured = coinExplicitValue(listing, ["originalPackagingIncluded", "originalPackaging", "packaging"]);
  if (structured) return structured;
  const title = canonicalCandidateTitle(listing);
  if (/\b(?:without|no)\s+(?:original\s+)?(?:packaging|box|ケース)\b/i.test(title)) return "No";
  if (/\b(?:original\s+packaging|original\s+box|with\s+(?:the\s+)?box)\b/i.test(title)) return "Yes";
  return "";
}
function coinSetIdentityConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (!isCoinSetTarget(targetMetadata)) return null;
  const target = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateDetails = candidateStructuredDetails(listing);
  const title = canonicalCandidateTitle(listing);
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
function movieTargetItemType(targetMetadata: string): 'individual_movie' | 'box_set' | 'collection/lot' | '' {
  const raw = normalizedChoice(metadataValue(targetMetadata, 'itemType') || extractTargetItemDetails(targetMetadata).itemType || '');
  if (/individual_movie|single_movie|individual/.test(raw)) return 'individual_movie';
  if (/box_set|boxset|complete_series|collection_set/.test(raw)) return 'box_set';
  if (/collection|lot/.test(raw)) return 'collection/lot';
  return '';
}
function movieCandidateItemType(listing: VisualSourceCandidate): 'individual_movie' | 'box_set' | 'collection/lot' | '' {
  const details = candidateStructuredDetails(listing);
  const explicit = normalizedChoice(listing.itemType ?? listing.productType ?? listing.form ?? details.itemType ?? details.productType ?? details.form ?? '');
  if (/individual_movie|single_movie|individual/.test(explicit)) return 'individual_movie';
  if (/box_set|boxset|complete_series|collection_set/.test(explicit)) return 'box_set';
  if (/collection|lot/.test(explicit)) return 'collection/lot';
  const title = canonicalCandidateTitle(listing);
  if (/\b(?:box\s*set|complete\s+series|complete\s+collection|seasons?\s*(?:[0-9]+|one|two|three|four|five|six|seven|eight|nine|ten)|trilogy|quadrilogy|bundle|movie\s+lot|film\s+lot)\b/i.test(title)) return 'box_set';
  if (/\b(?:collection|lot)\b/i.test(title)) return 'collection/lot';
  return '';
}
function movieCandidateHasBoxSetEvidence(listing: VisualSourceCandidate): boolean {
  const title = canonicalCandidateTitle(listing);
  return /\b(?:box\s*set|complete\s+(?:series|collection)|seasons?\s*(?:[0-9]+|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*(?:&|and|through|[-–])\s*(?:[0-9]+|one|two|three|four|five|six|seven|eight|nine|ten))?|trilogy|quadrilogy|movie\s+bundle|film\s+bundle)\b/i.test(title);
}
function movieCanonicalText(value: unknown): string {
  const normalized = normalizeComparableNumberWords(normalizedChoice(value).replace(/[’']/g, "'").replace(/'s\b/gi, 's').replace(/_/g, ' '))
    .replace(/\bseasons?\b/g, ' season')
    .replace(/(\d+)\s+and\s+(\d+)/g, '$1 $2');
  // Strip the complete media descriptor before removing VHS itself. Leaving
  // "Tape" behind turns an abbreviated "Conan" identity into "Conan Tape"
  // and incorrectly defeats the existing subset-title anchor match.
  return normalized.replace(/[_-]+/g, ' ').replace(/\b(?:vhs|video)\s+tapes?\b/g, '')
    .replace(/\bthe\b/g, '').replace(/\b(?:movie|film|dvd|blu\s*ray|4k\s+uhd|vhs|laserd?isc)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function movieTitleComparable(value: unknown): string {
  return movieCanonicalText(value)
    // Grader and numeric grade are separate Movie scoring fields. Remove the
    // complete holder-grade phrase from product-title comparison so harmless
    // title variants such as `CGC 8.0` versus `CGC 8.0 A` do not lose the
    // 25-point movie-identity award while grade/company are scored separately.
    // normalizeComparableNumberWords may turn `8.0` into `8 0`; accept both
    // spellings so harmless holder-grade/title variants still earn movie-title points.
    .replace(/\b(?:psa|cgc|wata|bgs|sgc|vga|pca)\s*\d+(?:(?:\.\d+)|(?:\s+\d+))?(?:\s*[a-z](?:\+{1,3})?)?\b/gi, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, '')
    .replace(/\b(?:special|standard|edition|new|used|tested)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
function movieValuesAgree(targetValue: unknown, candidateValue: unknown): boolean {
  const target = movieTitleComparable(targetValue);
  const candidate = movieTitleComparable(candidateValue);
  if (!target || !candidate) return true;
  if (target === candidate) return true;
  const targetTokens = target.split(' ').filter((token) => token.length > 1);
  const candidateTokens = candidate.split(' ').filter((token) => token.length > 1);
  const targetTokenSet = new Set(targetTokens);
  const candidateTokenSet = new Set(candidateTokens);
  // Provider titles may omit a studio/distributor prefix (for example,
  // "Hercules" instead of "Disney Hercules"). Treat either title as a
  // compatible anchor; the image review still makes the final decision.
  return targetTokens.length > 0 && candidateTokens.length > 0
    && (targetTokens.every((token) => candidateTokenSet.has(token))
      || candidateTokens.every((token) => targetTokenSet.has(token)));
}
function movieCandidateValue(listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[] = []): string {
  const details = candidateStructuredDetails(listing);
  for (const alias of aliases) {
    const value = listing[alias as keyof VisualSourceCandidate] ?? details[alias] ?? labeledCandidateValue(details, [alias]);
    if (value != null && String(value).trim()) return String(value);
  }
  const title = canonicalCandidateTitle(listing);
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match?.[1]) return match[1];
    if (match?.[0]) return match[0];
  }
  return '';
}
function movieSeasonCountFromText(value: unknown): string {
  const text = normalizeComparableNumberWords(String(value ?? ''));
  const range = text.match(/\bseasons?\s*(\d+)\s*(?:&|and|through|to|[-–])\s*(\d+)\b/i);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? String(end - start + 1) : '';
  }
  return text.match(/\bseasons?\s*(\d+)\b/i)?.[1] ?? '';
}
function movieFormat(value: unknown): string {
  return normalizedChoice(value).replace(/4k_uhd|uhd_4k/g, '4k').replace(/blu_ray/g, 'bluray');
}
function movieBoolean(value: unknown): string {
  const normalized = normalizedChoice(value);
  if (/^(?:yes|true|1|sealed|factory_sealed)$/.test(normalized)) return 'yes';
  if (/^(?:no|false|0|opened|used)$/.test(normalized)) return 'no';
  return '';
}

type PokemonTargetType = 'single_card' | 'set' | 'unopened_product' | 'collection_lot' | '';
function pokemonItemType(value: unknown): PokemonTargetType {
  const normalized = normalizedChoice(value);
  if (/collection|lot/.test(normalized)) return 'collection_lot';
  if (/unopened|sealed|booster|elite_trainer|collection_box|blaster|tin|product/.test(normalized)) return 'unopened_product';
  if (/set/.test(normalized) && !/single|individual/.test(normalized)) return 'set';
  if (/single|individual|card/.test(normalized)) return 'single_card';
  return '';
}
function pokemonTargetItemType(targetMetadata: string): PokemonTargetType {
  if (normalizedChoice(metadataValue(targetMetadata, 'category')) !== 'pokemon') return '';
  return pokemonItemType(targetItemTypeValue(targetMetadata));
}
function pokemonCandidateItemType(listing: VisualSourceCandidate): PokemonTargetType {
  const details = candidateStructuredDetails(listing);
  const explicit = pokemonItemType([listing.itemType, listing.productType, listing.form, details.itemType, details.productType, details.form].find((value) => String(value ?? '').trim()));
  if (explicit) return explicit;
  const title = canonicalCandidateTitle(listing);
  if (/\b(?:booster|elite\s+trainer|collection\s+box|blaster|tin|build\s*&?\s*battle|premium\s+collection|sealed\s+product)\b/i.test(title)) return 'unopened_product';
  if (/\b(?:collection|lot|bundle|assortment|mixed)\b/i.test(title)) return 'collection_lot';
  if (/\b(?:master|complete|partial)\s+set\b|\bset\s+of\s+\d+/i.test(title)) return 'set';
  if (/(?:^|[^\w])#?\s*\d{1,4}(?:\s*\/\s*\d{1,4})?\b|\b(?:single|individual)\s+card\b/i.test(title)) return 'single_card';
  return '';
}
function pokemonComparableValue(value: unknown): string {
  return normalizeComparableNumberWords(candidateText(value).toLowerCase()).replace(/[’']/g, '').replace(/[_-]+/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function pokemonCandidateValue(listing: VisualSourceCandidate, aliases: string[], titlePatterns: RegExp[] = []): string {
  const details = candidateStructuredDetails(listing);
  for (const alias of aliases) {
    const value = listing[alias as keyof VisualSourceCandidate] ?? details[alias] ?? labeledCandidateValue(details, [alias]);
    if (value != null && String(value).trim()) return String(value).trim();
  }
  const title = canonicalCandidateTitle(listing);
  for (const pattern of titlePatterns) {
    const match = title.match(pattern);
    if (match?.[1]) return match[1].trim();
    if (match?.[0]) return match[0].trim();
  }
  if (titlePatterns.length > 0) return '';
  return title.trim();
}
function pokemonValuesConflict(targetValue: unknown, candidateValue: unknown, allowTokenSubset = true): boolean {
  const target = pokemonComparableValue(targetValue);
  const candidate = pokemonComparableValue(candidateValue);
  if (!target || !candidate || /^(?:unknown|n a|na|none|not applicable)$/.test(target) || /^(?:unknown|n a|na|none|not applicable)$/.test(candidate)) return false;
  if (target === candidate) return false;
  if (allowTokenSubset && (target.includes(candidate) || candidate.includes(target))) return false;
  return true;
}
function pokemonBoolean(value: unknown): 'yes' | 'no' | '' {
  const normalized = normalizedChoice(value);
  if (/^(?:yes|true|1|sealed|factory_sealed|complete|master_set)$/.test(normalized)) return 'yes';
  if (/^(?:no|false|0|opened|partial|incomplete|unsealed|resealed)$/.test(normalized)) return 'no';
  return '';
}
function pokemonIdentityConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (normalizedChoice(metadataValue(targetMetadata, 'category')) !== 'pokemon') return null;
  const targetType = pokemonTargetItemType(targetMetadata);
  if (!targetType || targetType === 'collection_lot') return null;
  const candidateType = pokemonCandidateItemType(listing);
  if (candidateType === 'collection_lot') return 'Pokémon filter: candidate is a collection, lot, bundle, or mixed group rather than a comparable item.';
  if (candidateType && candidateType !== targetType) return `Pokémon item type differs: target is ${targetType.replace(/_/g, ' ')}, but the candidate is explicitly ${candidateType.replace(/_/g, ' ')}.`;
  const target = extractTargetItemDetails(targetMetadata);
  const candidateTitle = canonicalCandidateTitle(listing);
  const checks: Array<[string, unknown, string[], RegExp[], boolean]> = targetType === 'single_card'
    ? [
        ['card name', firstMeaningfulValue(target.cardName, target.pokemonName, target.name, extractTargetTitle(targetMetadata)), ['cardName', 'pokemonName', 'name'], [], true],
        ['set', target.setName ?? target.set ?? target.cardSet, ['setName', 'set', 'cardSet', 'series'], [], true],
        ['language', target.language, ['language'], [/(English|Japanese|French|German|Italian|Spanish|Korean|Chinese)/i], false],
        ['finish', target.finish ?? target.finishVariant, ['finish', 'finishVariant'], [/(Normal|Holo|Reverse\s+Holo|Full\s+Art|Rainbow|Gold)/i], false],
        ['card type / mechanic', target.cardType ?? target.mechanic ?? target.variant, ['cardType', 'mechanic', 'variant'], [/(VMAX|VSTAR|\bV\b|\bGX\b|\bex\b|BREAK|Tag\s+Team|Radiant|Amazing\s+Rare|ACE\s+SPEC)/i], false],
        ['rarity', target.rarity, ['rarity'], [/(Common|Uncommon|Rare|Holo\s+Rare|Ultra\s+Rare|Secret\s+Rare|Illustration\s+Rare|Special\s+Illustration\s+Rare|Hyper\s+Rare)/i], false],
        ['edition / era', target.editionEra ?? target.edition ?? target.era, ['editionEra', 'edition', 'era'], [], false],
      ]
    : targetType === 'set'
      ? [
          ['set', target.setName ?? target.set ?? extractTargetTitle(targetMetadata), ['setName', 'set', 'series', 'title'], [], true],
          ['language', target.language, ['language'], [/(English|Japanese|French|German|Italian|Spanish|Korean|Chinese)/i], false],
          ['set type', target.setType ?? target.complete ?? target.setStatus, ['setType', 'complete', 'setStatus'], [/(master\s+set|complete\s+set|partial\s+set|incomplete\s+set)/i], false],
          ['card count', target.numberOfCardsInSet, ['numberOfCardsInSet', 'cardCount', 'numberOfCards'], [/(?:set\s+of|\b)(\d{2,4})\s+cards?/i], false],
        ]
      : [
          ['product name', target.productName ?? target.name ?? extractTargetTitle(targetMetadata), ['productName', 'productTitle', 'name', 'title'], [], true],
          ['set', target.setName ?? target.set, ['setName', 'set', 'series'], [], true],
          ['product type', target.productType, ['productType', 'productConfiguration', 'format'], [/(booster\s+box|booster\s+pack|elite\s+trainer\s+box|collection\s+box|blaster\s+box|tin|premium\s+collection|build\s*&?\s*battle\s+box)/i], false],
          ['language', target.language, ['language'], [/(English|Japanese|French|German|Italian|Spanish|Korean|Chinese)/i], false],
          ['release year', target.releaseYear ?? target.year, ['releaseYear', 'year'], [/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/], false],
        ];
  for (const [label, targetValue, aliases, titlePatterns, allowSubset] of checks) {
    if (!targetValue || /^(?:unknown|n ?a|none)$/i.test(String(targetValue))) continue;
    const candidateValue = pokemonCandidateValue(listing, aliases, titlePatterns);
    if (!candidateValue || (candidateValue === candidateTitle && !titlePatterns.length && aliases.every((alias) => candidateStructuredDetails(listing)[alias] == null))) continue;
    if (pokemonValuesConflict(targetValue, candidateValue, allowSubset)) return `Pokémon ${label} differs: target explicitly declares “${String(targetValue)}”, but the candidate declares “${candidateValue}”.`;
  }
  if (targetType === 'unopened_product') {
    const targetSealed = pokemonBoolean(target.factorySealed ?? target.sealStatus ?? target.sealedStatus);
    const candidateDetails = candidateStructuredDetails(listing);
    const candidateSealed = pokemonBoolean(candidateDetails.factorySealed ?? candidateDetails.sealStatus ?? candidateDetails.sealedStatus ?? listing.condition)
      || (/\b(?:opened|resealed|damaged\s+seal|unsealed)\b/i.test(candidateTitle) ? 'no' : /\b(?:factory\s+sealed|new\s+sealed|sealed|unopened)\b/i.test(candidateTitle) ? 'yes' : '');
    if (targetSealed && candidateSealed && targetSealed !== candidateSealed) return `Pokémon Unopened Product seal status differs: target is ${targetSealed === 'yes' ? 'sealed' : 'not sealed'}, but the candidate explicitly declares the opposite.`;
    const targetAuthenticated = pokemonBoolean(target.authenticated ?? target.authenticationStatus);
    const candidateAuthenticated = pokemonBoolean(candidateDetails.authenticated ?? candidateDetails.authenticationStatus ?? listing.authenticated)
      || (/\b(?:unauthenticated|not\s+authenticated|no\s+authentication)\b/i.test(candidateTitle) ? 'no' : /\b(?:authenticated|sealed\s+by)\b/i.test(candidateTitle) ? 'yes' : '');
    if (targetAuthenticated && candidateAuthenticated && targetAuthenticated !== candidateAuthenticated) return `Pokémon Unopened Product authentication status differs: target is ${targetAuthenticated}, but the candidate explicitly declares ${candidateAuthenticated}.`;
    const targetCompany = pokemonComparableValue(target.authenticationCompany ?? target.authenticator);
    const candidateCompany = pokemonComparableValue(candidateDetails.authenticationCompany ?? candidateDetails.authenticator ?? listing.authenticationCompany);
    if (targetAuthenticated === 'yes' && targetCompany && candidateCompany && targetCompany !== candidateCompany) return `Pokémon Unopened Product authentication company differs: target is ${target.authenticationCompany}, but the candidate is ${candidateDetails.authenticationCompany ?? listing.authenticationCompany}.`;
    const targetFasc = pokemonBoolean(target.fromASealedCase ?? target.fromSealedCase);
    const candidateFasc = pokemonBoolean(candidateDetails.fromASealedCase ?? candidateDetails.fromSealedCase ?? listing.fromASealedCase)
      || (/\b(?:not\s+from\s+(?:a\s+)?sealed\s+case|not\s+FASC)\b/i.test(candidateTitle) ? 'no' : /\b(?:FASC|from\s+(?:a\s+)?sealed\s+case)\b/i.test(candidateTitle) ? 'yes' : '');
    if (targetFasc && candidateFasc && targetFasc !== candidateFasc) return `Pokémon Unopened Product sealed-case status differs: target is ${targetFasc === 'yes' ? 'from a sealed case' : 'not from a sealed case'}, but the candidate explicitly declares the opposite.`;
  }
  return null;
}
function movieIdentityConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (normalizedChoice(metadataValue(targetMetadata, 'category')) !== 'movies') return null;
  const targetType = movieTargetItemType(targetMetadata);
  if (!targetType || targetType === 'collection/lot') return null;
  const candidateType = movieCandidateItemType(listing);
  if (candidateType === 'collection/lot' && !(targetType === 'box_set' && movieCandidateHasBoxSetEvidence(listing))) return 'Movie candidate is explicitly a collection or lot, not a comparable single product.';
  if (targetType === 'individual_movie' && candidateType === 'box_set') return 'Movie format differs: target is an individual movie, but the candidate is a box set or series.';
  if (targetType === 'box_set' && candidateType === 'individual_movie') return 'Movie format differs: target is a box set, but the candidate is an individual movie.';
  const target = extractTargetItemDetails(targetMetadata);
  const checks: Array<[unknown, string, string[], RegExp[], boolean]> = [];
  if (targetType === 'individual_movie') {
    checks.push([firstMeaningfulValue(target.title, target.movieTitle, extractTargetTitle(targetMetadata)), 'movie title', ['title', 'movieTitle'], [], true]);
    checks.push([target.format, 'format', ['format', 'mediaFormat'], [/(?:DVD|Blu[- ]?ray|4K\s+UHD|VHS|LaserDisc)/i], false]);
    checks.push([firstMeaningfulValue(target.releaseYear, target.year), 'release year', ['releaseYear', 'year'], [/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/], false]);
    checks.push([target.region, 'region', ['region', 'regionCode'], [/(?:Region\s*[0-9A-C]|NTSC|PAL)/i], false]);
  } else {
    checks.push([firstMeaningfulValue(target.boxSetName, target.title, extractTargetTitle(targetMetadata)), 'box-set name', ['boxSetName', 'title', 'seriesName'], [], true]);
    checks.push([target.format, 'format', ['format', 'mediaFormat'], [/(?:DVD|Blu[- ]?ray|4K\s+UHD|VHS|LaserDisc|Mixed)/i], false]);
  }
  for (const [targetValue, label, aliases, patterns, textMatch] of checks) {
    const targetComparable = textMatch ? movieCanonicalText(targetValue) : movieFormat(targetValue);
    if (!targetComparable || /^(?:unknown|n a|na|none|not applicable)$/.test(targetComparable)) continue;
    const candidateValue = movieCandidateValue(listing, aliases, patterns);
    if (!candidateValue) continue;
    const candidateComparable = textMatch ? movieCanonicalText(candidateValue) : movieFormat(candidateValue);
    if (!candidateComparable || /^(?:unknown|n a|na|none|not applicable)$/.test(candidateComparable)) continue;
    const agrees = textMatch ? movieValuesAgree(targetValue, candidateValue) : targetComparable === candidateComparable;
    if (!agrees) return `Movie ${label} differs: target is ${String(targetValue)}, but the candidate explicitly declares ${String(candidateValue)}.`;
  }
  const targetYear = Number(firstMeaningfulValue(target.releaseYear, target.year));
  const candidateYear = Number(movieCandidateValue(listing, ['releaseYear', 'year'], [/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/]));
  if (targetType === 'individual_movie' && Number.isFinite(targetYear) && targetYear > 0 && Number.isFinite(candidateYear) && candidateYear > 0 && targetYear !== candidateYear) return `Movie release year differs: target is ${targetYear}, but the candidate explicitly declares ${candidateYear}.`;
  const targetCount = Number(firstMeaningfulValue(target.numberOfMovies, target.movieCount, target.quantity) ?? movieSeasonCountFromText(firstMeaningfulValue(target.boxSetName, target.title, extractTargetTitle(targetMetadata))));
  const candidateCount = Number(movieCandidateValue(listing, ['numberOfMovies', 'movieCount', 'quantity'], [/(?:contains?|includes?|set\s+of)\s*(\d+)\s+movies?/i, /\b(\d+)\s*[- ]?(?:disc|movie)\s+(?:box\s+)?set\b/i]));
  if (targetType === 'box_set' && Number.isFinite(targetCount) && targetCount > 0 && Number.isFinite(candidateCount) && candidateCount > 0 && targetCount !== candidateCount) return `Movie box-set size differs: target declares ${targetCount} movies, but the candidate explicitly declares ${candidateCount}.`;
  const targetSealed = movieBoolean(firstMeaningfulValue(target.sealed, target.sealedStatus, target.packaging));
  const candidateSealed = movieBoolean(movieCandidateValue(listing, ['sealed', 'sealedStatus', 'packaging'], [/(?:factory\s+sealed|sealed|opened|used)/i]));
  if (targetSealed && candidateSealed && targetSealed !== candidateSealed) return `Movie sealed status differs: target is ${targetSealed}, but the candidate explicitly declares ${candidateSealed}.`;
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
function isSingleStampTarget(targetMetadata: string): boolean {
  return normalizedChoice(metadataValue(targetMetadata, "category")) === "stamps"
    && targetItemTypeValue(targetMetadata) === "single_stamp";
}
function isStampSetTarget(targetMetadata: string): boolean {
  const itemType = targetItemTypeValue(targetMetadata);
  return normalizedChoice(metadataValue(targetMetadata, "category")) === "stamps"
    && (itemType === "stamp_set___sheet" || itemType === "stamp_set_sheet" || itemType === "stamp_set");
}
function stampComparable(value: unknown): string {
  return normalizedChoice(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function stampExplicitValue(listing: VisualSourceCandidate, aliases: string[], titlePatterns: RegExp[] = []): string {
  const details = candidateStructuredDetails(listing);
  const structured = aliases.map((key) => listing[key] ?? details[key] ?? labeledCandidateValue(details, [key])).find((value) => String(value ?? "").trim());
  if (structured != null) return String(structured).trim();
  for (const pattern of titlePatterns) {
    const match = canonicalCandidateTitle(listing).match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}
function stampValueConflict(targetValue: unknown, candidateValue: unknown, label: string): string | null {
  const target = stampComparable(targetValue);
  const candidate = stampComparable(candidateValue);
  if (!target || !candidate || target === candidate || candidate.includes(target) || target.includes(candidate)) return null;
  return `Stamp ${label} differs: target explicitly declares ${String(targetValue)}, but the candidate explicitly declares ${String(candidateValue)}.`;
}
function stampHingeComparable(value: unknown): string {
  const normalized = stampComparable(value);
  if (!normalized || normalized === "unknown") return "";
  if (["nh", "never hinged", "unhinged", "mnh"].includes(normalized)) return "never_hinged";
  if (["lh", "lightly hinged"].includes(normalized)) return "lightly_hinged";
  if (["h", "hinged", "mh"].includes(normalized)) return "hinged";
  if (["hh", "heavily hinged"].includes(normalized)) return "heavily_hinged";
  if (["hr", "hinge remnant"].includes(normalized)) return "hinge_remnant";
  if (["n a", "not applicable"].includes(normalized)) return "not_applicable";
  return normalized;
}
function stampGumComparable(value: unknown): string {
  const normalized = stampComparable(value);
  if (!normalized || normalized === "unknown") return "";
  if (["og", "original gum"].includes(normalized)) return "original_gum";
  if (["pog", "partial original gum"].includes(normalized)) return "partial_original_gum";
  if (["dg", "disturbed gum"].includes(normalized)) return "disturbed_gum";
  if (["rg", "regummed"].includes(normalized)) return "regummed";
  if (["ng", "no gum"].includes(normalized)) return "no_gum";
  if (["n a", "issued without gum", "not applicable"].includes(normalized)) return "not_applicable";
  return normalized;
}
function stampStatusConflict(targetValue: unknown, candidateValue: unknown, label: string, normalize: (value: unknown) => string): string | null {
  const target = normalize(targetValue);
  const candidate = normalize(candidateValue);
  if (!target || !candidate || target === candidate) return null;
  return `Stamp ${label} differs: target explicitly declares ${String(targetValue)}, but the candidate explicitly declares ${String(candidateValue)}.`;
}
function stampFormatConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const targetProfile = classifyStampFormat({
    title: extractTargetTitle(targetMetadata),
    itemType: metadataValue(targetMetadata, "itemType"),
    itemDetails: JSON.stringify(targetDetails),
    condition: metadataValue(targetMetadata, "condition"),
  });
  const candidateDetails = candidateStructuredDetails(listing);
  const candidateProfile = classifyStampFormat({
    title: canonicalCandidateTitle(listing),
    itemType: String(listing.itemType ?? candidateDetails.itemType ?? candidateDetails.format ?? ""),
    itemDetails: JSON.stringify(candidateDetails),
    condition: String(listing.condition ?? candidateDetails.condition ?? ""),
  });
  if (!stampFormatsCompatible(targetProfile, candidateProfile)) {
    return `Stamp format differs: target is ${targetProfile.label}, but the candidate is ${candidateProfile.label}.`;
  }
  return null;
}
function stampsIdentityConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (!isSingleStampTarget(targetMetadata) && !isStampSetTarget(targetMetadata)) return null;
  const target = extractTargetItemDetails(targetMetadata);
  const formatConflict = stampFormatConflict(targetMetadata, listing);
  if (formatConflict) return formatConflict;
  const isSet = isStampSetTarget(targetMetadata);
  const checks: Array<[unknown, string, string[], RegExp[]]> = [
    [target.country ?? target.issuingCountry, "country", ["country", "issuingCountry"], [/\b(United States|USA|Canada|Mexico|Australia|United Kingdom|Great Britain|France|Germany|Japan)\b/i]],
    [target.year ?? target.date ?? target.issueYear, "year/date", ["year", "date", "issueYear"], [/(?:^|[^0-9])((?:16|17|18|19|20)\d{2})(?:[^0-9]|$)/i]],
  ];
  if (!isSet) {
    checks.push([target.scottNumber ?? target.catalogNumber ?? target.catalogNo, "Scott/catalog number", ["scottNumber", "catalogNumber", "catalogNo"], [/(?:Scott|catalog|cat\.?)\s*#?\s*([A-Z]?\d{1,8})\b/i]]);
    checks.push([target.denomination, "denomination", ["denomination"], [/\b(\$?\d+(?:\.\d+)?\s*(?:c|cent|cents|d|dollar|dollars|p|pence|pound|pounds))\b/i]]);
    checks.push([target.mintOrUsed, "mint/used status", ["mintOrUsed", "status"], [/\b(Mint|Used|Unused|CTO)\b/i]]);
    const hingeConflict = stampStatusConflict(
      target.hinged ?? target.hingeStatus,
      stampExplicitValue(listing, ["hinged", "hingeStatus"], [/\b(Never Hinged|MNH|Mint Never Hinged|NH|Lightly Hinged|LH|Hinged|MH|H|Heavily Hinged|HH|Hinge Remnant|HR)\b/i]),
      "hinge status",
      stampHingeComparable,
    );
    if (hingeConflict) return hingeConflict;
    const gumConflict = stampStatusConflict(
      target.gum ?? target.gumType ?? target.gumCondition,
      stampExplicitValue(listing, ["gum", "gumType", "gumCondition"], [/\b(Original Gum|OG|Partial Original Gum|POG|Disturbed Gum|DG|Regummed|RG|No Gum|NG|Issued Without Gum)\b/i]),
      "gum type",
      stampGumComparable,
    );
    if (gumConflict) return gumConflict;
    checks.push([target.perforation, "perforation", ["perforation"], [/\b(perforated|imperforate|imperf|perforation\s*[0-9.]+)\b/i]]);
    checks.push([target.watermark, "watermark", ["watermark"], [/\b(watermark(?:ed)?|no watermark)\b/i]]);
    checks.push([target.overprintSurcharge ?? target.overprint, "overprint/surcharge", ["overprintSurcharge", "overprint", "surcharge"], [/\b(overprint(?:ed)?|surcharge|airmail|semi[- ]?postal)\b/i]]);
  } else {
    checks.push([target.setNameDescription ?? target.setName ?? target.series, "set name/description", ["setNameDescription", "setName", "series"], []]);
    checks.push([target.sheetType ?? target.format, "set/sheet type", ["sheetType", "format"], [/\b(Set|Sheet|Souvenir Sheet|Block|First Day Cover)\b/i]]);
    checks.push([target.mintOrUsed, "mint/used status", ["mintOrUsed", "status"], [/\b(Mint|Used|Mixed|Unused|CTO)\b/i]]);
    const targetCount = Number(target.numberOfStamps ?? target.quantity);
    const candidateCount = Number(stampExplicitValue(listing, ["numberOfStamps", "stampCount", "quantity"], [/(?:set|sheet|contains?|includes?)\s*(\d+)\s+stamps?/i]));
    if (Number.isFinite(targetCount) && targetCount > 0 && Number.isFinite(candidateCount) && candidateCount > 0 && targetCount !== candidateCount) {
      return `Stamp set size differs: target declares ${targetCount} stamps, but the candidate explicitly declares ${candidateCount}.`;
    }
  }
  for (const [targetValue, label, aliases, patterns] of checks) {
    const candidateValue = stampExplicitValue(listing, aliases, patterns);
    const conflict = stampValueConflict(targetValue, candidateValue, label);
    if (conflict) return conflict;
  }
  return null;
}
function comicSingleIdentityConflict(targetMetadata: string, listing: VisualSourceCandidate): string | null {
  if (!isSingleComicTarget(targetMetadata)) return null;
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidateDetails = candidateStructuredDetails(listing);
  const targetTitle = extractTargetTitle(targetMetadata);
  const candidateTitle = canonicalCandidateTitle(listing);

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
  const isMovieTarget = normalizedChoice(metadataValue(targetMetadata, 'category')) === 'movies';
  const targetFacsimile = normalizedChoice(targetDetails.facsimile);
  const targetDistribution = normalizedChoice(targetDetails.distributionType);
  return listings.flatMap((listing, candidateIndex) => {
    const title = canonicalCandidateTitle(listing);
    // Movie listings commonly add a release label such as "Special Edition"
    // while the target record leaves edition blank. That is a soft difference:
    // send the candidate to image review and let the visual result decide.
    // Edition wording remains a hard conflict for categories where it is an
    // identity-defining variant (comics, cards, games, etc.).
    const conflict = DECLARED_VARIANT_PATTERNS.find((pattern) => {
      if (isMovieTarget && pattern.source.includes('edition')) return false;
      return pattern.test(title) && !pattern.test(targetTitle);
    });
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
    const vintageToyIdentityConflictReason = vintageToyIdentityConflict(targetMetadata, listing);
    const compoundNumberConflict = explicitCompoundNumberConflict(targetMetadata, listing);
    const comicSingleIdentityConflictReason = comicSingleIdentityConflict(targetMetadata, listing);
    const coinSingleIdentityConflictReason = coinSingleIdentityConflict(targetMetadata, listing);
    const coinSetIdentityConflictReason = coinSetIdentityConflict(targetMetadata, listing);
    const paperMoneyIdentityConflictReason = paperMoneyIdentityConflict(targetMetadata, listing);
    const stampsIdentityConflictReason = stampsIdentityConflict(targetMetadata, listing);
    const disneyPinsIdentityConflictReason = disneyPinsIdentityConflict(targetMetadata, listing);
    const videoGameIdentityConflictReason = videoGameIdentityConflict(targetMetadata, listing);
    const movieIdentityConflictReason = movieIdentityConflict(targetMetadata, listing);
    const musicIdentityConflictReason = musicIdentityConflict(targetMetadata, listing);
    const pokemonIdentityConflictReason = pokemonIdentityConflict(targetMetadata, listing);
    const materialConflicts = findMaterialMetadataConflicts(targetMetadata, listing, options);
    const fieldConflict = distributionConflict || facsimileConflict || Boolean(packagingConflict) || Boolean(gradingStateConflict) || Boolean(productFormConflict) || Boolean(sportsCardConflict) || Boolean(sportsCardSetConflictReason) || Boolean(sportsCardUnopenedProductConflictReason) || Boolean(mediaConditionConflict) || Boolean(completenessConflict) || Boolean(vintageToyIdentityConflictReason) || Boolean(compoundNumberConflict) || Boolean(comicSingleIdentityConflictReason) || Boolean(coinSingleIdentityConflictReason) || Boolean(coinSetIdentityConflictReason) || Boolean(paperMoneyIdentityConflictReason) || Boolean(stampsIdentityConflictReason) || Boolean(disneyPinsIdentityConflictReason) || Boolean(videoGameIdentityConflictReason) || Boolean(movieIdentityConflictReason) || Boolean(musicIdentityConflictReason) || Boolean(pokemonIdentityConflictReason) || materialConflicts.length > 0;
    if (!conflict && !fieldConflict) return [];
    const reason = gradingStateConflict ?? sportsCardUnopenedProductConflictReason ?? sportsCardSetConflictReason ?? productFormConflict ?? sportsCardConflict ?? mediaConditionConflict ?? completenessConflict ?? vintageToyIdentityConflictReason ?? compoundNumberConflict ?? comicSingleIdentityConflictReason ?? coinSingleIdentityConflictReason ?? coinSetIdentityConflictReason ?? paperMoneyIdentityConflictReason ?? stampsIdentityConflictReason ?? disneyPinsIdentityConflictReason ?? videoGameIdentityConflictReason ?? movieIdentityConflictReason ?? musicIdentityConflictReason ?? pokemonIdentityConflictReason ?? packagingConflict ?? (materialConflicts.length > 0
      ? metadataConflictReviewReason(materialConflicts)
      : distributionConflict
      ? `Distribution Type is ${targetDistribution === "direct" ? "Direct" : "Newsstand"}, but the title explicitly declares ${distributionPhrase}.`
      : `Facsimile is No, but the title explicitly declares ${title.match(/\b(?:facsimile|reprint|reproduction)\b/i)?.[0] ?? "a reproduction"}.`);
    const metadataDifferences = visualMetadataDifferenceSummary(targetMetadata, listing);
    return [{
      candidateIndex,
      verdict: "mismatch" as const,
      confidence: "high" as const,
      rationale: fieldConflict
        ? `${reason}${metadataDifferences.length > 0 ? ` Metadata differences: ${metadataDifferences.join("; ")}.` : ""} Candidate retained for manual review.`
        : `Declared identity conflict in marketplace title: ${phrase}. Candidate retained for manual review.`,
    }];
  });
}

const MULTI_ITEM_TITLE_PATTERNS = [
  /\b(?:mixed\s+)?(?:lot|bundle|group|collection|assortment)\b/i,
  /\b(?:set|pair|duo|trio|multipack|multi[-\s]?pack|box\s+of|pack\s+of)\b/i,
  /\b(?:of|contains?|includes?)\s*\d+\s+(?:pins?|coins?|cards?|comics?|figures?|items?|pieces?)\b/i,
  /\(\s*\d+\s*\)\s*(?:signed\s+|autographed\s+)?(?:baseballs?|balls?|bats?|cards?|comics?|figures?|items?|photos?|photographs?|pieces?|posters?|pucks?|tickets?)\b/i,
  /\b(?:\d+)\s*(?:coin|coins|card|cards|comic|comics|figure|figures|item|items|piece|pieces)\b/i,
  /\b(?:coins?|cards?|comics?|issues?|figures?)\s+\d+\s*[-–]\s*\d+\b/i,
  /#?\d+\s*(?:\+|,|\/)\s*#?\d+(?:\s*(?:\+|,|\/)\s*#?\d+)+/i,
];

function targetDescribesMultipleItems(targetMetadata: string): boolean {
  const title = extractTargetTitle(targetMetadata);
  const details = extractTargetItemDetails(targetMetadata);
  const targetCategory = normalizedChoice(metadataValue(targetMetadata, "category"));
  const targetType = targetItemTypeValue(targetMetadata);
  const disneyIndividualPin = targetCategory === "disney_pins" && (targetType === "individual_pin" || targetType === "single_pin");
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
  const combined = disneyIndividualPin
    ? `${title} ${detailText}`.replace(/\bcollection\b/gi, "series")
    : `${title} ${detailText}`;
  if (MULTI_ITEM_TITLE_PATTERNS.some(pattern => pattern.test(combined))) return true;
  const normalizedDetailType = String(
    metadataValue(targetMetadata, "itemType")
      || metadataValue(targetMetadata, "productType")
      || metadataValue(targetMetadata, "form")
      || details.itemType
      || details.productType
      || details.form
      || "",
  ).replace(/[_-]+/g, " ");
  if (/\b(?:set|lot|bundle|group|collection|assortment)\b/i.test(normalizedDetailType)) return true;
  if ([details.quantity, details.itemCount, details.numberOfItems, details.lotQuantity].some(value => Number(value) > 1)) return true;
  if (details.isSet === true || details.isLot === true || details.bundle === true) return true;
  return Array.isArray(details.items) && details.items.length > 1;
}

function candidateMultiItemReason<T extends VisualSourceCandidate>(listing: T, targetMetadata = ""): string | null {
  const title = canonicalCandidateTitle(listing).trim();
  const candidateDetails = candidateStructuredDetails(listing);
  const structuredQuantity = [listing.lotQuantity, listing.itemCount, listing.numberOfItems, listing.quantity, candidateDetails.lotQuantity, candidateDetails.itemCount, candidateDetails.numberOfItems, candidateDetails.quantity]
    .map(value => Number(value))
    .find(value => Number.isFinite(value) && value > 1);
  if (structuredQuantity) {
    return `Pre-visual lot filter: listing declares ${structuredQuantity} items, but the target is a single item.`;
  }
  const details = [listing.saleForm, listing.itemType, listing.productType, listing.form, candidateDetails.saleForm, candidateDetails.itemType, candidateDetails.productType, candidateDetails.form]
    .filter(value => value != null).map(String).join(" ");
  const text = `${title} ${details}`.trim();
  const titleQuantity = extractMarketplaceLotQuantity(title);
  if (titleQuantity) {
    return `Pre-visual lot filter: listing declares ${titleQuantity} items, but the target is a single item.`;
  }
  const categoryAwareText = text;
  if (isExplicitMultiItemListing(listing, targetMetadata)) {
    const label = /\b(?:lot|bundle|group|collection|assortment)\b/i.test(categoryAwareText) ? "multi-item lot or collection language" : "multi-item language";
    return `Pre-visual lot filter: title or listing metadata contains ${label}; retained as context-only because the target is a single item.`;
  }
  const years = new Set(categoryAwareText.match(/\b(?:17|18|19|20)\d{2}\b/g) ?? []);
  if (years.size > 1 && /(?:\+|\/|,|\band\b|\bthrough\b|\-)/i.test(categoryAwareText)) {
    return `Pre-visual lot filter: listing names multiple issue years (${[...years].join(", ")}); retained as context-only because the target is a single item.`;
  }
  return null;
}

export function isMultiItemLot<T extends VisualSourceCandidate>(listing: T, targetMetadata: string): boolean {
  return !targetDescribesMultipleItems(targetMetadata) && Boolean(candidateMultiItemReason(listing, targetMetadata));
}
export function multiItemLotReason<T extends VisualSourceCandidate>(listing: T, targetMetadata: string): string | null {
  return isMultiItemLot(listing, targetMetadata) ? candidateMultiItemReason(listing, targetMetadata) : null;
}

function visualPriorityScore<T extends VisualSourceCandidate>(item: T, targetMetadata: string): number {
  const targetTitle = extractTargetTitle(targetMetadata).toLowerCase();
  const title = String(item.title ?? "").toLowerCase();
  const targetTokens = new Set(targetTitle.split(/[^a-z0-9]+/).filter(token => token.length >= 2));
  const titleTokens = new Set(title.split(/[^a-z0-9]+/).filter(token => token.length >= 2));
  const overlap = [...targetTokens].filter(token => titleTokens.has(token)).length;
  const targetGrade = targetMetadata.match(/(?:^|;)\s*grade=([^;]+)/i)?.[1]?.trim().toLowerCase();
  const category = normalizedChoice(metadataValue(targetMetadata, "category"));
  const observedGrade = parseSourceGradeFromTitle(canonicalCandidateTitle(item), { category });
  const gradeMatch = observedGrade && compareComparableGrades(targetGrade, observedGrade.comparable, { allowBareNumeric: true, category }) === "match" ? 1_000 : 0;
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
export function universalMetadataScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const targetTitle = meaningfulMetadataText(extractTargetTitle(targetMetadata)).toLowerCase();
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = sourceText(candidate).toLowerCase();
  const targetTokens = [...new Set(targetTitle.split(/[^a-z0-9]+/).filter((token) => token.length >= 2))];
  const matchedTokens = targetTokens.filter((token) => candidateText.includes(token));
  const matched = matchedTokens.length ? [`title overlap (${matchedTokens.length}/${targetTokens.length})`] : [];
  let score = targetTokens.length ? Math.round((matchedTokens.length / targetTokens.length) * 60) : 0;
  const awards: RankingAward[] = score > 0 ? [{ field: 'titleOverlap', source: 'combined', awardedPoints: score }] : [];
  const category = normalizedChoice(metadataValue(targetMetadata, 'category'));
  const targetGrade = metadataValue(targetMetadata, "grade");
  const directTitleGrade = titleGradeEvidence(candidate.title, category);
  const titleGrade = directTitleGrade ?? titleGradeEvidence(candidateText, category);
  const structuredGrade = normalizedChoice(candidate.grade);
  const candidateGrade = structuredGrade && !/^(?:unknown|n_a|na|none|not_applicable)$/i.test(structuredGrade) ? candidate.grade : titleGrade?.grade || "";
  if (targetGrade && candidateGrade && compareComparableGrades(targetGrade, candidateGrade, { allowBareNumeric: true, category }) === 'match') {
    score += 25;
    matched.push(titleGrade && (!structuredGrade || /^(?:unknown|n_a|na|none|not_applicable)$/i.test(structuredGrade)) ? "grade (title-derived)" : "grade");
    awards.push({ field: 'grade', source: structuredGrade && !/^(?:unknown|n_a|na|none|not_applicable)$/i.test(structuredGrade) ? 'structured' : directTitleGrade ? 'title' : 'combined', awardedPoints: 25 });
  }
  const targetGrader = normalizedChoice(meaningfulMetadataText(metadataValue(targetMetadata, "certificationCompany")));
  const structuredGrader = normalizedChoice(candidate.grader);
  const candidateGrader = structuredGrader && !/^(?:unknown|n_a|na|none|not_applicable)$/i.test(structuredGrader) ? structuredGrader : normalizedChoice(titleGrade?.grader || "");
  if (targetGrader && candidateGrader && candidateGrader === targetGrader) {
    score += 15;
    matched.push(titleGrade && (!structuredGrader || /^(?:unknown|n_a|na|none|not_applicable)$/i.test(structuredGrader)) ? "grading company (title-derived)" : "grading company");
    awards.push({ field: 'gradingCompany', source: structuredGrader && !/^(?:unknown|n_a|na|none|not_applicable)$/i.test(structuredGrader) ? 'structured' : directTitleGrade ? 'title' : 'combined', awardedPoints: 15 });
  }
  const base = { score: Math.min(100, score), matched, awards };
  return ['disney_pins', 'original_art', 'autographs'].includes(category)
    || category === 'comics' && normalizedChoice(metadataValue(targetMetadata, 'itemType')) === 'original_art' ? base
    : contingentGradingScore(listing, targetMetadata, [['titleOverlap', 60], ['grade', 25], ['gradingCompany', 15]], base);
}
function annotateUniversalScores<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string): Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }> {
  return candidates
    .map((candidate) => {
      const scoring = universalMetadataScore(candidate.item, targetMetadata);
      return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown ?? [], metadataScoreAwards: scoring.awards } as T };
    })
    .sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate, index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index + 1 } as T }));
}
export function prioritizeVisualSourceCandidates<T extends VisualSourceCandidate>(
  candidates: Array<{ item: T; candidateIndex: number; imageUrl: string; imageUrls: string[] }>,
  targetMetadata: string,
  declaredReviews: VisualSourceReview[],
  preserveCategoryScoreOrder = false,
) {
  const declaredConflicts = new Set(declaredReviews.filter(review => review.verdict === "mismatch").map(review => review.candidateIndex));
  return candidates
    .filter(candidate => !declaredConflicts.has(candidate.candidateIndex))
    // An explicit matching grader and numeric grade in the marketplace title
    // are the strongest available pre-vision identity signals. They must reach
    // vision before merely exact-tier rows; otherwise a clearly graded match
    // can remain outside the bounded review window behind weaker results.
    .sort((a, b) => preserveCategoryScoreOrder
      ? Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex
      : visualPriorityScore(b.item, targetMetadata) - visualPriorityScore(a.item, targetMetadata) || visualQueryTierPriority(b.item) - visualQueryTierPriority(a.item) || a.candidateIndex - b.candidateIndex)
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
const VIDEO_GAME_GAME_SCORE_FIELDS = [
  ['gameTitle', 20], ['platform', 20], ['releaseYear', 15], ['region', 10], ['edition', 10], ['productForm', 5], ['isGraded', 5], ['gradingCompany', 5], ['grade', 5], ['upcEan', 5],
] as const;
const VIDEO_GAME_CONSOLE_SCORE_FIELDS = [
  ['consoleName', 25], ['modelNumber', 20], ['region', 15], ['workingCondition', 15], ['originalBoxIncluded', 10], ['cablesIncluded', 5], ['controllersIncluded', 5], ['isGraded', 5],
] as const;
const VIDEO_GAME_ACCESSORY_SCORE_FIELDS = [
  ['accessoryType', 20], ['accessoryName', 25], ['compatiblePlatform', 20], ['manufacturer', 10], ['workingCondition', 10], ['originalPackaging', 10], ['isGraded', 5],
] as const;
const AUTOGRAPH_SCORE_FIELDS = [
  ['signer', 35], ['signedItemType', 25], ['autographCategory', 10], ['authenticationIncluded', 10], ['authenticationCompany', 10], ['inscription', 10],
] as const;
function videoGameScoreText(value: unknown): string {
  return videoGameCanonicalValue(value).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}
type ScoreEvidence = { value: string; source: 'structured' | 'title'; field: string };
type ScoreMatch = { result: boolean | null; source: RankingAward['source']; evidence?: RankingAwardEvidence[] };
type ScorePredicate = boolean | null | ScoreMatch;

/** Read the actual winning alias/capture once; never reconstruct it from reasons. */
function scoreCandidateEvidence(listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[] = [], options: { captureOnly?: boolean; titleFallback?: boolean; details?: Record<string, unknown> } = {}): ScoreEvidence | null {
  const details = options.details ?? candidateStructuredDetails(listing);
  for (const alias of aliases) {
    if (alias === 'title' || alias === 'name' || alias === 'productName') {
      const direct = readMetadataValue(listing, [alias]);
      const title = meaningfulMetadataText(canonicalCandidateTitle(listing));
      const value = alias === 'title' ? title : direct;
      if (value) return { value, source: 'title', field: alias };
      continue;
    }
    const value = readMetadataValue(listing, [alias]) || readMetadataValue(details, [alias]);
    if (value) return { value, source: 'structured', field: alias };
  }
  const title = canonicalCandidateTitle(listing);
  for (const pattern of patterns) {
    const match = title.match(pattern);
    const value = match?.[1] || (!options.captureOnly ? match?.[0] : '');
    if (value) return { value: value.trim(), source: 'title', field: aliases[0] ?? 'title' };
  }
  return options.titleFallback && title.trim() ? { value: title.trim(), source: 'title', field: aliases[0] ?? 'title' } : null;
}
function scoreMatch(result: boolean | null, witness?: ScoreEvidence | null, source: RankingAward['source'] = 'combined'): ScoreMatch {
  return witness ? { result, source: witness.source, evidence: [{ field: witness.field, source: witness.source, value: witness.value.slice(0, 240) }] } : { result, source };
}
function scoreResult(predicate: ScorePredicate): boolean | null {
  return typeof predicate === 'object' && predicate !== null ? predicate.result : predicate;
}
function scoreAward(field: string, awardedPoints: number, predicate: ScorePredicate): RankingAward {
  return typeof predicate === 'object' && predicate !== null
    ? { field, source: predicate.source, awardedPoints, ...(predicate.evidence ? { evidence: predicate.evidence } : {}) }
    : { field, source: 'combined', awardedPoints };
}
const GRADING_SCORE_FIELDS = new Set(['isgraded', 'gradingcompany', 'certificationcompany', 'grade', 'numericgrade', 'gradingdetails']);
const gradingFieldKey = (field: string) => field.toLowerCase().replace(/[^a-z0-9]/g, '');
function explicitScoreGradingStates(targetMetadata: string, listing: VisualSourceCandidate) {
  const details = extractTargetItemDetails(targetMetadata);
  const category = normalizedChoice(metadataValue(targetMetadata, 'category'));
  // Only actual identity fields disambiguate a product such as WWE Raw; the
  // target's arbitrary title, condition, description and grader are not hints.
  const identityFields = ['gameTitle', 'cardName', 'setName', 'series', 'releaseTitle', 'albumTitle', 'movieTitle', 'boxSetName',
    'toyName', 'toyNameCharacter', 'gamePuzzleName', 'vehicleName', 'franchise', 'comicTitle', 'productName'];
  const identityValues = identityFields.map(field => readMetadataValue(details, [field])).filter(Boolean);
  const candidateDetails = candidateStructuredDetails(listing);
  const candidateIdentityValues = [...identityValues, ...identityFields.map(field => readMetadataValue(listing, [field]) || readMetadataValue(candidateDetails, [field])).filter(Boolean)];
  const target = determineExplicitGradingState({
    fullItemDetails: details, isGraded: metadataValue(targetMetadata, 'isGraded'), grade: metadataValue(targetMetadata, 'grade'),
    certificationCompany: metadataValue(targetMetadata, 'certificationCompany'),
    ...directMetadataFields(targetMetadata),
  }, { category, title: extractTargetTitle(targetMetadata), identityValues });
  const candidate = determineExplicitGradingState(listing, { category, title: canonicalCandidateTitle(listing), identityValues: candidateIdentityValues });
  return { target, candidate, identityValues, candidateIdentityValues };
}
function gradingStateScoreWitness(state: ObservedExplicitGradingState): ScoreEvidence | null {
  const witness = state.witness;
  if (!witness) return null;
  const observation = state.observations.find(value => value.field === witness.field && value.value === witness.value && value.source === witness.source);
  // Map the actual title capture/structured state alias to its semantic field;
  // grade/grader-derived state keeps its real field and cannot color a fictional
  // provider Is Graded value or make a raw award appear on Grade/grader rows.
  const alias = witness.field.split(/[.\[\]]/).find(value => ['isgraded', 'graded', 'gradingstatus', 'gradingstate'].includes(gradingFieldKey(value)));
  return { value: witness.value, source: witness.source,
    field: observation?.kind === 'explicit' ? alias || 'isGraded' : witness.field };
}
function contingentGradingScore(
  listing: VisualSourceCandidate, targetMetadata: string, fields: readonly (readonly [string, number])[], base: MetadataScoreResult,
): MetadataScoreResult {
  const gradingWeight = fields.reduce((sum, [field, points]) => sum + (GRADING_SCORE_FIELDS.has(gradingFieldKey(field)) ? points : 0), 0);
  if (!gradingWeight) return base;
  const { target, candidate } = explicitScoreGradingStates(targetMetadata, listing);
  const raw = target.state === 'raw';
  const conflicted = target.state === 'conflicted' || candidate.state === 'conflicted';
  const nativeStateWeight = fields.reduce((sum, [field, points]) => sum + (gradingFieldKey(field) === 'isgraded' ? points : 0), 0);
  if (!raw && !conflicted && !nativeStateWeight) return base;
  const exactLegacyLabels: Record<string, string> = { 'grade (title-derived)': 'grade', 'grading company': 'gradingCompany', 'grading company (title-derived)': 'gradingCompany' };
  const displaced = (field: string) => (raw || conflicted) ? GRADING_SCORE_FIELDS.has(gradingFieldKey(exactLegacyLabels[field] || field)) : gradingFieldKey(field) === 'isgraded';
  const awards = base.awards.filter(award => !displaced(award.field));
  const matched = base.matched.filter(field => !displaced(field));
  const unknown = (base.unknown ?? []).filter(field => !displaced(field));
  const stateWeight = raw ? gradingWeight : nativeStateWeight;
  if (!conflicted && stateWeight && target.state !== 'unknown' && candidate.state === target.state) {
    const witness = gradingStateScoreWitness(candidate);
    if (witness) { awards.push(scoreAward('isGraded', stateWeight, scoreMatch(true, witness))); matched.push('isGraded'); }
  } else if (conflicted || stateWeight && (target.state === 'unknown' || candidate.state === 'unknown')) unknown.push('isGraded');
  return { score: awards.reduce((sum, award) => sum + award.awardedPoints, 0), matched, unknown: [...new Set(unknown)], awards };
}
function scoreComposite(left: ScorePredicate, right: ScorePredicate, result: boolean | null): ScoreMatch {
  const parts = [left, right].filter((part): part is ScoreMatch => typeof part === 'object' && part !== null);
  const evidence = parts.flatMap((part) => part.evidence ?? []);
  const sources = new Set(parts.map((part) => part.source));
  const source = sources.has('combined') || parts.length !== 2 ? 'combined' : sources.size === 1 ? parts[0].source : 'mixed';
  return { result, source, ...(evidence.length ? { evidence } : {}) };
}
function videoGameScoreValueMatches(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[], label: string): ScorePredicate {
  const target = videoGameScoreText(meaningfulMetadataText(targetValue));
  if (!target || /^(?:unknown|n a|na|none|not applicable)$/.test(target)) return null;
  if (label === 'edition' && titleContainsValue(canonicalCandidateTitle(listing), targetValue)) {
    return scoreMatch(true, { value: String(targetValue), source: 'title', field: aliases[0] ?? 'edition' });
  }
  // Edition is also independently extracted from the listing title for the
  // comparison table. Use that same title fallback here so a displayed MATCH
  // cannot lose its ranking award at the scorer boundary.
  const witness = scoreCandidateEvidence(listing, aliases, patterns, { titleFallback: label === 'edition' });
  const candidateValue = witness?.value;
  if (!candidateValue) return null;
  const candidate = videoGameScoreText(candidateValue);
  if (!candidate || /^(?:unknown|n a|na|none|not applicable)$/.test(candidate)) return null;
  return scoreMatch(videoGameValuesAgree(targetValue, candidateValue, label), witness);
}
function videoGameScoreBoolean(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[]): ScorePredicate {
  const target = normalizedChoice(targetValue);
  if (!target || !/^(?:yes|no|true|false|1|0|working|not_working|untested)$/.test(target)) return null;
  const witness = scoreCandidateEvidence(listing, aliases, patterns);
  const candidateValue = witness?.value;
  if (!candidateValue) return null;
  const candidate = normalizedChoice(candidateValue);
  if (!candidate) return null;
  if (target === 'yes' || target === 'true' || target === '1') return scoreMatch(/^(?:yes|true|1|working)$/.test(candidate), witness);
  if (target === 'no' || target === 'false' || target === '0') return scoreMatch(/^(?:no|false|0|not_working)$/.test(candidate), witness);
  return scoreMatch(candidate === target, witness);
}
function videoGameAccessoryScoreValueMatches(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[], label: string): ScorePredicate {
  const target = videoGameAccessoryCanonicalValue(meaningfulMetadataText(targetValue));
  if (!target || /^(?:unknown|n_a|na|none|not_applicable)$/.test(target)) return null;
  // Prefer a specific product identity in the title over a generic provider
  // label such as "Controller".
  const title = normalizeVisualSourceCandidate(listing).title;
  if (["name", "type", "manufacturer"].includes(label) && titleContainsValue(title, targetValue)) return scoreMatch(true, { value: title, source: 'title', field: aliases[0] });
  const witness = scoreCandidateEvidence(listing, aliases, patterns, { details: videoGameAccessoryDetails(listing) });
  const candidateValue = witness?.value;
  if (!candidateValue) return null;
  const candidate = videoGameAccessoryCanonicalValue(candidateValue);
  if (!candidate || /^(?:unknown|n_a|na|none|not_applicable)$/.test(candidate)) return null;
  return scoreMatch(videoGameAccessoryValuesAgree(targetValue, candidateValue, label), witness);
}
function videoGameAccessoryScoreBoolean(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[]): ScorePredicate {
  const target = videoGameAccessoryCanonicalValue(targetValue);
  if (!target || !/^(?:yes|no|true|false|1|0)$/.test(target)) return null;
  const explicit = scoreCandidateEvidence(listing, aliases, [], { details: videoGameAccessoryDetails(listing) });
  if (!explicit && aliases.some((alias) => ["originalPackaging", "packaging", "boxIncluded"].includes(alias))) {
    const titleState = titlePackagingState(listing.title);
    if (titleState !== "unknown") return scoreMatch(target === "yes" || target === "true" || target === "1" ? titleState === "yes" : titleState === "no", { value: titleState, source: 'title', field: aliases[0] });
  }
  const witness = explicit ?? scoreCandidateEvidence(listing, aliases, patterns, { details: videoGameAccessoryDetails(listing) });
  const candidateValue = witness?.value;
  if (!candidateValue) return null;
  const candidate = videoGameAccessoryCanonicalValue(candidateValue);
  if (!candidate) return null;
  if (target === "yes" || target === "true" || target === "1") return scoreMatch(/^(?:yes|true|1|original_packaging|original_box|included|with_packaging|with_box|open_box|boxed|complete_with_box|complete_with_manuals|with_manuals)$/.test(candidate), witness);
  return scoreMatch(/^(?:no|false|0|no_packaging|no_box|missing|without_packaging|without_box)$/.test(candidate), witness);
}
function videoGameScoreProductForm(targetMetadata: string, listing: VisualSourceCandidate): boolean | null {
  const targetForm = targetProductForm(targetMetadata);
  const candidateForm = candidateProductForm(targetMetadata, listing);
  if (!targetForm || !candidateForm) return null;
  return targetForm === candidateForm;
}
function videoGameScoreGradingCompany(targetValue: unknown, listing: VisualSourceCandidate): ScorePredicate {
  const target = videoGameScoreText(targetValue);
  if (!target || /^(?:unknown|n a|na|none|raw|ungraded|not applicable)$/.test(target)) return null;
  const structured = scoreCandidateEvidence(listing, ['gradingCompany', 'certificationCompany', 'grader']);
  const titleEvidence = titleGradeEvidence(canonicalCandidateTitle(listing));
  const witness = structured ?? (titleEvidence?.grader ? { value: titleEvidence.grader, source: 'title' as const, field: 'gradingCompany' } : null);
  const candidate = videoGameScoreText(witness?.value || '');
  if (!candidate || /^(?:unknown|n a|na|none|raw|ungraded|not applicable)$/.test(candidate)) return null;
  return scoreMatch(canonicalVideoGameGrader('video_games', candidate) === canonicalVideoGameGrader('video_games', target), witness);
}
function videoGameScoreGrade(targetValue: unknown, listing: VisualSourceCandidate): ScorePredicate {
  const target = videoGameScoreText(targetValue);
  if (!target || /^(?:unknown|n a|na|none|raw|ungraded|not applicable)$/.test(target)) return null;
  const structured = scoreCandidateEvidence(listing, ['grade', 'numericGrade', 'gameGrade']);
  const titleEvidence = titleGradeEvidence(canonicalCandidateTitle(listing), 'video_games');
  const witness = structured ?? (titleEvidence?.grade ? { value: titleEvidence.grade, source: 'title' as const, field: 'grade' } : null);
  const candidate = videoGameScoreText(witness?.value || '');
  if (!candidate || /^(?:unknown|n a|na|none|raw|ungraded|not applicable)$/.test(candidate)) return null;
  const result = compareComparableGrades(targetValue, witness?.value, { allowBareNumeric: true, category: 'video_games' });
  return scoreMatch(result === 'unknown' ? null : result === 'match', witness);
}
function videoGameScoreIsGraded(targetValue: unknown, listing: VisualSourceCandidate): ScorePredicate {
  const target = determineExplicitGradingState({ isGraded: targetValue }, { category: 'video_games' });
  const candidate = determineExplicitGradingState(listing, { category: 'video_games', title: canonicalCandidateTitle(listing) });
  if (target.state === 'unknown' || candidate.state === 'unknown' || target.state === 'conflicted' || candidate.state === 'conflicted') return null;
  return scoreMatch(target.state === candidate.state, gradingStateScoreWitness(candidate));
}
function videoGameScore<T extends readonly (readonly [string, number])[]>(
  listing: VisualSourceCandidate,
  targetMetadata: string,
  fields: T,
  targetType: 'game' | 'console' | 'accessory',
): MetadataScoreResult {
  const target = extractTargetItemDetails(targetMetadata);
  const matched: string[] = [];
  const unknown: string[] = [];
  const awards: RankingAward[] = [];
  let score = 0;
  const add = (field: string, points: number, result: ScorePredicate) => {
    if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); }
    else if (scoreResult(result) === null) unknown.push(field);
  };
  if (targetType === 'game') {
    add('gameTitle', 20, videoGameScoreValueMatches(firstMeaningfulValue(target.gameTitle, extractTargetTitle(targetMetadata)), listing, ['gameTitle', 'title'], [], 'title'));
    add('platform', 20, videoGameScoreValueMatches(target.platform, listing, ['platform', 'consoleName'], [/(?:NES|SNES|N64|GameCube|Wii(?:\s+U)?|Switch(?:\s+2)?|PlayStation|PS[1-5]|Xbox(?:\s+(?:360|One|Series\s+X\/S))?|Sega(?:\s+Master\s+System)?|Genesis|Saturn|Dreamcast|PC)/i], 'platform'));
    add('releaseYear', 15, videoGameScoreValueMatches(firstMeaningfulValue(target.releaseYear, target.year), listing, ['releaseYear', 'year'], [/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/], 'year'));
    add('region', 10, videoGameScoreValueMatches(target.region, listing, ['region'], [/(?:NTSC-U|NTSC-J|PAL|Region\s+Free)/i], 'region'));
    add('edition', 10, videoGameScoreValueMatches(target.edition, listing, ['edition', 'releaseType'], [], 'edition'));
    add('productForm', 5, videoGameScoreProductForm(targetMetadata, listing));
    add('isGraded', 5, videoGameScoreIsGraded(firstMeaningfulValue(metadataValue(targetMetadata, 'isGraded'), target.isGraded, target.graded), listing));
    add('gradingCompany', 5, videoGameScoreGradingCompany(firstMeaningfulValue(metadataValue(targetMetadata, 'certificationCompany'), target.gradingCompany, target.certificationCompany, target.grader), listing));
    add('grade', 5, videoGameScoreGrade(firstMeaningfulValue(metadataValue(targetMetadata, 'grade'), target.grade, target.numericGrade), listing));
    add('upcEan', 5, videoGameScoreValueMatches(firstMeaningfulValue(target.upc, target.ean), listing, ['upc', 'ean', 'barcode'], [/(?:UPC|EAN|barcode)\s*[:#]?\s*([0-9]{8,14})/i], 'upc'));
  } else if (targetType === 'console') {
    add('consoleName', 25, videoGameScoreValueMatches(firstMeaningfulValue(target.consoleName, extractTargetTitle(targetMetadata)), listing, ['consoleName', 'platform', 'title'], [/(?:NES|SNES|N64|GameCube|Wii(?:\s+U)?|Switch(?:\s+2)?|Sega\s+Genesis|Sega\s+Saturn|Dreamcast|PS[1-5]|Xbox(?:\s+(?:360|One|Series\s+X\/S))?)/i], 'name'));
    add('modelNumber', 20, videoGameScoreValueMatches(target.modelNumber, listing, ['modelNumber', 'model', 'sku'], [], 'model'));
    add('region', 15, videoGameScoreValueMatches(target.region, listing, ['region'], [/(?:NTSC-U|NTSC-J|PAL|Region\s+Free)/i], 'region'));
    add('workingCondition', 15, videoGameScoreValueMatches(target.workingCondition, listing, ['workingCondition', 'functionality', 'tested'], [/(?:Working|Not\s+Working|Untested)/i], 'working'));
    add('originalBoxIncluded', 10, videoGameScoreBoolean(target.originalBoxIncluded, listing, ['originalBoxIncluded', 'originalBox', 'boxIncluded'], [/(?:original\s+box|box\s+included|no\s+box)/i]));
    add('cablesIncluded', 5, videoGameScoreBoolean(target.cablesIncluded, listing, ['cablesIncluded', 'cables'], [/(?:cables?\s+included|no\s+cables?)/i]));
    add('controllersIncluded', 5, videoGameScoreBoolean(target.controllersIncluded, listing, ['controllersIncluded', 'controllers'], [/(?:controllers?\s+included|no\s+controllers?)/i]));
    add('isGraded', 5, videoGameScoreIsGraded(firstMeaningfulValue(metadataValue(targetMetadata, 'isGraded'), target.isGraded, target.graded), listing));
  } else {
    add('accessoryType', 20, videoGameAccessoryScoreValueMatches(target.accessoryType, listing, ['accessoryType', 'type', 'accessory_type', 'itemType'], [], 'type'));
    add('accessoryName', 25, videoGameAccessoryScoreValueMatches(target.accessoryName, listing, ['accessoryName', 'name', 'accessory_name', 'modelName', 'title'], [], 'name'));
    add('compatiblePlatform', 20, videoGameAccessoryScoreValueMatches(target.platform, listing, ['platform', 'compatiblePlatform', 'compatibleSystem', 'console', 'system'], [/(?:NES|SNES|N64|GameCube|Wii(?:\s+U)?|Switch(?:\s+2)?|PlayStation|PS[1-5]|Xbox|Sega|PC)/i], 'platform'));
    add('manufacturer', 10, videoGameAccessoryScoreValueMatches(target.manufacturer, listing, ['manufacturer', 'brand', 'maker'], [], 'manufacturer'));
    add('workingCondition', 10, videoGameAccessoryScoreValueMatches(target.workingCondition, listing, ['workingCondition', 'functionality', 'tested', 'working_status'], [/(?:Working|Tested|For\s+Parts|Not\s+Working|Untested)/i], 'working'));
    add('originalPackaging', 10, videoGameAccessoryScoreBoolean(target.originalPackaging, listing, ['originalPackaging', 'packaging', 'packageType', 'boxIncluded'], [/(?:original\s+(?:packaging|box)|no\s+(?:packaging|box))/i]));
    add('isGraded', 5, videoGameScoreIsGraded(firstMeaningfulValue(metadataValue(targetMetadata, 'isGraded'), target.isGraded, target.graded), listing));
  }
  void fields;
  return contingentGradingScore(listing, targetMetadata, fields, { score, matched, unknown, awards });
}
export function videoGameGameVisualScore(listing: VisualSourceCandidate, targetMetadata: string) { return videoGameScore(listing, targetMetadata, VIDEO_GAME_GAME_SCORE_FIELDS, 'game'); }
export function videoGameConsoleVisualScore(listing: VisualSourceCandidate, targetMetadata: string) { return videoGameScore(listing, targetMetadata, VIDEO_GAME_CONSOLE_SCORE_FIELDS, 'console'); }
export function videoGameAccessoryVisualScore(listing: VisualSourceCandidate, targetMetadata: string) { return videoGameScore(listing, targetMetadata, VIDEO_GAME_ACCESSORY_SCORE_FIELDS, 'accessory'); }
export function videoGameVisualCap(score: number): number {
  if (score >= 90) return 8;
  if (score >= 80) return 6;
  if (score >= 70) return 4;
  if (score >= 50) return 2;
  return 0;
}
const MOVIES_INDIVIDUAL_SCORE_FIELDS = [
  ['movieTitle', 25], ['format', 25], ['releaseYear', 15], ['edition', 15], ['region', 5], ['sealed', 5], ['gradingCompany', 5], ['grade', 5],
] as const;
const MOVIES_BOX_SET_SCORE_FIELDS = [
  ['boxSetName', 30], ['format', 20], ['numberOfMovies', 15], ['edition', 15], ['sealed', 10], ['gradingDetails', 10],
] as const;
function movieScoreText(value: unknown): string {
  return movieCanonicalText(value);
}
function movieScoreValueMatches(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[] = [], textMatch = false): ScorePredicate {
  const target = movieScoreText(meaningfulMetadataText(targetValue));
  if (!target || /^(?:unknown|n a|na|none|not applicable)$/.test(target)) return null;
  // Edition and other text identities may exist only in the marketplace title.
  // Keep the scorer aligned with the comparison table's title-derived evidence;
  // otherwise the UI can show MATCH while the award remains missing.
  const witness = scoreCandidateEvidence(listing, aliases, patterns, { titleFallback: textMatch });
  const candidateValue = witness?.value;
  if (!candidateValue) return null;
  const candidate = movieScoreText(candidateValue);
  if (!candidate || /^(?:unknown|n a|na|none|not applicable)$/.test(candidate)) return null;
  return scoreMatch(textMatch ? movieValuesAgree(targetValue, candidateValue) : target === candidate, witness);
}
function movieScoreEditionMatches(targetValue: unknown, listing: VisualSourceCandidate): ScorePredicate {
  const target = movieScoreText(meaningfulMetadataText(targetValue));
  if (!target || /^(?:unknown|n a|na|none|not applicable)$/.test(target)) return null;
  const structured = scoreCandidateEvidence(listing, ['edition', 'releaseType']);
  const title = canonicalCandidateTitle(listing);
  const titleMatch = title.match(/\b(?:limited|special|collector['’]?s?|anniversary|ultimate|deluxe|director['’]?s?|extended|criterion|steelbook)\s+edition\b/i);
  const titleHasTarget = titleMatch || titleContainsValue(title, targetValue);
  const witness = structured ?? (titleHasTarget ? { value: titleMatch?.[0] ?? String(targetValue), source: 'title' as const, field: 'edition' } : null);
  if (!witness) return null;
  const editionTerms = (value: unknown) => movieScoreText(value).replace(/\bedition\b/g, '').split(' ')
    .filter((term) => term.length > 1).map((term) => term.replace(/s$/, ''));
  const targetTerms = editionTerms(targetValue);
  const candidateTerms = editionTerms(witness.value);
  const agrees = targetTerms.length > 0 && targetTerms.every((term) => candidateTerms.includes(term));
  return scoreMatch(agrees, witness);
}
function movieScoreFormatMatches(targetValue: unknown, listing: VisualSourceCandidate): ScorePredicate {
  const target = movieFormat(meaningfulMetadataText(targetValue));
  if (!target || /^(?:unknown|n a|na|none|not applicable)$/.test(target)) return null;
  const witness = scoreCandidateEvidence(listing, ['format', 'mediaFormat'], [/(?:DVD|Blu[- ]?ray|4K\s+UHD|VHS|LaserDisc|Mixed)/i]);
  const candidateValue = witness?.value;
  if (!candidateValue) return null;
  return scoreMatch(target === movieFormat(candidateValue), witness);
}
function movieScoreBooleanMatches(targetValue: unknown, listing: VisualSourceCandidate): ScorePredicate {
  const target = movieBoolean(meaningfulMetadataText(targetValue));
  if (!target) return null;
  const witness = scoreCandidateEvidence(listing, ['sealed', 'sealedStatus', 'packaging'], [/(?:factory\s+sealed|sealed|opened|used)/i]);
  const candidateValue = witness?.value;
  if (!candidateValue) return null;
  const candidate = movieBoolean(candidateValue);
  return scoreMatch(candidate ? candidate === target : null, witness);
}
function movieScoreCountMatches(targetValue: unknown, listing: VisualSourceCandidate): ScorePredicate {
  const target = Number(targetValue);
  if (!Number.isFinite(target) || target <= 0) return null;
  const read = scoreCandidateEvidence(listing, ['numberOfMovies', 'movieCount', 'quantity'], [/(?:contains?|includes?|set\s+of)\s*(\d+)\s+movies?/i, /\b(\d+)\s*[- ]?(?:disc|movie)\s+(?:box\s+)?set\b/i]);
  const seasonCount = read ? '' : movieSeasonCountFromText(canonicalCandidateTitle(listing));
  const witness = read ?? (seasonCount ? { value: seasonCount, source: 'title' as const, field: 'numberOfMovies' } : null);
  const candidateValue = witness?.value;
  const candidate = Number(candidateValue);
  return scoreMatch(Number.isFinite(candidate) && candidate > 0 ? candidate === target : null, witness);
}
export function moviesIndividualVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  if (movieTargetItemType(targetMetadata) !== 'individual_movie') return { score: 0, matched: [], unknown: [], awards: [] };
  const target = extractTargetItemDetails(targetMetadata);
  const matched: string[] = []; const unknown: string[] = []; let score = 0;
  const awards: RankingAward[] = [];
  const add = (field: typeof MOVIES_INDIVIDUAL_SCORE_FIELDS[number][0], points: number, result: ScorePredicate) => { if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); } else if (scoreResult(result) === null) unknown.push(field); };
  add('movieTitle', 25, movieScoreValueMatches(firstMeaningfulValue(target.title, target.movieTitle, extractTargetTitle(targetMetadata)), listing, ['title', 'movieTitle'], [], true));
  add('format', 25, movieScoreFormatMatches(target.format, listing));
  add('releaseYear', 15, movieScoreValueMatches(firstMeaningfulValue(target.releaseYear, target.year), listing, ['releaseYear', 'year'], [/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/]));
  add('edition', 15, movieScoreEditionMatches(target.edition, listing));
  add('region', 5, movieScoreValueMatches(target.region, listing, ['region', 'regionCode'], [/(?:Region\s*[0-9A-C]|NTSC|PAL)/i]));
  add('sealed', 5, movieScoreBooleanMatches(firstMeaningfulValue(target.sealed, target.sealedStatus), listing));
  add('gradingCompany', 5, coinGradingCompanyMatches(targetMetadata, normalizeVisualSourceCandidate(listing)));
  add('grade', 5, coinNumericGradeMatches(targetMetadata, normalizeVisualSourceCandidate(listing)));
  return contingentGradingScore(listing, targetMetadata, MOVIES_INDIVIDUAL_SCORE_FIELDS, { score, matched, unknown, awards });
}
export function moviesBoxSetVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  if (movieTargetItemType(targetMetadata) !== 'box_set') return { score: 0, matched: [], unknown: [], awards: [] };
  const target = extractTargetItemDetails(targetMetadata);
  const matched: string[] = []; const unknown: string[] = []; let score = 0;
  const awards: RankingAward[] = [];
  const add = (field: typeof MOVIES_BOX_SET_SCORE_FIELDS[number][0], points: number, result: ScorePredicate) => { if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); } else if (scoreResult(result) === null) unknown.push(field); };
  add('boxSetName', 30, movieScoreValueMatches(firstMeaningfulValue(target.boxSetName, target.title, extractTargetTitle(targetMetadata)), listing, ['boxSetName', 'title', 'seriesName'], [], true));
  add('format', 20, movieScoreFormatMatches(target.format, listing));
  add('numberOfMovies', 15, movieScoreCountMatches(firstMeaningfulValue(target.numberOfMovies, target.movieCount) ?? movieSeasonCountFromText(firstMeaningfulValue(target.boxSetName, target.title, extractTargetTitle(targetMetadata))), listing));
  add('edition', 15, movieScoreEditionMatches(target.edition, listing));
  add('sealed', 10, movieScoreBooleanMatches(firstMeaningfulValue(target.sealed, target.sealedStatus), listing));
  const gradeMatch = coinNumericGradeMatches(targetMetadata, normalizeVisualSourceCandidate(listing));
  const companyMatch = coinGradingCompanyMatches(targetMetadata, normalizeVisualSourceCandidate(listing));
  add('gradingDetails', 10, scoreComposite(gradeMatch, companyMatch, scoreResult(gradeMatch) === true && scoreResult(companyMatch) === true ? true : scoreResult(gradeMatch) === false || scoreResult(companyMatch) === false ? false : null));
  return contingentGradingScore(listing, targetMetadata, MOVIES_BOX_SET_SCORE_FIELDS, { score, matched, unknown, awards });
}
export function moviesVisualCap(score: number): number {
  if (score >= 90) return 8;
  if (score >= 80) return 6;
  if (score >= 70) return 4;
  if (score >= 60) return 2;
  return 0;
}
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
  const target = coinComparable(meaningfulMetadataText(targetValue));
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
export function paperMoneyVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = sourceText(candidate);
  const matched: string[] = [];
  const unknown: string[] = [];
  const awards: RankingAward[] = [];
  let score = 0;
  const add = (field: typeof PAPER_MONEY_SCORE_FIELDS[number][0], points: number, result: ScorePredicate) => {
    if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); }
    else if (scoreResult(result) === null) unknown.push(field);
  };
  add('country', 20, coinScoreValueMatches(firstMeaningfulValue(targetDetails.country, targetDetails.issuingCountry), listing, ['country', 'issuingCountry'], [/\b(United States|USA|Canada|Mexico|Australia|United Kingdom|Great Britain|France|Germany|Japan)\b/i]));
  add('denomination', 20, coinScoreValueMatches(firstMeaningfulValue(targetDetails.denomination, targetDetails.noteDenomination, targetDetails.value), listing, ['denomination', 'noteDenomination', 'value'], [/\b(?:\$|£|€|\d+\s*(?:dollars?|cents?|pounds?|euros?))\b/i]));
  add('yearDate', 15, coinScoreValueMatches(firstMeaningfulValue(targetDetails.year, targetDetails.date, targetDetails.issueYear), listing, ['year', 'date', 'issueYear'], [/(?:^|[^0-9])((?:16|17|18|19|20)\d{2})(?:[^0-9]|$)/i]));
  add('titleSeries', 15, paperMoneyTextMatches(firstMeaningfulValue(targetDetails.series, targetDetails.noteType, targetDetails.design, targetDetails.subject, targetDetails.title, extractTargetTitle(targetMetadata)), candidateText));
  add('numericGrade', 12, coinNumericGradeMatches(targetMetadata, candidate));
  add('gradingCompany', 8, coinGradingCompanyMatches(targetMetadata, candidate));
  add('signature', 5, paperMoneyBooleanMatches(firstMeaningfulValue(targetDetails.signature, targetDetails.signed, targetDetails.isSigned), candidateText, /\b(?:signed|signature|autograph(?:ed)?)\b/i, /\b(?:unsigned|not\s+signed|no\s+signature)\b/i));
  add('condition', 5, scoreMatch(paperMoneyTextMatches(firstMeaningfulValue(targetDetails.condition, metadataValue(targetMetadata, 'condition')), candidate.condition || candidateText), candidate.condition ? { value: candidate.condition, source: 'structured', field: 'condition' } : null));
  return contingentGradingScore(listing, targetMetadata, PAPER_MONEY_SCORE_FIELDS, { score, matched, unknown, awards });
}
export function paperMoneyVisualCap(score: number): number {
  if (score >= 90) return 8;
  if (score >= 80) return 6;
  if (score >= 70) return 4;
  if (score >= 60) return 2;
  return 0;
}
const STAMPS_SINGLE_SCORE_FIELDS = [
  ['scottNumber', 25], ['country', 15], ['year', 15], ['denomination', 10], ['format', 10],
  ['mintOrUsed', 10], ['hingeStatus', 3], ['gumType', 2], ['perforation', 5], ['watermark', 3], ['overprintSurcharge', 2],
] as const;
function stampScoreText(value: unknown): string {
  return stampComparable(meaningfulMetadataText(value));
}
function stampTextMatches(targetValue: unknown, candidateText: string): boolean | null {
  const target = stampScoreText(targetValue);
  if (!target) return null;
  const tokens = target.split(' ').filter((token) => token.length > 1);
  if (!tokens.length) return null;
  const candidate = stampScoreText(candidateText);
  return tokens.every((token) => candidate.includes(token));
}
function stampScoreValueMatches(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[] = []): ScorePredicate {
  const target = stampScoreText(meaningfulMetadataText(targetValue));
  if (!target) return null;
  const witness = scoreCandidateEvidence(listing, aliases, patterns, { captureOnly: true });
  const candidate = witness?.value;
  if (!candidate) return null;
  const normalizedCandidate = stampScoreText(candidate);
  return scoreMatch(normalizedCandidate === target || normalizedCandidate.includes(target) || target.includes(normalizedCandidate), witness);
}
function stampStatusMatches(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[], normalize: (value: unknown) => string): ScorePredicate {
  const target = normalize(meaningfulMetadataText(targetValue));
  if (!target) return null;
  const witness = scoreCandidateEvidence(listing, aliases, patterns, { captureOnly: true });
  const candidate = witness?.value;
  if (!candidate) return null;
  const normalizedCandidate = normalize(candidate);
  return scoreMatch(normalizedCandidate ? normalizedCandidate === target : null, witness);
}
function stampFormatMatches(targetMetadata: string, listing: VisualSourceCandidate): boolean | null {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const targetProfile = classifyStampFormat({ title: extractTargetTitle(targetMetadata), itemType: metadataValue(targetMetadata, 'itemType'), itemDetails: JSON.stringify(targetDetails) });
  const candidateDetails = candidateStructuredDetails(listing);
  const candidateProfile = classifyStampFormat({ title: canonicalCandidateTitle(listing), itemType: String(listing.itemType ?? candidateDetails.itemType ?? ''), itemDetails: JSON.stringify(candidateDetails) });
  if (targetProfile.key === 'unknown' || candidateProfile.key === 'unknown') return null;
  return stampFormatsCompatible(targetProfile, candidateProfile);
}
export function stampsSingleVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const target = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const text = sourceText(candidate);
  const matched: string[] = []; const unknown: string[] = []; let score = 0;
  const awards: RankingAward[] = [];
  const add = (field: typeof STAMPS_SINGLE_SCORE_FIELDS[number][0], points: number, result: ScorePredicate) => { if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); } else if (scoreResult(result) === null) unknown.push(field); };
  add('scottNumber', 25, stampScoreValueMatches(target.scottNumber ?? target.catalogNumber ?? target.catalogNo, listing, ['scottNumber', 'catalogNumber', 'catalogNo'], [/(?:Scott|catalog|cat\.?)\s*#?\s*([A-Z]?\d{1,8})\b/i]));
  add('country', 15, stampScoreValueMatches(target.country ?? target.issuingCountry, listing, ['country', 'issuingCountry'], [/\b(United States|USA|Canada|Mexico|Australia|United Kingdom|Great Britain|France|Germany|Japan)\b/i]));
  add('year', 15, stampScoreValueMatches(target.year ?? target.date ?? target.issueYear, listing, ['year', 'date', 'issueYear'], [/(?:^|[^0-9])((?:16|17|18|19|20)\d{2})(?:[^0-9]|$)/i]));
  add('denomination', 10, stampScoreValueMatches(target.denomination, listing, ['denomination'], [/\b(\$?\d+(?:\.\d+)?\s*(?:c|cent|cents|d|dollar|dollars|p|pence|pound|pounds))\b/i]));
  add('format', 10, stampFormatMatches(targetMetadata, listing));
  add('mintOrUsed', 10, stampScoreValueMatches(target.mintOrUsed, listing, ['mintOrUsed', 'status'], [/\b(Mint|Used|Unused|CTO)\b/i]));
  add('hingeStatus', 3, stampStatusMatches(target.hinged ?? target.hingeStatus, listing, ['hinged', 'hingeStatus'], [/\b(Never Hinged|MNH|Mint Never Hinged|NH|Lightly Hinged|LH|Hinged|MH|H|Heavily Hinged|HH|Hinge Remnant|HR)\b/i], stampHingeComparable));
  add('gumType', 2, stampStatusMatches(target.gum ?? target.gumType ?? target.gumCondition, listing, ['gum', 'gumType', 'gumCondition'], [/\b(Original Gum|OG|Partial Original Gum|POG|Disturbed Gum|DG|Regummed|RG|No Gum|NG|Issued Without Gum)\b/i], stampGumComparable));
  add('perforation', 5, stampScoreValueMatches(target.perforation, listing, ['perforation'], [/\b(perforated|imperforate|imperf|perforation\s*[0-9.]+)\b/i]));
  add('watermark', 3, stampTextMatches(target.watermark, text));
  add('overprintSurcharge', 2, stampTextMatches(target.overprintSurcharge ?? target.overprint, text));
  return { score, matched, unknown, awards };
}
export function stampsSingleVisualCap(score: number): number { if (score >= 90) return 8; if (score >= 80) return 6; if (score >= 70) return 4; if (score >= 60) return 2; return 0; }
const STAMPS_SET_SCORE_FIELDS = [
  ['setName', 25], ['country', 15], ['year', 15], ['sheetType', 15], ['numberOfStamps', 10], ['mintOrUsed', 8], ['grade', 5], ['gradingCompany', 4], ['format', 3],
] as const;
export function stampsSetVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const target = extractTargetItemDetails(targetMetadata); const candidate = normalizeVisualSourceCandidate(listing); const text = sourceText(candidate);
  const matched: string[] = []; const unknown: string[] = []; let score = 0;
  const awards: RankingAward[] = [];
  const add = (field: typeof STAMPS_SET_SCORE_FIELDS[number][0], points: number, result: ScorePredicate) => { if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); } else if (scoreResult(result) === null) unknown.push(field); };
  add('setName', 25, stampTextMatches(target.setNameDescription ?? target.setName ?? target.series, text));
  add('country', 15, stampScoreValueMatches(target.country ?? target.issuingCountry, listing, ['country', 'issuingCountry'], [/\b(United States|USA|Canada|Mexico|Australia|United Kingdom|Great Britain|France|Germany|Japan)\b/i]));
  add('year', 15, stampScoreValueMatches(target.year ?? target.date ?? target.issueYear, listing, ['year', 'date', 'issueYear'], [/(?:^|[^0-9])((?:16|17|18|19|20)\d{2})(?:[^0-9]|$)/i]));
  add('sheetType', 15, stampScoreValueMatches(target.sheetType ?? target.format, listing, ['sheetType', 'format'], [/\b(Set|Sheet|Souvenir Sheet|Block|First Day Cover)\b/i]));
  const targetCount = Number(target.numberOfStamps ?? target.quantity);
  const countWitness = scoreCandidateEvidence(listing, ['numberOfStamps', 'stampCount', 'quantity'], [/(?:set|sheet|contains?|includes?)\s*(\d+)\s+stamps?/i], { captureOnly: true });
  const candidateCount = Number(countWitness?.value);
  add('numberOfStamps', 10, scoreMatch(Number.isFinite(targetCount) && targetCount > 0 ? (Number.isFinite(candidateCount) && candidateCount > 0 ? candidateCount === targetCount : null) : null, countWitness));
  add('mintOrUsed', 8, stampScoreValueMatches(target.mintOrUsed, listing, ['mintOrUsed', 'status'], [/\b(Mint|Used|Mixed|Unused|CTO)\b/i]));
  add('grade', 5, coinNumericGradeMatches(targetMetadata, candidate));
  add('gradingCompany', 4, coinGradingCompanyMatches(targetMetadata, candidate));
  add('format', 3, stampFormatMatches(targetMetadata, listing));
  return contingentGradingScore(listing, targetMetadata, STAMPS_SET_SCORE_FIELDS, { score, matched, unknown, awards });
}
export function stampsSetVisualCap(score: number): number { if (score >= 90) return 8; if (score >= 80) return 6; if (score >= 70) return 4; if (score >= 60) return 2; return 0; }
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
  const itemType = targetItemTypeValue(targetMetadata);
  return normalizedChoice(metadataValue(targetMetadata, 'category')) === 'comics'
    && ['single_comic', 'single_issue', 'comic'].includes(itemType);
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
): ScorePredicate {
  const target = normalizer(meaningfulMetadataText(targetValue));
  if (!target) return null;
  const witness = scoreCandidateEvidence(listing, aliases, titlePatterns, { captureOnly: true });
  const candidateValue = witness?.value;
  if (!candidateValue) return null;
  const candidate = normalizer(candidateValue);
  return scoreMatch(Boolean(candidate && (candidate === target || candidate.includes(target) || target.includes(candidate))), witness);
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
  const targetTokens = coinComparable(meaningfulMetadataText(targetValue))
    .split(' ')
    .filter((token) => token && !/^\d{4}$/.test(token) && !/^(?:coin|coins|graded|pcgs|ngc)$/.test(token));
  if (!targetTokens.length) return null;
  const candidate = coinComparable(candidateText);
  return targetTokens.every((token) => candidate.includes(token));
}
function coinNumericGradeMatches(targetMetadata: string, candidate: NormalizedVisualSourceCandidate): ScorePredicate {
  const category = normalizedChoice(metadataValue(targetMetadata, 'category'));
  const target = parsedComparableGrade(metadataValue(targetMetadata, 'grade'), { allowBareNumeric: true, category });
  if (!target) return null;
  const structured = parsedComparableGrade(candidate.grade, { allowBareNumeric: true, category });
  // A complete title can begin with a year/issue number. Use the title reader,
  // not the structured-value parser's intentional leading-number rejection.
  const source = structured ?? parseSourceGradeFromTitle(candidate.title, { category })?.comparable;
  if (!source) return null;
  const result = compareComparableGrades(target, source, { allowBareNumeric: true, category });
  return scoreMatch(result === 'unknown' ? null : result === 'match', { value: structured ? candidate.grade : candidate.title, source: structured ? 'structured' : 'title', field: 'grade' });
}
function coinGradingCompanyMatches(targetMetadata: string, candidate: NormalizedVisualSourceCandidate): ScorePredicate {
  const target = targetGrader(targetMetadata);
  if (!target || /^(?:UNKNOWN|NONE|RAW|UNGRADED|N\/A)$/i.test(target)) return null;
  const structured = normalizedGrader(candidate.grader);
  const source = structured || candidateGrader(candidate);
  if (!source) return null;
  return scoreMatch(source === target, { value: source, source: structured ? 'structured' : 'title', field: 'gradingCompany' });
}
export function coinsSingleVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = sourceText(candidate);
  const matched: string[] = [];
  const unknown: string[] = [];
  const awards: RankingAward[] = [];
  let score = 0;
  const add = (field: typeof COIN_SINGLE_SCORE_FIELDS[number][0], points: number, result: ScorePredicate) => {
    if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); }
    else if (scoreResult(result) === null) unknown.push(field);
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
  return contingentGradingScore(listing, targetMetadata, COIN_SINGLE_SCORE_FIELDS, { score, matched, unknown, awards });
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
function coinSetNumberMatches(targetValue: unknown, listing: VisualSourceCandidate): ScorePredicate {
  const target = Number(targetValue);
  if (!Number.isFinite(target) || target <= 0) return null;
  const witness = scoreCandidateEvidence(listing, ["numberOfCoins", "numberOfCoinsInSet", "coinCount", "quantity"], [/(?:set\s+of|contains?|includes?)\s*(\d+)\s+coins?/i, /\b(\d+)\s*[- ]?coin\s+set\b/i], { captureOnly: true });
  const candidate = Number(witness?.value);
  return scoreMatch(Number.isFinite(candidate) && candidate > 0 ? candidate === target : null, witness);
}
function coinSetPackagingMatches(targetValue: unknown, listing: VisualSourceCandidate): ScorePredicate {
  const target = normalizedChoice(targetValue);
  if (!/^(?:yes|no)$/.test(target)) return null;
  const explicit = scoreCandidateEvidence(listing, ['originalPackagingIncluded', 'originalPackaging', 'packaging']);
  const witness = explicit ?? { value: coinSetPackagingValue(listing), source: 'title' as const, field: 'originalPackagingIncluded' };
  const candidate = normalizedChoice(witness.value);
  return scoreMatch(/^(?:yes|no)$/.test(candidate) ? candidate === target : null, witness);
}
export function coinsSetVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = sourceText(candidate);
  const matched: string[] = [];
  const unknown: string[] = [];
  const awards: RankingAward[] = [];
  let score = 0;
  const add = (field: typeof COIN_SET_SCORE_FIELDS[number][0], points: number, result: ScorePredicate) => {
    if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); }
    else if (scoreResult(result) === null) unknown.push(field);
  };
  const setName = coinSetScoreTargetValue(targetDetails, ['setName', 'series', 'coinSeries', 'coinType'], extractTargetTitle(targetMetadata));
  add('setNameSeries', 25, coinTitleSeriesTypeMatches(setName, candidateText));
  add('yearDate', 20, coinScoreValueMatches(coinSetScoreTargetValue(targetDetails, ['year', 'date', 'issueYear']), listing, ['year', 'date', 'issueYear'], [/(?:^|[^0-9])((?:17|18|19|20)\d{2})(?:[^0-9]|$)/i]));
  add('countryIssuingAuthority', 15, coinScoreValueMatches(coinSetScoreTargetValue(targetDetails, ['country', 'issuingCountry', 'issuingAuthority']), listing, ['country', 'issuingCountry', 'issuingAuthority'], [/\b(United States|USA|US|Canada|Mexico|Australia|United Kingdom|Great Britain)\b/i]));
  add('setType', 15, coinScoreValueMatches(targetDetails.setType, listing, ['setType', 'type'], [/\b((?:proof\s+set|mint\s+set|commemorative\s+set|type\s+set))\b/i]));
  add('numberOfCoins', 15, coinSetNumberMatches(coinSetScoreTargetValue(targetDetails, ['numberOfCoins', 'numberOfCoinsInSet', 'coinCount']), listing));
  add('originalPackagingIncluded', 10, coinSetPackagingMatches(coinSetScoreTargetValue(targetDetails, ['originalPackagingIncluded', 'originalPackaging', 'packaging']), listing));
  return { score, matched, unknown, awards };
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
  const target = comicScoreText(meaningfulMetadataText(targetValue));
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
  const target = comicTitleComparable(meaningfulMetadataText(targetValue));
  const candidate = comicTitleComparable(candidateTitle);
  if (!target) return null;
  return candidate.includes(target);
}
function comicGradeMatches(targetMetadata: string, candidate: NormalizedVisualSourceCandidate): ScorePredicate {
  return coinNumericGradeMatches(targetMetadata, candidate);
}
function comicGradingCompanyMatches(targetMetadata: string, candidate: NormalizedVisualSourceCandidate): ScorePredicate {
  return coinGradingCompanyMatches(targetMetadata, candidate);
}
function comicIssueMatches(targetValue: unknown, candidateText: string): boolean | null {
  const target = meaningfulMetadataText(targetValue);
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


const DISNEY_PINS_INDIVIDUAL_SCORE_FIELDS = [
  ['pinName', 25], ['character', 15], ['series', 15], ['year', 10],
  ['pinTradingEvent', 10], ['limitedEdition', 10], ['openEdition', 5],
  ['artistProof', 4], ['preProduction', 3], ['backstampInformation', 3],
] as const;
const DISNEY_PINS_SET_SCORE_FIELDS = [
  ['setName', 25], ['completeSet', 20], ['numberOfPins', 15], ['series', 15],
  ['charactersIncluded', 10], ['limitedEdition', 10], ['missingPins', 5],
] as const;
function disneyPinsScoreText(value: unknown): string {
  return normalizedChoice(value).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function disneyPinsMeaningfulTokens(value: unknown, extraIgnored: string[] = []): string[] {
  const ignored = new Set(['disney', 'trading', 'pin', 'pins', 'designer', 'limited', 'edition', ...extraIgnored]);
  return disneyPinsScoreText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !ignored.has(token));
}
function disneyPinsTokenEvidenceMatches(targetValue: unknown, candidateValue: unknown, extraIgnored: string[] = []): boolean {
  const targetTokens = disneyPinsMeaningfulTokens(targetValue, extraIgnored);
  const candidateTokens = new Set(disneyPinsMeaningfulTokens(candidateValue, extraIgnored));
  return targetTokens.length > 0 && targetTokens.every((token) => candidateTokens.has(token));
}
function disneyPinsTargetValue(details: Record<string, unknown>, aliases: string[], fallback?: unknown): unknown {
  return firstMeaningfulValue(...aliases.map((alias) => details[alias] ?? labeledCandidateValue(details, [alias])), fallback);
}
function disneyPinsCandidateDetails(listing: VisualSourceCandidate): Record<string, unknown> {
  return candidateStructuredDetails(listing);
}
function disneyPinsValueMatches(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[] = []): ScorePredicate {
  const target = disneyPinsScoreText(meaningfulMetadataText(targetValue));
  if (!target) return null;
  const details = disneyPinsCandidateDetails(listing);
  const explicit = firstMeaningfulValue(...aliases.map((alias) => details[alias] ?? labeledCandidateValue(details, [alias])));
  const title = canonicalCandidateTitle(listing);
  const value = explicit || title || sourceText(normalizeVisualSourceCandidate(listing));
  const witness = explicit ? { value: String(explicit), source: 'structured' as const, field: aliases[0] } : title ? { value: title, source: 'title' as const, field: aliases[0] } : null;
  const candidate = disneyPinsScoreText(value);
  if (!candidate) return null;
  const characterAliases = aliases.some((alias) => /^(?:character|characters|characterName)$/i.test(alias));
  if (characterAliases) {
    const declaredCharacters = disneyPinsCharactersFromTitle(title);
    if (declaredCharacters) {
      const targetCharacters = disneyPinsMeaningfulTokens(targetValue);
      const candidateCharacters = disneyPinsMeaningfulTokens(declaredCharacters);
      if (targetCharacters.some((token) => candidateCharacters.includes(token))
        && (targetCharacters.length !== candidateCharacters.length
        || !targetCharacters.every((token) => candidateCharacters.includes(token)))) {
        return scoreMatch(false, witness);
      }
    }
  }
  if (candidate.includes(target) || target.includes(candidate)) return scoreMatch(true, witness);
  if (!explicit && disneyPinsTokenEvidenceMatches(targetValue, candidate, characterAliases ? ['princess', 'prince', 'queen', 'king'] : [])) return scoreMatch(true, witness);
  return patterns.some((pattern) => pattern.test(title)) ? scoreMatch(true, { value: title, source: 'title', field: aliases[0] }) : explicit ? false : null;
}
function disneyPinsPinNameMatches(targetValue: unknown, listing: VisualSourceCandidate, targetCharacter?: unknown): ScorePredicate {
  // Pin Name is its own identity field. Character evidence cannot manufacture
  // the separate 25-point Pin Name award when the candidate name is unknown.
  // The Character scorer below may still award its independent 15 points.
  const title = canonicalCandidateTitle(listing);
  const declaredCharacters = disneyPinsCharactersFromTitle(title);
  if (declaredCharacters && meaningfulMetadataText(targetCharacter)) {
    const targetCharacters = disneyPinsMeaningfulTokens(targetCharacter);
    const candidateCharacters = disneyPinsMeaningfulTokens(declaredCharacters);
    if (targetCharacters.length > 0 && candidateCharacters.length > 0
      && (targetCharacters.length !== candidateCharacters.length
        || !targetCharacters.every((token) => candidateCharacters.includes(token)))) return scoreMatch(false, {
          value: declaredCharacters, source: 'title', field: 'pinName',
        });
  }
  const parsedTitleName = disneyPinsPinNameTitleValue(targetValue, undefined, title);
  if (parsedTitleName) return scoreMatch(true, { value: parsedTitleName, source: 'title', field: 'pinName' });
  return disneyPinsValueMatches(targetValue, listing, ["pinName", "name"]);
}
function disneyPinsBooleanMatches(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], positive: RegExp, negative: RegExp): ScorePredicate {
  const target = disneyPinsScoreText(targetValue);
  if (!/^(?:yes|no|true|false)$/.test(target)) return null;
  const details = disneyPinsCandidateDetails(listing);
  const explicit = disneyPinsScoreText(firstMeaningfulValue(...aliases.map((alias) => details[alias] ?? labeledCandidateValue(details, [alias]))));
  if (explicit) return scoreMatch(/^(?:yes|true)$/.test(target) ? /^(?:yes|true)$/.test(explicit) : /^(?:no|false)$/.test(explicit), { value: explicit, source: 'structured', field: aliases[0] });
  const text = `${canonicalCandidateTitle(listing)} ${sourceText(normalizeVisualSourceCandidate(listing))}`;
  return /^(?:yes|true)$/.test(target) ? (positive.test(text) ? true : negative.test(text) ? false : null) : (negative.test(text) ? true : positive.test(text) ? false : null);
}
function disneyPinsYearMatches(targetValue: unknown, listing: VisualSourceCandidate): boolean | null {
  const target = String(targetValue ?? '').match(/\d{4}/)?.[0];
  if (!target) return null;
  const text = `${canonicalCandidateTitle(listing)} ${sourceText(normalizeVisualSourceCandidate(listing))}`;
  return new RegExp(`(?:^|[^0-9])${target}(?:[^0-9]|$)`).test(text);
}
function disneyPinsNumberMatches(targetValue: unknown, listing: VisualSourceCandidate): ScorePredicate {
  const target = Number(targetValue);
  if (!Number.isFinite(target) || target <= 0) return null;
  const explicitRead = scoreCandidateEvidence(listing, ['numberOfPins', 'pinCount', 'quantity']);
  const explicit = Number(explicitRead?.value);
  if (Number.isFinite(explicit) && explicit > 0) return scoreMatch(explicit === target, explicitRead);
  const text = `${canonicalCandidateTitle(listing)} ${sourceText(normalizeVisualSourceCandidate(listing))}`;
  const match = text.match(/(?:set\s+of|contains?|includes?)\s*(\d+)\s*pins?/i) ?? text.match(/\b(\d+)\s*pin\s+set\b/i);
  if (!match) return null;
  const title = canonicalCandidateTitle(listing);
  const titleMatch = title.match(/(?:set\s+of|contains?|includes?)\s*(\d+)\s*pins?/i) ?? title.match(/\b(\d+)\s*pin\s+set\b/i);
  // Preserve the old combined-text fallback, but witness a genuine title capture.
  return scoreMatch(Number(match[1]) === target, titleMatch ? { value: titleMatch[1], source: 'title', field: 'numberOfPins' } : null);
}
/** None is a real absence declaration only for this existing missing-pins term. */
function disneyPinsMissingPinsMatches(targetValue: unknown, listing: VisualSourceCandidate): ScorePredicate {
  if (!/^none$/i.test(String(targetValue ?? '').trim())) return disneyPinsValueMatches(targetValue, listing, ['missingPins', 'missing']);
  // A meaningful provider declaration wins over a discarded None elsewhere.
  const explicit = scoreCandidateEvidence(listing, ['missingPins', 'missing']);
  if (explicit) return scoreMatch(false, explicit);
  const wrappers = new Set(['normalizedstructuredmetadata', 'structuredmetadata', 'soldcompsmetadata', 'fullitemdetails', 'itemdetails', 'details', 'itemspecifics', 'specifics', 'aspects', 'metadata', 'rawmetadata']);
  const seen = new WeakSet<object>();
  let remaining = 2048;
  const rawAbsence = (value: unknown, depth = 0): ScoreEvidence | null => {
    if (depth > 6 || remaining-- <= 0) return null;
    if (typeof value === 'string') {
      if (!/^\s*[\[{]/.test(value) || value.length > 200000) return null;
      try { return rawAbsence(JSON.parse(value), depth + 1); } catch { return null; }
    }
    if (!value || typeof value !== 'object' || seen.has(value)) return null;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const child of value.slice(0, 256)) { const found = rawAbsence(child, depth + 1); if (found) return found; }
      return null;
    }
    const record = value as Record<string, unknown>;
    const namedField = normalizedFieldKey(readMetadataValue(record, ['name', 'key', 'label', 'propertyName']));
    for (const [field, raw] of Object.entries(record).slice(0, 512)) {
      const key = normalizedFieldKey(field);
      const isMissingPins = ['missingpins', 'missing'].includes(key)
        || ['missingpins', 'missing'].includes(namedField) && ['value', 'values', 'propertyvalue'].includes(key);
      if (isMissingPins && typeof raw === 'string' && /^none$/i.test(raw.trim())) return { value: raw.trim(), source: 'structured', field: 'missingPins' };
    }
    for (const [field, child] of Object.entries(record).slice(0, 512)) {
      if (!wrappers.has(normalizedFieldKey(field))) continue;
      const found = rawAbsence(child, depth + 1);
      if (found) return found;
    }
    return null;
  };
  const absence = rawAbsence(listing);
  return scoreMatch(absence ? true : null, absence);
}
export function disneyPinsIndividualVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const details = extractTargetItemDetails(targetMetadata);
  const itemType = disneyPinsTargetItemType(targetMetadata);
  if (normalizedChoice(metadataValue(targetMetadata, 'category')) !== 'disney_pins' || itemType !== 'individual_pin') return { score: 0, matched: [], unknown: [], awards: [] };
  const matched: string[] = [], unknown: string[] = []; let score = 0;
  const awards: RankingAward[] = [];
  const add=(field: typeof DISNEY_PINS_INDIVIDUAL_SCORE_FIELDS[number][0], points:number, result:ScorePredicate)=>{ if(scoreResult(result)===true){score+=points;matched.push(field);awards.push(scoreAward(field,points,result));} else if(scoreResult(result)===null) unknown.push(field); };
  add('pinName',25,disneyPinsPinNameMatches(disneyPinsTargetValue(details,['pinName','name'],extractTargetTitle(targetMetadata)),listing,details.character));
  add('character',15,disneyPinsValueMatches(details.character,listing,['character','characters']));
  add('series',15,disneyPinsValueMatches(details.series,listing,['series']));
  add('year',10,disneyPinsYearMatches(details.year,listing));
  add('pinTradingEvent',10,disneyPinsValueMatches(details.pinTradingEvent,listing,['pinTradingEvent','event']));
  add('limitedEdition',10,disneyPinsBooleanMatches(details.limitedEdition,listing,['limitedEdition'],/\blimited edition\b/i,/\bopen edition\b/i));
  add('openEdition',5,disneyPinsBooleanMatches(details.openEdition,listing,['openEdition'],/\bopen edition\b/i,/\blimited edition\b/i));
  add('artistProof',4,disneyPinsBooleanMatches(details.artistProof,listing,['artistProof'],/\b(?:artist proof|AP)\b/i,/\bnot artist proof\b/i));
  add('preProduction',3,disneyPinsBooleanMatches(details.preProduction,listing,['preProduction'],/\b(?:pre-production|PP)\b/i,/\bnot pre-production\b/i));
  add('backstampInformation',3,disneyPinsValueMatches(details.backstampInformation,listing,['backstampInformation','backstamp']));
  return {score,matched,unknown,awards};
}
export function disneyPinsSetVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const details = extractTargetItemDetails(targetMetadata);
  const itemType = disneyPinsTargetItemType(targetMetadata);
  if (normalizedChoice(metadataValue(targetMetadata, 'category')) !== 'disney_pins' || itemType !== 'pin_set') return { score: 0, matched: [], unknown: [], awards: [] };
  const matched: string[] = [], unknown: string[] = []; let score = 0;
  const awards: RankingAward[] = [];
  const add=(field: typeof DISNEY_PINS_SET_SCORE_FIELDS[number][0], points:number, result:ScorePredicate)=>{ if(scoreResult(result)===true){score+=points;matched.push(field);awards.push(scoreAward(field,points,result));} else if(scoreResult(result)===null) unknown.push(field); };
  add('setName',25,disneyPinsValueMatches(disneyPinsTargetValue(details,['setName','name'],extractTargetTitle(targetMetadata)),listing,['setName','name']));
  add('completeSet',20,disneyPinsBooleanMatches(details.completeSet,listing,['completeSet'],/\bcomplete(?:d)?\s+set\b/i,/\bincomplete|missing\s+pins?\b/i));
  add('numberOfPins',15,disneyPinsNumberMatches(details.numberOfPins,listing));
  add('series',15,disneyPinsValueMatches(details.series,listing,['series']));
  add('charactersIncluded',10,disneyPinsValueMatches(details.charactersIncluded,listing,['charactersIncluded','characters','character']));
  add('limitedEdition',10,disneyPinsBooleanMatches(details.limitedEdition,listing,['limitedEdition'],/\blimited edition\b/i,/\bopen edition\b/i));
  add('missingPins',5,disneyPinsMissingPinsMatches(details.missingPins,listing));
  return {score,matched,unknown,awards};
}
export function disneyPinsVisualCap(score: number): number { if(score>=90) return 8; if(score>=80) return 6; if(score>=70) return 4; if(score>=40) return 4; return 0; }

const MUSIC_SCORE_FIELDS = [
  ['artist', 20],
  ['releaseTitle', 15],
  ['format', 15],
  ['recordLabel', 10],
  ['catalogNumber', 10],
  ['releaseYear', 8],
  ['country', 5],
  ['edition', 5],
  ['packagingIncluded', 2],
  ['gradingCompany', 5],
  ['grade', 5],
] as const;

function musicScoreText(value: unknown): string {
  return musicComparableValue(value);
}

function musicScoreTargetValue(targetDetails: Record<string, unknown>, aliases: string[], fallback?: unknown): unknown {
  return firstMeaningfulValue(...aliases.map((alias) => targetDetails[alias]), fallback);
}

function musicScoreValueMatches(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], titlePatterns: RegExp[] = []): ScorePredicate {
  const target = musicScoreText(meaningfulMetadataText(targetValue));
  if (!target) return null;
  const candidateDetails = candidateStructuredDetails(listing);
  const normalizedCandidate = normalizeVisualSourceCandidate(listing);
  const candidateValue = musicExplicitValue(candidateDetails, ...aliases);
  const candidate = musicScoreText(candidateValue || normalizedCandidate.title || sourceText(normalizedCandidate));
  const witness = candidateValue ? { value: candidateValue, source: 'structured' as const, field: aliases[0] } : normalizedCandidate.title ? { value: normalizedCandidate.title, source: 'title' as const, field: aliases[0] } : null;
  if (!candidate) return null;
  if (candidate.includes(target) || target.includes(candidate)) return scoreMatch(true, witness);
  if (titlePatterns.some((pattern) => pattern.test(canonicalCandidateTitle(listing)))) return scoreMatch(true, { value: canonicalCandidateTitle(listing), source: 'title', field: aliases[0] });
  return false;
}

function musicScoreFormatMatches(targetType: string, listing: VisualSourceCandidate): ScorePredicate {
  if (!targetType) return null;
  const details = candidateStructuredDetails(listing);
  const explicit = musicItemTypeLabel(listing.itemType ?? listing.format ?? listing.productType ?? details.itemType ?? details.format ?? details.productType);
  const candidateType = musicCandidateFormat(listing);
  return scoreMatch(candidateType ? candidateType === targetType : null, { value: candidateType, source: explicit ? 'structured' : 'title', field: 'format' });
}

function musicScoreBooleanMatches(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], positive: RegExp, negative: RegExp): ScorePredicate {
  const target = normalizedChoice(targetValue);
  if (!/^(?:yes|no|true|false)$/.test(target)) return null;
  const candidateDetails = candidateStructuredDetails(listing);
  const candidateValue = normalizedChoice(musicExplicitValue(candidateDetails, ...aliases));
  const normalizedCandidate = normalizeVisualSourceCandidate(listing);
  const candidateText = String(normalizedCandidate.title ?? '') + ' ' + sourceText(normalizedCandidate);
  if (candidateValue) return scoreMatch(/^(?:yes|true)$/.test(target) ? /^(?:yes|true)$/.test(candidateValue) : /^(?:no|false)$/.test(candidateValue), { value: candidateValue, source: 'structured', field: aliases[0] });
  return /^(?:yes|true)$/.test(target) ? (positive.test(candidateText) ? true : negative.test(candidateText) ? false : null) : (negative.test(candidateText) ? true : positive.test(candidateText) ? false : null);
}

export function musicVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const targetType = musicItemTypeLabel(metadataValue(targetMetadata, 'itemType') || targetDetails.itemType || targetDetails.format);
  if (normalizedChoice(metadataValue(targetMetadata, 'category')) !== 'music' || !targetType || targetType === 'collection/lot') return { score: 0, matched: [], unknown: [], awards: [] };
  const matched: string[] = [];
  const unknown: string[] = [];
  const awards: RankingAward[] = [];
  let score = 0;
  const add = (field: typeof MUSIC_SCORE_FIELDS[number][0], points: number, result: ScorePredicate) => { if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); } else if (scoreResult(result) === null) unknown.push(field); };
  add('artist', 20, musicScoreValueMatches(musicScoreTargetValue(targetDetails, ['artist', 'performer', 'artistName']), listing, ['artist', 'performer', 'artistName']));
  add('releaseTitle', 15, musicScoreValueMatches(musicScoreTargetValue(targetDetails, ['releaseTitle', 'album', 'albumTitle'], extractTargetTitle(targetMetadata)), listing, ['releaseTitle', 'album', 'albumTitle', 'title']));
  add('format', 15, musicScoreFormatMatches(targetType, listing));
  add('recordLabel', 10, musicScoreValueMatches(targetDetails.recordLabel, listing, ['recordLabel', 'label']));
  add('catalogNumber', 10, musicScoreValueMatches(targetDetails.catalogNumber, listing, ['catalogNumber', 'catalogNo', 'catNo']));
  add('releaseYear', 8, musicScoreValueMatches(targetDetails.releaseYear ?? targetDetails.year, listing, ['releaseYear', 'year'], [/(?:^|[^0-9])((?:17|18|19|20)\d{2})(?:[^0-9]|$)/i]));
  add('country', 5, musicScoreValueMatches(targetDetails.country ?? targetDetails.countryOfRelease, listing, ['country', 'countryOfRelease', 'pressingCountry']));
  add('edition', 5, musicScoreValueMatches(targetDetails.edition ?? targetDetails.variant ?? targetDetails.pressingDetails, listing, ['edition', 'variant', 'pressing', 'pressingDetails']));
  add('packagingIncluded', 2, musicScoreBooleanMatches(targetDetails.packagingIncluded, listing, ['packagingIncluded', 'originalPackaging'], /\b(?:original|complete|with)\s+(?:packaging|case|jewel case|sleeve)\b/i, /\b(?:no|without|missing)\s+(?:original\s+)?(?:packaging|case|jewel case|sleeve)\b/i));
  add('gradingCompany', 5, coinGradingCompanyMatches(targetMetadata, normalizeVisualSourceCandidate(listing)));
  add('grade', 5, coinNumericGradeMatches(targetMetadata, normalizeVisualSourceCandidate(listing)));
  return contingentGradingScore(listing, targetMetadata, MUSIC_SCORE_FIELDS, { score, matched, unknown, awards });
}

export function musicVisualCap(score: number): number {
  if (score >= 90) return 8;
  if (score >= 80) return 6;
  if (score >= 70) return 4;
  if (score >= 60) return 2;
  return 0;
}

const ORIGINAL_ART_SCORE_FIELDS = [
  ['artistName', 30],
  ['artworkTitleCharacter', 20],
  ['artType', 20],
  ['comicTitle', 15],
  ['issueNumber', 10],
  ['publisher', 5],
] as const;
function originalArtFieldMatches(targetValue: unknown, candidate: NormalizedVisualSourceCandidate, candidateText: string, aliases: string[] = []): ScorePredicate {
  const target = comicTitleComparable(meaningfulMetadataText(targetValue));
  if (!target) return null;
  for (const key of aliases) {
    const value = comicTitleComparable(candidate.details[key]);
    if (value && value.includes(target)) return scoreMatch(true, { value, source: 'structured', field: key });
  }
  const title = comicTitleComparable(candidate.title);
  if (title && title.includes(target)) return scoreMatch(true, { value: candidate.title, source: 'title', field: aliases[0] ?? 'title' });
  return scoreMatch(comicTitleComparable(candidateText).includes(target));
}
export function originalArtMarketRelevanceScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = comicScoreText(sourceText(candidate));
  const matched: string[] = [];
  const unknown: string[] = [];
  const awards: RankingAward[] = [];
  let score = 0;
  const add = (field: typeof ORIGINAL_ART_SCORE_FIELDS[number][0], points: number, result: ScorePredicate) => {
    if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); }
    else if (scoreResult(result) === null) unknown.push(field);
  };
  add('artistName', 30, originalArtFieldMatches(firstMeaningfulValue(targetDetails.artistName, targetDetails.artist, targetDetails.creator), candidate, candidateText, ['artistName', 'artist', 'creator']));
  add('artworkTitleCharacter', 20, originalArtFieldMatches(firstMeaningfulValue(targetDetails.artworkTitle, targetDetails.character, targetDetails.artworkTitleCharacter), candidate, candidateText, ['artworkTitle', 'character', 'artworkTitleCharacter']));
  add('artType', 20, originalArtFieldMatches(targetDetails.artType, candidate, candidateText, ['artType']));
  add('comicTitle', 15, originalArtFieldMatches(firstMeaningfulValue(targetDetails.coverSketchComicTitle, targetDetails.comicTitle, targetDetails.series, targetDetails.comicSeries), candidate, candidateText, ['coverSketchComicTitle', 'comicTitle', 'series', 'comicSeries']));
  add('issueNumber', 10, comicIssueMatches(firstMeaningfulValue(targetDetails.coverSketchIssueNumber, targetDetails.issueNumber, targetDetails.issueNo, targetDetails.number), candidateText));
  add('publisher', 5, originalArtFieldMatches(targetDetails.publisher, candidate, candidateText, ['publisher']));
  return { score, matched, unknown, awards };
}
export function annotateOriginalArtMarketCandidates<T extends VisualSourceCandidate>(listings: T[], targetMetadata: string): T[] {
  return listings.map((item, index) => {
    const scoring = originalArtMarketRelevanceScore(item, targetMetadata);
    return { ...item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards, metadataMatchRank: index + 1, metadataMatchLabel: 'Market Relevance Score' };
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
export function comicsSingleVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = comicScoreText(sourceText(candidate));
  const matched: string[] = [];
  const unknown: string[] = [];
  const awards: RankingAward[] = [];
  let score = 0;
  const add = (field: typeof COMICS_SINGLE_SCORE_FIELDS[number][0], points: number, result: ScorePredicate) => {
    if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); }
    else if (scoreResult(result) === null) unknown.push(field);
  };
  add('comicTitle', 20, scoreMatch(comicTitleMatches(firstMeaningfulValue(targetDetails.comicTitle, targetDetails.series, targetDetails.title, extractTargetTitle(targetMetadata)), candidate.title), { value: candidate.title, source: 'title', field: 'comicTitle' }));
  add('issueNumber', 20, comicIssueMatches(firstMeaningfulValue(targetDetails.issueNumber, targetDetails.issueNo, targetDetails.number), candidateText));
  add('grade', 15, comicGradeMatches(targetMetadata, candidate));
  add('gradingCompany', 10, comicGradingCompanyMatches(targetMetadata, candidate));
  add('variant', 10, comicValueMatches(firstMeaningfulValue(targetDetails.variantDescription, targetDetails.variantCover, targetDetails.variant), candidateText));
  add('publisher', 10, comicValueMatches(targetDetails.publisher, candidateText));
  add('publicationYear', 5, comicValueMatches(firstMeaningfulValue(targetDetails.publicationYear, targetDetails.year), candidateText));
  add('distributionType', 5, comicValueMatches(targetDetails.distributionType, candidateText));
  add('facsimile', 3, comicBoolean(firstMeaningfulValue(targetDetails.facsimile, targetDetails.original), candidateText, /\b(?:facsimile|facsimile\s*edition|reprint)\b/i, /\b(?:original|first\s*print)\b/i));
  add('signed', 2, comicBoolean(targetDetails.signed, candidateText, /\b(?:signed|autograph(?:ed)?)\b/i, /\b(?:unsigned|not\s*signed)\b/i));
  return contingentGradingScore(listing, targetMetadata, COMICS_SINGLE_SCORE_FIELDS, { score, matched, unknown, awards });
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
  const itemType = targetItemTypeValue(targetMetadata);
  return category === 'sports_cards' && !itemType.includes('set') && !itemType.includes('collection') && !itemType.includes('lot') && !/unopened|box_set|sealed_box|bundle|product/.test(itemType);
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
function sportsCardTextEvidenceMatches(targetValue: unknown, candidate: NormalizedVisualSourceCandidate, field = 'title'): ScorePredicate {
  const target = meaningfulMetadataText(targetValue);
  if (!target) return false;
  if (titleContainsValue(candidate.title, target)) return scoreMatch(true, { value: target, source: 'title', field });
  if (['manufacturer', 'setName'].includes(field)) {
    const aliases = field === 'manufacturer' ? ['manufacturer', 'brand', 'maker'] : ['setName', 'series', 'cardSet'];
    const value = readMetadataValue(candidate.details, aliases);
    if (value && sportsCardText(value).includes(sportsCardText(target))) return scoreMatch(true, { value, source: 'structured', field });
  }
  return scoreMatch(sportsCardText(sourceText(candidate)).includes(sportsCardText(target)));
}
function sportsCardPlayerEvidenceMatches(targetValue: unknown, candidate: NormalizedVisualSourceCandidate): ScorePredicate {
  const target = meaningfulMetadataText(targetValue);
  if (!target) return false;
  if (titleContainsValue(candidate.title, target)) return scoreMatch(true, { value: target, source: 'title', field: 'player' });
  const candidatePlayer = firstMeaningfulValue(
    candidate.details.player,
    candidate.details.athlete,
    candidate.details.subject,
    candidate.details.playerName,
    candidate.details.athleteName,
  );
  return scoreMatch(Boolean(candidatePlayer && titleContainsValue(candidatePlayer, target) && titleContainsValue(target, candidatePlayer)), candidatePlayer ? { value: String(candidatePlayer), source: 'structured', field: 'player' } : null);
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

export function sportsCardSingleVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const targetTitle = extractTargetTitle(targetMetadata);
  const targetTextValue = targetText(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateTextValue = sourceText(candidate);
  const matched: string[] = [];
  const unknown: string[] = [];
  const awards: RankingAward[] = [];
  let score = 0;
  const add = (field: typeof SPORTS_CARD_SCORE_FIELDS[number][0], points: number, isMatch: ScorePredicate, isKnown = true) => {
    if (scoreResult(isMatch) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, isMatch)); }
    else if (!isKnown) unknown.push(field);
  };

  const player = firstMeaningfulValue(targetDetails.player, targetDetails.athlete, targetDetails.subject);
  add('player', 20, sportsCardPlayerEvidenceMatches(player, candidate), Boolean(player));

  const year = String(firstMeaningfulValue(targetDetails.year, targetDetails.releaseYear, targetDetails.issueYear) ?? '').trim();
  add('year', 15, Boolean(year && new RegExp(`\\b${year.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`).test(candidateTextValue)), Boolean(year));

  const manufacturer = String(firstMeaningfulValue(targetDetails.manufacturer, targetDetails.customManufacturer, targetDetails.brand) ?? '').trim();
  const setName = String(firstMeaningfulValue(targetDetails.setName, targetDetails.series, targetDetails.cardSet) ?? '').trim();
  const manufacturerOrSet = [manufacturer, setName].filter(Boolean);
  const manufacturerMatch = sportsCardTextEvidenceMatches(manufacturer, candidate, 'manufacturer');
  const setMatch = scoreResult(manufacturerMatch) === true ? null : sportsCardTextEvidenceMatches(setName, candidate, 'setName');
  add('manufacturerOrSet', 15, scoreResult(manufacturerMatch) === true ? manufacturerMatch : setMatch, manufacturerOrSet.length > 0);

  const cardNumber = String(firstMeaningfulValue(targetDetails.cardNumber, targetDetails.cardNo, targetDetails.number) ?? '').trim();
  add('cardNumber', 15, scoreMatch(sportsCardExplicitNumber(cardNumber, candidate.title), { value: cardNumber, source: 'title', field: 'cardNumber' }), Boolean(cardNumber));

  const targetGrader = String(firstMeaningfulValue(metadataValue(targetMetadata, 'certificationCompany'), targetDetails.gradingCompany, targetDetails.grader) ?? '').trim();
  const directTitleGrade = titleGradeEvidence(candidate.title, 'sports_cards');
  const titleGrade = directTitleGrade ?? titleGradeEvidence(candidateTextValue, 'sports_cards');
  const structuredGrader = sportsCardText(candidate.grader);
  const candidateGrader = structuredGrader && !/^(?:unknown|n a|na|none|not applicable)$/.test(structuredGrader)
    ? structuredGrader
    : sportsCardText(titleGrade?.grader);
  add('gradingCompany', 10, { result: Boolean(targetGrader && candidateGrader === sportsCardText(targetGrader)), source: structuredGrader && !/^(?:unknown|n a|na|none|not applicable)$/.test(structuredGrader) ? 'structured' : directTitleGrade ? 'title' : 'combined' }, Boolean(targetGrader));

  const targetGrade = String(firstMeaningfulValue(metadataValue(targetMetadata, 'grade'), targetDetails.grade) ?? '');
  const structuredGrade = normalizedChoice(candidate.grade);
  const candidateGrade = structuredGrade && !/^(?:unknown|n_a|na|none|not_applicable)$/i.test(structuredGrade) ? candidate.grade : titleGrade?.grade ?? '';
  add('grade', 10, { result: Boolean(targetGrade && candidateGrade && compareComparableGrades(targetGrade, candidateGrade, { allowBareNumeric: true, category: 'sports_cards' }) === 'match'), source: structuredGrade && !/^(?:unknown|n_a|na|none|not_applicable)$/i.test(structuredGrade) ? 'structured' : directTitleGrade ? 'title' : 'combined' }, Boolean(targetGrade));

  const singleForm = !/\b(?:complete|factory|master|team)\s+set\b|\b(?:lot|bundle|collection|multipack|\d+\s+cards?)\b/i.test(candidateTextValue);
  add('singleCardForm', 5, { result: singleForm, source: 'rule' }, true);

  const targetRookie = `${targetTextValue} ${JSON.stringify(targetDetails)}`;
  const targetAutograph = `${targetTextValue} ${JSON.stringify(targetDetails)}`;
  const targetRelic = `${targetTextValue} ${JSON.stringify(targetDetails)}`;
  const targetSerial = `${targetTextValue} ${JSON.stringify(targetDetails)}`;
  const candidateIdentityText = `${candidateTextValue} ${JSON.stringify(candidate.details)}`;
  add('rookieStatus', 3, sportsCardBooleanSignal(targetRookie, candidateIdentityText, /\b(?:rookie|rc)\b/i) === 'match', sportsCardBooleanSignal(targetRookie, candidateIdentityText, /\b(?:rookie|rc)\b/i) !== 'unknown');
  add('autographStatus', 3, sportsCardBooleanSignal(targetAutograph, candidateIdentityText, /\b(?:autograph(?:ed)?|signed|auto)\b/i) === 'match', sportsCardBooleanSignal(targetAutograph, candidateIdentityText, /\b(?:autograph(?:ed)?|signed|auto)\b/i) !== 'unknown');
  add('relicStatus', 2, sportsCardBooleanSignal(targetRelic, candidateIdentityText, /\b(?:relic|memorabilia|patch|jersey)\b/i) === 'match', sportsCardBooleanSignal(targetRelic, candidateIdentityText, /\b(?:relic|memorabilia|patch|jersey)\b/i) !== 'unknown');
  add('serialNumberedStatus', 2, sportsCardBooleanSignal(targetSerial, candidateIdentityText, /\b(?:\d+\/\d+|serial(?:ized)?|numbered|print\s*run)\b/i) === 'match', sportsCardBooleanSignal(targetSerial, candidateIdentityText, /\b(?:\d+\/\d+|serial(?:ized)?|numbered|print\s*run)\b/i) !== 'unknown');

  return contingentGradingScore(listing, targetMetadata, SPORTS_CARD_SCORE_FIELDS, { score, matched, unknown, awards });
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
  const itemType = targetItemTypeValue(targetMetadata);
  return category === 'sports_cards' && itemType.includes('set') && !itemType.includes('collection') && !itemType.includes('lot');
}

function sportsCardSetSignal(value: unknown, candidateText: string, patterns: RegExp[]): boolean | null {
  const normalized = normalizedChoice(meaningfulMetadataText(value));
  if (!normalized) return null;
  return patterns.some((pattern) => pattern.test(candidateText));
}

export function sportsCardSetVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = sourceText(candidate);
  const matched: string[] = [];
  const unknown: string[] = [];
  const awards: RankingAward[] = [];
  let score = 0;
  const add = (field: typeof SPORTS_CARD_SET_SCORE_FIELDS[number][0], points: number, result: ScorePredicate) => {
    if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); }
    else if (scoreResult(result) === null) unknown.push(field);
  };

  const setName = firstMeaningfulValue(targetDetails.setName, targetDetails.series, targetDetails.cardSet);
  add('setName', 25, setName ? sportsCardTextEvidenceMatches(setName, candidate) : null);

  const year = String(firstMeaningfulValue(targetDetails.year, targetDetails.releaseYear, targetDetails.issueYear) ?? '').trim();
  add('year', 15, year ? new RegExp(`\\b${year.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`).test(candidateText) : null);

  const manufacturer = firstMeaningfulValue(targetDetails.manufacturer, targetDetails.customManufacturer, targetDetails.brand);
  add('manufacturer', 15, manufacturer ? sportsCardTextEvidenceMatches(manufacturer, candidate) : null);

  const setType = normalizedChoice(targetDetails.setType);
  const setTypePatterns: Record<string, RegExp[]> = {
    factory_set: [/\bfactory\s+set\b/i, /\bfactory\s+sealed\b/i],
    complete_hand_collated_set: [/\bcomplete(?:ly)?\s+(?:hand[- ]?collated\s+)?set\b/i, /\bcomplete\s+set\b/i],
    partial_set: [/\bpartial\s+set\b/i, /\bincomplete\s+set\b/i],
  };
  add('setType', 15, setType ? sportsCardSetSignal(setType, candidateText, setTypePatterns[setType] ?? [new RegExp(`\\b${setType.replace(/_/g, '[ -]')}\\b`, 'i')]) : null);

  const missingCards = normalizedChoice(meaningfulMetadataText(targetDetails.missingCards));
  add('missingCards', 15, missingCards
      ? missingCards === 'yes'
      ? /\b(?:partial|incomplete|missing\s+(?:cards?|pieces?))\b/i.test(candidateText)
      : /\b(?:complete|factory|master|team)(?:\s+(?:factory|sealed|hand[- ]?collated))*\s+set\b/i.test(candidateText)
    : null);

  const factorySealed = normalizedChoice(meaningfulMetadataText(targetDetails.factorySealed));
  add('factorySealed', 10, factorySealed
    ? factorySealed === 'yes'
      ? /\b(?:factory\s+sealed|sealed|unopened)\b/i.test(candidateText)
      : /\b(?:opened|open\s+box|unsealed)\b/i.test(candidateText)
    : null);

  const sport = firstMeaningfulValue(targetDetails.sport);
  add('sport', 5, sport ? sportsCardText(candidateText).includes(sportsCardText(sport)) : null);
  return { score, matched, unknown, awards };
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
  const itemType = targetItemTypeValue(targetMetadata);
  return category === 'sports_cards' && /unopened|box_set|sealed_box|bundle|product/.test(itemType);
}

export function sportsCardUnopenedVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const targetDetails = extractTargetItemDetails(targetMetadata);
  const candidate = normalizeVisualSourceCandidate(listing);
  const candidateText = sourceText(candidate);
  const candidateDetails = candidateStructuredDetails(candidate);
  const matched: string[] = [];
  const unknown: string[] = [];
  const awards: RankingAward[] = [];
  let score = 0;
  const add = (field: typeof SPORTS_CARD_UNOPENED_SCORE_FIELDS[number][0], points: number, result: ScorePredicate) => {
    if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); }
    else if (scoreResult(result) === null) unknown.push(field);
  };

  const productName = firstMeaningfulValue(targetDetails.productName, targetDetails.productTitle, targetDetails.name, targetDetails.itemName);
  add('productName', 20, productName ? sportsCardTextEvidenceMatches(productName, candidate) : null);
  const targetFormat = sportsCardUnopenedFormat(targetDetails.productFormat);
  const formatValue = candidateDetails.productFormat ?? candidateDetails.format ?? candidate.productFormat ?? candidate.format;
  const explicitFormat = sportsCardUnopenedFormat(formatValue);
  const candidateFormat = explicitFormat || sportsCardUnopenedFormat(undefined, candidate.title);
  add('productFormat', 20, scoreMatch(targetFormat ? (candidateFormat ? candidateFormat === targetFormat : null) : null, { value: String(explicitFormat ? formatValue : candidate.title), source: explicitFormat ? 'structured' : 'title', field: 'productFormat' }));
  const targetProductType = sportsCardUnopenedProductType(meaningfulMetadataText(targetDetails.productType));
  const productTypeValue = readMetadataValue(candidateDetails, ['productType']) || meaningfulMetadataText(candidate.productType);
  const explicitProductType = sportsCardUnopenedProductType(productTypeValue);
  const candidateProductType = explicitProductType || sportsCardUnopenedProductType(undefined, candidate.title);
  add('productType', 15, scoreMatch(targetProductType ? (candidateProductType ? candidateProductType === targetProductType : null) : null, { value: String(explicitProductType ? productTypeValue : candidate.title), source: explicitProductType ? 'structured' : 'title', field: 'productType' }));

  const manufacturer = firstMeaningfulValue(targetDetails.manufacturer, targetDetails.customManufacturer, targetDetails.brand);
  const setName = firstMeaningfulValue(targetDetails.setName, targetDetails.series, targetDetails.cardSet);
  const manufacturerOrSet = [manufacturer, setName].filter(Boolean);
  const manufacturerMatch = sportsCardTextEvidenceMatches(manufacturer, candidate, 'manufacturer');
  const setMatch = scoreResult(manufacturerMatch) === true ? null : sportsCardTextEvidenceMatches(setName, candidate, 'setName');
  add('manufacturerOrSet', 15, manufacturerOrSet.length ? scoreResult(manufacturerMatch) === true ? manufacturerMatch : setMatch : null);
  const year = String(firstMeaningfulValue(targetDetails.year, targetDetails.releaseYear, targetDetails.issueYear) ?? '').trim();
  add('year', 10, year ? new RegExp(`\\b${year.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`).test(candidateText) : null);

  const targetCompany = sportsCardUnopenedCompany(meaningfulMetadataText(targetDetails.authenticationCompany));
  const companyValue = readMetadataValue(candidateDetails, ['authenticationCompany']) || meaningfulMetadataText(candidate.authenticationCompany);
  const explicitCompany = sportsCardUnopenedCompany(companyValue);
  const candidateCompany = explicitCompany || sportsCardUnopenedCompany(undefined, candidate.title);
  add('authenticationCompany', 10, scoreMatch(targetCompany ? (candidateCompany ? candidateCompany === targetCompany : null) : null, { value: String(explicitCompany ? companyValue : candidate.title), source: explicitCompany ? 'structured' : 'title', field: 'authenticationCompany' }));
  const targetSealed = sportsCardUnopenedState(targetDetails.factorySealed);
  const explicitSealed = sportsCardUnopenedState(candidateDetails.factorySealed ?? candidateDetails.sealedStatus ?? candidate.factorySealed);
  const candidateSealed = explicitSealed
    ?? (/\b(?:factory\s+sealed|unopened|original\s+shrink|wax\s+sealed)\b/i.test(candidate.title) ? 'yes' : /\b(?:opened|open\s+box|unsealed|resealed)\b/i.test(candidate.title) ? 'no' : null);
  add('factorySealed', 5, scoreMatch(targetSealed ? (candidateSealed ? candidateSealed === targetSealed : null) : null, { value: candidateSealed || '', source: explicitSealed ? 'structured' : 'title', field: 'factorySealed' }));
  const targetFasc = sportsCardUnopenedState(targetDetails.fromASealedCase);
  const explicitFasc = sportsCardUnopenedState(candidateDetails.fromASealedCase ?? candidate.fromASealedCase);
  const candidateFasc = explicitFasc
    ?? (/\b(?:FASC|from\s+(?:a\s+)?sealed\s+case)\b/i.test(candidate.title) ? 'yes' : /\bnot\s+from\s+(?:a\s+)?sealed\s+case\b/i.test(candidate.title) ? 'no' : null);
  add('fromASealedCase', 5, scoreMatch(targetFasc ? (candidateFasc ? candidateFasc === targetFasc : null) : null, { value: candidateFasc || '', source: explicitFasc ? 'structured' : 'title', field: 'fromASealedCase' }));
  return { score, matched, unknown, awards };
}

export function sportsCardUnopenedVisualCap(score: number): number {
  if (score >= 90) return 10;
  if (score >= 75) return 6;
  if (score >= 65) return 3;
  if (score >= 55) return 2;
  return 0;
}

const POKEMON_SCORE_FIELDS = {
  single_card: [['cardName', 20], ['setName', 15], ['cardNumber', 15], ['language', 10], ['finish', 10], ['cardType', 10], ['rarity', 5], ['editionEra', 5], ['gradingCompany', 5], ['grade', 5]],
  set: [['setName', 30], ['language', 15], ['setType', 20], ['cardCount', 15], ['year', 5], ['packaging', 5], ['gradingCompany', 5], ['grade', 5]],
  unopened_product: [['productName', 15], ['setName', 15], ['productType', 20], ['language', 10], ['year', 10], ['factorySealed', 10], ['authentication', 5], ['fromASealedCase', 5], ['gradingCompany', 5], ['grade', 5]],
} as const;
function pokemonScoreValue(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[] = [], allowSubset = true): ScorePredicate {
  const target = pokemonComparableValue(meaningfulMetadataText(targetValue));
  if (!target || /^(?:unknown|n a|na|none|not applicable)$/.test(target)) return null;
  const witness = scoreCandidateEvidence(listing, aliases, patterns, { titleFallback: patterns.length === 0 });
  const candidate = pokemonComparableValue(witness?.value);
  if (!candidate) return null;
  return scoreMatch(allowSubset ? target.includes(candidate) || candidate.includes(target) : target === candidate, witness);
}
function pokemonScoreBoolean(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], positive: RegExp, negative: RegExp): ScorePredicate {
  const target = pokemonBoolean(targetValue);
  if (!target) return null;
  const structuredRead = scoreCandidateEvidence(listing, aliases);
  const structured = pokemonBoolean(structuredRead?.value);
  const text = canonicalCandidateTitle(listing);
  const candidate = structured || (positive.test(text) ? 'yes' : negative.test(text) ? 'no' : '');
  return scoreMatch(candidate ? candidate === target : null, { value: structured || text, source: structured ? 'structured' : 'title', field: aliases[0] });
}
function pokemonScoreNumber(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], patterns: RegExp[]): ScorePredicate {
  const target = String(targetValue ?? '').match(/\d{1,4}(?:\s*\/\s*\d{1,4})?/)?.[0];
  if (!target) return null;
  const witness = scoreCandidateEvidence(listing, aliases, patterns, { titleFallback: patterns.length === 0 });
  const candidate = witness?.value.match(/\d{1,4}(?:\s*\/\s*\d{1,4})?/i)?.[0];
  return scoreMatch(candidate ? pokemonComparableValue(candidate) === pokemonComparableValue(target) : null, witness);
}
function pokemonTitleNumber(title: string) {
  const parsed = readPokemonCardNumbersFromTitle(title);
  if (parsed.ambiguous) return null;
  // Prefer a fuller actual declaration, not a value reconstructed from target.
  const specificity = (value: typeof parsed.observations[number]) => Number(Boolean(value.denominator)) * 4
    + [value.numerator.prefix, value.numerator.suffix, value.denominator?.prefix, value.denominator?.suffix].filter(Boolean).length;
  return [...parsed.observations].sort((a, b) => specificity(b) - specificity(a))[0] ?? null;
}
function pokemonScoreCardNumber(targetValue: unknown, listing: VisualSourceCandidate, targetMetadata: string): ScorePredicate {
  if (!parsePokemonCardNumber(targetValue)) return null;
  const details = candidateStructuredDetails(listing);
  const aliases = ['cardNumber', 'cardNo', 'number'];
  const declarations = aliases.map(alias => readMetadataValue(listing, [alias]) || readMetadataValue(details, [alias])).filter(Boolean);
  const titleNumbers = readPokemonCardNumbersFromTitle(canonicalCandidateTitle(listing));
  if (titleNumbers.ambiguous || findMaterialMetadataConflicts(targetMetadata, listing).some(conflict => aliases.includes(conflict.field))) return null;
  if (declarations.some((value, index) => declarations.slice(index + 1).some(other => comparePokemonCardNumbers(value, other) === 'different'))
    || declarations.some(value => titleNumbers.observations.some(observed => comparePokemonCardNumbers(value, observed.raw) === 'different'))) return null;
  const explicit = scoreCandidateEvidence(listing, aliases);
  const titleObservation = pokemonTitleNumber(canonicalCandidateTitle(listing));
  const witness = explicit ?? (titleObservation ? { value: titleObservation.raw, source: 'title' as const, field: 'cardNumber' } : null);
  const result = comparePokemonCardNumbers(targetValue, witness?.value);
  return scoreMatch(result === 'match' ? true : result === 'different' ? false : null, witness);
}
export function pokemonVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const type = pokemonTargetItemType(targetMetadata);
  const target = extractTargetItemDetails(targetMetadata);
  const matched: string[] = []; const unknown: string[] = []; let score = 0;
  const awards: RankingAward[] = [];
  const add = (field: string, points: number, result: ScorePredicate) => { if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); } else if (scoreResult(result) === null) unknown.push(field); };
  const fields = POKEMON_SCORE_FIELDS[type as keyof typeof POKEMON_SCORE_FIELDS] ?? [];
  for (const [field, points] of fields) {
    switch (field) {
      case 'cardName': add(field, points, pokemonScoreValue(firstMeaningfulValue(target.cardName, target.pokemonName, target.name, extractTargetTitle(targetMetadata)), listing, ['cardName', 'pokemonName', 'name', 'title'], [], true)); break;
      case 'setName': add(field, points, pokemonScoreValue(firstMeaningfulValue(target.setName, target.set, target.cardSet, target.series), listing, ['setName', 'set', 'cardSet', 'series'], [], true)); break;
      case 'cardNumber': add(field, points, pokemonScoreCardNumber(firstMeaningfulValue(target.cardNumber, target.cardNo, target.number), listing, targetMetadata)); break;
      case 'language': add(field, points, pokemonScoreValue(target.language, listing, ['language'], [/(English|Japanese|French|German|Italian|Spanish|Korean|Chinese)/i], false)); break;
      case 'finish': add(field, points, pokemonScoreValue(firstMeaningfulValue(target.finish, target.finishVariant), listing, ['finish', 'finishVariant'], [/(Normal|Holo|Reverse\s+Holo|Full\s+Art|Rainbow|Gold)/i], false)); break;
      case 'cardType': add(field, points, pokemonScoreValue(firstMeaningfulValue(target.cardType, target.mechanic, target.variant), listing, ['cardType', 'mechanic', 'variant'], [/(VMAX|VSTAR|\bV\b|\bGX\b|\bex\b|BREAK|Tag\s+Team|Radiant|Amazing\s+Rare|ACE\s+SPEC)/i], false)); break;
      case 'rarity': add(field, points, pokemonScoreValue(target.rarity, listing, ['rarity'], [], true)); break;
      case 'editionEra': add(field, points, pokemonScoreValue(firstMeaningfulValue(target.editionEra, target.edition, target.era), listing, ['editionEra', 'edition', 'era'], [], true)); break;
      case 'setType': add(field, points, pokemonScoreValue(firstMeaningfulValue(target.setType, target.complete, target.setStatus), listing, ['setType', 'complete', 'setStatus'], [/(master\s+set|complete\s+set|partial\s+set|incomplete\s+set)/i], false)); break;
      case 'cardCount': add(field, points, pokemonScoreNumber(target.numberOfCardsInSet, listing, ['numberOfCardsInSet', 'cardCount', 'numberOfCards'], [/(?:set\s+of|\b)(\d{2,4})\s+cards?/i])); break;
      case 'packaging': add(field, points, pokemonScoreValue(firstMeaningfulValue(target.packaging, target.originalPackaging), listing, ['packaging', 'originalPackaging'], [], true)); break;
      case 'productName': add(field, points, pokemonScoreValue(firstMeaningfulValue(target.productName, target.productTitle, target.name, extractTargetTitle(targetMetadata)), listing, ['productName', 'productTitle', 'name', 'title'], [], true)); break;
      case 'productType': add(field, points, pokemonScoreValue(target.productType, listing, ['productType', 'productConfiguration', 'format'], [/(booster\s+box|booster\s+pack|elite\s+trainer\s+box|collection\s+box|blaster\s+box|tin|premium\s+collection)/i], false)); break;
      case 'year': add(field, points, pokemonScoreValue(firstMeaningfulValue(target.releaseYear, target.year), listing, ['releaseYear', 'year'], [/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/], false)); break;
      case 'factorySealed': add(field, points, pokemonScoreBoolean(firstMeaningfulValue(target.factorySealed, target.sealStatus, target.sealedStatus), listing, ['factorySealed', 'sealStatus', 'sealedStatus'], /\b(?:factory\s+sealed|new\s+sealed|sealed|unopened)\b/i, /\b(?:opened|resealed|damaged\s+seal|unsealed)\b/i)); break;
      case 'authentication': add(field, points, pokemonScoreValue(firstMeaningfulValue(target.authenticationCompany, target.authenticator), listing, ['authenticationCompany', 'authenticator'], [], false)); break;
      case 'fromASealedCase': add(field, points, pokemonScoreBoolean(firstMeaningfulValue(target.fromASealedCase, target.fromSealedCase), listing, ['fromASealedCase', 'fromSealedCase'], /\b(?:FASC|from\s+(?:a\s+)?sealed\s+case)\b/i, /\b(?:not\s+FASC|not\s+from\s+(?:a\s+)?sealed\s+case)\b/i)); break;
      case 'gradingCompany': add(field, points, coinGradingCompanyMatches(targetMetadata, normalizeVisualSourceCandidate(listing))); break;
      case 'grade': add(field, points, coinNumericGradeMatches(targetMetadata, normalizeVisualSourceCandidate(listing))); break;
    }
  }
  return contingentGradingScore(listing, targetMetadata, fields, { score, matched, unknown, awards });
}
export function pokemonVisualCap(score: number): number {
  if (score >= 90) return 8;
  if (score >= 80) return 6;
  if (score >= 70) return 4;
  if (score >= 60) return 2;
  return 0;
}
function selectPokemonVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string) {
  const ranked = candidates.map((candidate) => {
    const scoring = pokemonVisualScore(candidate.item, targetMetadata);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T };
  }).sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex);
  const cap = pokemonVisualCap(Number(ranked[0]?.item.metadataMatchScore ?? 0));
  const selected = ranked.filter(candidate => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 60).slice(0, cap);
  const selectedKeys = new Set(selected.map(candidate => candidate.candidateIndex));
  return { ranked, selected, cap, excluded: ranked.filter(candidate => !selectedKeys.has(candidate.candidateIndex)).map(entry => ({
    ...entry.item, evidenceDisposition: 'pre_vision_score_excluded', visualReviewStatus: 'not_reviewed',
    visualReviewRationale: entry.imageUrls.length === 0 ? 'Pokémon candidate image unavailable; retained as context-only.'
      : Number(entry.item.metadataMatchScore ?? 0) < 60 ? 'Pokémon metadata score below visual-review minimum (60).'
      : `Pokémon visual cap reached (${cap}); higher-scoring candidates selected first.`,
    evidenceReasons: [entry.imageUrls.length === 0 ? 'no candidate image available' : Number(entry.item.metadataMatchScore ?? 0) < 60 ? 'metadata score below minimum (60)' : `visual-review cap reached (${cap})`],
  } as T)) };
}
const VINTAGE_TOY_SCORE_FIELDS = {
  "action figure/doll": [
    ["toyNameCharacter", 25], ["brand", 15], ["franchise", 15], ["year", 5],
    ["packagingType", 10], ["complete", 10], ["accessoriesIncluded", 10], ["gradingCompany", 5], ["grade", 5],
  ],
  "board game/puzzle": [
    ["gamePuzzleName", 25], ["publisherBrand", 15], ["year", 5], ["complete", 15],
    ["numberOfPieces", 10], ["instructionsIncluded", 10], ["boxIncluded", 10], ["gradingCompany", 5], ["grade", 5],
  ],
  "electronic toy": [
    ["toyName", 25], ["brand", 15], ["year", 5], ["tested", 15],
    ["workingCondition", 15], ["batteryCompartmentCondition", 10], ["soundOrLights", 5], ["gradingCompany", 5], ["grade", 5],
  ],
  LEGO: [
    ["setNumber", 25], ["theme", 20], ["complete", 15], ["packagingType", 10],
    ["releaseYear", 5], ["pieceCount", 5], ["minifiguresIncluded", 5], ["retiredStatus", 5], ["gradingCompany", 5], ["grade", 5],
  ],
  "model/kit": [
    ["modelKitName", 25], ["brand", 10], ["scale", 15], ["builtOrUnbuilt", 15],
    ["complete", 10], ["instructionsIncluded", 10], ["year", 5], ["gradingCompany", 5], ["grade", 5],
  ],
  playset: [
    ["playsetName", 25], ["brand", 15], ["franchise", 15], ["year", 5],
    ["complete", 15], ["missingPieces", 10], ["originalBoxIncluded", 5], ["gradingCompany", 5], ["grade", 5],
  ],
  "plush/stuffed toy": [
    ["toyNameCharacter", 30], ["brand", 20], ["franchise", 10], ["year", 5],
    ["tagsAttached", 15], ["cleanlinessOdorNotes", 10], ["gradingCompany", 5], ["grade", 5],
  ],
  vehicle: [
    ["vehicleName", 25], ["brand", 15], ["franchise", 10], ["year", 5],
    ["vehicleType", 15], ["packagingType", 10], ["workingFeatures", 10], ["gradingCompany", 5], ["grade", 5],
  ],
} as const;

function vintageToyScoreText(value: unknown): string {
  return normalizedChoice(meaningfulMetadataText(value)).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function vintageToyScoreTargetValue(details: Record<string, unknown>, aliases: string[], fallback?: unknown): unknown {
  return firstMeaningfulValue(...aliases.map((alias) => details[alias] ?? labeledCandidateValue(details, [alias])), fallback);
}

function vintageToyScoreCandidateText(listing: VisualSourceCandidate, aliases: string[]): { explicit: string; text: string } {
  const details = candidateStructuredDetails(listing);
  const explicit = vintageToyScoreText(firstMeaningfulValue(...aliases.map((alias) => details[alias] ?? labeledCandidateValue(details, [alias]))));
  const text = vintageToyScoreText(`${canonicalCandidateTitle(listing)} ${sourceText(normalizeVisualSourceCandidate(listing))}`);
  return { explicit, text };
}

function vintageToyScoreTextMatch(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[]): ScorePredicate {
  const target = vintageToyScoreText(targetValue);
  if (!target) return null;
  const candidate = vintageToyScoreCandidateText(listing, aliases);
  if (candidate.explicit) return scoreMatch(candidate.explicit.includes(target) || target.includes(candidate.explicit), { value: candidate.explicit, source: 'structured', field: aliases[0] });
  if (!candidate.text) return null;
  return candidate.text.includes(target) ? true : null;
}
function vintageToyScoreIdentityMatch(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[]): ScorePredicate {
  const targetTokens = vintageToyIdentityComparable(meaningfulMetadataText(targetValue));
  if (!targetTokens.length) return null;
  const candidate = vintageToyScoreCandidateText(listing, aliases);
  const candidateValue = candidate.explicit || candidate.text;
  const candidateTokens = new Set(vintageToyIdentityComparable(candidateValue));
  if (!candidateTokens.size) return null;
  return scoreMatch(targetTokens.every((token) => candidateTokens.has(token))
    || [...candidateTokens].every((token) => targetTokens.includes(token))
    ? true
    : null, candidate.explicit ? { value: candidate.explicit, source: 'structured', field: aliases[0] } : null);
}
function vintageToyScoreYearMatch(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[]): ScorePredicate {
  const target = String(targetValue ?? "").match(/\b(?:17|18|19|20)\d{2}\b/)?.[0];
  if (!target) return null;
  const candidate = vintageToyScoreCandidateText(listing, aliases);
  // A marketplace title can contain an edition or listing year. It is not
  // structured candidate metadata and must not create a year match/conflict.
  const candidateYear = candidate.explicit.match(/\b(?:17|18|19|20)\d{2}\b/)?.[0];
  return scoreMatch(candidateYear ? candidateYear === target : null, { value: candidate.explicit, source: 'structured', field: aliases[0] });
}

function vintageToyScoreNumberMatch(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[]): ScorePredicate {
  const field = aliases[0] as ToyNumericField;
  const target = parseToyNumericValue(targetValue, field);
  if (!target) return null;
  const details = candidateStructuredDetails(listing);
  const explicit = scoreCandidateEvidence(listing, aliases);
  const declarations = aliases.map(alias => readMetadataValue(listing, [alias]) || readMetadataValue(details, [alias])).filter(Boolean)
    .map(value => parseToyNumericValue(value, field));
  if (declarations.some(value => value && declarations.some(other => other && value.value !== other.value))) return null;
  const titleDeclarations = extractToyNumericTitleEvidence(canonicalCandidateTitle(listing), field);
  if (titleDeclarations.ambiguous || declarations.some(value => value
    && titleDeclarations.observations.some(observed => value.value !== observed.value))) return null;
  const titleValue = readToyNumericTitleEvidence(canonicalCandidateTitle(listing), field);
  const candidate = explicit ? parseToyNumericValue(explicit.value, field) : titleValue;
  const witness = explicit ?? (titleValue ? { value: titleValue.raw, source: 'title' as const, field } : null);
  return scoreMatch(candidate ? candidate.value === target.value : null, witness);
}

function vintageToyScoreStateMatch(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], positive: RegExp, negative: RegExp): ScorePredicate {
  const target = vintageToyState(meaningfulMetadataText(targetValue));
  if (!target) return null;
  const candidate = vintageToyScoreCandidateText(listing, aliases);
  // Structured candidate state remains authoritative. When it is absent,
  // recognized title evidence is allowed to supply the same field-specific
  // value used by the comparison table (for example, Sealed implies complete).
  const text = candidate.explicit || candidate.text;
  if (!text) return null;
	const explicitState = vintageToyState(candidate.explicit);
	if (explicitState) return scoreMatch(explicitState === target, { value: candidate.explicit, source: 'structured', field: aliases[0] });
	if (aliases.some((alias) => /^(?:complete|completeness|isComplete)$/i.test(alias))) {
		const titleCompleteness = titleCompletenessState(candidate.text);
		if (titleCompleteness !== "unknown") return titleCompleteness === target;
	}
	const targetYes = target === "yes";
  const title = canonicalCandidateTitle(listing);
  const titleResult = targetYes ? positive.test(title) : negative.test(title);
  const witness = candidate.explicit ? { value: candidate.explicit, source: 'structured' as const, field: aliases[0] }
    : titleResult ? { value: title, source: 'title' as const, field: aliases[0] } : null;
  if (targetYes) return scoreMatch(positive.test(text) ? true : negative.test(text) ? false : null, witness);
  return scoreMatch(negative.test(text) ? true : positive.test(text) ? false : null, witness);
}

function vintageToyScoreValue(targetValue: unknown, listing: VisualSourceCandidate, aliases: string[], kind: "text" | "identity" | "year" | "number" | "state", positive?: RegExp, negative?: RegExp): ScorePredicate {
  if (kind === "identity") return vintageToyScoreIdentityMatch(targetValue, listing, aliases);
  if (kind === "year") return vintageToyScoreYearMatch(targetValue, listing, aliases);
  if (kind === "number") return vintageToyScoreNumberMatch(targetValue, listing, aliases);
  if (kind === "state") return vintageToyScoreStateMatch(targetValue, listing, aliases, positive ?? /\b(?:yes|complete|working|tested|sealed|original)\b/i, negative ?? /\b(?:no|incomplete|missing|not\s+working|untested|opened|loose)\b/i);
  return vintageToyScoreTextMatch(targetValue, listing, aliases);
}

function vintageToyScoreType(targetMetadata: string): string {
  return vintageToyTargetItemType(targetMetadata);
}

function vintageToyScoreFields(type: string): Array<readonly [string, number]> {
  return [...(VINTAGE_TOY_SCORE_FIELDS[type as keyof typeof VINTAGE_TOY_SCORE_FIELDS] ?? [])];
}

export function vintageToyVisualScore(listing: VisualSourceCandidate, targetMetadata: string): MetadataScoreResult {
  const type = vintageToyScoreType(targetMetadata);
  const details = extractTargetItemDetails(targetMetadata);
  const matched: string[] = [];
  const unknown: string[] = [];
  const awards: RankingAward[] = [];
  let score = 0;
  const add = (field: string, points: number, value: unknown, aliases: string[], kind: "text" | "identity" | "year" | "number" | "state", positive?: RegExp, negative?: RegExp) => {
    const result = vintageToyScoreValue(value, listing, aliases, kind, positive, negative);
    if (scoreResult(result) === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, result)); }
    else if (scoreResult(result) === null) unknown.push(field);
  };
  const addResult = (field: string, result: ScorePredicate) => {
    if (scoreResult(result) === true) { score += 5; matched.push(field); awards.push(scoreAward(field, 5, result)); }
    else if (scoreResult(result) === null) unknown.push(field);
  };
  for (const [field, points] of vintageToyScoreFields(type)) {
    switch (field) {
      case "toyNameCharacter": add(field, points, vintageToyScoreTargetValue(details, ["toyNameCharacter", "toyName", "character"], extractTargetTitle(targetMetadata)), ["toyNameCharacter", "toyName", "character", "name"], "text"); break;
      case "toyName": add(field, points, vintageToyScoreTargetValue(details, ["toyName"], extractTargetTitle(targetMetadata)), ["toyName", "name"], "text"); break;
      case "gamePuzzleName": add(field, points, vintageToyScoreTargetValue(details, ["gamePuzzleName", "gameName", "puzzleName"], extractTargetTitle(targetMetadata)), ["gamePuzzleName", "gameName", "puzzleName", "name"], "identity"); break;
      case "modelKitName": add(field, points, vintageToyScoreTargetValue(details, ["modelKitName", "modelName", "kitName"], extractTargetTitle(targetMetadata)), ["modelKitName", "modelName", "kitName", "name"], "text"); break;
      case "playsetName": add(field, points, vintageToyScoreTargetValue(details, ["playsetName"], extractTargetTitle(targetMetadata)), ["playsetName", "name"], "text"); break;
      case "vehicleName": add(field, points, vintageToyScoreTargetValue(details, ["vehicleName"], extractTargetTitle(targetMetadata)), ["vehicleName", "name"], "text"); break;
      case "setNumber": add(field, points, vintageToyScoreTargetValue(details, ["setNumber", "setNo", "number"]), ["setNumber", "setNo", "number"], "number"); break;
      case "pieceCount": add(field, points, vintageToyScoreTargetValue(details, ["pieceCount"]), ["pieceCount", "pieces", "numberOfPieces"], "number"); break;
      case "numberOfPieces": add(field, points, vintageToyScoreTargetValue(details, ["numberOfPieces", "pieceCount"]), ["numberOfPieces", "pieceCount", "pieces"], "number"); break;
      case "releaseYear": add(field, points, vintageToyScoreTargetValue(details, ["releaseYear", "year"]), ["releaseYear", "year"], "year"); break;
      case "year": add(field, points, vintageToyScoreTargetValue(details, ["year", "releaseYear"]), ["year", "releaseYear"], "year"); break;
      case "brand": add(field, points, vintageToyScoreTargetValue(details, ["brand", "manufacturer"]), ["brand", "manufacturer"], "text"); break;
      case "publisherBrand": add(field, points, vintageToyScoreTargetValue(details, ["publisherBrand", "publisher", "brand"]), ["publisherBrand", "publisher", "brand"], "text"); break;
      case "franchise": add(field, points, vintageToyScoreTargetValue(details, ["franchise", "series"]), ["franchise", "series"], "text"); break;
      case "theme": add(field, points, vintageToyScoreTargetValue(details, ["theme"]), ["theme"], "text"); break;
      case "scale": add(field, points, vintageToyScoreTargetValue(details, ["scale"]), ["scale"], "text"); break;
      case "vehicleType": add(field, points, vintageToyScoreTargetValue(details, ["vehicleType", "type"]), ["vehicleType", "type"], "text"); break;
      case "workingCondition": add(field, points, vintageToyScoreTargetValue(details, ["workingCondition", "functionality"]), ["workingCondition", "functionality"], "text"); break;
      case "builtOrUnbuilt": add(field, points, vintageToyScoreTargetValue(details, ["builtOrUnbuilt", "buildStatus"]), ["builtOrUnbuilt", "buildStatus"], "state", /\b(?:unbuilt|sealed|unopened)\b/i, /\b(?:built|assembled|completed)\b/i); break;
      case "packagingType": add(field, points, vintageToyScoreTargetValue(details, ["packagingType", "packageType", "packaging"]), ["packagingType", "packageType", "packaging"], "text"); break;
      case "complete": add(field, points, vintageToyScoreTargetValue(details, ["complete", "isComplete", "completeness"]), ["complete", "isComplete", "completeness"], "state", /\b(?:complete|sealed|factory\s+sealed)\b/i, /\b(?:incomplete|missing|partial)\b/i); break;
      case "accessoriesIncluded": add(field, points, vintageToyScoreTargetValue(details, ["accessoriesIncluded", "accessories"]), ["accessoriesIncluded", "accessories"], "state", /\b(?:accessories?|all\s+accessories)\b/i, /\b(?:missing\s+accessories?|no\s+accessories)\b/i); break;
      case "instructionsIncluded": add(field, points, vintageToyScoreTargetValue(details, ["instructionsIncluded", "instructions"]), ["instructionsIncluded", "instructions"], "state", /\b(?:instructions?|with\s+instructions?)\b/i, /\b(?:no\s+instructions?|missing\s+instructions?)\b/i); break;
      case "boxIncluded": add(field, points, vintageToyScoreTargetValue(details, ["boxIncluded", "originalBoxIncluded"]), ["boxIncluded", "originalBoxIncluded", "box"], "state", /\b(?:box|boxed|with\s+box)\b/i, /\b(?:no\s+box|boxless)\b/i); break;
      case "originalBoxIncluded": add(field, points, vintageToyScoreTargetValue(details, ["originalBoxIncluded", "boxIncluded"]), ["originalBoxIncluded", "boxIncluded", "box"], "state", /\b(?:original\s+box|with\s+box)\b/i, /\b(?:no\s+box|boxless)\b/i); break;
      case "tested": add(field, points, vintageToyScoreTargetValue(details, ["tested"]), ["tested"], "state", /\btested\b/i, /\buntested\b/i); break;
      case "batteryCompartmentCondition": add(field, points, vintageToyScoreTargetValue(details, ["batteryCompartmentCondition", "batteryCondition"]), ["batteryCompartmentCondition", "batteryCondition"], "text"); break;
      case "soundOrLights": {
        const sound = vintageToyScoreTargetValue(details, ["soundWorks"]);
        const lights = vintageToyScoreTargetValue(details, ["lightsWork"]);
        const soundResult = vintageToyScoreValue(sound, listing, ["soundWorks"], "state", /\b(?:sound|voice|audio)\s*(?:works?|working)\b/i, /\b(?:sound|voice|audio)\s*(?:doesn.t\s+work|not\s+working)\b/i);
        const lightResult = vintageToyScoreValue(lights, listing, ["lightsWork"], "state", /\blights?\s*(?:works?|working)\b/i, /\blights?\s*(?:doesn.t\s+work|not\s+working)\b/i);
        const result = sound || lights ? (scoreResult(soundResult) === true || scoreResult(lightResult) === true ? true : scoreResult(soundResult) === null || scoreResult(lightResult) === null ? null : false) : null;
        if (result === true) { score += points; matched.push(field); awards.push(scoreAward(field, points, scoreResult(soundResult) === true ? soundResult : lightResult)); } else if (result === null) unknown.push(field);
        break;
      }
      case "retiredStatus": add(field, points, vintageToyScoreTargetValue(details, ["retiredStatus", "retired"]), ["retiredStatus", "retired"], "state", /\bretired\b/i, /\b(?:current|not\s+retired)\b/i); break;
      case "minifiguresIncluded": add(field, points, vintageToyScoreTargetValue(details, ["minifiguresIncluded", "minifigures"]), ["minifiguresIncluded", "minifigures"], "state", /\b(?:minifig(?:ure)?s?|figures?)\s*(?:included|present)\b/i, /\b(?:no|missing)\s+(?:minifig(?:ure)?s?|figures?)\b/i); break;
      case "tagsAttached": add(field, points, vintageToyScoreTargetValue(details, ["tagsAttached", "tags"]), ["tagsAttached", "tags"], "state", /\b(?:with\s+tags?|tags?\s+attached)\b/i, /\b(?:no\s+tags?|tags?\s+missing)\b/i); break;
      case "missingPieces": add(field, points, vintageToyScoreTargetValue(details, ["missingPieces"]), ["missingPieces"], "state", /\b(?:no\s+missing\s+pieces?|complete)\b/i, /\b(?:missing\s+pieces?|incomplete)\b/i); break;
      case "workingFeatures": add(field, points, vintageToyScoreTargetValue(details, ["workingFeatures", "features"]), ["workingFeatures", "features"], "text"); break;
      case "cleanlinessOdorNotes": add(field, points, vintageToyScoreTargetValue(details, ["cleanlinessOdorNotes"]), ["cleanlinessOdorNotes", "cleanliness", "odor"], "text"); break;
      case "gradingCompany": addResult(field, coinGradingCompanyMatches(targetMetadata, normalizeVisualSourceCandidate(listing))); break;
      case "grade": addResult(field, coinNumericGradeMatches(targetMetadata, normalizeVisualSourceCandidate(listing))); break;
    }
  }
  return contingentGradingScore(listing, targetMetadata, vintageToyScoreFields(type), { score, matched, unknown, awards });
}

export function vintageToyVisualCap(score: number): number {
  if (score >= 90) return 8;
  if (score >= 80) return 6;
  if (score >= 70) return 4;
  if (score >= 60) return 2;
  return 0;
}

function selectVintageToyVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string) {
  const label = `Vintage Toys / ${vintageToyScoreType(targetMetadata)}`;
  const ranked = candidates.map((candidate) => {
    const scoring = vintageToyVisualScore(candidate.item, targetMetadata);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T };
  }).sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate, index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index + 1 } as T }));
  const cap = vintageToyVisualCap(Number(ranked[0]?.item.metadataMatchScore ?? 0));
  const selected = ranked.filter((candidate) => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 60).slice(0, cap);
  const selectedKeys = new Set(selected.map((candidate) => candidate.candidateIndex));
  const excluded = ranked.filter((candidate) => !selectedKeys.has(candidate.candidateIndex)).map((entry) => ({
    ...entry.item,
    evidenceDisposition: 'pre_vision_score_excluded',
    visualReviewStatus: 'not_reviewed',
    visualReviewRationale: Number(entry.item.metadataMatchScore ?? 0) < 60
      ? `${label} metadata score ${Number(entry.item.metadataMatchScore ?? 0)}/100 is below the visual-review minimum of 60.`
      : `${label} visual cap reached (${cap}); higher-scoring candidates were selected first.`,
    evidenceReasons: [entry.imageUrls.length === 0 ? 'no candidate image available; retained as context-only' : Number(entry.item.metadataMatchScore ?? 0) < 60 ? 'metadata score below minimum (60)' : `visual-review cap reached (${cap})`],
  } as T));
  return { selected, excluded, cap, ranked };
}

function selectSportsCardUnopenedVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string) {
  const ranked = candidates.map((candidate) => {
    const scoring = sportsCardUnopenedVisualScore(candidate.item, targetMetadata);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T };
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
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T };
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
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards, metadataMatchRank: index + 1 } as T };
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
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T };
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
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T };
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
function selectStampsVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string, setTarget: boolean) {
  const score = (item: T) => setTarget ? stampsSetVisualScore(item, targetMetadata) : stampsSingleVisualScore(item, targetMetadata);
  const capFor = (value: number) => setTarget ? stampsSetVisualCap(value) : stampsSingleVisualCap(value);
  const label = setTarget ? 'Stamps / Stamp Set or Sheet' : 'Stamps / Single Stamp';
  const ranked = candidates.map((candidate) => { const scoring = score(candidate.item); return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T }; })
    .sort((a,b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate,index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index + 1 } as T }));
  const highestScore = Number(ranked[0]?.item.metadataMatchScore ?? 0); const cap = capFor(highestScore);
  const selected = ranked.filter((candidate) => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 60).slice(0, cap);
  const selectedKeys = new Set(selected.map((candidate) => candidate.candidateIndex));
  const excluded = ranked.filter((candidate) => !selectedKeys.has(candidate.candidateIndex)).map((entry) => ({ ...entry.item, evidenceDisposition: 'pre_vision_score_excluded', visualReviewStatus: 'not_reviewed', visualReviewRationale: Number(entry.item.metadataMatchScore ?? 0) < 60 ? `${label} metadata score ${Number(entry.item.metadataMatchScore ?? 0)}/100 is below the visual-review minimum of 60.` : `${label} visual cap reached (${cap}); higher-scoring candidates were selected first.`, evidenceReasons: [entry.imageUrls.length === 0 ? 'no candidate image available; retained as context-only' : Number(entry.item.metadataMatchScore ?? 0) < 60 ? 'metadata score below minimum (60)' : `visual-review cap reached (${cap})`] } as T));
  return { selected, excluded, cap, ranked };
}
function selectMoviesVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string, boxSetTarget: boolean) {
  const score = (item: T) => boxSetTarget ? moviesBoxSetVisualScore(item, targetMetadata) : moviesIndividualVisualScore(item, targetMetadata);
  const label = boxSetTarget ? 'Movies / Box Set' : 'Movies / Individual Movie';
  const ranked = candidates.map((candidate) => {
    const scoring = score(candidate.item);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T };
  }).sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate, index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index + 1 } as T }));
  const highestScore = Number(ranked[0]?.item.metadataMatchScore ?? 0);
  const cap = moviesVisualCap(highestScore);
  const selected = ranked.filter((candidate) => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 60).slice(0, cap);
  const selectedKeys = new Set(selected.map((candidate) => candidate.candidateIndex));
  const excluded = ranked.filter((candidate) => !selectedKeys.has(candidate.candidateIndex)).map((entry) => ({
    ...entry.item,
    evidenceDisposition: 'pre_vision_score_excluded',
    visualReviewStatus: 'not_reviewed',
    visualReviewRationale: Number(entry.item.metadataMatchScore ?? 0) < 60 ? `${label} metadata score ${Number(entry.item.metadataMatchScore ?? 0)}/100 is below the visual-review minimum of 60.` : `${label} visual cap reached (${cap}); higher-scoring candidates were selected first.`,
    evidenceReasons: [entry.imageUrls.length === 0 ? 'no candidate image available; retained as context-only' : Number(entry.item.metadataMatchScore ?? 0) < 60 ? 'metadata score below minimum (60)' : `visual-review cap reached (${cap})`],
  } as T));
  return { selected, excluded, cap, ranked };
}

function selectDisneyPinsVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string, setTarget: boolean) {
  const ranked = candidates.map((candidate) => { const scoring = setTarget ? disneyPinsSetVisualScore(candidate.item, targetMetadata) : disneyPinsIndividualVisualScore(candidate.item, targetMetadata); return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T }; })
    .sort((a,b) => Number(b.item.metadataMatchScore ?? 0)-Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex-b.candidateIndex)
    .map((candidate,index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index+1 } as T }));
  const cap = disneyPinsVisualCap(Number(ranked[0]?.item.metadataMatchScore ?? 0));
  const label = setTarget ? 'Disney Pins / Pin Set' : 'Disney Pins / Individual Pin';
  const selected = ranked.filter((candidate) => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 40).slice(0,cap);
  const selectedKeys = new Set(selected.map((candidate)=>candidate.candidateIndex));
  const excluded = ranked.filter((candidate)=>!selectedKeys.has(candidate.candidateIndex)).map((entry)=>({ ...entry.item, evidenceDisposition:'pre_vision_score_excluded', visualReviewStatus:'not_reviewed', visualReviewRationale:Number(entry.item.metadataMatchScore ?? 0)<40 ? `${label} metadata score ${Number(entry.item.metadataMatchScore ?? 0)}/100 is below the visual-review minimum of 40.` : `${label} visual cap reached (${cap}); higher-scoring candidates were selected first.`, evidenceReasons:[entry.imageUrls.length===0?'no candidate image available; retained as context-only':Number(entry.item.metadataMatchScore ?? 0)<40?'metadata score below minimum (40)':`visual-review cap reached (${cap})`] } as T));
  return {selected,excluded,cap,ranked};
}

function selectMusicVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string) {
  const ranked = candidates.map((candidate) => {
    const scoring = musicVisualScore(candidate.item, targetMetadata);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T };
  }).sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate, index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index + 1 } as T }));
  const highestScore = Number(ranked[0]?.item.metadataMatchScore ?? 0);
  const cap = musicVisualCap(highestScore);
  const selected = ranked.filter((candidate) => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 60).slice(0, cap);
  const selectedKeys = new Set(selected.map((candidate) => candidate.candidateIndex));
  const excluded = ranked.filter((candidate) => !selectedKeys.has(candidate.candidateIndex)).map((entry) => ({
    ...entry.item,
    evidenceDisposition: 'pre_vision_score_excluded',
    visualReviewStatus: 'not_reviewed',
    visualReviewRationale: Number(entry.item.metadataMatchScore ?? 0) < 60
      ? `Music metadata score ${Number(entry.item.metadataMatchScore ?? 0)}/100 is below the visual-review minimum of 60.`
      : `Music visual cap reached (${cap}); higher-scoring candidates were selected first.`,
    evidenceReasons: [entry.imageUrls.length === 0 ? 'no candidate image available; retained as context-only' : Number(entry.item.metadataMatchScore ?? 0) < 60 ? 'metadata score below minimum (60)' : `visual-review cap reached (${cap})`],
  } as T));
  return { selected, excluded, cap, ranked };
}

function selectVideoGameVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string, targetType: 'game' | 'console' | 'accessory') {
  const score = (item: T) => targetType === 'game'
    ? videoGameGameVisualScore(item, targetMetadata)
    : targetType === 'console'
      ? videoGameConsoleVisualScore(item, targetMetadata)
      : videoGameAccessoryVisualScore(item, targetMetadata);
  const label = `Video Games / ${targetType[0].toUpperCase()}${targetType.slice(1)}`;
  const ranked = candidates.map((candidate) => {
    const scoring = score(candidate.item);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T };
  }).sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex)
    .map((candidate, index) => ({ ...candidate, item: { ...candidate.item, metadataMatchRank: index + 1 } as T }));
  const highestScore = Number(ranked[0]?.item.metadataMatchScore ?? 0);
  const cap = videoGameVisualCap(highestScore);
  const selected = ranked.filter((candidate) => candidate.imageUrls.length > 0 && Number(candidate.item.metadataMatchScore ?? 0) >= 50).slice(0, cap);
  const selectedKeys = new Set(selected.map((candidate) => candidate.candidateIndex));
  const excluded = ranked.filter((candidate) => !selectedKeys.has(candidate.candidateIndex)).map((entry) => ({
    ...entry.item,
    evidenceDisposition: 'pre_vision_score_excluded',
    visualReviewStatus: 'not_reviewed',
    visualReviewRationale: Number(entry.item.metadataMatchScore ?? 0) < 50
      ? `${label} metadata score ${Number(entry.item.metadataMatchScore ?? 0)}/100 is below the visual-review minimum of 50.`
      : `${label} visual cap reached (${cap}); higher-scoring candidates were selected first.`,
    evidenceReasons: [entry.imageUrls.length === 0 ? 'no candidate image available; retained as context-only' : Number(entry.item.metadataMatchScore ?? 0) < 50 ? 'metadata score below minimum (50)' : `visual-review cap reached (${cap})`],
  } as T));
  return { selected, excluded, cap, ranked };
}
function selectCoinsSingleVisualCandidates<T extends VisualSourceCandidate>(candidates: Array<{ item: T; candidateIndex: number; imageUrl: string | null; imageUrls: string[] }>, targetMetadata: string) {
  const ranked = candidates.map((candidate) => {
    const scoring = coinsSingleVisualScore(candidate.item, targetMetadata);
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T };
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
    return { ...candidate, item: { ...candidate.item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T };
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
      return { item: { ...item, metadataMatchScore: scoring.score, metadataMatchReasons: scoring.matched, metadataUnknownFields: scoring.unknown, metadataScoreAwards: scoring.awards } as T, index };
    })
    .sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.index - b.index)
    .map((entry, rank) => ({ ...entry.item, metadataMatchRank: rank + 1 } as T));
}

// Pre-vision conflicts stay excluded from visual review and valuation, but they
// still receive the same single item-type score for transparent auditing.
// Collection/Lot remains intentionally non-comparable and receives no score.
function isExactComparableVisualTarget(targetMetadata: string): boolean {
  const category = normalizedChoice(metadataValue(targetMetadata, 'category'));
  const itemType = targetItemTypeValue(targetMetadata);
  const supportedCategory = ['sports_cards', 'comics', 'coins', 'stamps', 'video_games', 'movies', 'disney_pins', 'music', 'vintage_toys', 'pokemon', 'autographs'].includes(category);
  return supportedCategory && Boolean(meaningfulMetadataText(itemType)) && !/collection|lot/.test(itemType)
    && category !== 'autographs' && !(category === 'comics' && itemType === 'original_art');
}

function exactComparableVisualScorer(targetMetadata: string): ((listing: VisualSourceCandidate) => MetadataScoreResult) | null {
  const category = normalizedChoice(metadataValue(targetMetadata, "category"));
  const itemType = targetItemTypeValue(targetMetadata);
  // These separate relevance paths are scored by their existing outer caller,
  // never relabeled exact-comparable by this annotation helper.
  if (!isExactComparableVisualTarget(targetMetadata)) return null;

  let scorer: ((listing: VisualSourceCandidate, metadata: string) => MetadataScoreResult) | null = null;
  const videoGameType = category === "video_games" ? videoGameItemTypeLabel(videoGameTargetItemType(targetMetadata)) : "";
  const movieType = category === "movies" ? movieTargetItemType(targetMetadata) : "";
  const musicType = musicItemTypeLabel(itemType);
  const vintageToyType = vintageToyScoreType(targetMetadata);
  const pokemonType = pokemonTargetItemType(targetMetadata);
  if (sportsCardUnopenedTarget(targetMetadata)) scorer = sportsCardUnopenedVisualScore;
  else if (sportsCardSetTarget(targetMetadata)) scorer = sportsCardSetVisualScore;
  else if (sportsCardSingleTarget(targetMetadata)) scorer = sportsCardSingleVisualScore;
  else if (comicsSingleTarget(targetMetadata)) scorer = comicsSingleVisualScore;
  else if (isSingleStampTarget(targetMetadata)) scorer = stampsSingleVisualScore;
  else if (isStampSetTarget(targetMetadata)) scorer = stampsSetVisualScore;
  else if (isSingleCoinTarget(targetMetadata)) scorer = coinsSingleVisualScore;
  else if (isCoinSetTarget(targetMetadata)) scorer = coinsSetVisualScore;
  else if (isPaperMoneyTarget(targetMetadata)) scorer = paperMoneyVisualScore;
  else if (videoGameType === "game") scorer = videoGameGameVisualScore;
  else if (videoGameType === "console") scorer = videoGameConsoleVisualScore;
  else if (videoGameType === "accessory") scorer = videoGameAccessoryVisualScore;
  else if (movieType === "individual_movie") scorer = moviesIndividualVisualScore;
  else if (movieType === "box_set") scorer = moviesBoxSetVisualScore;
  // The inventory form stores an individual pin as `single_pin`; use the same
  // Disney type reader as the scorer and selector instead of one literal key.
  else if (category === "disney_pins" && disneyPinsTargetItemType(targetMetadata) === "individual_pin") scorer = disneyPinsIndividualVisualScore;
  else if (category === "disney_pins" && disneyPinsTargetItemType(targetMetadata) === "pin_set") scorer = disneyPinsSetVisualScore;
  else if (category === "music" && musicType && musicType !== "collection/lot") scorer = musicVisualScore;
  else if (category === "vintage_toys" && vintageToyType && vintageToyType !== "collection/lot") scorer = vintageToyVisualScore;
  else if (category === "pokemon" && pokemonType) scorer = pokemonVisualScore;
  // The existing inner pipeline already invokes this genuine universal model
  // when no category item-type handler applies (for example, Stamp Block).
  // Bind it before the final display overlay; do not fabricate a new model.
  else if (category === 'stamps' && itemType === 'stamp_block') scorer = universalMetadataScore;
  return scorer ? (listing) => scorer!(listing, targetMetadata) : null;
}

function scorePreVisualComparableCandidate<T extends VisualSourceCandidate>(listing: T, targetMetadata: string): T {
  const scoring = exactComparableVisualScorer(targetMetadata)?.(listing);
  return scoring ? {
    ...listing,
    metadataMatchScore: scoring.score,
    metadataMatchReasons: scoring.matched,
    metadataUnknownFields: scoring.unknown ?? [],
    metadataScoreAwards: scoring.awards,
	} as T : { ...listing, metadataMatchScore: undefined, metadataMatchRank: undefined,
    metadataMatchReasons: [], metadataUnknownFields: [], metadataScoreAwards: [], metadataMatchLabel: undefined } as T;
}

/**
 * Score every comparable candidate, including candidates that a deterministic
 * pre-vision safeguard kept out of image review. This is presentation/audit
 * metadata only; it does not make an excluded candidate eligible for valuation.
 */
export function annotatePreVisualComparableScores<T extends VisualSourceCandidate>(listings: T[], targetMetadata: string): T[] {
  const scored = listings.map((listing, index) => ({ item: scorePreVisualComparableCandidate(listing, targetMetadata), index }));
  const ranked = [...scored].sort((a, b) => Number(b.item.metadataMatchScore ?? -1) - Number(a.item.metadataMatchScore ?? -1) || a.index - b.index);
  const rankByIndex = new Map(ranked.map((entry, rank) => [entry.index, rank + 1]));
  return scored.map((entry) => ({
    ...entry.item,
    metadataMatchRank: entry.item.metadataMatchScore === undefined ? undefined : rankByIndex.get(entry.index),
  } as T));
}

export type VisualSourceReviewOpportunityArguments<T extends VisualSourceCandidate> = {
  listings: T[];
  targetMetadata: string;
  ignoreSubjectiveConditionDifferences?: boolean;
};

export type PreparedVisualSourceReviewCandidate<T extends VisualSourceCandidate> = {
  item: T;
  /** Original ingress occurrence, not provider ID or audit rank. */
  candidateIndex: number;
  imageUrl: string | null;
  imageUrls: string[];
};

export type VisualSourceReviewOpportunity<T extends VisualSourceCandidate> = {
  /** Only an existing exact-comparable category selector establishes support. */
  supported: boolean;
  unsupportedReason?: 'context_or_relevance_workflow' | 'no_category_selector';
  /** Selected image-bearing opportunity count, with no pricing meaning. */
  eligibleCount: number;
  targetMetadata: string;
  /** Real image-bearing category-selected rows; never sale or visual approval. */
  selectedCandidates: PreparedVisualSourceReviewCandidate<T>[];
  /** Every retained occurrence in ingress order, including hard holds. */
  preparedListings: T[];
  heldCandidates: Array<{ candidateIndex: number; item: T; reason: string; reasonCode: VisualExecutionReasonCode }>;
  declaredReviews: VisualSourceReview[];
  cap: number | null;
  minimumMetadataScore: number | null;
};

function prepareVisualSourceReviewPopulation<T extends VisualSourceCandidate>(args: VisualSourceReviewOpportunityArguments<T>) {
  const targetMetadata = canonicalVisualTargetMetadata(args.targetMetadata);
  const comparisonListings = args.listings.map((listing) => ({
    ...listing,
    metadataFieldComparisons: buildMetadataFieldComparisons(targetMetadata, listing),
  } as T));
  const universalPreparation = prepareUniversalVisualCandidates(comparisonListings, targetMetadata);
  return { targetMetadata, universalPreparation, preparedListings: universalPreparation.listings };
}

type PreparedVisualSourceCategorySelection<T extends VisualSourceCandidate> = {
  selected: PreparedVisualSourceReviewCandidate<T>[];
  excluded: T[];
  cap: number;
  ranked: PreparedVisualSourceReviewCandidate<T>[];
};

/** The actual pre-dispatch gates and selector policy, shared with final vision. */
function prepareVisualSourceReviewSelection<T extends VisualSourceCandidate>(args: {
  targetMetadata: string;
  universalPreparation: UniversalPreparation<T>;
  ignoreSubjectiveConditionDifferences?: boolean;
}) {
  const { targetMetadata, universalPreparation } = args;
  const preparedListings = universalPreparation.listings;
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
  const preVisualContextItems = new Map<number, T>();
  const preVisualContextListings: T[] = preparedListings.flatMap<T>((listing, originalIndex) => {
    if (!preVisualExcludedIndexes.has(originalIndex)) return [] as T[];
    const declaredReview = declaredReviewByIndex.get(originalIndex);
    const reason = preVisualUniversalReasons.get(originalIndex)
      ?? preVisualLotReasons.get(originalIndex)
      ?? declaredReview?.rationale
      ?? 'Pre-visual identity filter excluded this listing from visual review.';
    const scoredListing = scorePreVisualComparableCandidate(listing, targetMetadata);
    const item = {
      ...scoredListing,
      visualRequirement: 'not_required_pre_visual',
      visualReviewStatus: declaredReview?.verdict ?? 'not_reviewed',
      visualReviewRationale: reason,
      evidenceDisposition: 'context_only',
    } as T;
    preVisualContextItems.set(originalIndex, item);
    return item;
  });
  const eligibleListings = preparedListings.filter((_, index) => !preVisualExcludedIndexes.has(index));
  let allCandidates: PreparedVisualSourceReviewCandidate<T>[] = preparedListings
    .map((item, candidateIndex) => {
      const imageUrls = normalizeVisualSourceCandidate(item).imageUrls;
      return { item, candidateIndex, imageUrl: imageUrls[0] ?? null, imageUrls };
    })
    .filter((entry) => !preVisualExcludedIndexes.has(entry.candidateIndex));
  allCandidates = annotateUniversalScores(allCandidates, targetMetadata);
  const rankedItems = new Map<number, T>(allCandidates.map((candidate) => [candidate.candidateIndex, candidate.item]));
  const pokemonType = pokemonTargetItemType(targetMetadata);
  const pokemonSelection = pokemonType === 'single_card' || pokemonType === 'set' || pokemonType === 'unopened_product'
    ? selectPokemonVisualCandidates(allCandidates, targetMetadata)
    : null;
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
  const stampsSelection = isSingleStampTarget(targetMetadata)
    ? selectStampsVisualCandidates(allCandidates, targetMetadata, false)
    : isStampSetTarget(targetMetadata)
      ? selectStampsVisualCandidates(allCandidates, targetMetadata, true)
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
  const videoGameType = normalizedChoice(metadataValue(targetMetadata, 'category')) === 'video_games'
    ? videoGameItemTypeLabel(videoGameTargetItemType(targetMetadata))
    : '';
  const videoGameSelection = videoGameType === 'game' || videoGameType === 'console' || videoGameType === 'accessory'
    ? selectVideoGameVisualCandidates(allCandidates, targetMetadata, videoGameType)
    : null;
  // Category-guarded like exactComparableVisualScorer: an unguarded item-type
  // regex sent Disney `individual_pin` targets through the Movies selector.
  const movieType = normalizedChoice(metadataValue(targetMetadata, 'category')) === 'movies'
    ? movieTargetItemType(targetMetadata)
    : '';
  const moviesSelection = movieType === 'individual_movie' || movieType === 'box_set'
    ? selectMoviesVisualCandidates(allCandidates, targetMetadata, movieType === 'box_set')
    : null;
  const disneyPinsType = disneyPinsTargetItemType(targetMetadata);
  const disneyPinsSelection = normalizedChoice(metadataValue(targetMetadata, 'category')) === 'disney_pins' && (disneyPinsType === 'individual_pin' || disneyPinsType === 'pin_set')
    ? selectDisneyPinsVisualCandidates(allCandidates, targetMetadata, disneyPinsType === 'pin_set')
    : null;
  const musicType = musicItemTypeLabel(targetItemTypeValue(targetMetadata));
  const musicSelection = normalizedChoice(metadataValue(targetMetadata, 'category')) === 'music'
    && musicType !== '' && musicType !== 'collection/lot'
    ? selectMusicVisualCandidates(allCandidates, targetMetadata)
    : null;
  const vintageToyType = vintageToyScoreType(targetMetadata);
  const vintageToySelection = normalizedChoice(metadataValue(targetMetadata, 'category')) === 'vintage_toys' && vintageToyType && vintageToyType !== 'collection/lot'
    ? selectVintageToyVisualCandidates(allCandidates, targetMetadata)
    : null;
  const rankedSelection: PreparedVisualSourceCategorySelection<T> | null = pokemonSelection ?? sportsCardSelection ?? comicsSelection ?? stampsSelection ?? coinsSelection ?? coinSetSelection ?? paperMoneySelection ?? videoGameSelection ?? moviesSelection ?? disneyPinsSelection ?? musicSelection ?? vintageToySelection;
  // Reporting/budget minimum comes from the same dispatch, not a second policy.
  const minimumMetadataScore = !rankedSelection ? null
    : rankedSelection === videoGameSelection || rankedSelection === comicsSelection ? 50
    : rankedSelection === sportsCardSelection ? sportsCardUnopenedTarget(targetMetadata) ? 55 : 50
    : rankedSelection === disneyPinsSelection ? 40 : 60;
  return { preVisualUniversalReasons, preVisualLotReasons, declaredReviews, declaredReviewByIndex,
    preVisualExcludedIndexes, preVisualContextListings, preVisualContextItems, eligibleListings,
    allCandidates, rankedItems, rankedSelection, minimumMetadataScore };
}

/**
 * Synchronous deterministic preparation only: no target image, model dispatch,
 * sale-fact inference, signing, or cross-request state. Caller owns factual
 * sold-candidate checks and the retained provider-ID union before calling this.
 */
export function prepareVisualSourceReviewOpportunity<T extends VisualSourceCandidate>(
  args: VisualSourceReviewOpportunityArguments<T>,
): VisualSourceReviewOpportunity<T> {
  // An empty local display population clears direct/known-wrapper foreign
  // diagnostics without issuing an invocation binding or trusting inbound ranks.
  const emptyDisplayPopulation = freezeMetadataRankingPopulation([], {
    populationId: 'preparation_only', sourceId: 'visual_review_opportunity', scorerRole: 'unranked',
  });
  const cleanListings = overlayMetadataRankingPopulation(args.listings, emptyDisplayPopulation) as T[];
  const population = prepareVisualSourceReviewPopulation({ ...args, listings: cleanListings });
  const { targetMetadata, universalPreparation } = population;
  const isOriginalArt = normalizedChoice(metadataValue(targetMetadata, 'category')) === 'comics'
    && targetItemTypeValue(targetMetadata) === 'original_art';
  const contextWorkflow = isOriginalArt || isAutographSignedItemTarget(targetMetadata)
    || /collection|lot/.test(targetItemTypeValue(targetMetadata));
  if (contextWorkflow) {
    return { supported: false, unsupportedReason: 'context_or_relevance_workflow', targetMetadata,
      eligibleCount: 0, selectedCandidates: [], preparedListings: population.preparedListings,
      heldCandidates: population.preparedListings.map((item, candidateIndex) => ({ item, candidateIndex,
        reason: universalPreparation.contextReasons.get(candidateIndex) ?? 'Intentionally context-only or relevance-only workflow; no exact-comparable review opportunity.',
        reasonCode: universalPreparation.contextCodes.get(candidateIndex) ?? 'workflow_context_only' })),
      declaredReviews: [], cap: null, minimumMetadataScore: null };
  }
  const selection = prepareVisualSourceReviewSelection({ ...args, targetMetadata, universalPreparation });
  const itemType = targetItemTypeValue(targetMetadata);
  const supported = exactComparableVisualScorer(targetMetadata) !== null && selection.rankedSelection !== null
    && (normalizedChoice(metadataValue(targetMetadata, 'category')) !== 'sports_cards' || sportsCardProductForm(itemType) !== null);
  const categoryItems = new Map<number, T>(supported
    ? selection.rankedSelection!.ranked.map(candidate => [candidate.candidateIndex, candidate.item] as const) : []);
  const selectedIndexes = new Set(supported ? selection.rankedSelection!.selected.map(candidate => candidate.candidateIndex) : []);
  const selectionExcluded = new Map<number, T>(supported
    ? selection.rankedSelection!.ranked.filter(candidate => !selectedIndexes.has(candidate.candidateIndex))
      .map((candidate, index) => [candidate.candidateIndex, selection.rankedSelection!.excluded[index]] as const) : []);
  const preparedListings = population.preparedListings.map((listing, index) =>
    selection.preVisualContextItems.get(index) ?? selectionExcluded.get(index) ?? categoryItems.get(index) ?? listing);
  // Full-population audit ranks are an output overlay only, never cap drivers.
  const auditOrder = preparedListings.map((item, index) => ({ item, index }))
    .filter(entry => typeof entry.item.metadataMatchScore === 'number')
    .sort((a, b) => Number(b.item.metadataMatchScore) - Number(a.item.metadataMatchScore) || a.index - b.index);
  const auditRanks = new Map(auditOrder.map((entry, index) => [entry.index, index + 1]));
  const auditedListings = preparedListings.map((item, index) => withMetadataFieldComparisons(targetMetadata,
    { ...item, metadataMatchRank: auditRanks.get(index) } as T));
  const selectedCandidates = (supported ? selection.rankedSelection!.selected : [])
    .filter(candidate => candidate.imageUrls.length > 0)
    .map(candidate => ({ ...candidate, item: auditedListings[candidate.candidateIndex] }));
  const heldCandidates = auditedListings.flatMap((item, candidateIndex) => {
    const universalCode = universalPreparation.contextCodes.get(candidateIndex);
    const declaredReview = selection.declaredReviewByIndex.get(candidateIndex);
    const reason = selection.preVisualUniversalReasons.get(candidateIndex)
      ?? selection.preVisualLotReasons.get(candidateIndex) ?? declaredReview?.rationale
      ?? selectionExcluded.get(candidateIndex)?.visualReviewRationale;
    if (typeof reason !== 'string') return [];
    const reasonCode: VisualExecutionReasonCode = universalCode
      ?? (selection.preVisualLotReasons.has(candidateIndex) ? 'multi_item_hold'
        : declaredReview ? 'declared_identity_conflict' : 'selection_excluded');
    return [{ candidateIndex, item, reason, reasonCode }];
  });
  return { supported, ...(!supported ? { unsupportedReason: 'no_category_selector' as const } : {}),
    eligibleCount: selectedCandidates.length, targetMetadata, selectedCandidates,
    preparedListings: auditedListings, heldCandidates, declaredReviews: selection.declaredReviews,
    cap: supported ? selection.rankedSelection!.cap : null,
    minimumMetadataScore: supported ? selection.minimumMetadataScore : null };
}

type VisualSourceFilterArguments<T extends VisualSourceCandidate> = {
		  /** Marketplace/eBay candidates only. Grading and reference sources use separate evidence contracts. */
			  sourceRole: 'marketplace' | 'ebay';
		  sourceLabel: string;
  /** Owned route literal only; do not accept from browser DTOs or infer from labels. */
  reviewBudgetRole?: 'sold_source' | 'context';
		  targetImageUrl?: string | null;
		  targetMetadata: string;
		  visualProvider?: LlmProvider;
		  listings: T[];
		  ignoreSubjectiveConditionDifferences?: boolean;
		  reviewDeadlineAt?: number;

  /** Server-internal display snapshot, never accepted as browser authority. */
  rankingPopulation?: MetadataRankingPopulation;
};

export async function filterVisualSourceCandidates<T extends VisualSourceCandidate>(args: VisualSourceFilterArguments<T>): Promise<VisualSourceFilterResult<T>> {
  const targetMetadata = canonicalVisualTargetMetadata(args.targetMetadata);
  const isOriginalArt = /(?:^|;\s*)category=comics(?:;|$)/i.test(targetMetadata)
    && /(?:^|;\s*)itemType=original_art(?:;|$)/i.test(targetMetadata);
  let population = args.rankingPopulation;
  if (!population) {
    const role = isOriginalArt ? "original_art_relevance" : isAutographSignedItemTarget(targetMetadata) ? "signed_item_relevance"
      : /collection|lot/.test(targetItemTypeValue(targetMetadata)) ? "unranked" : "exact_comparable";
    const frozen = freezeMetadataRankingPopulation(args.listings, { populationId: randomUUID(), sourceId: args.sourceLabel, scorerRole: role });
    const scored = isOriginalArt ? annotateOriginalArtMarketCandidates(frozen.listings, targetMetadata)
      : isAutographSignedItemTarget(targetMetadata) ? annotateAutographMarketCandidates(frozen.listings, targetMetadata)
      : annotatePreVisualComparableScores(frozen.listings, targetMetadata);
    population = bindMetadataRankingPopulation(frozen, scored.map((listing) => withMetadataFieldComparisons(targetMetadata, {
      ...listing,
      ...(role === "signed_item_relevance" || role === "original_art_relevance" ? { metadataMatchLabel: "Market Relevance Score" } : {}),
    })));
  }
  const prepared = overlayMetadataRankingPopulation(args.rankingPopulation ? args.listings : population.listings as T[], population);
  const result = await filterPreparedVisualSourceCandidates({ ...args, targetMetadata, listings: prepared, rankingPopulation: population });
  const project = (listings: T[]) => overlayMetadataRankingPopulation(listings, population!).map((listing) => withMetadataFieldComparisons(targetMetadata, listing));
  return { ...result, listings: project(result.listings),
    ...(result.contextListings ? { contextListings: project(result.contextListings) } : {}) };
}

async function filterPreparedVisualSourceCandidates<T extends VisualSourceCandidate>(args: VisualSourceFilterArguments<T>): Promise<VisualSourceFilterResult<T>> {
  const { targetMetadata, universalPreparation, preparedListings } = prepareVisualSourceReviewPopulation(args);
  let reviewBudget: VisualSourceFilterResult<T>['reviewBudget'];
  // Invocation-owned reporting lives outside the provider try/catch. No receipt
  // is inferred from required/status/audit or inherited from another invocation.
  const executionReceipts = new Map<number, VisualExecution>(preparedListings.map((_, index) => [index, undispatchedVisualExecution("selected_not_dispatched")]));
  const indexByOccurrence = new Map(preparedListings.flatMap((listing, index) => listing.metadataRanking
    ? [[JSON.stringify([listing.metadataRanking.populationId, listing.metadataRanking.sourceId, listing.metadataRanking.occurrenceKey]), index] as const] : []));
  const receiptAt = (index: number) => executionReceipts.get(index)!;
  const holdAt = (index: number, reasonCode: VisualExecutionReasonCode, hardExclusion = false, deterministicMismatch = false) => {
    const receipt = undispatchedVisualExecution(reasonCode, hardExclusion);
    if (deterministicMismatch) receipt.identity = { result: "mismatch", origin: "deterministic" };
    executionReceipts.set(index, receipt);
  };
  const selectAt = (index: number, reasonCode: VisualExecutionReasonCode) => {
    const receipt = receiptAt(index);
    receipt.selectedForReview = true;
    receipt.state = "selected_pending";
    receipt.reasonCode = reasonCode;
  };
  const beginAttempt = (index: number, stage: VisualExecutionStage, format: VisualExecutionFormat): VisualExecutionAttempt => {
    const receipt = receiptAt(index);
    const attempt: VisualExecutionAttempt = { ordinal: receipt.attempts.length + 1, stage, format, outcome: "started" };
    receipt.attempts.push(attempt);
    return attempt;
  };
  const finish = (result: VisualSourceFilterResult<T>): VisualSourceFilterResult<T> => {
    const project = (rows: T[]) => rows.map((listing) => {
      const rank = listing.metadataRanking;
      const index = rank ? indexByOccurrence.get(JSON.stringify([rank.populationId, rank.sourceId, rank.occurrenceKey])) : undefined;
      const receipt = index === undefined ? undefined : executionReceipts.get(index);
      return { ...listing, visualExecution: receipt ? terminalVisualExecution(receipt)
        : { ...undispatchedVisualExecution("legacy_unknown"), state: "unknown" as const } } as T;
    });
    const listings = project(result.listings);
    const contextListings = result.contextListings ? project(result.contextListings) : undefined;
    const visualExecutionCounts = summarizeVisualExecutionOccurrences([...listings, ...(contextListings ?? [])], preparedListings.length,
      args.rankingPopulation ? { populationId: args.rankingPopulation.populationId, sourceId: args.rankingPopulation.sourceId } : undefined);
    return { ...result, listings, ...(contextListings ? { contextListings } : {}),
      note: reviewBudget ? `${result.note} Bounded sold-source review opportunity: ${reviewBudget.requestedSelectionBudget} requested, ${reviewBudget.eligibleImageBearingCount} eligible image-bearing candidates, ${reviewBudget.selectedCount} selected, ${reviewBudget.queuedCount} queued, ${visualExecutionCounts.dispatchedCandidateCount} actually dispatched; opportunity shortfall ${reviewBudget.opportunityShortfall}. Already-admitted current sales and the financial evidence deficit are unmeasured here; visual matches are not admitted sales.` : result.note,
      ...(reviewBudget ? { reviewBudget: { ...reviewBudget, dispatchedCount: visualExecutionCounts.dispatchedCandidateCount,
        deadlineHeldCount: [...executionReceipts.values()].filter(receipt => receipt.reasonCode === 'overall_deadline').length } } : {}),
      visualExecutionCounts };
  };
			  const isOriginalArtTarget = /(?:^|;\s*)category=comics(?:;|$)/i.test(targetMetadata)
		    && /(?:^|;\s*)itemType=original_art(?:;|$)/i.test(targetMetadata);
		  if (isOriginalArtTarget) {
		    preparedListings.forEach((_, index) => holdAt(index, "workflow_context_only"));
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
		    return finish({
		      listings: [],
		      contextListings,
		      preVisualExcludedCount: contextListings.length,
	      status: 'skipped_no_target_image',
	      reviewedCount: 0,
	      removedCount: 0,
		      retainedUnreviewedCount: contextListings.length,
		      reviews: [],
		      note: 'Original Art market context only: candidates are not sent to visual analysis because different artworks are not exact matches.',
		    });
		  }
		  if (isAutographSignedItemTarget(targetMetadata)) {
		    const autographExcluded = preparedListings.map((listing) => autographMarketExclusionReason(targetMetadata, listing));
		    preparedListings.forEach((_, index) => holdAt(index, autographExcluded[index] ? "universal_pre_visual_hold" : "workflow_context_only", Boolean(autographExcluded[index])));
		    const autographExcludedCount = autographExcluded.filter(Boolean).length;
    const autographEligibleListings = preparedListings.filter((_, index) => !autographExcluded[index]);
    const rankedAutographListings = annotateAutographMarketCandidates(autographEligibleListings, targetMetadata);
	    const contextListings = rankedAutographListings.map((listing, index) => ({
	      ...listing,
	      visualRequirement: 'not_required_autograph_market_context',
	      visualReviewStatus: 'not_reviewed',
	      visualReviewRationale: 'Signed Item uses broad market-range context; the signed object can vary and is not an exact visual comparable.',
	      evidenceDisposition: listing.evidenceDisposition ?? 'context_only',
	      evidenceReasons: [
	        ...(universalPreparation.contextReasons.get(index) ? [universalPreparation.contextReasons.get(index)!] : []),
	        ...(Array.isArray(listing.evidenceReasons) ? listing.evidenceReasons : []),
	        'Autographs / Signed Item market-range workflow does not use visual analysis.',
	      ],
	    } as T));
	    const heldListings = preparedListings.flatMap((listing, index) => autographExcluded[index] ? [{
      ...listing,
      visualRequirement: 'not_required_pre_visual', visualReviewStatus: 'not_reviewed',
      visualReviewRationale: autographExcluded[index]!,
	      evidenceDisposition: 'context_only', valuationEligible: false, hardException: true,
	      evidenceReasons: [autographExcluded[index]!],
	    } as T] : []);
	    return finish({
		      listings: [],
		      contextListings: [...contextListings, ...heldListings],
		      preVisualExcludedCount: autographExcludedCount,
	      status: 'skipped_no_target_image',
	      reviewedCount: 0,
	      removedCount: autographExcludedCount,
		      retainedUnreviewedCount: contextListings.length,
		      reviews: [],
			      note: 'Autographs / Signed Item market range only: candidates are ranked as similar market evidence and are not sent to visual analysis.',
			    });
			  }
  const selectionPreparation = prepareVisualSourceReviewSelection({ targetMetadata, universalPreparation,
    ignoreSubjectiveConditionDifferences: args.ignoreSubjectiveConditionDifferences });
  const { preVisualUniversalReasons, preVisualLotReasons, declaredReviews, declaredReviewByIndex, preVisualExcludedIndexes,
    preVisualContextListings, rankedItems } = selectionPreparation;
  preparedListings.forEach((_, index) => {
    const universalCode = universalPreparation.contextCodes.get(index);
    if (universalCode) holdAt(index, universalCode, true, universalCode !== "universal_duplicate_hold" && declaredReviewByIndex.has(index));
    else if (preVisualLotReasons.has(index)) holdAt(index, "multi_item_hold", true);
    else if (declaredReviewByIndex.has(index)) holdAt(index, "declared_identity_conflict", true, true);
  });
  let eligibleListings = selectionPreparation.eligibleListings;
  let preVisualScoreExcludedListings: T[] = [];
  let preVisualScoreExcludedIndexes = new Set<number>();
  let itemTypeRankedItems = new Map<number, T>();
  const allCandidates = selectionPreparation.allCandidates;
  let rankedSelection = selectionPreparation.rankedSelection;
  if (args.reviewBudgetRole === 'sold_source' && rankedSelection) {
    const minimum = selectionPreparation.minimumMetadataScore!;
    const eligible = rankedSelection.ranked.filter(candidate => candidate.imageUrls.length > 0
      && Number(candidate.item.metadataMatchScore ?? 0) >= minimum)
      .sort((a, b) => Number(b.item.metadataMatchScore ?? 0) - Number(a.item.metadataMatchScore ?? 0) || a.candidateIndex - b.candidateIndex);
    const budget = buildSoldReviewBudget(metadataValue(targetMetadata, 'category'), rankedSelection.cap, eligible.length, VISUAL_REVIEW_MAX_CANDIDATES);
    reviewBudget = { ...budget, targetItemType: targetItemTypeValue(targetMetadata), existingScoreBandCap: rankedSelection.cap,
      minimumMetadataScore: minimum, queuedCount: 0, dispatchedCount: 0, deadlineHeldCount: 0 };
    const selected = eligible.slice(0, budget.selectedCount);
    const selectedKeys = new Set(selected.map(candidate => candidate.candidateIndex));
    const excluded = rankedSelection.ranked.filter(candidate => !selectedKeys.has(candidate.candidateIndex)).map(candidate => {
      const reason = candidate.imageUrls.length === 0 ? 'no candidate image available; retained as context-only'
        : Number(candidate.item.metadataMatchScore ?? 0) < minimum ? `metadata score below minimum (${minimum})`
        : `bounded sold-source review budget reached (${budget.selectedCount} selected; ${budget.requestedSelectionBudget} requested)`;
      return { ...candidate.item, evidenceDisposition: 'pre_vision_score_excluded', visualReviewStatus: 'not_reviewed',
        visualReviewRationale: reason, evidenceReasons: [reason] } as T;
    });
    rankedSelection = { ...rankedSelection, selected, excluded, cap: budget.selectedCount } as typeof rankedSelection;
  }
  if (rankedSelection) {
    const selectedCandidateIndexes = new Set(rankedSelection.selected.map((candidate) => candidate.candidateIndex));
    preVisualScoreExcludedIndexes = new Set<number>(
      rankedSelection.ranked
        .filter((candidate) => !selectedCandidateIndexes.has(candidate.candidateIndex))
        .map((candidate) => candidate.candidateIndex),
    );
    preVisualScoreExcludedIndexes.forEach((index) => holdAt(index, "selection_excluded"));
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
  const target = safeRemoteImageUrl(args.targetImageUrl);
  // Same actual image-bearing selected population even on the missing-target return.
  const selectedBeforeTarget = (rankedSelection ? rankedSelection.selected : allCandidates)
    .filter((candidate) => candidate.imageUrls.length > 0 && !preVisualScoreExcludedIndexes.has(candidate.candidateIndex));
  selectedBeforeTarget.forEach((candidate) => selectAt(candidate.candidateIndex, target ? "selected_not_dispatched" : "target_image_unavailable"));
  allCandidates.filter((candidate) => candidate.imageUrls.length === 0 && !preVisualScoreExcludedIndexes.has(candidate.candidateIndex))
    .forEach((candidate) => holdAt(candidate.candidateIndex, target ? "candidate_image_unavailable" : "target_image_unavailable"));
  const remainingUnrankedEligible = rankedSelection ? [] : eligibleListings;
  // A ranking cap selects the strongest candidates for visual review, but a
  // missing target image means visual review cannot start. Keep those selected
  // candidates visible as context-only instead of silently dropping ranks 1..N.
  const rankedSelectedContextListings = rankedSelection
    ? rankedSelection.selected.map((candidate) => ({
      ...candidate.item,
      visualRequirement: "not_required_no_target_image",
      visualReviewStatus: "not_reviewed",
      visualReviewRationale: "Not visually analyzed because the target item has no usable image for comparison.",
      evidenceDisposition: "context_only",
      evidenceReasons: ["target image unavailable; visual analysis did not run"],
	    } as T))
	    : [];
  if (!target)
    return finish({
      listings: [],
      contextListings: [...rankedSelectedContextListings, ...preVisualContextListings, ...preVisualScoreExcludedListings, ...remainingUnrankedEligible.map((listing) => ({
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
      reviews: [],
      note: `No target listing image was supplied; ${args.sourceLabel} candidates were not visually filtered. ${preVisualContextListings.length} explicit identity or multi-item listing${preVisualContextListings.length === 1 ? " was" : "s were"} excluded before vision and retained as context-only.`,
    });
  const candidates = allCandidates
    .filter(
      (entry): entry is { item: T; candidateIndex: number; imageUrl: string; imageUrls: string[] } =>
        !preVisualScoreExcludedIndexes.has(entry.candidateIndex) &&
        entry.imageUrls.length > 0
    );
  const imageLessIndexes = new Set(allCandidates.filter((candidate) => candidate.imageUrls.length === 0).map((candidate) => candidate.candidateIndex));
  if (!candidates.length) {
    return finish({
      listings: [],
      contextListings: [...rankedSelectedContextListings, ...preVisualContextListings, ...preVisualScoreExcludedListings, ...remainingUnrankedEligible.map((listing) => ({
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
      reviews: [],
      note: eligibleListings.length === 0
        ? `No ${args.sourceLabel.toLowerCase()} candidates remained after deterministic identity and multi-item filtering; ${preVisualContextListings.length} listing${preVisualContextListings.length === 1 ? " was" : "s were"} retained as context-only before vision.`
        : `No ${args.sourceLabel.toLowerCase()} candidate images were available; all eligible candidates were retained. ${preVisualContextListings.length} explicit identity or multi-item listing${preVisualContextListings.length === 1 ? " was" : "s were"} excluded before vision and retained as context-only.`,
    });
  }
  let reviewCandidates = candidates;
  try {
    const strictResponseFormat = {
      type: "json_schema",
      json_schema: {
        name: "visual_source_filter",
        // OpenAI accepts this schema in non-strict mode. The Forge endpoint
        // does not reliably support response_format=json_schema, so Forge
        // uses the json_object fallback below instead of receiving a request
        // that is rejected with HTTP 400.
        strict: false,
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
                  visualDifferences: {
                    type: "array",
                    maxItems: 20,
                    items: {
                      type: "object",
                      properties: {
                        field: { type: "string", minLength: 1 },
                        targetObservation: { type: "string", minLength: 1 },
                        candidateObservation: { type: "string", minLength: 1 },
                        impact: { type: "string", minLength: 1 },
                      },
                      required: ["field", "targetObservation", "candidateObservation", "impact"],
                      additionalProperties: false,
                    },
                  },
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
                required: ["candidateIndex", "verdict", "confidence", "rationale", "visualDifferences", "visualEvidence"],
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
    const reviewQueue = prioritizeVisualSourceCandidates(reviewCandidates, targetMetadata, declaredReviews, Boolean(reviewBudget));
    if (reviewBudget) reviewBudget.queuedCount = reviewQueue.length;
    const queuedIndexes = new Set(reviewQueue.map((candidate) => candidate.candidateIndex));
    reviewCandidates.filter((candidate) => !queuedIndexes.has(candidate.candidateIndex))
      .forEach((candidate) => selectAt(candidate.candidateIndex, "adaptive_window_limit"));
    const markUnreachedQueue = (reasonCode: VisualExecutionReasonCode) => reviewQueue.forEach((candidate) => {
      if (!receiptAt(candidate.candidateIndex).attempts.length) selectAt(candidate.candidateIndex, reasonCode);
    });
    const responseFormats = args.visualProvider === "openai"
      ? [strictResponseFormat, { type: "json_object" as const }]
      : [{ type: "json_object" as const }];
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
        markUnreachedQueue("overall_deadline");
        break;
      }
      const batch = window.slice(offset, offset + 4);
      const batchResults = await Promise.all(batch.map(async (candidate) => {
      const content: Array<TextContent | ImageContent> = [
        {
          type: "text",
          text: `You are a strict visual identity reviewer for ${args.sourceLabel}. You are reviewing exactly one candidate. First classify the TARGET and CANDIDATE as graded/slabbed or raw/ungraded from the images. A visible slab, certification label, encapsulation, or grading holder means graded; an exposed item without a slab means raw/ungraded. Graded-versus-raw status is a mandatory identity gate: if the target is graded and the candidate is visibly raw, mark mismatch with high confidence; if the target is raw and the candidate is visibly graded, mark mismatch with high confidence. Do not override this visual decision because the title, series, grade, or price looks similar. If either image is too obscured to determine graded/raw status, use unreadable or low-confidence manual review rather than accepting it. If the candidate title explicitly declares a grader or numeric grade but the primary image appears raw, loose, un-slabbed, or missing its label, this is a grading-evidence conflict: do not finalize a hard mismatch from the primary image alone. Use the additional gallery images and high-detail view to verify the slab, grader, and grade; if they remain unclear or contradictory, return unreadable/manual review. When the target is graded, the candidate numeric or descriptive grade is also mandatory: a holder or grader name alone is not enough. If the candidate grade is not clearly readable or cannot be confirmed to match the target, use unreadable/manual review and state that limitation in the rationale. Before the JSON, list every detected material difference in visualDifferences. Include image-observed differences such as artwork, silhouette, pose, color, packaging, grading holder, label, grade, item form, or readability; include an entry even when the difference is only a soft variant. Use exact observations from the target and candidate images, never vague phrases such as “looks different”. If no difference is detected, return an empty array. Return visualEvidence booleans based only on visible pixels, never on title claims: slabVisible, gradingLabelVisible, graderVisible, numericGradeVisible, gradeMatches, rawOrLooseVisible, characterMatches, artworkMatches, silhouetteMatches, backingCardMatches, setDesignMatches, identityMatches, dateMatches, varietyMatches, mintMarkMatches, and denominationMatches. A graded match requires the first five fields true and rawOrLooseVisible false; otherwise use unreadable/manual review rather than match. If structured target metadata names a grade qualifier, label designation, or comic certification label status, that is also a mandatory identity fact: confirm the same explicit label evidence in the candidate title or images, otherwise use unreadable/manual review rather than infer it. For Video Games, descriptive sealed-label suffixes such as A+, A++, and A+++ are never match criteria and must never cause mismatch or unreadable; ignore those suffixes while still enforcing numeric grade, grader/holder, game identity, platform, artwork, and sealed/CIB/loose form. After that gate, compare the TARGET cover/front image to the CANDIDATE cover/front image. For comics, the same series or character is not enough: the visible cover art, title treatment, issue number, language, edition, printing, and variant must correspond. If the candidate cover art is materially different from the target cover, mark mismatch with high confidence, even if the title, slab, grade, or series appears similar. Candidate title text is evidence: Mexican, foil, reprint, fifth printing, first appearance, variant, sketch, signed, edition, or a different issue are conflicts unless the target metadata explicitly supports them. Do not call a candidate a match merely because it is the same series, slab type, or grade. Use rough_match only when the cover is plausibly the same but cropped, obscured, or low quality. Use unreadable only when the image cannot be inspected.${gradedIdentifierInstruction()}${disneyPinsVisualInstruction(targetMetadata)}${explicitUngradedTargetInstruction(targetMetadata)}${gradedCoinInstruction(targetMetadata)}${coinVisualInstruction(targetMetadata)}${sportsCardSetInstruction(targetMetadata)}${vintageToyPackagingInstruction(targetMetadata)}${vintageToyVisualInstruction(targetMetadata)}${videoGameFormInstruction(targetMetadata)}${videoGameGraderEquivalenceInstruction(targetMetadata)} Return exactly one JSON review for candidate ${candidate.candidateIndex}: {"reviews":[{"candidateIndex":${candidate.candidateIndex},"verdict":"match|rough_match|mismatch|unreadable","confidence":"high|medium|low","rationale":"...","visualDifferences":[{"field":"artwork","targetObservation":"...","candidateObservation":"...","impact":"material identity difference"}],"visualEvidence":{"slabVisible":true,"gradingLabelVisible":true,"graderVisible":true,"numericGradeVisible":true,"gradeMatches":true,"rawOrLooseVisible":false,"characterMatches":true,"artworkMatches":true,"silhouetteMatches":true,"backingCardMatches":true,"setDesignMatches":true,"identityMatches":true,"dateMatches":true,"varietyMatches":true,"mintMarkMatches":true,"denominationMatches":true}}]}. Target metadata: ${targetMetadata}`,
        },
        { type: "text", text: "TARGET LISTING IMAGE:" },
        { type: "image_url", image_url: { url: target, detail: "high" } },
      ];
      const moviesInstruction = moviesVisualInstruction(targetMetadata);
      if (moviesInstruction) content.splice(1, 0, { type: "text", text: moviesInstruction });
      content.push({ type: "text", text: `CANDIDATE ${candidate.candidateIndex}: title=${candidate.item.title ?? "unknown"}` });
      content.push({ type: "image_url", image_url: { url: promoteEbayImageUrl(candidate.imageUrl) ?? candidate.imageUrl, detail: "high" } });
      let text = "";
      let candidateError: unknown;
      let initialResponseAttempt: VisualExecutionAttempt | undefined;
      let initialResponse: unknown;
      for (const responseFormat of responseFormats) {
        const attempt = beginAttempt(candidate.candidateIndex, "initial", responseFormat.type);
        try {
          const response = await invokeVisualReview({ provider: args.visualProvider, model: visualReviewModel(args.visualProvider, "initial"), messages: [{ role: "user", content }], maxCompletionTokens: 3000, temperature: 0, response_format: responseFormat }, VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS);
          const raw = response.choices[0]?.message?.content;
          text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.filter((part): part is TextContent => part.type === "text").map(part => part.text).join("\n") : "";
          attempt.outcome = "no_decision";
          initialResponseAttempt = attempt;
          initialResponse = response;
          if (!text.trim()) Object.assign(attempt, diagnoseVisualResponse({ response, content: text,
            parsedPayload: null, normalizedReviewCount: 0, listingCount: preparedListings.length,
            expectedCandidateIndex: candidate.candidateIndex }));
          if (text.trim()) break;
          throw new Error("The vision model returned no structured content");
        } catch (error) {
          recordVisualExecutionError(attempt, error);
          candidateError = error;
        }
      }
      if (!text.trim()) return { reviews: [] as VisualSourceReview[], error: candidateError };
      const primaryPayload = parseAnalyzerResponse(text);
      const primaryReviews = normalizeSingleCandidateVisualReview(
        primaryPayload,
        preparedListings.length,
        candidate.candidateIndex,
      );
      if (initialResponseAttempt) {
        initialResponseAttempt.outcome = primaryReviews.length ? "usable_review" : "no_decision";
        Object.assign(initialResponseAttempt, diagnoseVisualResponse({ response: initialResponse, content: text,
          parsedPayload: primaryPayload, normalizedReviewCount: primaryReviews.length,
          listingCount: preparedListings.length, expectedCandidateIndex: candidate.candidateIndex }));
      }
      // Reconcile a holder-cropped coin result with an exact completed-sale
      // title before calculating the retry. The reconciliation only unlocks
      // the independent second visual pass; it does not itself admit a sale.
      const reconciledPrimaryReviews = primaryReviews.map((review) => review.candidateIndex === candidate.candidateIndex
        ? reconcileCoinPrimaryReviewForAdjudication(review, targetMetadata, String(candidate.item.title ?? ""))
        : review);
      const primaryReview = reconciledPrimaryReviews.find((review) => review.candidateIndex === candidate.candidateIndex);
      const needsDisneyAdjudication = isDisneyPinsMetadata(targetMetadata) && primaryReview?.verdict === "match";
      const canAttemptThirdDisneyReview = needsDisneyAdjudication
        && primaryReview?.confidence === "high"
        && disneyPinsEvidenceIsExact(primaryReview.visualEvidence, targetMetadata);
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
        provider: args.visualProvider ?? "manus_forge",
        initialModel: visualReviewModel(args.visualProvider, "initial"),
        finalModel: visualReviewModel(args.visualProvider, "initial"),
        initialVerdict: primaryReviews[0]?.verdict ?? "no_decision" as const,
        initialConfidence: primaryReviews[0]?.confidence ?? "no_decision" as const,
        initialRationale: primaryReviews[0]?.rationale,
        decidingRationale: primaryReviews[0]?.rationale,
        normalizations: primaryReview?.visualAudit?.normalizations,
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
        initialEvidence: primaryReviews[0]?.visualEvidence,
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
              text: `INDEPENDENT DISNEY PINS IDENTITY ADJUDICATION: Ignore every preliminary verdict and independently compare exactly two images at high detail: first image is TARGET; second image is CANDIDATE ${candidate.candidateIndex}. Disney Pins have no grading-company, slab, numeric-grade, or raw-versus-graded identity gate. Primary identity is authoritative: character, exact artwork, pose, silhouette, pin shape, colors, visible design details, and pin count/form must correspond. A different primary pin artwork, pose, silhouette, shape, or layout is a high-confidence mismatch. Backing card, backing logo, event/set branding, and packaging are secondary evidence: a generic backing-card or packaging variation alone is a soft difference and must not reject an otherwise exact primary pin match. Treat secondary evidence as a hard conflict only when the target metadata explicitly identifies a backing-card-specific, event-specific, set-specific, or edition-specific release. Return visualEvidence booleans characterMatches, artworkMatches, silhouetteMatches, backingCardMatches, and setDesignMatches; backingCardMatches and setDesignMatches are diagnostic for generic targets, but must be true when the target explicitly requires that secondary release detail. If primary identity or any explicitly required secondary detail is obscured or cannot be independently confirmed, return unreadable/manual review rather than guessing. Return exactly one JSON review for candidate ${candidate.candidateIndex} using the required visualEvidence object. Target metadata: ${targetMetadata}`,
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
      // Ordinary gallery escalation inherits content (and the Movies policy).
      // The independent grading branch rebuilds its prompt, so retain it there too.
      if (moviesInstruction && needsFocusedGradeEscalation && !needsDisneyAdjudication && !needsCoinAdjudication) {
        galleryContent.push({ type: "text", text: moviesInstruction });
      }
      let galleryReviews: VisualSourceReview[] = [];
      let galleryError: unknown;
      let galleryTimedOut = false;
      for (const responseFormat of responseFormats) {
        const attempt = beginAttempt(candidate.candidateIndex, "high_resolution_retry", responseFormat.type);
        try {
          const response = await invokeVisualReview({ provider: args.visualProvider, model: visualReviewModel(args.visualProvider, "retry", needsFocusedGradeEscalation), messages: [{ role: "user", content: galleryContent }], maxCompletionTokens: 3000, reasoning: needsFocusedGradeEscalation ? { effort: "low" } : undefined, temperature: 0, response_format: responseFormat }, VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS);
          const raw = response.choices[0]?.message?.content;
          const galleryText = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.filter((part): part is TextContent => part.type === "text").map(part => part.text).join("\n") : "";
          attempt.outcome = "no_decision";
          if (!galleryText.trim()) Object.assign(attempt, diagnoseVisualResponse({ response, content: galleryText,
            parsedPayload: null, normalizedReviewCount: 0, listingCount: preparedListings.length,
            expectedCandidateIndex: candidate.candidateIndex }));
          if (!galleryText.trim()) throw new Error("The gallery visual review returned no structured content");
          const galleryPayload = parseAnalyzerResponse(galleryText);
          galleryReviews = normalizeSingleCandidateVisualReview(
            galleryPayload,
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
          attempt.outcome = galleryReviews.length ? "usable_review" : "no_decision";
          Object.assign(attempt, diagnoseVisualResponse({ response, content: galleryText,
            parsedPayload: galleryPayload, normalizedReviewCount: galleryReviews.length,
            listingCount: preparedListings.length, expectedCandidateIndex: candidate.candidateIndex }));
          if (galleryReviews.length) break;
          galleryError = new Error("The high-resolution visual-review call returned a structured reply without the required review decision.");
        } catch (error) {
          recordVisualExecutionError(attempt, error);
          galleryError = error;
          if (error instanceof VisualReviewTimeoutError) galleryTimedOut = true;
        }
      }
      let thirdDisneyAttempted = false;
      if (!galleryReviews.length && canAttemptThirdDisneyReview && galleryTimedOut) {
        thirdDisneyAttempted = true;
        const attempt = beginAttempt(candidate.candidateIndex, "disney_third_confirmation", "json_object");
        try {
          const response = await invokeVisualReview({
            provider: args.visualProvider,
            model: visualReviewModel(args.visualProvider, "retry"),
            messages: [{
              role: "user",
              content: [
                ...galleryContent,
                {
                  type: "text",
                  text: "THIRD CONFIRMATION ATTEMPT: The prior independent visual call timed out. Perform one final independent comparison now. Do not reuse the timeout as a decision and do not assume the first result is correct. Return exactly one structured review only after checking all five Disney identity evidence fields.",
                },
              ],
            }],
            maxCompletionTokens: 3000,
            temperature: 0,
            response_format: { type: "json_object" as const },
          }, VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS);
          const raw = response.choices[0]?.message?.content;
          const thirdText = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.filter((part): part is TextContent => part.type === "text").map(part => part.text).join("\n") : "";
          attempt.outcome = "no_decision";
          if (!thirdText.trim()) Object.assign(attempt, diagnoseVisualResponse({ response, content: thirdText,
            parsedPayload: null, normalizedReviewCount: 0, listingCount: preparedListings.length,
            expectedCandidateIndex: candidate.candidateIndex }));
          if (!thirdText.trim()) throw new Error("The third Disney visual confirmation returned no structured content");
          const thirdPayload = parseAnalyzerResponse(thirdText);
          galleryReviews = normalizeSingleCandidateVisualReview(
            thirdPayload,
            preparedListings.length,
            candidate.candidateIndex,
          );
          attempt.outcome = galleryReviews.length ? "usable_review" : "no_decision";
          Object.assign(attempt, diagnoseVisualResponse({ response, content: thirdText,
            parsedPayload: thirdPayload, normalizedReviewCount: galleryReviews.length,
            listingCount: preparedListings.length, expectedCandidateIndex: candidate.candidateIndex }));
          if (!galleryReviews.length) {
            galleryError = new Error("The third Disney visual confirmation returned no usable review decision.");
          }
        } catch (error) {
          recordVisualExecutionError(attempt, error);
          galleryError = error;
          if (error instanceof VisualReviewTimeoutError) galleryTimedOut = true;
        }
      }
      if (!galleryReviews.length) {
        return {
          reviews: reconciledPrimaryReviews.map((review) => review.candidateIndex === candidate.candidateIndex
            ? {
                ...enforceCoinExactEvidence(review, targetMetadata, String(candidate.item.title ?? "")),
                visualAudit: {
                ...initialAudit,
                finalModel: visualReviewModel(args.visualProvider, "retry", needsFocusedGradeEscalation),
                retryStatus: "failed",
                  adjudicationStatus: "unavailable",
                  retryReason: thirdDisneyAttempted
                    ? galleryError instanceof VisualReviewTimeoutError
                      ? "The independent second visual adjudication timed out; the third Disney confirmation attempt also timed out before returning a structured decision."
                      : "The independent second visual adjudication timed out; the third Disney confirmation attempt did not return a usable decision."
                    : galleryError instanceof VisualReviewTimeoutError
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
      const finalReviews = galleryReviews.map((review) => enforceCoinExactEvidence(review, targetMetadata, String(candidate.item.title ?? "")));
      return {
        reviews: finalReviews.map((review) => review.candidateIndex === candidate.candidateIndex
          ? {
              ...review,
              visualAudit: {
                ...initialAudit,
                retryVerdict: galleryReviews[0]?.verdict,
                retryConfidence: galleryReviews[0]?.confidence,
                retryRationale: galleryReviews[0]?.rationale,
                decidingRationale: galleryReviews[0]?.rationale,
                normalizations: [...(initialAudit.normalizations ?? []), ...(review.visualAudit?.normalizations ?? [])],
                finalModel: thirdDisneyAttempted
                  ? visualReviewModel(args.visualProvider, "retry")
                  : visualReviewModel(args.visualProvider, "retry", needsFocusedGradeEscalation),
                adjudicationStatus: needsDisneyAdjudication || needsCoinAdjudication ? (galleryReviews.length ? "confirmed" : "unavailable") : undefined,
                finalPass: galleryReviews.length ? "high_resolution_retry" : "initial",
                ...(thirdDisneyAttempted ? { retryReason: "The independent second visual adjudication timed out; a third Disney confirmation attempt was made." } : {}),
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
      if (!reviewBudget && acceptedMatches >= VISUAL_REVIEW_TARGET_MATCHES) {
        markUnreachedQueue("adaptive_match_target");
        break;
      }
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
      // A returned review is authoritative evidence that this candidate did
      // reach vision. This check must precede score-cap handling because a
      // stale ranking index must never relabel a reviewed match as pre-visual.
      if (reviewedIndexes.has(index)) return { ...displayListing, visualRequirement: "required" } as T;
      if (preVisualScoreExcludedIndexes.has(index)) {
        const occurrenceKey = listing.metadataRanking?.occurrenceKey;
        const scored = occurrenceKey ? preVisualScoreExcludedListings.find((candidate) => candidate.metadataRanking?.occurrenceKey === occurrenceKey) : undefined;
        return {
          ...displayListing,
          metadataMatchScore: scored?.metadataMatchScore,
          metadataMatchReasons: scored?.metadataMatchReasons,
          visualRequirement: "not_required_pre_visual",
          visualReviewStatus: "not_reviewed",
          visualReviewRationale: scored?.visualReviewRationale ?? "Candidate was omitted by the item-type visual-review score cap.",
          evidenceReasons: scored?.evidenceReasons ?? displayListing.evidenceReasons,
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
      return {
        ...displayListing,
        visualRequirement: "required",
        visualReviewStatus: "not_reviewed",
        visualReviewRationale: "Candidate image was not reached by the bounded adaptive review window; manual image review is required.",
        evidenceDisposition: "not_visually_reviewed_window",
      } as T;
	    }).map((listing) => withMetadataFieldComparisons(targetMetadata, listing));
    const applied = applyVisualSourceReviews(
      requirementAnnotatedListings,
      uniqueReviews,
      reviewedCandidateCount,
      { requireExactMatch: isDisneyPinsMetadata(targetMetadata), requireCoinExactMatch: isCoinMetadata(targetMetadata), targetMetadata: targetMetadata, executionReceipts },
    );
    const declaredConflictIndexes = new Set(declaredReviews.map((review) => review.candidateIndex));
    // Ranking indexes can be stale after visual-review rows are merged back
    // into the display shape. A completed Disney adjudication is authoritative
    // and must stay valuation-facing so Mercari annotation can promote it.
    const completedDisneyMatchIndexes = new Set(
      applied.listings.flatMap((listing, index) => isDisneyPinsMetadata(targetMetadata)
        && String(listing.visualReviewStatus ?? '').trim().toLowerCase() === 'match'
        && !preVisualUniversalReasons.has(index)
        && !declaredConflictIndexes.has(index)
        && !preVisualLotReasons.has(index)
        && !imageLessIndexes.has(index)
        ? [index]
        : []),
    );
    const contextIndexes = new Set([...preVisualUniversalReasons.keys(), ...declaredConflictIndexes, ...preVisualLotReasons.keys(), ...preVisualScoreExcludedIndexes, ...imageLessIndexes]);
    for (const index of completedDisneyMatchIndexes) contextIndexes.delete(index);
    const contextListings = applied.listings.filter((_, index) => contextIndexes.has(index));
    const visibleListings = applied.listings.filter((_, index) => !contextIndexes.has(index));
    const completedWithTimeout = timedOutCount > 0 || deadlineReached;
    return finish({
      ...applied,
      listings: visibleListings,
      contextListings,
      preVisualExcludedCount: preVisualContextListings.length,
      removedCount: contextListings.length,
      status: completedWithTimeout ? "completed_with_timeout" : "applied",
      reviews: uniqueReviews,
      timedOutCount,
      deadlineReached,
	      note: `${buildVisualSourceFilterNote(args.sourceLabel, { ...applied, removedCount: contextListings.length })} Adaptive visual review sent ${reviewedCandidateCount} of ${candidates.length} image-bearing candidates in batches of ${VISUAL_REVIEW_BATCH_SIZE}, stopping after ${reviewBudget ? "the bounded selected sold-source queue has been visited" : `${VISUAL_REVIEW_TARGET_MATCHES} accepted visual matches`}, the ${VISUAL_REVIEW_MAX_CANDIDATES}-image maximum, or the ${VISUAL_REVIEW_OVERALL_DEADLINE_MS / 1000}-second overall deadline; ${timedOutCount} candidate${timedOutCount === 1 ? "" : "s"} timed out; ${preVisualUniversalReasons.size} universal duplicate, quantity, state, grade, component, or image-readiness record${preVisualUniversalReasons.size === 1 ? " was" : "s were"} retained as context-only; ${preVisualLotReasons.size} multi-item listing${preVisualLotReasons.size === 1 ? " was" : "s were"} excluded before vision and retained as context-only; ${declaredConflictIndexes.size} other explicit identity conflict${declaredConflictIndexes.size === 1 ? " was" : "s were"} excluded before vision and retained in context for audit.${completedWithTimeout ? " Remaining candidates are retained for manual review and cannot enter valuation implicitly." : ""}`,
    });
  } catch {
	    executionReceipts.forEach((receipt) => {
      // No final attachment survived this catch: retain operations, never
      // reconstruct an identity approval from preliminary response attempts.
      if (receipt.attempts.length) receipt.identity = { result: "manual_unknown", origin: "unknown" };
      else if (receipt.selectedForReview && receipt.reasonCode === "selected_not_dispatched") receipt.reasonCode = "provider_error";
    });
			    const unavailableContextListings = [
      ...preVisualContextListings,
      ...preVisualScoreExcludedListings,
      ...preparedListings.flatMap((listing, index) => imageLessIndexes.has(index) && !preVisualExcludedIndexes.has(index) && !preVisualScoreExcludedIndexes.has(index)
        ? [{
            ...listing,
            ...(rankedItems.get(index) ?? {}),
            visualRequirement: "not_required_pre_visual",
            visualReviewStatus: "not_reviewed",
            visualReviewRationale: "No usable candidate image was supplied; ranked candidate retained as context-only and not sent to visual review.",
            evidenceDisposition: "context_only",
          } as T]
	        : []),
		    ].map((listing) => withMetadataFieldComparisons(targetMetadata, listing));
    return finish({
		      listings: preparedListings.map((listing, index) => reviewCandidates.some((candidate) => candidate.candidateIndex === index)
        ? {
            ...listing,
            ...(rankedItems.get(index) ?? {}),
            visualRequirement: "required",
            visualReviewStatus: "not_reviewed",
            visualReviewRationale: "The visual provider was unavailable; manual image review is required.",
            evidenceDisposition: "warning_review",
          } as T
		        : { ...listing, ...(rankedItems.get(index) ?? {}) }).map((listing) => withMetadataFieldComparisons(targetMetadata, listing)).filter((_, index) => !preVisualExcludedIndexes.has(index) && !preVisualScoreExcludedIndexes.has(index) && !imageLessIndexes.has(index)),
      contextListings: unavailableContextListings,
      preVisualExcludedCount: unavailableContextListings.length,
      status: "provider_unavailable",
      reviewedCount: 0,
      removedCount: unavailableContextListings.length,
      retainedUnreviewedCount: candidates.length,
      reviews: [],
      note: `The ${args.sourceLabel.toLowerCase()} visual filter was unavailable; all eligible text-filtered candidates were retained. ${preVisualContextListings.length} explicit identity or multi-item listing${preVisualContextListings.length === 1 ? " was" : "s were"} excluded before vision and retained as context-only.`,
    });
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
