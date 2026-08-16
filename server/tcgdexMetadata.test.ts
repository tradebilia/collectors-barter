import { describe, expect, it, vi } from 'vitest';
import { lookupTcgDexCatalog } from './tcgdexMetadata';

describe('TCGdex metadata adapter', () => {
  it('returns factual card metadata and deliberately excludes provider pricing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [
        { id: 'base1-4', localId: '4', name: 'Charizard' },
        { id: 'base2-4', localId: '4', name: 'Charizard' },
      ] })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({
        id: 'base1-4', localId: '4', name: 'Charizard', category: 'Pokemon', rarity: 'Rare', hp: 120,
        illustrator: 'Mitsuhiro Arita', types: ['Fire'], stage: 'Stage2',
        set: { id: 'base1', name: 'Base Set' }, variants: { firstEdition: true, holo: true },
        variants_detailed: [{ type: 'holo', subtype: 'shadowless' }],
        legal: { standard: false, expanded: false }, pricing: { tcgplayer: { marketPrice: 999 } },
      }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({
        id: 'base2-4', localId: '4', name: 'Charizard', set: { id: 'base2', name: 'Jungle' }, pricing: { tcgplayer: { marketPrice: 1 } },
      }) });

    const result = await lookupTcgDexCatalog('Pokémon Charizard', { cardNumber: '4', setName: 'Shadowless' }, fetchMock as typeof fetch);

    expect(result.status).toBe('success');
    expect(result.data?.title).toBe('Charizard');
    expect(result.data?.id).toBe('base1-4');
    expect(result.data?.facts).toEqual(expect.arrayContaining([
      { label: 'Card number', value: '4' },
      { label: 'Set', value: 'Base Set' },
      { label: 'Rarity', value: 'Rare' },
      { label: 'Variants', value: 'First edition, Holo' },
    ]));
    expect(result.data?.matchNote).toContain('card number, and variant');
    expect(result.data).not.toHaveProperty('pricing');
    expect(JSON.stringify(result.data)).not.toContain('999');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('name=Charizard');
  });

  it('returns a clear not-found result when no card records match', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    const result = await lookupTcgDexCatalog('No Such Card', {}, fetchMock as typeof fetch);
    expect(result).toMatchObject({ status: 'not_found' });
  });
});
