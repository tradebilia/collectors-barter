import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const router = readFileSync(resolve(process.cwd(), 'server/testAIRouter.ts'), 'utf8');
const evidence = readFileSync(resolve(process.cwd(), 'server/testAiMarketEvidence.ts'), 'utf8');
const engine = readFileSync(resolve(process.cwd(), 'server/testAiComparableEngine.ts'), 'utf8');

describe('Analyzer 2.9 architecture boundaries', () => {
  it('keeps the generic acquisition orchestrator outside the Test AI valuation path', () => {
    expect(router).not.toContain("marketDataOrchestrator");
    expect(router).toContain('normalizeAnalysisMarketSales');
    expect(router).toContain('buildAnalysisSnapshot');
  });

  it('requires server-signed canonical observations before client-carried records can affect value', () => {
    expect(evidence).toContain('verifyCanonicalObservation');
    expect(evidence).toContain('server provenance is not verified');
    expect(evidence).toContain("currency !== 'USD'");
  });

  it('uses post-policy accepted sales for deterministic value rather than aggregate provider statistics', () => {
    expect(engine).toContain('const primaryValue = median');
    expect(engine).toContain('const acceptedPrices = accepted.map');
    expect(engine).toContain('marketplaceConcentration');
  });
});
