import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('manual Test AI selector boundary', () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');

  it('retains manual source state and does not apply the future Trade Room applicability policy to the sandbox selector', () => {
    expect(source).toContain('const [leftSources, setLeftSources] = useState<Set<SourceId>>');
    expect(source).toContain('function SourceSelector');
    expect(source).not.toContain('getEligibleTestAiSources');
  });
});
