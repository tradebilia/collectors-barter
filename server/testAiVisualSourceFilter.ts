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
    const content: Array<TextContent | ImageContent> = [
      {
        type: "text",
        text: `You are the final visual identity filter for ${args.sourceLabel} market candidates. Compare the target listing image to each numbered candidate. Judge broad identity and object type, not exact photography, and never reject only because of condition, crop, or background. Return JSON only: {"reviews":[{"candidateIndex":0,"verdict":"match|rough_match|mismatch|unreadable","confidence":"high|medium|low","rationale":"..."}]}. A mismatch should be high-confidence only when the candidate is clearly a different object or item type. Target metadata: ${args.targetMetadata}`,
      },
      { type: "text", text: "TARGET LISTING IMAGE:" },
      { type: "image_url", image_url: { url: target, detail: "auto" } },
    ];
    for (const candidate of candidates) {
      content.push({
        type: "text",
        text: `CANDIDATE ${candidate.candidateIndex}: title=${candidate.item.title ?? "unknown"}`,
      });
      content.push({
        type: "image_url",
        image_url: { url: candidate.imageUrl, detail: "auto" },
      });
    }
    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [{ role: "user", content }],
      maxCompletionTokens: 1800,
      temperature: 0,
      response_format: {
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
                    verdict: {
                      type: "string",
                      enum: ["match", "rough_match", "mismatch", "unreadable"],
                    },
                    confidence: {
                      type: "string",
                      enum: ["high", "medium", "low"],
                    },
                    rationale: { type: "string" },
                  },
                  required: [
                    "candidateIndex",
                    "verdict",
                    "confidence",
                    "rationale",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["reviews"],
            additionalProperties: false,
          },
        },
      },
    });
    const raw = response.choices[0]?.message?.content;
    const text =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw)
          ? raw
              .filter((part): part is TextContent => part.type === "text")
              .map(part => part.text)
              .join("\n")
          : "";
    const reviews = normalizeVisualSourceReviews(
      parseAnalyzerResponse(text),
      args.listings.length
    );
    const applied = applyVisualSourceReviews(
      args.listings,
      reviews,
      candidates.length
    );
    return {
      ...applied,
      status: "applied",
      reviews,
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
