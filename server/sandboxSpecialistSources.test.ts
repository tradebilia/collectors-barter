import { describe, expect, it } from 'vitest';
import { SANDBOX_SPECIALIST_SOURCES, getSandboxSpecialistSource, isSandboxSpecialistSourceApplicable } from '../shared/sandboxSpecialistSources';
import { CANONICAL_ADAPTER_REGISTRY, sealCanonicalObservation, verifyCanonicalObservation } from './testAiCanonicalObservation';

describe('sandbox specialist source activation', () => {
  it('activates exactly the 15 verified sources and excludes Omega, Heritage, and partial sources', () => {
    expect(SANDBOX_SPECIALIST_SOURCES).toHaveLength(15);
    expect(SANDBOX_SPECIALIST_SOURCES.map((source) => source.id)).not.toContain('omega_auctions');
    expect(SANDBOX_SPECIALIST_SOURCES.map((source) => source.id)).not.toContain('heritage');
    expect(SANDBOX_SPECIALIST_SOURCES.map((source) => source.id)).not.toContain('bertoia');
    expect(SANDBOX_SPECIALIST_SOURCES.map((source) => source.id)).not.toContain('propstore');
    expect(SANDBOX_SPECIALIST_SOURCES.map((source) => source.id)).not.toContain('hakes');
  });

  it('keeps category mapping source-specific', () => {
    expect(isSandboxSpecialistSourceApplicable('goldin', 'video_games')).toBe(true);
    expect(isSandboxSpecialistSourceApplicable('goldin', 'comics')).toBe(false);
    expect(isSandboxSpecialistSourceApplicable('rr_auction', 'music')).toBe(true);
    expect(isSandboxSpecialistSourceApplicable('rr_auction', 'coins')).toBe(false);
  });

  it('records the owner-approved USD assumption without hiding unresolved currency cases', () => {
    expect(getSandboxSpecialistSource('ngc')?.currencyPolicy).toBe('usd_inferred_us_route');
    expect(getSandboxSpecialistSource('morphy')?.currencyPolicy).toBe('usd_symbol_context');
    expect(getSandboxSpecialistSource('raritan')?.currencyPolicy).toBe('currency_unresolved');
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
      sourceLabel: 'Goldin Video Game Auctions',
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
