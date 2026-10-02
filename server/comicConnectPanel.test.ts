import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../client/src/pages/TestAI.tsx', import.meta.url), 'utf8');

describe('ComicConnect identity review panel', () => {
  it('shows match and mismatch counts before records can enter analyzer admission', () => {
    expect(source).toContain('Identity review — what would be eligible for further analyzer review');
    expect(source).toContain('identity match');
    expect(source).toContain('mismatch');
    expect(source).toContain('dated current/extended matches are sent to the analyzer');
  });

  it('shows explicit per-record match and mismatch verdicts with reasons', () => {
    expect(source).toContain('✓ Identity matched — retained for admission review');
    expect(source).toContain('✕ Mismatch —');
    expect(source).toContain('record.exclusionReason');
  });
});
