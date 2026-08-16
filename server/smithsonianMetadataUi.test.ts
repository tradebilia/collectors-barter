import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Smithsonian Test AI UI wiring', () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');
  it('registers the stamp-only source and discloses its reference-only role', () => {
    expect(source).toContain("id: 'smithsonian'");
    expect(source).toContain("enabledSources.has('smithsonian')");
    expect(source).toContain('National Postal Museum');
    expect(source).toContain('Not a price, certification, or authenticity source');
  });
});
