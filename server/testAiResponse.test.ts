import { describe, expect, it } from 'vitest';
import { parseAnalyzerResponse } from './testAiResponse';

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
});
