import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Coming Soon exact supplied composition', () => {
  it('renders the unchanged supplied SVG and wires only its displayed email controls', () => {
    const page = readFileSync(resolve(process.cwd(), 'client/src/pages/ComingSoon.tsx'), 'utf8');

    expect(page).toContain('/manus-storage/Tradebilia_Hero_Logo_Fully_Opaque_Large_fc0f5b5b.svg');
    expect(page).not.toContain('/manus-storage/pasted_file_wvBASJ_image_bce6bd30.png');
    expect(page).toContain('pointer-events-none');
    expect(page).toContain('aria-label="Tradebilia launch email signup"');
    expect(page).toContain('aspect-[1810/869]');
    expect(page).toContain('top-[65.5%]');
    expect(page).toContain('Notify Me');
    expect(page).toContain('h-auto w-full opacity-90');
    expect(page).toContain('h-[14.25rem] shrink-0');
    expect(page).toContain('bg-[#0b0705]/90');
    expect(page).toContain('aria-label="Tradebilia collector benefits"');
    expect(page).toContain('Discover rare finds');
    expect(page).toContain('Trade with confidence');
    expect(page).toContain('No trading fees');
    expect(page).toContain('Trade across categories');
    expect(page).toContain('Build trust faster');
    expect(page).toContain('Interactive trading platform');
    expect(page).toContain('A.I. assisted trade evaluation');
    expect(page).not.toContain('h-full w-full scale-105 object-cover object-center opacity-35');
    expect(page).not.toContain('h-auto w-full opacity-65');
    expect(page).not.toContain('h-full w-auto max-w-none -translate-x-1/2 opacity-45');
    expect(page.lastIndexOf('Built for collectors')).toBeLessThan(page.indexOf('collectorPhrases.map'));
    expect(page).toContain('subscribeMutation.mutate({ email })');
    expect(page).toContain('Please enter a valid email address.');
    expect(page).toContain('You’re on the launch list.');
    expect(page).toContain('trpc.launchUpdates.subscribe.useMutation');
    expect(page).toContain('type="email"');
    expect(page).toContain('type="submit"');
    expect(page).not.toContain('max-w-[1815px]');
    expect(page).not.toContain('SUPPLIED_TIDBITS');
    expect(page).not.toContain('SuppliedComingSoonLogo');
  });
});
