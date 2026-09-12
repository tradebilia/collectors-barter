import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Coming Soon launch signup', () => {
  it('keeps the supplied artwork and places the signup before the category icon row', () => {
    const source = readFileSync(resolve(process.cwd(), 'client/src/pages/ComingSoon.tsx'), 'utf8');
    expect(source).toContain('/manus-storage/coming-soon-exact-supplied-clean-row_d8aa56d4.png');
    expect(source).toContain('aria-label="Tradebilia launch email signup"');
    expect(source).toContain('trpc.launchUpdates.subscribe.useMutation');
    expect(source.indexOf('Tradebilia launch email signup')).toBeLessThan(source.indexOf('Collections on the exchange'));
    expect(source).toContain('Your email for launch updates');
  });
});
