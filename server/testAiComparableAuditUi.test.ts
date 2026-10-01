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

  it('renders a simplified recommended trade summary for collectors', () => {
    expect(page).toContain('Recommended Trade Summary · User View');
    expect(page).toContain('Observed accepted-sale range:');
    expect(page).toContain('Typical middle band:');
    expect(page).toContain('Primary median value:');
    expect(page).toContain('recency-weighted diagnostic:');
    expect(page).toContain('Confidence:');
    expect(page).toContain('Confidence basis:');
    expect(page).toContain('Evidence-based');
  });

  it('renders source reliability and evidence coverage explanations', () => {
    expect(page).toContain('Source reliability:');
    expect(page).toContain('Evidence coverage:');
    expect(page).toContain('selected records attributed');
    expect(page).toContain('Source reliability meter');
    expect(page).toContain('Category threshold:');
    expect(page).toContain('Adapter reliability history');
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
