import { invokeLLM, type ImageContent, type TextContent } from "./_core/llm";
import { parseAnalyzerResponse } from "./testAiResponse";

export type VisualSourceCandidate = {
  title?: string | null;
  imageUrl?: string | null;
  [key: string]: unknown;
};
export type VisualSourceReview = {
  candidateIndex: number;
  verdict: "match" | "rough_match" | "mismatch" | "unreadable";
  confidence: "high" | "medium" | "low";
  rationale: string;
};
export type VisualSourceFilterResult<T extends VisualSourceCandidate> = {
  listings: T[];
  status:
    | "applied"
    | "skipped_no_target_image"
    | "skipped_no_candidate_images"
    | "provider_unavailable";
  reviewedCount: number;
  removedCount: number;
  retainedUnreviewedCount: number;
  reviews: VisualSourceReview[];
  note: string;
};

const VERDICTS = new Set(["match", "rough_match", "mismatch", "unreadable"]);
const CONFIDENCES = new Set(["high", "medium", "low"]);

function safeHttps(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
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
      rationale:
        typeof row?.rationale === "string" ? row.rationale.slice(0, 240) : "",
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
  return listings.flatMap((listing, candidateIndex) => {
    const title = String(listing.title ?? "");
    const conflict = DECLARED_VARIANT_PATTERNS.find((pattern) => pattern.test(title) && !pattern.test(targetTitle));
    if (!conflict) return [];
    const phrase = title.match(conflict)?.[0] ?? "declared variant";
    return [{
      candidateIndex,
      verdict: "mismatch" as const,
      confidence: "high" as const,
      rationale: `Declared identity conflict in marketplace title: ${phrase}. Candidate retained for manual review.`,
    }];
  });
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
    .map((item, candidateIndex) => ({
      item,
      candidateIndex,
      imageUrl: safeHttps(item.imageUrl),
    }))
    .filter(
      (entry): entry is { item: T; candidateIndex: number; imageUrl: string } =>
        !!entry.imageUrl
    )
    .slice(0, 20);
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
                },
                required: ["candidateIndex", "verdict", "confidence", "rationale"],
                additionalProperties: false,
              },
            },
          },
          required: ["reviews"],
          additionalProperties: false,
        },
      },
    } as const;
    const reviews: VisualSourceReview[] = buildDeclaredIdentityReviews(args.listings, args.targetMetadata);
    let completedBatches = 0;
    let lastError: unknown;
    // Review one candidate at a time so the model must inspect that cover and cannot
    // omit a difficult candidate while answering for a batch.
    for (let offset = 0; offset < candidates.length; offset += 1) {
      const batch = candidates.slice(offset, offset + 1);
      const content: Array<TextContent | ImageContent> = [
        {
          type: "text",
          text: `You are a strict visual identity reviewer for ${args.sourceLabel}. You are reviewing exactly one candidate. Compare the TARGET cover/front image to the CANDIDATE cover/front image. For comics, the same series or character is not enough: the visible cover art, title treatment, issue number, language, edition, printing, and variant must correspond. If the candidate cover art is materially different from the target cover, mark mismatch with high confidence, even if the title, slab, grade, or series appears similar. Candidate title text is evidence: Mexican, foil, reprint, fifth printing, first appearance, variant, sketch, signed, edition, or a different issue are conflicts unless the target metadata explicitly supports them. Do not call a candidate a match merely because it is the same series, slab type, or grade. Use rough_match only when the cover is plausibly the same but cropped, obscured, or low quality. Use unreadable only when the image cannot be inspected. Return exactly one JSON review for candidate ${batch[0].candidateIndex}: {"reviews":[{"candidateIndex":${batch[0].candidateIndex},"verdict":"match|rough_match|mismatch|unreadable","confidence":"high|medium|low","rationale":"..."}]}. Target metadata: ${args.targetMetadata}`,
        },
        { type: "text", text: "TARGET LISTING IMAGE:" },
        { type: "image_url", image_url: { url: target, detail: "auto" } },
      ];
      for (const candidate of batch) {
        content.push({ type: "text", text: `CANDIDATE ${candidate.candidateIndex}: title=${candidate.item.title ?? "unknown"}` });
        content.push({ type: "image_url", image_url: { url: candidate.imageUrl, detail: "auto" } });
      }
      let text = "";
      for (const responseFormat of [strictResponseFormat, { type: "json_object" as const }]) {
        try {
          const response = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "user", content }], maxCompletionTokens: 1800, temperature: 0, response_format: responseFormat });
          const raw = response.choices[0]?.message?.content;
          text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.filter((part): part is TextContent => part.type === "text").map(part => part.text).join("\n") : "";
          if (text.trim()) break;
          throw new Error("The vision model returned no structured content");
        } catch (error) {
          lastError = error;
        }
      }
      if (!text.trim()) continue;
      const batchReviews = normalizeVisualSourceReviews(parseAnalyzerResponse(text), args.listings.length);
      reviews.push(...batchReviews);
      completedBatches += 1;
    }
    if (!completedBatches) throw lastError instanceof Error ? lastError : new Error("The vision model returned no structured content");
    const uniqueReviews = reviews.filter((review, index, all) => all.findIndex((other) => other.candidateIndex === review.candidateIndex) === index);
    const reviewByIndex = new Map(uniqueReviews.map((review) => [review.candidateIndex, review]));
    // Never leave an image appearing implicitly accepted because a provider omitted
    // its row. An absent response is explicitly unreadable/needs manual review.
    for (const candidate of candidates) {
      if (!reviewByIndex.has(candidate.candidateIndex)) {
        const fallback: VisualSourceReview = {
          candidateIndex: candidate.candidateIndex,
          verdict: "unreadable",
          confidence: "low",
          rationale: "The visual model returned no usable decision for this candidate; manual image review is required.",
        };
        uniqueReviews.push(fallback);
        reviewByIndex.set(candidate.candidateIndex, fallback);
      }
    }
    const applied = applyVisualSourceReviews(args.listings, uniqueReviews, candidates.length);
    return {
      ...applied,
      status: "applied",
      reviews: uniqueReviews,
      note: buildVisualSourceFilterNote(args.sourceLabel, applied),
    };
  } catch {
    return {
      listings: args.listings,
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
