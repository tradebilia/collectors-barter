import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { annotateSoldComparableCandidate, assessSoldCompsPreVisionCandidates, mercariVideoGameVisualCap, rankMercariVideoGameCandidates, rankVideoGameCandidates, selectMercariVideoGameVisualCandidates, targetVideoGamePackaging } from './testAIRouter';

const routerSource = readFileSync(resolve(import.meta.dirname, './testAIRouter.ts'), 'utf8');
const pageSource = readFileSync(resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');
const sourceOutcomeSource = readFileSync(resolve(import.meta.dirname, '../client/src/components/test-ai/SourceRunOutcomeSummary.tsx'), 'utf8');
const rankingDisplaySource = readFileSync(resolve(import.meta.dirname, '../shared/testAiRankingDisplay.ts'), 'utf8');
const candidateLedgerSource = readFileSync(resolve(import.meta.dirname, '../shared/testAiCandidateLedger.ts'), 'utf8');
const masterListSource = readFileSync(resolve(import.meta.dirname, '../client/src/components/TestAiCandidateMasterList.tsx'), 'utf8');

describe('Mercari Video Game pre-visual filtering', () => {
  it('keeps the title gate opt-in so eBay behavior is not changed by this Mercari scope', () => {
    const result = assessSoldCompsPreVisionCandidates({
      category: 'video_games',
      targetMetadata: 'title=Metroid; category=video_games; fullItemDetails={"platform":"NES"}',
      targetPlatform: 'NES',
      listings: [{ title: 'Met Rosie #40B', price: 3 }],
    });

    expect(result.eligible).toHaveLength(1);
    expect(result.excluded).toHaveLength(0);
  });

  it('routes Mercari Video Game results through the gate and exposes excluded rows separately', () => {
    const start = routerSource.indexOf('getMercariSoldCompsData: protectedProcedure');
    const end = routerSource.indexOf('// SoldComps TCGplayer coverage', start);
    const section = routerSource.slice(start, end);

    expect(section).toContain("if (normalizedCategory === 'video_games')");
    expect(section).toContain('enforceVideoGameTitleMatch: true');
    expect(section).toContain('preVisionExcludedListings');
    expect(section).toContain('const universalPreFilter = await filterVisualSourceCandidates');
    expect(section).toContain('targetImageUrl: safeTargetImage');
    expect(section).toContain('shared universal and item-type ranking pipeline');
    const universalPreparation = section.indexOf('const universalPreFilter = await filterVisualSourceCandidates');
    expect(universalPreparation).toBeGreaterThanOrEqual(0);
    expect(section).not.toContain('rankVideoGameCandidates');
    expect(section).not.toContain('selectVideoGameVisualCandidates');
    expect(sourceOutcomeSource).toContain('<strong>Held out</strong>');
  });

  it('uses the shared Video Game scorer across the marketplace visual-review routes', () => {
    const activeStart = routerSource.indexOf('getEbayData: protectedProcedure');
    const activeEnd = routerSource.indexOf('getSoldCompsData: protectedProcedure', activeStart);
    const activeSection = routerSource.slice(activeStart, activeEnd);
    const soldStart = routerSource.indexOf('getSoldCompsData: protectedProcedure');
    const soldEnd = routerSource.indexOf('getMercariSoldCompsData: protectedProcedure', soldStart);
    const soldSection = routerSource.slice(soldStart, soldEnd);
    const mercariStart = routerSource.indexOf('getMercariSoldCompsData: protectedProcedure');
    const mercariEnd = routerSource.indexOf('// SoldComps TCGplayer coverage', mercariStart);
    const mercariSection = routerSource.slice(mercariStart, mercariEnd);

    expect(activeSection).toContain('filterVisualSourceCandidates');
    expect(activeSection).not.toContain('rankVideoGameCandidates');
    expect(activeSection).not.toContain('selectVideoGameVisualCandidates');
    expect(soldSection).toContain('filterVisualSourceCandidates');
    expect(soldSection).not.toContain('rankVideoGameCandidates');
    expect(soldSection).not.toContain('selectVideoGameVisualCandidates');
    expect(mercariSection).toContain('filterVisualSourceCandidates');
    expect(mercariSection).not.toContain('rankVideoGameCandidates');
    expect(mercariSection).not.toContain('selectVideoGameVisualCandidates');
  });

  it('routes every non-Video-Game Mercari result through shared universal preparation, even without a target image', () => {
    const start = routerSource.indexOf('getMercariSoldCompsData: protectedProcedure');
    const end = routerSource.indexOf('// SoldComps TCGplayer coverage', start);
    const section = routerSource.slice(start, end);

    expect(routerSource).toContain('completed Mercari sales use the same evidence-based analyzer disposition');
    expect(section).toContain('filterVisualSourceCandidates');
    expect(section).toContain("targetImageUrl: safeTargetImage");
    expect(section).toContain("visualReviewRequired: true");
    expect(section).toContain("valuationEligible: valuationEligible.length");
    expect(section).not.toContain("if (!['disney_pins', 'coins'].includes(normalizedCategory) && !input.imageUrl)");
    expect(pageSource).toContain('records can affect valuation after the shared sold-evidence and identity gates.');
  });

  it('orders every ranked candidate-analysis surface by rank before rendering', () => {
    expect(pageSource).toContain("from '@shared/testAiRankingDisplay'");
    expect(pageSource).toContain(`function sortRankedCandidates<T extends Record<string, any>>(listings: T[]): T[] {
  return sortMetadataRankedCandidates(listings);
}`);
    expect(pageSource).toContain(`function sortAnalysisCandidates<T extends Record<string, any>>(listings: T[]): T[] {
  return sortRankedCandidates(listings);
}`);
    expect(rankingDisplaySource).toContain(`      const rankA = validDisplayRank(a.listing.metadataMatchRank) ?? Number.POSITIVE_INFINITY;
      const rankB = validDisplayRank(b.listing.metadataMatchRank) ?? Number.POSITIVE_INFINITY;
      if (rankA !== rankB) return rankA - rankB;
      const scoreA = validScore(a.listing.metadataMatchScore) ?? Number.NEGATIVE_INFINITY;
      const scoreB = validScore(b.listing.metadataMatchScore) ?? Number.NEGATIVE_INFINITY;
      return scoreB - scoreA || a.index - b.index;`);
    expect(pageSource).toContain("import { TestAiCandidateMasterList as CandidateMasterList } from '@/components/TestAiCandidateMasterList';");
    expect(pageSource).toContain("from '@shared/testAiCandidateLedger'");
    expect(pageSource).toContain('const auditLedger = mergeCandidateDisplayGroups([data?.audit?.ledger ?? [], data?.listings ?? [], data?.visualFilter?.contextListings ?? []]);');
    expect(pageSource).toContain('const rankedListings = sortAnalysisCandidates(data?.listings ?? []);');
    expect(pageSource).toContain('sortAnalysisCandidates(data?.preVisionExcludedListings ?? [])');
    expect(pageSource).toMatch(/import \{[^}]*\bcollectEbayCandidateDisplayOccurrences\b[^}]*\} from '@shared\/testAiCandidateLedger';/);
    expect(pageSource).toContain(`  const activeMasterListings = mergeMasterCandidates(
    collectEbayCandidateDisplayOccurrences(displayData),
    displayData?.metadataParentDisplayListings ?? [],
  );`);
    expect(candidateLedgerSource).toContain(`export function collectEbayCandidateDisplayOccurrences(data: CandidateDisplayRow | null | undefined): CandidateDisplayRow[] {
  if (!data) return [];
  const stamp = (group: any) => Array.isArray(group) ? group.map(retainCandidateDisplayOccurrence) : group;
  return collectEbayDisplayCandidates({ ...data, listings: stamp(data.listings), visualReviewListings: stamp(data.visualReviewListings),
    visualFilter: data.visualFilter ? { ...data.visualFilter, listings: stamp(data.visualFilter.listings), contextListings: stamp(data.visualFilter.contextListings) } : undefined,
    preVisionFilter: data.preVisionFilter ? { ...data.preVisionFilter, excludedListings: stamp(data.preVisionFilter.excludedListings) } : undefined });
}`);
    expect(pageSource).toContain('<CandidateMasterList listings={activeMasterListings} sourceLabel="eBay Active Listings" targetImageUrl={item.primaryPhotoUrl} />');
    expect(pageSource).toContain('<CandidateMasterList listings={auditLedger} sourceLabel="eBay Sold History" targetImageUrl={item.primaryPhotoUrl} />');
    expect(pageSource).toContain('<CandidateMasterList listings={mergeMasterCandidates(rankedListings, preVisionExcludedListings)} sourceLabel={`${marketplace} completed sales`} targetImageUrl={item.primaryPhotoUrl} />');
    expect(pageSource).toContain(`function mergeMasterCandidates(...groups: any[][]): any[] {
  return mergeCandidateDisplayGroups(groups);
}`);
    expect(candidateLedgerSource).toContain('return sortMetadataRankedCandidates([...merged.values()]);');
    expect(candidateLedgerSource).toContain('preserveParentDisplayRanking(knownParent, result)');
    expect(masterListSource).toContain('const candidates = reconcileCandidateFinalUse(mergeCandidateDisplayGroups([listings], scope), context.outcome, scope);');
    expect(masterListSource).toContain('candidates.map((listing, index)');
    expect(masterListSource).toContain('<MetadataComparisonTable listing={listing} />');
    expect(masterListSource).toContain('<TestAiCandidateStatus listing={listing} scope={scope} reconciled />');
    expect(pageSource).toContain('{rankedListings.map((l: any, i: number) => (');
    expect(pageSource).toContain('{rankedListings.map((listing: any, index: number) => (');
  });

  it('promotes a confirmed Mercari Video Game visual match to analyzer eligibility', () => {
    const annotated = annotateSoldComparableCandidate({
      title: 'Metroid - NES CIB',
      soldPrice: 112,
      soldCurrency: 'USD',
      saleStatus: 'completed',
      priceBasis: 'sold',
      visualReviewStatus: 'match',
      visualReviewRationale: 'Complete-in-box Metroid NES matches the target.',
    }, {
      category: 'video_games',
      targetItemType: 'single',
      certificationCompany: '',
      targetGrade: null,
      targetNumber: null,
      targetPlayer: null,
      visualReviewRequired: true,
    });

    expect(annotated.evidenceDisposition).toBe('valuation_eligible');
    expect(annotated.visualReviewStatus).toBe('match');
  });

  it('ranks Complete In Box/CIB candidates ahead of candidates with unknown form', () => {
    expect(targetVideoGamePackaging({ completeInBox: 'Yes' })).toBe('cib');
    expect(targetVideoGamePackaging({ sealed: 'yes' })).toBe('sealed');
    const ranked = rankMercariVideoGameCandidates({
      targetGameTitle: 'Metroid',
      targetPlatform: 'NES',
      targetPackaging: targetVideoGamePackaging({ completeInBox: 'Yes' }),
      listings: [
        { title: 'Metroid NES' },
        { title: 'Metroid NES CIB', itemSpecifics: [{ name: 'Completeness', value: 'Complete in Box' }] },
        { title: 'Metroid NES Loose Cartridge' },
      ],
    });

    expect(ranked.map((item) => item.title)).toEqual([
      'Metroid NES CIB',
      'Metroid NES',
      'Metroid NES Loose Cartridge',
    ]);
    expect(ranked[0].metadataMatchReasons).toContain('Complete in Box/CIB form matches');
    expect(ranked[1].metadataMatchReasons).toContain('packaging form not stated by candidate');
  });

  it('produces the same ranking when the shared scorer receives an equivalent non-Mercari source listing', () => {
    const listings = [
      { title: 'Metroid NES' },
      { title: 'Metroid NES CIB', itemSpecifics: [{ name: 'Completeness', value: 'Complete in Box' }] },
    ];
    const args = {
      targetGameTitle: 'Metroid',
      targetPlatform: 'NES',
      targetPackaging: targetVideoGamePackaging({ completeInBox: 'Yes' }),
      listings,
    };
    expect(rankVideoGameCandidates(args).map((item) => item.title))
      .toEqual(rankMercariVideoGameCandidates(args).map((item) => item.title));
  });

  it('uses the confirmed score bands and never fills the cap with sub-50 candidates', () => {
    expect(mercariVideoGameVisualCap(95)).toBe(6);
    expect(mercariVideoGameVisualCap(85)).toBe(5);
    expect(mercariVideoGameVisualCap(70)).toBe(3);
    expect(mercariVideoGameVisualCap(60)).toBe(3);
    expect(mercariVideoGameVisualCap(50)).toBe(2);
    expect(mercariVideoGameVisualCap(49)).toBe(0);

    const admission = selectMercariVideoGameVisualCandidates([
      { title: 'A', itemUrl: 'a', metadataMatchScore: 62 },
      { title: 'B', itemUrl: 'b', metadataMatchScore: 60 },
      { title: 'C', itemUrl: 'c', metadataMatchScore: 55 },
      { title: 'D', itemUrl: 'd', metadataMatchScore: 49 },
    ]);
    expect(admission.cap).toBe(3);
    expect(admission.selected.map((item) => item.title)).toEqual(['A', 'B', 'C']);
    expect(admission.excluded[0].visualReviewRationale).toContain('below the Video Game visual-review minimum of 50');
  });
});
