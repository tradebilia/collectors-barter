import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('ItemDetail hero title centering', () => {
  it('uses the measured visible-artwork correction instead of the old generic offset', () => {
    const source = readFileSync(resolve(process.cwd(), 'client/src/pages/ItemDetail.tsx'), 'utf8');
    expect(source).toContain('translateX(-4.296875%)');
    expect(source).not.toContain('translateX(-2.34375%)');
  });
});
