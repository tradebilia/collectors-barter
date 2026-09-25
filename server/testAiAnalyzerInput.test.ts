import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routerSource = readFileSync(new URL('./testAIRouter.ts', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('../client/src/pages/TestAI.tsx', import.meta.url), 'utf8');

describe('Test AI analyzer input compatibility', () => {
  it('accepts nullable certification metadata for both analyzer items', () => {
    const analyzeBlock = routerSource.slice(routerSource.indexOf('analyzeItems:'));
    expect(analyzeBlock.match(/certificationCompany: z\.string\(\)\.nullish\(\)/g)).toHaveLength(2);
  });

  it('normalizes nullable client certification values before mutation', () => {
    expect(clientSource).toContain('certificationCompany: leftItem.certificationCompany ?? undefined');
    expect(clientSource).toContain('certificationCompany: rightItem.certificationCompany ?? undefined');
  });

  it('exposes an explicit image-review switch for controlled A/B runs', () => {
    expect(routerSource).toContain('useImageAnalyzer: z.boolean().optional().default(true)');
    expect(routerSource).toContain('useImageAnalyzer && isSafeVisionImageUrl(item.imageUrl)');
    expect(clientSource).toContain('Use image analyzer');
    expect(clientSource).toContain('useImageAnalyzer ? leftItem.primaryPhotoUrl : undefined');
  });

  it('requires structured visual output and surfaces provider availability for evaluation', () => {
    expect(routerSource).toContain("model: 'gpt-5-mini'");
    expect(routerSource).toContain('maxCompletionTokens: 1000');
    expect(routerSource).toContain('response_format: VISUAL_IDENTITY_RESPONSE_FORMAT');
    expect(routerSource).toContain('visionDiagnostics');
    expect(routerSource).toContain("responseKind: Array.isArray(visualText) ? 'content_parts' : typeof visualText");
    expect(clientSource).toContain('Vision provider status:');
    expect(clientSource).toContain('Image-Review Impact Check');
  });

  it('supports a separate A/B toggle for temporary visual missing-field context', () => {
    expect(routerSource).toContain('useVisualFieldCompletion: z.boolean().optional().default(false)');
    expect(routerSource).toContain('scanMissingFieldsForAnalysis');
    expect(routerSource).toContain('applyHighConfidenceVisualFields');
    expect(routerSource).toContain('IMAGE-DERIVED MISSING FIELDS — TEMPORARY ANALYSIS CONTEXT ONLY');
    expect(routerSource).toContain('visualFieldCompletionUsed: useVisualFieldCompletion');
    expect(clientSource).toContain('Fill missing fields from image');
    expect(clientSource).toContain('Visual Search Fields Used in This Analysis');
    expect(clientSource).toContain('useVisualFieldCompletion: useImageAnalyzer && useVisualFieldCompletion');
  });

  it('shows comparable acceptance reasons and data-sufficiency checks in the sandbox result', () => {
    expect(clientSource).toContain('Comparable audit · why each sale counted');
    expect(clientSource).toContain('exact or near identity matches');
    expect(clientSource).toContain('P0 identity readiness');
    expect(clientSource).toContain('P0 evidence sufficiency');
    expect(clientSource).toContain('Excluded ·');
    expect(clientSource).toContain("['Identity', profile.identityReadiness === 'ready' && profile.itemIdentificationConfidence !== 'low']");
    expect(clientSource).toContain("['Recent sales', profile.recentSaleCount > 0]");
  });

  it('keeps Pokémon Price Tracker as manually enabled source-attributed context', () => {
    expect(routerSource).toContain('getPokemonPriceTrackerData: protectedProcedure');
    expect(routerSource).toContain('return lookupPokemonPriceTracker(input)');
    expect(clientSource).toContain("id: 'pokemon_price_tracker', label: 'Pokémon Price Tracker', kind: 'reference'");
    expect(clientSource).toContain('do not alter Tradebilia valuation, confidence, or trade verdicts');
  });
});
