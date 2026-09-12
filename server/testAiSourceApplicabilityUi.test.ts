import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('manual Test AI selector boundary', () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');

  it('retains manual source state while highlighting sources applicable to the loaded item', () => {
    expect(source).toContain('const [leftSources, setLeftSources] = useState<Set<SourceId>>');
    expect(source).toContain('function SourceSelector');
    expect(source).toContain('getEligibleTestAiSources');
    expect(source).toContain('applicableSourceIds');
    expect(source).toContain('border-yellow-400');
    expect(source).toContain('Yellow border = applicable to loaded item');
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
    expect(source).toContain("label: 'Discogs Music Catalog'");
    expect(source).toContain('getDiscogsReleases.useQuery');
    expect(source).toContain('function DiscogsSection');
    expect(source).toContain('not affiliated with, sponsored or endorsed by Discogs');
  });

  it('uses the structured Music release title rather than the listing title for Discogs requests', () => {
    expect(source).toContain('releaseTitle?: string;');
    expect(source).toContain('const releaseTitle = (item.releaseTitle ??');
    expect(source).toContain('releaseTitle,\n    category: item.category');
    expect(source).toContain('enabled: isMusic && releaseTitle.length >= 2');
    expect(source).toContain('The listing title is not used for this lookup.');
    expect(source).toContain('Artist / Performer:</span> {release.artist');
  });

  it('shows the exact Discogs Music search criteria in the Evidence Review', () => {
    expect(source).toContain('const discogsSearchCriteria = useMemo');
    expect(source).toContain('Discogs search criteria');
    expect(source).toContain('Album / Release Title:');
    expect(source).toContain('Artist / Performer:');
    expect(source).toContain('Release Year:');
    expect(source).toContain('If the year returns no candidate, Discogs retries without it.');
    expect(source).toContain('Listing title, format, label, catalog number, and country are not used as filters.');
  });

  it('shows conditional Sports Cards Unopened Product search criteria in Evidence Review', () => {
    expect(source).toContain('sportsUnopenedSearchCriteria');
    expect(source).toContain('Product Name:');
    expect(source).toContain('Product Format:');
    expect(source).toContain('Authentication Company:');
    expect(source).toContain('From a Sealed Case:');
    expect(source).toContain('Authentication Company is included only when Graded is Yes');
    expect(source).toContain('sealed-case criterion is included only when From a Sealed Case is Yes');
  });

  it('keeps selected-item metadata bubbles readable on dark cards', () => {
    expect(source).toContain('text-slate-100 border-slate-500/70');
    expect(source).toContain('bg-slate-900/70 text-[10px] text-slate-100 border-slate-400/80');
  });

  it('passes each loaded item into both source selectors so applicability is evaluated per side', () => {
    expect(source).toContain('side="left" item={leftItem}');
    expect(source).toContain('side="right" item={rightItem}');
    expect(source).toContain('Applicable to the loaded item.');
  });

  it('renders a deterministic evidence review beside the existing provider panels without changing manual source selection', () => {
    expect(source).toContain("from '@shared/testAiEvidenceNormalization'");
    expect(source).toContain('function EvidenceNormalizationSummary');
    expect(source).toContain('Deterministic identity and evidence check. It preserves source facts and does not calculate a value.');
    expect(source).toContain('Evidence Review flag legend');
    expect(source).toContain('a selected source differs on a key identity field. Review before comparing.');
    expect(source).toContain('both facts may be valid, such as global versus regional release dates.');
    expect(source).toContain('no result or service issue; it is not negative proof about the item.');
    expect(source).toContain('<EvidenceNormalizationSummary item={item}');
    expect(source).toContain('getEligibleTestAiSources');
    expect(source).toContain('setLeftEvidenceSummary(null)');
    expect(source).toContain('setRightEvidenceSummary(null)');
  });
});
