import { describe, expect, it } from 'vitest';
import { VIDEO_GAMES_GAME_FIELDS } from '../client/src/lib/fieldDefinitionsGenerated';
import { video_gamesGameLayout } from '../client/src/lib/layoutConfigs/layouts/video_games_game';

describe('Video Games Game recommended Edition / Version field', () => {
  it('uses the canonical edition key with the requested label and recommended requirement', () => {
    const field = VIDEO_GAMES_GAME_FIELDS.find((candidate) => candidate.name === 'edition');
    expect(field).toMatchObject({
      name: 'edition',
      label: 'Edition / Version',
      inputType: 'text',
      requirement: 'recommended',
    });
  });

  it('places Edition / Version in the recommended section', () => {
    const recommended = video_gamesGameLayout.sections.recommended?.fieldLayout ?? {};
    expect(recommended.edition).toEqual({ colSpan: 'half', position: 3 });
    expect(recommended.edition?.position).toBeLessThan(recommended.upc?.position ?? Infinity);
  });
});
