import { describe, expect, it } from 'vitest';
import { formatTestAiEvidenceForAnalysis, normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';

describe('normalizeTestAiEvidence', () => {
  it('aligns Pokémon identity fields while keeping market-guide evidence separate', () => {
    const summary = normalizeTestAiEvidence({
      title: 'Pokemon Charizard',
      category: 'pokemon',
      grade: '9',
      certificationCompany: 'PSA',
      itemDetails: { cardName: 'Charizard', setName: 'Base Set', cardNumber: '4', variant: 'Shadowless' },
    }, [
      { id: 'tcgdex', label: 'TCGdex', kind: 'reference', status: 'success', fields: { cardName: 'Charizard', set: 'Base Set', cardNumber: '4', variant: 'Shadowless' } },
      { id: 'pricecharting', label: 'PriceCharting', kind: 'market_current', status: 'success', fields: { cardName: 'Charizard', set: 'Base Set', cardNumber: '4' } },
    ]);

    expect(summary.alignedSources.find((source) => source.id === 'tcgdex')?.fields).toEqual(expect.arrayContaining(['Card name', 'Set', 'Card #', 'Variant']));
    expect(summary.reviewFlags).toHaveLength(0);
    expect(summary.marketEvidence).toHaveLength(0);
    expect(summary.identityReadiness.readiness).toBe('ready');
    expect(summary.sources.find((source) => source.id === 'pricecharting')?.role).toBe('asking_price_context');
  });

  it('flags a material Pokémon card-number mismatch rather than silently treating records as comparable', () => {
    const summary = normalizeTestAiEvidence({
      title: 'Pokemon Charizard',
      category: 'pokemon',
      itemDetails: { cardName: 'Charizard', setName: 'Base Set', cardNumber: '4' },
    }, [
      { id: 'tcgdex', label: 'TCGdex', kind: 'reference', status: 'success', fields: { cardName: 'Charizard', set: 'Base Set', cardNumber: '102' } },
    ]);

    expect(summary.reviewFlags).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'material', field: 'Card #' }),
    ]));
  });

  it('shows a global-versus-listing video-game release year as contextual while accepting the requested platform', () => {
    const summary = normalizeTestAiEvidence({
      title: 'Super Mario Bros. 3',
      category: 'video_games',
      itemDetails: { gameTitle: 'Super Mario Bros. 3', platform: 'NES', releaseYear: '1990' },
    }, [
      { id: 'rawg', label: 'RAWG', kind: 'reference', status: 'success', fields: { title: 'Super Mario Bros 3', platform: 'Nintendo Switch, NES, SNES', globalReleaseYear: '1988' } },
    ]);

    expect(summary.alignedSources[0]?.fields).toEqual(expect.arrayContaining(['Title', 'Platform']));
    expect(summary.reviewFlags).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'context', field: 'Release year' }),
    ]));
    expect(summary.reviewFlags.some((flag) => flag.kind === 'material' && flag.field === 'Platform')).toBe(false);
  });

  it('flags a material platform mismatch for video games', () => {
    const summary = normalizeTestAiEvidence({
      title: 'Super Mario Bros. 3',
      category: 'video_games',
      itemDetails: { platform: 'NES' },
    }, [
      { id: 'igdb', label: 'IGDB', kind: 'reference', status: 'success', fields: { title: 'Super Mario Bros. 3', platform: 'SNES' } },
    ]);

    expect(summary.reviewFlags).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'material', field: 'Platform' }),
    ]));
  });

  it('retains completed, historical, and undated 130point records separately', () => {
    const summary = normalizeTestAiEvidence({ title: 'Wayne Gretzky Rookie', category: 'sports_cards' }, [
      { id: 'one_thirty_point', label: '130point', kind: 'market_completed', role: 'valuation_candidate', status: 'success', market: { completedSaleCount: 2, historicalSaleCount: 3, undatedSaleCount: 1 } },
    ]);

    expect(summary.marketEvidence).toEqual(['130point: 2 completed sales, 3 historical records, 1 undated record.']);
    expect(summary.reviewFlags).toHaveLength(0);
    expect(summary.evidenceSufficiency.status).toBe('limited');
    expect(summary.sources[0]?.role).toBe('valuation_candidate');
  });

  it('summarizes only prices submitted to the analyzer', () => {
    const summary = normalizeTestAiEvidence({ title: 'Barry Sanders Rookie', category: 'sports_cards', grade: '10', certificationCompany: 'PSA' }, [
      { id: 'the_card_api', label: 'The Card API Sales', kind: 'market_completed', role: 'valuation_candidate', status: 'success', market: { completedSaleCount: 3, analyzerSubmittedSaleCount: 2, analyzerSubmittedPrices: [100, 300] } },
    ]);

    expect(summary.marketEvidencePriceSummaries).toEqual(['The Card API Sales: submitted-price summary — 2 sales · average $200 · median $200 · range $100–$300.']);
  });

  it('reports Sirius completed candidates separately from zero analyzer submissions', () => {
    const summary = normalizeTestAiEvidence({ title: '1985 Topps Mark McGwire', category: 'sports_cards', grade: '10', certificationCompany: 'PSA' }, [
      { id: 'sirius_sports_auctions', label: 'Sirius Sports Auctions', kind: 'market_completed', role: 'valuation_candidate', status: 'success', market: { completedSaleCount: 3, analyzerSubmittedSaleCount: 0, analyzerSubmittedPrices: [], historicalSaleCount: 3 } },
    ]);

    expect(summary.marketEvidence).toEqual(['Sirius Sports Auctions: 3 completed sales, 0 submitted to analyzer, 3 historical records.']);
    expect(summary.marketEvidencePriceSummaries).toEqual(['Sirius Sports Auctions: submitted-price summary — 0 sales · no prices submitted to analyzer.']);
  });

  it('summarizes every selected source, including non-market sources', () => {
    const summary = normalizeTestAiEvidence({ title: 'Charizard', category: 'pokemon' }, [
      { id: 'sold_comps', label: 'Sold-Comps', kind: 'market_completed', status: 'success', market: { completedSaleCount: 2, analyzerSubmittedSaleCount: 1, analyzerSubmittedPrices: [250] } },
      { id: 'tcgdex', label: 'TCGdex', kind: 'reference', status: 'success' },
      { id: 'psa', label: 'Parse.bot PSA', kind: 'certification', status: 'not_found' },
    ]);

    expect(summary.selectedSourceSummaries).toEqual([
      'Sold-Comps: 2 completed sales, 1 submitted to analyzer.',
      'TCGdex: selected reference source; completed-sales and analyzer-price summary not applicable.',
      'Parse.bot PSA: no record returned; 0 completed sales and 0 submitted to analyzer.',
    ]);
  });

  it('keeps coin certification evidence attributable and does not create market evidence from a guide value', () => {
    const summary = normalizeTestAiEvidence({
      title: '1923 Peace Dollar',
      category: 'coins',
      grade: '64',
      certificationCompany: 'PCGS',
      itemDetails: { denomination: '$1', year: '1923', mintMark: 'S' },
    }, [
      { id: 'pcgs', label: 'PCGS CoinFacts', kind: 'certification', status: 'success', fields: { denomination: '$1', year: '1923', mintMark: 'S', certificationCompany: 'PCGS', grade: '64' } },
    ]);

    expect(summary.alignedSources[0]?.label).toBe('PCGS CoinFacts');
    expect(summary.marketEvidence).toHaveLength(0);
  });

  it('reports unavailable specialist evidence as coverage rather than a false negative conclusion', () => {
    const summary = normalizeTestAiEvidence({ title: 'Transformers Megatron G1', category: 'vintage_toys', itemDetails: { brand: 'Hasbro', toyName: 'Megatron', year: '1984' } }, [
      { id: 'sold_comps', label: 'Sold-Comps', kind: 'market_completed', status: 'success', market: { completedSaleCount: 3 } },
    ]);

    expect(summary.identity.map((field) => field.label)).toEqual(expect.arrayContaining(['Brand', 'Toy name', 'Year']));
    expect(summary.marketEvidence).toEqual(['Sold-Comps: 3 completed sales.']);
    expect(summary.reviewFlags).toHaveLength(0);
    expect(summary.evidenceSufficiency.status).toBe('sufficient');
    expect(summary.sources[0]?.role).toBe('valuation_candidate');
  });

  it('uses a custom manufacturer or grading company only when the corresponding listing selector is Other', () => {
    const directManufacturer = normalizeTestAiEvidence({
      title: 'Ken Griffey Jr Rookie', category: 'sports_cards', certificationCompany: 'PSA',
      itemDetails: { manufacturer: 'Upper Deck', customManufacturer: 'Incorrect carry-over' },
    }, [{ id: 'psa', label: 'PSA', kind: 'certification', status: 'success', fields: { manufacturer: 'Upper Deck', certificationCompany: 'PSA' } }]);
    const customManufacturer = normalizeTestAiEvidence({
      title: 'Ken Griffey Jr Rookie', category: 'sports_cards', certificationCompany: 'Other',
      itemDetails: { manufacturer: 'Other', customManufacturer: 'Acme Cards', customGradingCompany: 'Custom Grade' },
    }, [{ id: 'custom', label: 'Custom source', kind: 'reference', status: 'success', fields: { manufacturer: 'Acme Cards', certificationCompany: 'Custom Grade' } }]);

    expect(directManufacturer.identity).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'manufacturer', value: 'Upper Deck' })]));
    expect(customManufacturer.identity).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'manufacturer', value: 'Acme Cards' }), expect.objectContaining({ key: 'certificationCompany', value: 'Custom Grade' })]));
  });

  it.each([
    ['comics', { series: 'Amazing Spider-Man', issueNumber: '300', variant: 'Newsstand', publisher: 'Marvel' }, { series: 'Amazing Spider-Man', issueNumber: '300', variant: 'Newsstand' }, ['Series', 'Issue #', 'Variant']],
    ['stamps', { country: 'United States', catalogNumber: '572', denomination: '2¢', issueYear: '1923' }, { catalogNumber: '572', denomination: '2¢', issueYear: '1923' }, ['Catalog #', 'Denomination', 'Issue year']],
    ['movies', { format: 'Blu-ray', edition: 'Steelbook', releaseYear: '2019' }, { title: 'Avengers: Endgame', format: 'Blu-ray', edition: 'Steelbook' }, ['Title', 'Format', 'Edition']],
    ['autographs', { signer: 'Wayne Gretzky', signedItemType: 'Hockey puck', authenticationCompany: 'JSA', certificateNumber: 'AB123' }, { signer: 'Wayne Gretzky', signedItemType: 'Hockey puck', authenticationCompany: 'JSA', certificate: 'AB123' }, ['Signer', 'Signed item', 'Authentication company', 'Certificate']],
    ['disney_pins', { character: 'Mickey Mouse', pinName: 'Mickey 100', series: 'Disney 100', editionSize: '500', pinNumber: 'D100-1' }, { character: 'Mickey Mouse', pinName: 'Mickey 100', series: 'Disney 100', editionSize: '500', pinNumber: 'D100-1' }, ['Character', 'Pin name', 'Series', 'Edition size', 'Pin #']],
  ])('normalizes aligned %s category fields without borrowing unrelated category rules', (category, itemDetails, sourceFields, expectedLabels) => {
    const summary = normalizeTestAiEvidence({ title: category === 'movies' ? 'Avengers: Endgame' : 'Category fixture', category, itemDetails }, [
      { id: `${category}-reference`, label: `${category} reference`, kind: 'reference', status: 'success', fields: sourceFields },
    ]);

    expect(summary.identity.map((field) => field.label)).toEqual(expect.arrayContaining(expectedLabels));
    expect(summary.alignedSources[0]?.fields).toEqual(expect.arrayContaining(expectedLabels));
    expect(summary.reviewFlags).toHaveLength(0);
  });

  it('formats deterministic review context for analysis without converting reference or historical data into a valuation', () => {
    const summary = normalizeTestAiEvidence({ title: 'Super Mario Bros. 3', category: 'video_games', itemDetails: { platform: 'NES', releaseYear: '1990' } }, [
      { id: 'rawg', label: 'RAWG', kind: 'reference', status: 'success', fields: { title: 'Super Mario Bros 3', platform: 'NES', globalReleaseYear: '1988' } },
      { id: 'one_thirty_point', label: '130point', kind: 'market_historical', status: 'success', market: { historicalSaleCount: 2 } },
    ]);

    const context = formatTestAiEvidenceForAnalysis(summary, 'ITEM A');
    expect(context).toContain('global first-release year of 1988');
    expect(context).toContain('2 historical records');
    expect(context).toContain('do not use factual reference metadata as value');
    expect(context).toContain('do not use historical or undated records as current-value averages');
  });
});
