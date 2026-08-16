import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Smithsonian Test AI UI wiring', () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');

  it('registers Smithsonian as a live stamp-only reference source', () => {
    expect(source).toContain("id: 'smithsonian'");
    expect(source).toContain('Smithsonian Stamp Reference');
    expect(source).toContain("item.category === 'stamps'");
    expect(source).toContain("enabledSources.has('smithsonian')");
    expect(source).toContain('`${item.title} stamp`');
  });
});
