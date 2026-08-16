import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Wikidata Test AI UI wiring', () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');

  it('registers Wikidata as a live reference source and renders its read-only panel', () => {
    expect(source).toContain("id: 'wikidata'");
    expect(source).toContain("status: 'live' as const");
    expect(source).toContain("enabledSources.has('wikidata')");
    expect(source).toContain('Read-only public metadata for Movies and Autographs');
    expect(source).toContain('details.signer || item.title');
    expect(source).toContain('details.title || details.movieTitle || item.title');
  });
});
