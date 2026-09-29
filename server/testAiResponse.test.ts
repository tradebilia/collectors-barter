import { describe, expect, it } from 'vitest';
import { buildDeterministicNarrativeFallback, parseAnalyzerResponse } from './testAiResponse';

describe('Trade Analyzer response parser', () => {
  it('parses a fenced JSON object', () => {
    expect(parseAnalyzerResponse('```json\n{"verdict":"Roughly Equal"}\n```')).toEqual({ verdict: 'Roughly Equal' });
  });

  it('removes a provider-added trailing comma', () => {
    expect(parseAnalyzerResponse('{"verdict":"Roughly Equal",}')).toEqual({ verdict: 'Roughly Equal' });
  });

  it('returns null for truncated or non-object responses', () => {
    expect(parseAnalyzerResponse('{"verdict":"Roughly Equal"')).toBeNull();
    expect(parseAnalyzerResponse('not JSON')).toBeNull();
    expect(parseAnalyzerResponse('[]')).toBeNull();
  });

  it('recovers visual-review payloads with trailing commas', () => {
    const parsed = parseAnalyzerResponse('{"items":[{"label":"ITEM A","identity":"Wayne Gretzky"},],}');
    expect(parsed?.items).toEqual([{ label: 'ITEM A', identity: 'Wayne Gretzky' }]);
  });

  it('returns a schema-compliant non-valuing fallback when narrative generation is unavailable', () => {
    const fallback = buildDeterministicNarrativeFallback({
      leftTitle: 'Item A',
      rightTitle: 'Item B',
      leftEvidenceState: 'sparse_market_evidence',
      rightEvidenceState: 'no_market_evidence',
    });
    expect(fallback.valueSummary).toContain('deterministic market comparison completed');
    expect(fallback.itemAInsights).toContain('sparse market evidence');
    expect(fallback.sourceReferences).toEqual({ itemA: [], itemB: [] });
  });
});
