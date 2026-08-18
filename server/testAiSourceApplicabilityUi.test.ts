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

  it('shows TCGdex, IGDB, and user-approved RAWG as factual specialist reference sources', () => {
    expect(source).toContain("label: 'TCGdex Pokémon Catalog'");
    expect(source).toContain("status: 'live' as const");
    expect(source).toContain('Not a price, certification, authenticity, condition, or ownership source');
    expect(source).toContain("label: 'IGDB Video Game Catalog'");
    expect(source).toContain('Commercially approved read-only game identification metadata');
    expect(source).toContain('getIgdbGameMetadata.useQuery');
    expect(source).toContain("label: 'RAWG Video Game Catalog'");
    expect(source).toContain("description: 'User-approved read-only Video Game catalog metadata");
    expect(source).toContain('getRawgGameMetadata.useQuery');
    expect(source).toContain('function RawgSection');
    expect(source).not.toContain('RawgSetupSection');
  });

  it('renders a deterministic evidence review beside the existing provider panels without changing manual source selection', () => {
    expect(source).toContain("from '@shared/testAiEvidenceNormalization'");
    expect(source).toContain('function EvidenceNormalizationSummary');
    expect(source).toContain('Deterministic identity and evidence check. It preserves source facts and does not calculate a value.');
    expect(source).toContain('<EvidenceNormalizationSummary item={item}');
    expect(source).not.toContain('getEligibleTestAiSources');
    expect(source).toContain('setLeftEvidenceSummary(null)');
    expect(source).toContain('setRightEvidenceSummary(null)');
  });
});
