import { describe, expect, it } from 'vitest';
import { classifyStampFormat, stampFormatsCompatible } from './stampFormat';

describe('stamp format classification', () => {
  it('distinguishes a single stamp from a raw hinged block', () => {
    const single = classifyStampFormat({ itemType: 'single_stamp', itemDetails: JSON.stringify({ format: 'single stamp', condition: 'MNH' }) });
    const block = classifyStampFormat({ itemType: 'collection_lot', itemDetails: JSON.stringify({ format: 'raw hinged block' }) });
    expect(single.key).toBe('single_unhinged');
    expect(block.key).toBe('hinged_block');
    expect(stampFormatsCompatible(single, block)).toBe(false);
  });

  it('does not mix hinged and never-hinged single stamps', () => {
    const hinged = classifyStampFormat({ itemType: 'single_stamp', itemDetails: JSON.stringify({ condition: 'Mint Hinged' }) });
    const neverHinged = classifyStampFormat({ itemType: 'single_stamp', itemDetails: JSON.stringify({ condition: 'Mint Never Hinged' }) });
    expect(hinged.key).toBe('single_hinged');
    expect(neverHinged.key).toBe('single_unhinged');
    expect(stampFormatsCompatible(hinged, neverHinged)).toBe(false);
  });

  it('keeps format unknown when the listing does not provide enough evidence', () => {
    expect(classifyStampFormat({ title: 'US Scott C1' }).key).toBe('unknown');
    expect(stampFormatsCompatible(classifyStampFormat({ title: 'US Scott C1' }), classifyStampFormat({ itemType: 'single_stamp' }))).toBe(true);
  });
});
