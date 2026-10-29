import { describe, expect, it } from 'vitest';
import { SPORTS_CARDS_SET_FIELDS } from '../client/src/lib/fieldDefinitionsGenerated';
import { ITEM_TYPE_LAYOUTS } from '../client/src/lib/layoutConfigs/itemTypeLayouts';

describe('Sports Cards / Set Factory Sealed field', () => {
  it('defines Factory Sealed as a recommended Yes/No dropdown', () => {
    const field = SPORTS_CARDS_SET_FIELDS.find(item => item.name === 'factorySealed');

    expect(field).toMatchObject({
      name: 'factorySealed',
      label: 'Factory Sealed',
      inputType: 'dropdown',
      requirement: 'recommended',
      dropdownOptions: ['Yes', 'No'],
    });
  });

  it('places Factory Sealed in the Sports Cards / Set Recommended Fields layout', () => {
    const layout = ITEM_TYPE_LAYOUTS.sports_cards_set;
    expect(layout.sections.recommended.fieldLayout.factorySealed).toEqual({
      colSpan: 'half',
      position: 2,
    });
  });
});
