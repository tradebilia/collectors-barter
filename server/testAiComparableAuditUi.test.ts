import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const page = readFileSync(resolve(process.cwd(), 'client/src/pages/TestAI.tsx'), 'utf8');

describe('Test AI comparable audit ledger UI', () => {
  it('exposes every returned comparable with an explicit valuation-use explanation', () => {
    expect(page).toContain('Full valuation-use ledger');
    expect(page).toContain('Used in direct valuation');
    expect(page).toContain('Secondary evidence only');
    expect(page).toContain('Matched but omitted by source-balanced cap');
    expect(page).toContain('Category gate:');
    expect(page).toContain('completed-sale, identity, and source-balanced selection rules');
  });

  it('renders the deterministic range-first decision rationale', () => {
    expect(page).toContain('Range-first decision:');
    expect(page).toContain('Shared band:');
    expect(page).toContain('Range gap:');
  });

  it('renders one concise final valuation summary for collectors', () => {
    expect(page).toContain('Final valuation summary');
    expect(page).toContain('Estimated market range');
    expect(page).toContain('Where pricing goes:');
    expect(page).toContain('sent to valuation');
    expect(page).toContain('Completed sales control the valuation.');
  });

  it('keeps the technical evidence audit separate from the final conclusion', () => {
    expect(page).toContain('Trade Analyzer 2.0 · Deterministic Evidence Layer');
    expect(page).toContain('Range-first decision:');
    expect(page).toContain('Evidence:');
    expect(page).toContain('Confidence:');
  });

  it('shows ReefAPI history controls and per-run request usage without presenting it as billing', () => {
    expect(page).toContain('History window');
    expect(page).toContain('Recent · last 12 months');
    expect(page).toContain('Historical · older than 12 months');
    expect(page).toContain('ReefAPI usage for this run');
    expect(page).toContain('Detail calls:');
    expect(page).toContain('Estimated credits:');
    expect(page).toContain('it is not a billing statement');
  });
});
