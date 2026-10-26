import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { annotateSoldComparableCandidate, assessSoldCompsPreVisionCandidates, mercariVideoGameVisualCap, rankMercariVideoGameCandidates, selectMercariVideoGameVisualCandidates, targetVideoGamePackaging } from './testAIRouter';

const routerSource = readFileSync(resolve(import.meta.dirname, './testAIRouter.ts'), 'utf8');
const pageSource = readFileSync(resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');

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
    expect(section).toContain('selectMercariVideoGameVisualCandidates');
    expect(section).toContain('minimum metadata score of 50');
    expect(section).toContain('Score-band cap for this result set');
    expect(pageSource).toContain('Excluded before visual review');
  });

  it('does not blanket-mark non-Video-Game Mercari sold records as context-only', () => {
    const start = routerSource.indexOf('getMercariSoldCompsData: protectedProcedure');
    const end = routerSource.indexOf('// SoldComps TCGplayer coverage', start);
    const section = routerSource.slice(start, end);

    expect(routerSource).toContain('completed Mercari sales use the same evidence-based analyzer disposition');
    expect(section).toContain('annotateSoldComparableCandidate');
    expect(section).toContain("visualReviewRequired: false");
    expect(section).toContain("valuationEligible: valuationEligible.length");
    expect(section).not.toContain("if (!['disney_pins', 'coins'].includes(normalizedCategory)) return result;");
    expect(pageSource).toContain('records can affect valuation after the shared sold-evidence and identity gates.');
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
    expect(admission.excluded[0].visualReviewRationale).toContain('below the Mercari Video Game visual-review minimum of 50');
  });
});
