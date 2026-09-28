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
    expect(page).toContain('Supported market range:');
    expect(page).toContain('Typical evidence value:');
    expect(page).toContain('Confidence:');
    expect(page).toContain('Evidence-based');
  });
});
