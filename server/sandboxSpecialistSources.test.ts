import { describe, expect, it } from 'vitest';
import { SANDBOX_SPECIALIST_SOURCES, getSandboxSpecialistSource, isSandboxSpecialistSourceApplicable } from '../shared/sandboxSpecialistSources';
import { CANONICAL_ADAPTER_REGISTRY, sealCanonicalObservation, verifyCanonicalObservation } from './testAiCanonicalObservation';

describe('sandbox specialist source activation', () => {
  it('activates the 15 displayed test sources and excludes HTTP 403-blocked or unapproved sources', () => {
    expect(SANDBOX_SPECIALIST_SOURCES).toHaveLength(20);
    expect(SANDBOX_SPECIALIST_SOURCES.map((source) => source.id)).not.toContain('omega_auctions');
    expect(SANDBOX_SPECIALIST_SOURCES.map((source) => source.id)).not.toContain('propstore');
    expect(SANDBOX_SPECIALIST_SOURCES.map((source) => source.id)).toEqual(expect.arrayContaining(['bertoia', 'hakes', 'lcg', 'coin_archives', 'weiss', 'stephen_album', 'nate_sanders', 'tcgplayer_reef']));
    for (const removed of ['greatcollections', 'university_archives', 'swann', 'heritage', 'rr_auction', 'alexander_historical']) {
      expect(SANDBOX_SPECIALIST_SOURCES.map((source) => source.id)).not.toContain(removed);
      expect(getSandboxSpecialistSource(removed)).toBeNull();
    }
  });

  it('keeps category mapping source-specific', () => {
    const allTradebiliaCategories = ['comics', 'sports_cards', 'vintage_toys', 'video_games', 'stamps', 'coins', 'pokemon', 'movies', 'music', 'autographs', 'disney_pins'];
    for (const category of allTradebiliaCategories) expect(isSandboxSpecialistSourceApplicable('goldin', category), `Goldin should be available for ${category}`).toBe(true);
    for (const category of allTradebiliaCategories) expect(isSandboxSpecialistSourceApplicable('weiss', category), `Weiss should be available for ${category}`).toBe(true);
    expect(isSandboxSpecialistSourceApplicable('rr_auction', 'music')).toBe(false);
    expect(isSandboxSpecialistSourceApplicable('rr_auction', 'coins')).toBe(false);
  });

  it('records the owner-approved USD assumption without hiding unresolved currency cases', () => {
    expect(getSandboxSpecialistSource('ngc')?.currencyPolicy).toBe('usd_inferred_us_route');
    expect(getSandboxSpecialistSource('morphy')?.currencyPolicy).toBe('usd_symbol_context');
    expect(getSandboxSpecialistSource('raritan')?.currencyPolicy).toBe('currency_unresolved');
  });

  it('declares a specific bounded public search contract for every specialist source', () => {
    for (const source of SANDBOX_SPECIALIST_SOURCES) {
      expect(source.searchInstruction.length, `${source.label} needs a visible sandbox instruction`).toBeGreaterThan(30);
      expect(['automatic_title_search', 'public_locator_required', 'price_table_locator_required', 'public_contract_unverified']).toContain(source.searchContract);
    }
    expect(getSandboxSpecialistSource('goldin')?.searchContract).toBe('automatic_title_search');
    expect(getSandboxSpecialistSource('weiss')?.searchContract).toBe('automatic_title_search');
    expect(getSandboxSpecialistSource('morphy')?.searchContract).toBe('public_locator_required');
    expect(getSandboxSpecialistSource('bertoia')?.searchContract).toBe('price_table_locator_required');
  });

  it('has a matching signed canonical adapter for every activated source', () => {
    for (const source of SANDBOX_SPECIALIST_SOURCES) {
      expect(CANONICAL_ADAPTER_REGISTRY[source.id]).toBeDefined();
    }
  });

  it('can sign and verify a specialist observation without admitting unresolved price basis', () => {
    const sealed = sealCanonicalObservation('goldin', {
      title: 'Super Mario 64 Wata 9.8 A++',
      price: 12500,
      currency: 'USD',
      date: '2026-06-01',
      marketplace: 'Goldin',
      sourceId: 'goldin',
      sourceLabel: 'Goldin Auction Results',
      saleId: 'LOT-123',
      url: 'https://goldin.co/lot/123',
      saleStatus: 'completed',
      completedStatusBasis: 'Lot Sold',
      priceBasis: 'unknown',
    }, { signingKey: 'test-specialist-key' });
    expect(sealed.provenanceToken).toBeTruthy();
    const verified = verifyCanonicalObservation({
      title: 'Super Mario 64 Wata 9.8 A++',
      price: 12500,
      currency: 'USD',
      date: '2026-06-01',
      sourceId: 'goldin',
      saleStatus: 'completed',
      priceBasis: 'unknown',
      provenanceToken: sealed.provenanceToken,
    }, { signingKey: 'test-specialist-key' });
    expect(verified.verified).toBe(true);
    expect(verified.provenance?.adapterId).toBe('goldin');
    expect(verified.sale.priceBasis).toBe('unknown');
  });
});
