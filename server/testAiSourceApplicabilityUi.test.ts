import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const testAiSource = readFileSync(resolve(process.cwd(), 'client/src/pages/TestAI.tsx'), 'utf8');

describe('Test AI source applicability policy UI boundary', () => {
  it('retains explicit manual source toggles instead of auto-enforcing category eligibility in Test AI', () => {
    expect(testAiSource).toContain('function SourceSelector({ enabled, onChange, side }');
    expect(testAiSource).toContain('onClick={() => toggle(source.id as SourceId)}');
    expect(testAiSource).not.toContain('getSourceApplicability');
  });
});
