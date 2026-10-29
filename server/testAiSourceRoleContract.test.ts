import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const routerSource = readFileSync(resolve(projectRoot, 'server/testAIRouter.ts'), 'utf8');
const filterSource = readFileSync(resolve(projectRoot, 'server/testAiVisualSourceFilter.ts'), 'utf8');
const testAiSource = readFileSync(resolve(projectRoot, 'client/src/pages/TestAI.tsx'), 'utf8');

describe('Test AI source-role boundary', () => {
  it('requires the shared visual filter to declare marketplace or eBay scope', () => {
    const calls = [...routerSource.matchAll(/filterVisualSourceCandidates\(\{([\s\S]*?)\n\s*\}\)/g)];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((call) => /sourceRole:\s*['"](?:marketplace|ebay)['"]/.test(call[1]))).toBe(true);
    expect(calls.some((call) => /sourceLabel:\s*['"]eBay/.test(call[1]) && /sourceRole:\s*['"]ebay['"]/.test(call[1]))).toBe(true);
  });

  it('does not allow grading or reference source labels to enter the shared visual filter', () => {
    expect(filterSource).toContain("sourceRole: 'marketplace' | 'ebay'");
    expect(testAiSource).toContain("kind: 'certification'");
    expect(testAiSource).toContain("kind: 'reference'");
    expect(testAiSource).not.toMatch(/sourceLabel:\s*['"][^'\"]*(?:PSA|BGS|SGC|CGC|PCGS|Reference|Catalog)[^'\"]*['"][\s\S]{0,240}filterVisualSourceCandidates/);
  });
});
