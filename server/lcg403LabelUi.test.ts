import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('LCG 403 source labeling', () => {
  it('shows a 403 error badge beside LCG in both the source panel and Evidence Review', () => {
    const source = readFileSync('client/src/pages/TestAI.tsx', 'utf8');
    expect(source).toContain("source.id === 'lcg'");
    expect(source).toContain("decision.id === 'lcg'");
    expect(source.match(/403 error/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
