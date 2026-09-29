import { z } from 'zod';

export function parseAnalyzerResponse(content: string): Record<string, unknown> | null {
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  for (const candidate of [cleaned, cleaned.replace(/,\s*([}\]])/g, '$1')]) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // Try the next safe normalization. Never execute or evaluate model text.
    }
  }
  return null;
}

const narrativeText = z.string().trim().min(1).max(1_000);
const insightList = z.array(z.string().trim().min(1).max(360)).min(1).max(5);

/**
 * The model explains deterministic records; it does not emit values, verdicts,
 * investment forecasts, or cash amounts. Those are computed server-side.
 */
export const analyzerNarrativeSchema = z.object({
  valueSummary: narrativeText,
  itemAInsights: narrativeText,
  itemBInsights: narrativeText,
  itemAMarketNews: narrativeText,
  itemBMarketNews: narrativeText,
  itemAStrengths: insightList,
  itemARisks: insightList,
  itemBStrengths: insightList,
  itemBRisks: insightList,
  sourceReferences: z.object({
    itemA: z.array(z.string().trim().min(1).max(120)).max(12),
    itemB: z.array(z.string().trim().min(1).max(120)).max(12),
  }),
});

export type AnalyzerNarrative = z.infer<typeof analyzerNarrativeSchema>;

/**
 * Keeps the deterministic analyzer usable when a narrative model is disabled,
 * rate-limited, malformed, or otherwise unavailable. No valuation fact is
 * invented here: this only points the administrator back to server-computed
 * evidence already returned with the analysis.
 */
export function buildDeterministicNarrativeFallback(input: {
  leftTitle: string;
  rightTitle: string;
  leftEvidenceState: string;
  rightEvidenceState: string;
}): AnalyzerNarrative {
  return {
    valueSummary: 'The deterministic market comparison completed, but the narrative AI response was unavailable. Review the server-computed market profiles and evidence ledger below.',
    itemAInsights: `${input.leftTitle}: deterministic evidence is ${input.leftEvidenceState.replace(/_/g, ' ')}. Narrative interpretation was unavailable for this run.`,
    itemBInsights: `${input.rightTitle}: deterministic evidence is ${input.rightEvidenceState.replace(/_/g, ' ')}. Narrative interpretation was unavailable for this run.`,
    itemAMarketNews: 'Narrative AI response unavailable; review the loaded RSS context separately.',
    itemBMarketNews: 'Narrative AI response unavailable; review the loaded RSS context separately.',
    itemAStrengths: ['Server-computed evidence ledger remains available.'],
    itemARisks: ['Narrative AI response unavailable; do not infer additional market claims.'],
    itemBStrengths: ['Server-computed evidence ledger remains available.'],
    itemBRisks: ['Narrative AI response unavailable; do not infer additional market claims.'],
    sourceReferences: { itemA: [], itemB: [] },
  };
}

export const ANALYZER_NARRATIVE_RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'test_ai_evidence_bound_narrative',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        valueSummary: { type: 'string', minLength: 1, maxLength: 1000 },
        itemAInsights: { type: 'string', minLength: 1, maxLength: 1000 },
        itemBInsights: { type: 'string', minLength: 1, maxLength: 1000 },
        itemAMarketNews: { type: 'string', minLength: 1, maxLength: 1000 },
        itemBMarketNews: { type: 'string', minLength: 1, maxLength: 1000 },
        itemAStrengths: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', minLength: 1, maxLength: 360 } },
        itemARisks: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', minLength: 1, maxLength: 360 } },
        itemBStrengths: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', minLength: 1, maxLength: 360 } },
        itemBRisks: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', minLength: 1, maxLength: 360 } },
        sourceReferences: {
          type: 'object',
          properties: {
            itemA: { type: 'array', maxItems: 12, items: { type: 'string', minLength: 1, maxLength: 120 } },
            itemB: { type: 'array', maxItems: 12, items: { type: 'string', minLength: 1, maxLength: 120 } },
          },
          required: ['itemA', 'itemB'],
          additionalProperties: false,
        },
      },
      required: ['valueSummary', 'itemAInsights', 'itemBInsights', 'itemAMarketNews', 'itemBMarketNews', 'itemAStrengths', 'itemARisks', 'itemBStrengths', 'itemBRisks', 'sourceReferences'],
      additionalProperties: false,
    },
  },
};

export function parseEvidenceBoundNarrative(content: string, allowedSourceReferences: string[]): AnalyzerNarrative | null {
  const parsed = parseAnalyzerResponse(content);
  const validated = analyzerNarrativeSchema.safeParse(parsed);
  if (!validated.success) return null;
  const allowed = new Map(allowedSourceReferences.map((source) => [source.trim().toLowerCase(), source.trim()]));
  const filterReferences = (references: string[]) => references
    .map((reference) => allowed.get(reference.trim().toLowerCase()))
    .filter((reference): reference is string => Boolean(reference));
  return {
    ...validated.data,
    sourceReferences: {
      itemA: filterReferences(validated.data.sourceReferences.itemA),
      itemB: filterReferences(validated.data.sourceReferences.itemB),
    },
  };
}
