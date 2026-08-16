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

  it('shows TCGdex and IGDB as factual specialist reference sources and keeps RAWG visibly key-and-terms gated', () => {
    expect(source).toContain("label: 'TCGdex Pokémon Catalog'");
    expect(source).toContain("status: 'live' as const");
    expect(source).toContain('Not a price, certification, authenticity, condition, or ownership source');
    expect(source).toContain("label: 'IGDB Video Game Catalog'");
    expect(source).toContain('Commercially approved read-only game identification metadata');
    expect(source).toContain('getIgdbGameMetadata.useQuery');
    expect(source).toContain("label: 'RAWG Video Game Catalog'");
    expect(source).toContain("status: 'requires_key' as const");
    expect(source).toContain('current commercial-use terms are confirmed in writing');
    expect(source).toContain('getRawgProviderStatus.useQuery');
  });
});
