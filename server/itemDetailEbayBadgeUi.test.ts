import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const itemDetailSource = readFileSync(resolve(process.cwd(), 'client/src/pages/ItemDetail.tsx'), 'utf8');

describe('item-detail eBay badge presentation', () => {
  it('uses the established full eBay integration logo with contained badge dimensions', () => {
    expect(itemDetailSource).toContain('https://assets.tradebilia.com/Ebaylogo_12a10426.png');
    expect(itemDetailSource).toContain('h-4 w-[48px] object-contain');
  });
});
