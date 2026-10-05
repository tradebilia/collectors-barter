import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Coming Soon exact supplied composition', () => {
  it('renders the unchanged supplied SVG and wires only its displayed email controls', () => {
    const page = readFileSync(resolve(process.cwd(), 'client/src/pages/ComingSoon.tsx'), 'utf8');

    expect(page).toContain('/manus-storage/Tradebilia_Hero_Logo_Fully_Opaque_Large_fc0f5b5b.svg');
    expect(page).toContain('/manus-storage/pasted_file_wvBASJ_image_bce6bd30.png');
    expect(page).toContain('pointer-events-none');
    expect(page).toContain('aria-label="Tradebilia launch email signup"');
    expect(page).toContain('aspect-[1810/869]');
    expect(page).toContain('top-[65.5%]');
    expect(page).toContain('Notify Me');
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
