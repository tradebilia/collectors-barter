import { describe, expect, it } from 'vitest';
import { buildSportsCardTestAiCriteria, buildStructuredItemQuery, resolveTestAiGradingCompany, resolveTestAiManufacturer } from '../shared/testAiCriteria';
import { buildMarketplaceSearchDefinition } from '../shared/marketplaceSearchDefinition';

describe('Test AI manufacturer criteria', () => {
  it('uses Custom Manufacturer rather than the Other placeholder', () => {
    expect(resolveTestAiManufacturer({ manufacturer: 'Other', customManufacturer: 'O-Pee-Chee' })).toBe('O-Pee-Chee');
  });

  it('retains the standard manufacturer and safely handles an empty custom value', () => {
    expect(resolveTestAiManufacturer({ manufacturer: 'Topps', customManufacturer: 'Ignored' })).toBe('Topps');
    expect(resolveTestAiManufacturer({ manufacturer: 'Other', customManufacturer: '   ' })).toBe('');
  });

  it('matches the stored Wayne Gretzky listing detail shape', () => {
    expect(resolveTestAiManufacturer({ manufacturer: 'Other', customManufacturer: 'O-Pee-Chee', player: 'Wayne Gretzky' })).toBe('O-Pee-Chee');
  });

  it('builds a sports-card source query with Custom Manufacturer rather than Other', () => {
    expect(buildSportsCardTestAiCriteria({
      year: '1979', manufacturer: 'Other', customManufacturer: 'O-Pee-Chee', player: 'Wayne Gretzky', cardNumber: '18',
    })).toBe('1979 O-Pee-Chee Wayne Gretzky 18');
  });

  it('builds a title-independent structured query from stored fields', () => {
    expect(buildStructuredItemQuery('sports_cards', JSON.stringify({
      year: '1989', manufacturer: 'Upper Deck', player: 'Ken Griffey Jr.', cardNumber: '1', setName: 'Base',
    }), ['PSA', '10.00'])).toBe('1989 Upper Deck Ken Griffey Jr. 1 Base PSA 10.0');
    expect(buildStructuredItemQuery('sports_cards', JSON.stringify({ year: '1989' }))).toBe('1989');
  });

  it('builds a structured coin query from stored coin fields', () => {
    const query = buildStructuredItemQuery('coins', { year: '2026', denomination: '$1', series: 'American Eagle', mintMark: 'W', designation: 'MS' });
    expect(query).toContain('2026');
    expect(query).toContain('$1');
    expect(query).toContain('American Eagle');
    expect(query).toContain('W');
    expect(query).toContain('MS');
  });

  it('adds the default autograph designation before Signed Item identity fields', () => {
    expect(buildStructuredItemQuery('autographs', {
      signer: 'Wayne Gretzky', signedItemType: 'Hockey Puck', autographCategory: 'Sports',
      authenticationCompany: 'JSA', inscriptionText: 'HOF',
    })).toBe('autograph Wayne Gretzky Hockey Puck JSA HOF');
  });

  it('replaces Other with the custom grading-company field', () => {
    const details = { gradingCompany: 'Other', customGradingCompany: 'KSA' };
    expect(resolveTestAiGradingCompany(details, 'Other')).toBe('KSA');
    expect(buildStructuredItemQuery('sports_cards', details, ['Other'])).toContain('KSA');
    expect(buildStructuredItemQuery('sports_cards', details, ['Other'])).not.toContain('Other');
  });

  it('normalizes a two-decimal grade to one decimal in the structured query', () => {
    expect(buildStructuredItemQuery('sports_cards', { year: '1979' }, ['9.00'])).toBe('1979 9.0');
  });

  it('does not append condition when a grading company and grade are present', () => {
    const query = buildStructuredItemQuery('sports_cards', { year: '1979', manufacturer: 'Other', customManufacturer: 'O-Pee-Chee', player: 'Wayne Gretzky', cardNumber: '18' }, ['PSA', '9.00']);
    expect(query).toBe('1979 O-Pee-Chee Wayne Gretzky 18 PSA 9.0');
    expect(query).not.toContain('mint');
  });

  it('uses whole-number grades for PSA in shared structured queries', () => {
    expect(buildStructuredItemQuery('sports_cards', { year: '1989', gradingCompany: 'PSA' }, ['9.00'])).toBe('1989 PSA 9');
  });

  it('omits zero and ungraded values instead of treating them as grades', () => {
    expect(buildStructuredItemQuery('sports_cards', { year: '1985' }, ['0.0', 'mint'])).toBe('1985 mint');
  });

  it('keeps Year first and orders unopened-product fields after Manufacturer', () => {
    expect(buildStructuredItemQuery('sports_cards', {
      year: '2024', manufacturer: 'Topps', sport: 'Hockey', productFormat: 'Box',
      authentication: 'yes', authenticationCompany: 'BBCE', fromSealedCase: 'yes',
    })).toBe('2024 Topps Hockey Box BBCE FASC');
  });

  it('uses one standard definition for Autographs across marketplace providers', () => {
    const definition = buildMarketplaceSearchDefinition({
      title: 'Wayne Gretzky signed puck',
      category: 'autographs',
      itemType: 'signed_item',
      itemDetails: {
        signer: 'Wayne Gretzky',
        signedItemType: 'Hockey Puck',
        autographCategory: 'Sports',
        authenticationCompany: 'JSA',
        inscriptionText: 'HOF',
      },
    });

    expect(definition.query).toBe('autograph Wayne Gretzky Hockey Puck JSA HOF');
    expect(definition.baseQuery).toBe(definition.query);
    expect(definition.fieldsUsed).toEqual(['signer', 'signed item type', 'authentication company', 'inscription']);
    expect(definition.marketContextOnly).toBe(true);
  });

  it('omits cosmetic condition from the primary query for an ungraded Autograph', () => {
    const definition = buildMarketplaceSearchDefinition({
      title: 'Marlon Brando signed paper',
      category: 'autographs',
      itemType: 'signed_paper',
      condition: 'near_mint',
      itemDetails: {
        signer: 'Marlon Brando',
        signedItemType: 'Paper',
        autographCategory: 'Entertainment',
        authenticationCompany: 'East Coast Authenticators',
      },
    });

    expect(definition.query).toBe('autograph Marlon Brando Paper East Coast Authenticators');
    expect(definition.query.toLowerCase()).not.toContain('near_mint');
    expect(definition.fallbackQueries).toEqual([
      'autograph Marlon Brando Paper',
    ]);
    expect(definition.fallbackQueries).not.toContain(definition.query);
  });

  it('retains grade but omits cosmetic condition for a graded Autograph query', () => {
    const definition = buildMarketplaceSearchDefinition({
      title: 'Babe Ruth signed baseball',
      category: 'autographs',
      itemType: 'signed_baseball',
      grade: '9',
      condition: 'near_mint',
      certificationCompany: 'PSA',
      itemDetails: {
        signer: 'Babe Ruth',
        signedItemType: 'Baseball',
        autographCategory: 'Sports',
        authenticationCompany: 'PSA/DNA',
      },
    });

    expect(definition.query).toContain('PSA');
    expect(definition.query).toContain('9');
    expect(definition.query.toLowerCase()).not.toContain('near_mint');
    expect(definition.fallbackQueries).toEqual([
      'autograph Babe Ruth Baseball PSA/DNA',
      'autograph Babe Ruth Baseball',
    ]);
    expect(definition.fallbackQueries).not.toContain(definition.query);
  });

  it('keeps Original Art broad and market-context-only in the shared definition', () => {
    const definition = buildMarketplaceSearchDefinition({
      title: 'Todd McFarlane original art',
      category: 'comics',
      itemType: 'original_art',
      itemDetails: { artistName: 'Todd McFarlane', artworkTitle: 'Spider-Man', artType: 'Comic Book Cover Art' },
    });

    expect(definition.marketContextOnly).toBe(true);
    expect(definition.fallbackQueries.length).toBeGreaterThan(1);
    expect(definition.fieldsUsed).toContain('artist');
  });

  it('anchors a movie query to the title when structured fields contain only metadata', () => {
    const definition = buildMarketplaceSearchDefinition({
      title: 'Disney Hercules (1997) (Blu-ray) NEW',
      category: 'movies',
      itemDetails: { title: '1997', format: 'Blu-ray' },
      condition: 'mint',
    });
    expect(definition.query).toMatch(/^Disney Hercules/);
    expect(definition.query).not.toBe('1997 mint Blu-ray');
  });

  it('omits cosmetic condition from an ungraded movie query', () => {
    const definition = buildMarketplaceSearchDefinition({
      title: 'Disney Hercules (1997) (Blu-ray) NEW',
      category: 'movies',
      itemType: 'individual_movie',
      itemDetails: { title: '1997', format: 'Blu-ray' },
      condition: 'mint',
    });
    expect(definition.query).toContain('Disney Hercules');
    expect(definition.query).toContain('Blu-ray');
    expect(definition.query.toLowerCase()).not.toContain('mint');
    expect(definition.fallbackQueries).toContain('Disney Hercules (1997) (Blu-ray) NEW');
    expect(definition.fallbackQueries).not.toContain(definition.query);
  });

  it('preserves the apostrophe in two-digit Vintage Toys model years', () => {
    const definition = buildMarketplaceSearchDefinition({
      title: "'70 Plymouth AAR Cuda Hot Wheels",
      category: 'vintage_toys',
      itemType: 'individual_vehicle',
      itemDetails: { year: '70', vehicleName: 'Plymouth AAR Cuda', franchise: 'Hot Wheels' },
    });

    expect(definition.query).toBe("'70 Plymouth AAR Cuda Hot Wheels");
    expect(definition.fallbackQueries).not.toContain('70 Plymouth AAR Cuda Hot Wheels');
  });

  it.each([
    'sports_cards', 'comics', 'video_games', 'movies', 'autographs', 'pokemon',
    'vintage_toys', 'disney_pins', 'stamps', 'music', 'coins',
  ])('never uses condition as a search term for %s, including fallbacks', (category) => {
    const definition = buildMarketplaceSearchDefinition({
      title: 'Example Collectible',
      category,
      itemType: 'individual',
      condition: 'near_mint',
      grade: category === 'sports_cards' ? '9' : undefined,
      certificationCompany: category === 'sports_cards' ? 'PSA' : undefined,
      itemDetails: category === 'autographs'
        ? { signer: 'Example Signer', signedItemType: 'Baseball' }
        : category === 'disney_pins'
          ? { character: 'Aurora', pinName: 'Example Collectible' }
          : {},
    });
    const allQueries = [definition.query, definition.baseQuery, ...definition.fallbackQueries];
    expect(allQueries.every((query) => !/\bnear_mint\b/i.test(query))).toBe(true);
  });

  it('omits condition from every Disney Pins marketplace query', () => {
    const definition = buildMarketplaceSearchDefinition({
      title: 'Disney Princess Aurora Designer Collection Pin',
      category: 'disney_pins',
      itemType: 'individual_pin',
      condition: 'mint',
      itemDetails: {
        character: 'Aurora',
        pinName: 'Princess Aurora Designer Collection',
        edition: 'Limited Edition',
      },
    });
    const allQueries = [definition.query, definition.baseQuery, ...definition.fallbackQueries];
    expect(allQueries.length).toBeGreaterThan(0);
    expect(allQueries.every((query) => !/\bmint\b/i.test(query))).toBe(true);
    expect(definition.query).toContain('Aurora');
    expect(definition.query).toContain('Limited Edition');
  });

  it('does not put a zero placeholder grade into a coin query', () => {
    const definition = buildMarketplaceSearchDefinition({
      title: '1982 Mexican coin',
      category: 'coins',
      itemDetails: { year: '1982', country: 'Mexico', denomination: '1', mintMark: 'Mexican Mint' },
      grade: '0.00',
      condition: 'near_mint',
    });
    expect(definition.query).not.toContain('0.00');
  });
});
