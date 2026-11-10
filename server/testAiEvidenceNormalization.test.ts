import { describe, expect, it } from 'vitest';
import { formatTestAiEvidenceForAnalysis, normalizeTestAiEvidence, summarizeTestAiSourceRunOutcomes } from '../shared/testAiEvidenceNormalization';

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

  it('shows a custom platform instead of the Other selector in evidence review', () => {
    const summary = normalizeTestAiEvidence({
      title: 'Pokemon Silver Version',
      category: 'video_games',
      itemDetails: { gameTitle: 'Pokemon Silver Version', platform: 'Other', customPlatform: 'Game Boy Color' },
    }, []);

    expect(summary.identity).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'platform', value: 'Game Boy Color' }),
    ]));
    expect(summary.identity.some((field) => field.value === 'Other')).toBe(false);
  });

  it('retains completed, historical, and undated 130point records separately', () => {
    const summary = normalizeTestAiEvidence({ title: 'Wayne Gretzky Rookie', category: 'sports_cards' }, [
      { id: 'one_thirty_point', label: '130point', kind: 'market_completed', role: 'valuation_candidate', status: 'success', market: { completedSaleCount: 2, historicalSaleCount: 3, undatedSaleCount: 1 } },
    ]);

    expect(summary.marketEvidence).toEqual(['130point: 2 completed sales, 0 current-window source candidates, 3 historical source candidates, 3 historical records, 1 undated record.']);
    expect(summary.reviewFlags).toHaveLength(0);
    expect(summary.evidenceSufficiency.status).toBe('limited');
    expect(summary.sources[0]?.role).toBe('valuation_candidate');
  });

  it('summarizes only prices submitted to the analyzer', () => {
    const summary = normalizeTestAiEvidence({ title: 'Barry Sanders Rookie', category: 'sports_cards', grade: '10', certificationCompany: 'PSA' }, [
      { id: 'the_card_api', label: 'The Card API Sales', kind: 'market_completed', role: 'valuation_candidate', status: 'success', market: { completedSaleCount: 3, analyzerSubmittedSaleCount: 2, analyzerSubmittedPrices: [100, 300] } },
    ]);

    expect(summary.marketEvidencePriceSummaries).toEqual(['The Card API Sales: source-stage price observations — 2 priced observations · currency/basis unresolved — aggregate not shown; anonymous source observations, not final-price statistics.']);
  });

  it('reports Sirius completed candidates separately from zero analyzer submissions', () => {
    const summary = normalizeTestAiEvidence({ title: '1985 Topps Mark McGwire', category: 'sports_cards', grade: '10', certificationCompany: 'PSA' }, [
      { id: 'sirius_sports_auctions', label: 'Sirius Sports Auctions', kind: 'market_completed', role: 'valuation_candidate', status: 'success', market: { completedSaleCount: 3, analyzerSubmittedSaleCount: 0, analyzerSubmittedPrices: [], historicalSaleCount: 3 } },
    ]);

    expect(summary.marketEvidence).toEqual(['Sirius Sports Auctions: 3 completed sales, 0 source-stage eligible (not request receipts), 0 current-window source candidates, 3 historical source candidates, 3 historical records.']);
    expect(summary.marketEvidencePriceSummaries).toEqual(['Sirius Sports Auctions: source-stage price observations — 0 priced observations · currency/basis unresolved — aggregate not shown; anonymous source observations, not final-price statistics.']);
  });

  it('summarizes every selected source, including non-market sources', () => {
    const summary = normalizeTestAiEvidence({ title: 'Charizard', category: 'pokemon' }, [
      { id: 'sold_comps', label: 'Sold-Comps', kind: 'market_completed', status: 'success', market: { completedSaleCount: 2, analyzerSubmittedSaleCount: 1, analyzerSubmittedPrices: [250] } },
      { id: 'tcgdex', label: 'TCGdex', kind: 'reference', status: 'success' },
      { id: 'psa', label: 'Parse.bot PSA', kind: 'certification', status: 'not_found' },
    ]);

    expect(summary.selectedSourceSummaries).toEqual([
      'Sold-Comps: 2 completed sales, 1 source-stage eligible (not request receipts).',
      'TCGdex: selected reference source; completed-sales and analyzer-price summary not applicable.',
      'Parse.bot PSA: no record returned; returned no record; source/final populations not measured.',
    ]);
  });

  it('keeps current-value and historical-trend matching data in separate summaries', () => {
    const summary = normalizeTestAiEvidence({ title: 'Ken Griffey Jr. Rookie', category: 'sports_cards' }, [
      { id: 'sirius_sports_auctions', label: 'Sirius Sports Auctions', kind: 'market_completed', status: 'success', market: { completedSaleCount: 4, analyzerSubmittedSaleCount: 4, currentValueSaleCount: 1, historicalTrendSaleCount: 3, currentValuePrices: [5000], historicalTrendPrices: [100, 200, 300] } },
    ]);

    expect(summary.marketEvidence).toEqual(['Sirius Sports Auctions: 4 completed sales, 4 source-stage eligible (not request receipts), 1 current-window source candidates, 3 historical source candidates.']);
    expect(summary.marketEvidencePriceSummaries?.[0]).toContain('current-window source candidates: 1 priced observations');
    expect(summary.marketEvidencePriceSummaries?.[0]).toContain('historical source candidates: 3 priced observations');
    expect(summary.sourceDecisions?.[0]).toMatchObject({ completed: 4, accepted: 4, currentValue: 1, historicalTrend: 3, context: 0 });
  });

  it('preserves the exact source records classified for analyzer submission', () => {
    const summary = normalizeTestAiEvidence({ title: 'Certified card', category: 'sports_cards' }, [{
      id: 'the_card_api', label: 'The Card API Sales', kind: 'market_completed', status: 'success',
      market: {
        completedSaleCount: 2,
        analyzerSubmittedSaleCount: 1,
        analyzerSubmittedPrices: [300],
        analyzerRecords: [{ id: 'sale-1', title: 'Certified card PSA 10', price: 300, currency: 'USD', date: '2026-10-01', bucket: 'current_value' }],
      },
    }]);

    expect(summary.sourceDecisions?.[0]?.analyzerRecords).toEqual([expect.objectContaining({ id: 'sale-1', title: 'Certified card PSA 10', price: 300, bucket: 'current_value' })]);
  });

  it('keeps asking listings and non-market sources in context-only buckets', () => {
    const summary = normalizeTestAiEvidence({ title: 'Megatron', category: 'vintage_toys' }, [
      { id: 'ebay_active', label: 'eBay Active Listings', kind: 'market_current', status: 'success', market: { currentListingCount: 20 } },
      { id: 'tcgdex', label: 'Reference Catalog', kind: 'reference', status: 'success' },
    ]);
    expect(summary.sourceDecisions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'eBay Active Listings', accepted: 0, currentValue: 0, historicalTrend: 0, context: 20 }),
      expect.objectContaining({ label: 'Reference Catalog', context: 0 }),
    ]));
  });

  it('classifies identity-matched eBay Active records as current-value evidence', () => {
    const summary = normalizeTestAiEvidence({ title: 'AFA graded collectible', category: 'vintage_toys' }, [{
      id: 'ebay_active', label: 'eBay Active Listings', kind: 'market_current', status: 'success',
      market: {
        returnedRecordCount: 20,
        currentListingCount: 20,
        currentValueSaleCount: 1,
        currentValuePrices: [499],
        analyzerRecords: [{ id: 'active-1', title: 'Matched active listing', price: 499, currency: 'USD', bucket: 'current_value', note: 'Identity-matched active asking price; not a completed sale.' }],
      },
    }]);
    expect(summary.sourceDecisions?.[0]).toMatchObject({ accepted: 0, currentValue: 1, historicalTrend: 0, context: 19, treatment: 'current_value' });
    expect(summary.sourceDecisions?.[0]?.analyzerRecords).toHaveLength(1);
  });

  it('reports current-run returned, sent-to-analyzer, held-out, and timeout outcomes without persistence', () => {
    const summary = normalizeTestAiEvidence({ title: 'High-value collectible', category: 'coins' }, [
      { id: 'sold_comps', label: 'Sold-Comps', kind: 'market_completed', status: 'success', market: { returnedRecordCount: 13, completedSaleCount: 10, analyzerSubmittedSaleCount: 3 } },
      { id: 'ebay_active', label: 'eBay Active Listings', kind: 'market_current', status: 'success', market: { currentListingCount: 2 } },
      { id: 'pricecharting', label: 'PriceCharting', kind: 'market_current', status: 'error', message: 'get_coin_detail timed out while waiting for response headers' },
    ]);

    expect(summarizeTestAiSourceRunOutcomes(summary.sourceDecisions ?? [])).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'sold_comps', returned: 13, accepted: 3, currentValue: 0, historicalTrend: 0, excludedFromValuation: 7, context: 7, timedOut: false }),
      expect.objectContaining({ id: 'ebay_active', returned: 2, accepted: 0, currentValue: 0, historicalTrend: 0, excludedFromValuation: 0, context: 2, timedOut: false }),
      expect.objectContaining({ id: 'pricecharting', returned: 0, accepted: 0, timedOut: true }),
    ]));
  });

  it('counts Autographs market-range evidence as current-value without visual-analyzer transport', () => {
    const summary = normalizeTestAiEvidence({ title: 'Babe Ruth signed baseball', category: 'autographs' }, [{
      id: 'ebay_active',
      label: 'eBay Active Listings',
      kind: 'market_current',
      status: 'success',
      visualAnalysisRequired: false,
      market: {
        returnedRecordCount: 20,
        currentListingCount: 20,
        currentValueSaleCount: 1,
        currentValuePrices: [19500],
      },
    }]);

    const outcome = summarizeTestAiSourceRunOutcomes(summary.sourceDecisions ?? [])[0];
    expect(outcome).toMatchObject({ returned: 20, currentValue: 1, context: 19, visualAnalysisRequired: false });
    expect(outcome?.accepted).toBe(0);
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

  it('treats a US coin denomination of 1 as 1 Dollar and accepts a containing Numista year range', () => {
    const summary = normalizeTestAiEvidence({
      title: '2026 Morgan Dollar',
      category: 'coins',
      itemDetails: { country: 'United States', denomination: '1', year: '2026' },
    }, [
      { id: 'numista', label: 'Numista Coin Catalog', kind: 'reference', status: 'success', fields: { country: 'United States', denomination: '1 Dollar', year: '2021-2026' } },
    ]);

    expect(summary.alignedSources[0]?.fields).toEqual(expect.arrayContaining(['Denomination', 'Year']));
    expect(summary.reviewFlags).toHaveLength(0);
  });

  it('retains a documented Numista grade-band mapping as a separately verified fallback candidate', () => {
    const summary = normalizeTestAiEvidence({
      title: '1903 Morgan Dollar PCGS MS65',
      category: 'coins',
      grade: 'MS65',
      certificationCompany: 'PCGS',
      itemDetails: { country: 'United States', denomination: '$1', year: '1903' },
    }, [{
      id: 'numista',
      label: 'Numista Coin Catalog',
      kind: 'reference',
      status: 'success',
      fields: {
        country: 'United States', denomination: '1 Dollar', year: '1878-1921',
        guideValue: 430, guideGrade: 'UNC', guideSelectedGrade: 'MS65', guideMatchType: 'mapped',
      },
    }]);

    expect(summary.guideAnchors).toEqual([expect.objectContaining({ sourceId: 'numista', value: 430, matchType: 'mapped' })]);
    expect(summary.reviewFlags).toEqual(expect.arrayContaining([expect.objectContaining({
      kind: 'context', sourceId: 'numista', message: expect.stringContaining('must be verified before guide fallback'),
    })]));
    expect(formatTestAiEvidenceForAnalysis(summary, 'ITEM A')).toContain('Numista Coin Catalog');
  });

  it('uses only an exact-grade PriceCharting coin guide as the preferred sale-derived anchor', () => {
    const summary = normalizeTestAiEvidence({
      title: '1903 Morgan Dollar PCGS MS65',
      category: 'coins',
      grade: 'MS-65',
      certificationCompany: 'PCGS',
      itemDetails: { country: 'United States', denomination: '$1', year: '1903', variety: 'Morgan' },
    }, [{
      id: 'pricecharting',
      label: 'PriceCharting',
      kind: 'market_current',
      role: 'valuation_guide',
      status: 'success',
      fields: { guideValue: 1_250, guideGrade: 'MS65', guideSelectedGrade: 'MS65', guideMatchType: 'exact' },
    }]);

    expect(summary.guideAnchors).toEqual([expect.objectContaining({ sourceId: 'pricecharting', value: 1_250, matchType: 'exact' })]);
    expect(summary.sourceDecisions).toEqual(expect.arrayContaining([expect.objectContaining({
      id: 'pricecharting',
      treatment: 'valuation_guide',
      analyzerWeightPct: 0,
      accepted: 0,
    })]));
    expect(summary.reviewFlags).toEqual(expect.arrayContaining([expect.objectContaining({
      kind: 'context', sourceId: 'pricecharting', message: expect.stringContaining('preferred fallback candidate only after server provenance verification'),
    })]));
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

describe('Mercari evidence population diagnostics', () => {
  it('retains the complete mixed listing union without duplicate asking counts or sold-label completion credit', () => {
    const summary = normalizeTestAiEvidence({ title: 'Metroid NES', category: 'video_games' }, [{
      id: 'mercari_sold_comps', label: 'Mercari', kind: 'market_completed', role: 'valuation_candidate', status: 'success',
      market: {
        requestedMode: 'sold', returnedRecordCount: 12, retainedListingCount: 10,
        providerSoldListingCount: 2, activeListingCount: 7, unknownListingCount: 1,
        currentListingCount: 7, completedSaleCount: 0, analyzerSubmittedSaleCount: 0,
        currentValueSaleCount: 0, historicalTrendSaleCount: 0,
      },
    }]);
    expect(summary.sourceDecisions?.[0]).toMatchObject({
      returned: 12, retainedListingCount: 10, providerSoldListingCount: 2, activeListingCount: 7, unknownListingCount: 1,
      completed: 0, accepted: 0, currentValue: 0, historicalTrend: 0, excludedFromValuation: 0,
      context: 10, acceptedPrices: [], treatment: 'context_only',
    });
    expect(summary.evidenceSufficiency).toMatchObject({ completedSaleCount: 0, askingListingCount: 7, historicalRecordCount: 0, status: 'unavailable' });
    expect(summary.sources[0]).toMatchObject({
      role: 'reference_context', requestedMode: 'sold', retainedListingCount: 10,
      providerSoldListingCount: 2, activeListingCount: 7, unknownListingCount: 1,
    });
    expect(summary.sources[0]).not.toHaveProperty('analyzerRecords');
    expect(summary.sources[0]).not.toHaveProperty('returnedRecordCount');
    const marketText = summary.marketEvidence.join(' ');
    expect(marketText).toContain('sold mode requested');
    expect(marketText).toContain('provider returned records: 12');
    expect(marketText).toContain('retained listings: 10');
    expect(marketText).toContain('retained provider-sold listings: 2, active listings: 7, unknown listings: 1');
    expect(marketText).toContain('0 admitted completed-sale credit');
    expect(summary.selectedSourceSummaries).toEqual(summary.marketEvidence);
    expect(formatTestAiEvidenceForAnalysis(summary, 'ITEM A')).toContain(marketText);
    expect(summarizeTestAiSourceRunOutcomes(summary.sourceDecisions ?? [])[0]).toMatchObject({
      returned: 12, returnedRecordCount: 12, retainedListingCount: 10, requestedMode: 'sold',
      providerSoldListingCount: 2, activeListingCount: 7, unknownListingCount: 1, context: 10, completed: 0, accepted: 0,
    });
  });

  it('distinguishes measured zeros from missing measures without manufacturing population labels', () => {
    const summary = normalizeTestAiEvidence({ title: 'Mercari fixture', category: 'vintage_toys' }, [
      { id: 'mercari_sold_comps', label: 'Measured Mercari', kind: 'market_completed', status: 'success', market: {
        requestedMode: 'sold', returnedRecordCount: 0, retainedListingCount: 0,
        providerSoldListingCount: 0, activeListingCount: 0, unknownListingCount: 0,
      } },
      { id: 'mercari_sold_comps', label: 'Unmeasured Mercari', kind: 'market_completed', status: 'idle' },
    ]);
    expect(summary.sourceDecisions?.[0]).toMatchObject({ returned: 0, context: 0, retainedListingCount: 0 });
    expect(summary.marketEvidence[0]).toContain('retained provider-sold listings: 0, active listings: 0, unknown listings: 0');
    const unmeasured = summary.sourceDecisions?.[1];
    expect(unmeasured?.returned).toBeUndefined();
    expect(unmeasured?.context).toBeUndefined();
    expect(unmeasured?.requestedMode).toBeUndefined();
    expect(unmeasured?.returnedRecordCount).toBeUndefined();
    expect(unmeasured?.retainedListingCount).toBeUndefined();
    expect(unmeasured?.providerSoldListingCount).toBeUndefined();
    expect(unmeasured?.activeListingCount).toBeUndefined();
    expect(unmeasured?.unknownListingCount).toBeUndefined();
    expect(summary.marketEvidence[1]).toContain('requested mode not reported');
    expect(summary.marketEvidence[1]).toContain('provider returned records: not measured; retained listings: not measured');
    expect(summary.marketEvidence[1]).toContain('retained provider-sold listings: not measured, active listings: not measured, unknown listings: not measured');
    expect(summary.marketEvidencePriceSummaries?.[1]).toContain('retained context-detail records: not measured');
    expect(summary.sources[1]?.retainedListingCount).toBeUndefined();
    expect(summarizeTestAiSourceRunOutcomes(summary.sourceDecisions ?? [])[1]?.context).toBeUndefined();
  });

  it('uses measured retained totals before returned totals and never infers either from sale-like fields or partition sums', () => {
    const summary = normalizeTestAiEvidence({ title: 'Mercari fixture', category: 'pokemon' }, [
      { id: 'mercari_sold_comps', label: 'Returned only', kind: 'market_completed', status: 'partial', market: {
        returnedRecordCount: 9, providerSoldListingCount: 2, activeListingCount: 3, unknownListingCount: 1,
      } },
      { id: 'mercari_sold_comps', label: 'Retained only', kind: 'market_completed', status: 'success', market: {
        retainedListingCount: 6, providerSoldListingCount: 2, activeListingCount: 3, unknownListingCount: 1,
      } },
      { id: 'mercari_sold_comps', label: 'Partitions only', kind: 'market_completed', status: 'success', market: {
        providerSoldListingCount: 2, activeListingCount: 3, unknownListingCount: 1,
        currentListingCount: 3, completedSaleCount: 100, analyzerSubmittedSaleCount: 100,
      } },
    ]);
    expect(summary.sourceDecisions?.[0]).toMatchObject({ returned: 9, context: 9 });
    expect(summary.sourceDecisions?.[0]?.retainedListingCount).toBeUndefined();
    expect(summary.sourceDecisions?.[1]?.returned).toBeUndefined();
    expect(summary.sourceDecisions?.[1]?.context).toBe(6);
    expect(summary.sourceDecisions?.[2]?.returned).toBeUndefined();
    expect(summary.sourceDecisions?.[2]?.context).toBeUndefined();
    expect(summary.sourceDecisions?.[2]).toMatchObject({ completed: 0, accepted: 0 });
  });

  it.each([null, true, false, '', '4', [], {}, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, Symbol('count')].map((invalid) => ({ invalid })))('rejects malformed typed Mercari population measures ($invalid) without coercion', ({ invalid }) => {
    const market = {
      requestedMode: 'SOLD', returnedRecordCount: invalid, retainedListingCount: invalid,
      providerSoldListingCount: invalid, activeListingCount: invalid, unknownListingCount: invalid,
      currentListingCount: 100, completedSaleCount: 100, analyzerSubmittedSaleCount: 100,
    } as unknown as NonNullable<Parameters<typeof normalizeTestAiEvidence>[1][number]['market']>;
    const summary = normalizeTestAiEvidence({ title: 'Fixture', category: 'coins' }, [{
      id: 'mercari_sold_comps', label: 'Mercari', kind: 'market_completed', status: 'success', market,
    }]);
    const decision = summary.sourceDecisions?.[0];
    expect(decision?.requestedMode).toBeUndefined();
    expect(decision?.returned).toBeUndefined();
    expect(decision?.context).toBeUndefined();
    expect(decision?.returnedRecordCount).toBeUndefined();
    expect(decision?.retainedListingCount).toBeUndefined();
    expect(decision?.providerSoldListingCount).toBeUndefined();
    expect(decision?.activeListingCount).toBeUndefined();
    expect(decision?.unknownListingCount).toBeUndefined();
    expect(decision).toMatchObject({ completed: 0, accepted: 0, currentValue: 0, historicalTrend: 0, acceptedPrices: [] });
    expect(summary.evidenceSufficiency).toMatchObject({ completedSaleCount: 0, askingListingCount: 0, historicalRecordCount: 0 });
    expect(summary.marketEvidence[0]).toContain('retained listings: not measured');
    expect(summary.sources[0]?.retainedListingCount).toBeUndefined();
  });

  it('does not invoke count accessors or favorable numeric conversion hooks', () => {
    let accessorCalls = 0;
    let conversionCalls = 0;
    const market = {
      get returnedRecordCount() { accessorCalls += 1; return 8; },
      retainedListingCount: { valueOf() { conversionCalls += 1; return 8; } },
      get providerSoldListingCount() { accessorCalls += 1; return 8; },
      get activeListingCount() { accessorCalls += 1; return 0; },
      get unknownListingCount() { accessorCalls += 1; return 0; },
      get requestedMode() { accessorCalls += 1; return 'sold'; },
    } as unknown as NonNullable<Parameters<typeof normalizeTestAiEvidence>[1][number]['market']>;
    const summary = normalizeTestAiEvidence({ title: 'Fixture', category: 'coins' }, [{
      id: 'mercari_sold_comps', label: 'Mercari', kind: 'market_completed', status: 'success', market,
    }]);
    expect(accessorCalls).toBe(0);
    expect(conversionCalls).toBe(0);
    expect(summary.sourceDecisions?.[0]?.context).toBeUndefined();
    expect(summary.sourceDecisions?.[0]?.requestedMode).toBeUndefined();
  });

  it('ignores false completed/current/historical credit while retaining unknown-price records as context', () => {
    const records = [
      { id: 'provider-sold', title: 'Provider sold label', price: 40, currency: 'USD', date: '2026-10-01', bucket: 'current_value' as const },
      { id: 'active', title: 'Active asking listing', price: 50, currency: 'USD', bucket: 'current_value' as const },
      { id: 'unknown-priced', title: 'Status unknown listing', price: 60, currency: null, bucket: 'historical_trend' as const, note: 'Unknown status and price basis' },
      { id: 'unknown-price', title: 'Price unavailable listing', price: null, currency: null, date: null, bucket: 'context' as const },
    ];
    const summary = normalizeTestAiEvidence({ title: 'Fixture', category: 'vintage_toys' }, [{
      id: 'mercari_sold_comps', label: 'Mercari', kind: 'market_completed', status: 'success', market: {
        requestedMode: 'active', returnedRecordCount: 4, retainedListingCount: 4,
        providerSoldListingCount: 1, activeListingCount: 1, unknownListingCount: 2,
        completedSaleCount: 99, analyzerSubmittedSaleCount: 99, currentValueSaleCount: 99, historicalTrendSaleCount: 99,
        recentSaleCount: 99, historicalSaleCount: 99, undatedSaleCount: 99,
        analyzerSubmittedPrices: [400, 500], currentValuePrices: [400], historicalTrendPrices: [500], analyzerRecords: records,
      },
    }]);
    expect(summary.sourceDecisions?.[0]).toMatchObject({
      completed: 0, accepted: 0, currentValue: 0, historicalTrend: 0, excludedFromValuation: 0,
      acceptedPrices: [], context: 4, treatment: 'context_only',
    });
    expect(summary.sourceDecisions?.[0]?.analyzerRecords).toEqual(records.map((record) => ({ ...record, bucket: 'context' })));
    expect(records[0]?.bucket).toBe('current_value');
    expect(summary.marketEvidence[0]).toContain('active mode requested');
    expect(summary.marketEvidence[0]).toContain('unknown listings: 2');
    expect(summary.marketEvidence[0]).toContain('unknown-status basis unknown');
    expect(summary.marketEvidencePriceSummaries?.[0]).toContain('retained context-detail records: 4; priced context observations: 3');
    expect(summary.marketEvidencePriceSummaries?.[0]).not.toContain('submitted context records');
    expect(summary.marketEvidencePriceSummaries?.[0]).not.toContain('source candidates');
    expect(summary.evidenceSufficiency).toMatchObject({ completedSaleCount: 0, askingListingCount: 1, historicalRecordCount: 0, status: 'unavailable' });
    expect(summary.evidenceSufficiency.message).toContain('Measured Mercari listings remain context/identity review only');
    expect(formatTestAiEvidenceForAnalysis(summary, 'ITEM B')).toContain('0 admitted completed-sale credit');
  });

  it.each(['success', 'partial', 'error', 'not_found', 'idle'] as const)('preserves measured context and population summaries when retrieval status is %s', (status) => {
    const summary = normalizeTestAiEvidence({ title: 'Fixture', category: 'disney_pins' }, [{
      id: 'mercari_sold_comps', label: 'Mercari', kind: 'market_completed', status,
      message: 'Later lookup timed out; earlier records retained',
      market: {
        requestedMode: 'sold', returnedRecordCount: 10, retainedListingCount: 8,
        providerSoldListingCount: 1, activeListingCount: 5, unknownListingCount: 2,
        analyzerRecords: [{ id: 'known-unknown', title: 'Retained unknown status', price: null, bucket: 'context' }],
      },
    }]);
    expect(summary.sourceDecisions?.[0]).toMatchObject({ returned: 10, context: 8, treatment: 'context_only', accepted: 0, completed: 0 });
    expect(summary.sourceDecisions?.[0]?.analyzerRecords).toHaveLength(1);
    expect(summary.marketEvidence[0]).toContain('retained listings: 8');
    expect(summary.marketEvidence[0]).toContain('unknown listings: 2');
    expect(summary.marketEvidence[0]).toContain(`Retrieval status: ${status}`);
    expect(summary.selectedSourceSummaries?.[0]).toContain('earlier records retained');
    expect(formatTestAiEvidenceForAnalysis(summary, 'ITEM A')).toContain('retained listings: 8');
    expect(summarizeTestAiSourceRunOutcomes(summary.sourceDecisions ?? [])[0]).toMatchObject({ context: 8, completed: 0, timedOut: status === 'error' });
  });

  it('leaves other providers arithmetic and summaries unchanged even with new Mercari-shaped fields present', () => {
    const summary = normalizeTestAiEvidence({ title: 'Fixture', category: 'sports_cards' }, [{
      id: 'sold_comps', label: 'Sold-Comps', kind: 'market_completed', status: 'success', market: {
        requestedMode: 'sold', retainedListingCount: 999, providerSoldListingCount: 999, activeListingCount: 999, unknownListingCount: 999,
        returnedRecordCount: 9, currentListingCount: 3, completedSaleCount: 6,
        analyzerSubmittedSaleCount: 4, currentValueSaleCount: 2, historicalTrendSaleCount: 2, analyzerSubmittedPrices: [100, 200],
      },
    }]);
    expect(summary.sourceDecisions?.[0]).toMatchObject({ returned: 9, completed: 6, accepted: 4, currentValue: 2, historicalTrend: 2, excludedFromValuation: 2, context: 3, acceptedPrices: [100, 200], treatment: 'valuation_candidate' });
    expect(summary.marketEvidence).toEqual(['Sold-Comps: 3 current asking listings, 6 completed sales, 4 source-stage eligible (not request receipts), 2 current-window source candidates, 2 historical source candidates.']);
    expect(summary.sources[0]?.role).toBe('valuation_candidate');
    expect(summary.sources[0]).not.toHaveProperty('retainedListingCount');
    expect(summary.sourceDecisions?.[0]).not.toHaveProperty('providerSoldListingCount');
    expect(summarizeTestAiSourceRunOutcomes(summary.sourceDecisions ?? [])[0]).not.toHaveProperty('requestedMode');
    expect(summary.evidenceSufficiency).toMatchObject({ completedSaleCount: 6, askingListingCount: 3, status: 'sufficient' });
  });
});

describe('reviewed Mercari final narrative bounds', () => {
  it('keeps mandatory population and zero-credit context while bounding verbose duplicated source messages', () => {
    const summary = normalizeTestAiEvidence({ title: 'Fixture', category: 'video_games' }, [{ id: 'mercari_sold_comps',
      label: 'Sold-Comps — Mercari Listings', kind: 'market_historical', status: 'partial', message: 'Long retained-retrieval diagnostic. '.repeat(100),
      market: { requestedMode: 'sold', returnedRecordCount: 4, retainedListingCount: 3, providerSoldListingCount: 1, activeListingCount: 1, unknownListingCount: 1,
        analyzerRecords: [{ title: 'Retained context', price: null, currency: null, date: null, bucket: 'context' }] } }]);
    for (const text of [...summary.marketEvidence, ...(summary.selectedSourceSummaries ?? []), ...(summary.marketEvidencePriceSummaries ?? [])]) expect(text.length).toBeLessThanOrEqual(600);
    expect(summary.marketEvidence[0]).toContain('0 admitted completed-sale credit');
    expect(summary.marketEvidence[0]).toContain('provider returned records: 4');
    expect(summary.marketEvidence[0]).toContain('retained listings: 3');
    expect(summary.marketEvidencePriceSummaries?.[0]).toContain('retained context-detail records: 1');
    expect(summary.marketEvidencePriceSummaries?.[0]).not.toContain('submitted context records');
  });
});
