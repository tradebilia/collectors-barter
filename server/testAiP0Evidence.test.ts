import { describe, expect, it } from 'vitest';
import { buildP0EvidenceSufficiency, buildTestAiP0Identity, evidenceRoleForSourceKind } from '../shared/testAiP0Evidence';

describe('Test AI P0 evidence contract', () => {
  it('requires category-critical Pokémon identity before market records can be valuation candidates', () => {
    const limited = buildTestAiP0Identity({
      title: 'Charizard', category: 'pokemon', itemType: 'Single Card',
      itemDetails: JSON.stringify({ cardName: 'Charizard', setName: 'Base Set' }),
    });
    const ready = buildTestAiP0Identity({
      title: 'Charizard', category: 'pokemon', itemType: 'Single Card',
      grade: '9', certificationCompany: 'PSA',
      itemDetails: JSON.stringify({ cardName: 'Charizard', setName: 'Base Set', cardNumber: '4', variant: 'Shadowless' }),
    });

    expect(limited.readiness).toBe('limited');
    expect(limited.missingCriticalFields).toEqual(['Card #']);
    expect(ready.readiness).toBe('ready');
  });

  it('keeps raw hinged stamp format identity visible rather than treating a block as a generic stamp', () => {
    const identity = buildTestAiP0Identity({
      title: 'US Scott 572 raw hinged block', category: 'stamps', itemType: 'Stamp Block',
      itemDetails: JSON.stringify({ country: 'United States', scottNumber: '572', issueYear: '1923', hinged: 'Yes' }),
    });

    expect(identity.readiness).toBe('ready');
    expect(identity.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Scott #', value: '572' }),
      expect.objectContaining({ label: 'Hinged', value: 'Yes' }),
    ]));
  });

  it('separates valuation candidates from all contextual evidence roles', () => {
    expect(evidenceRoleForSourceKind('market_completed')).toBe('valuation_candidate');
    expect(evidenceRoleForSourceKind('market_current')).toBe('asking_price_context');
    expect(evidenceRoleForSourceKind('market_historical')).toBe('historical_context');
    expect(evidenceRoleForSourceKind('certification')).toBe('certification_context');
    expect(evidenceRoleForSourceKind('reference')).toBe('reference_context');
  });

  it('requires multiple completed-sale records for a sufficient market-evidence state', () => {
    expect(buildP0EvidenceSufficiency({ completedSaleCount: 0, askingListingCount: 20, historicalRecordCount: 8 }).status).toBe('unavailable');
    expect(buildP0EvidenceSufficiency({ completedSaleCount: 1 }).status).toBe('limited');
    expect(buildP0EvidenceSufficiency({ completedSaleCount: 3 }).status).toBe('sufficient');
  });
});
