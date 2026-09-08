import { describe, expect, it } from 'vitest';
import { CATEGORY_ITEM_TYPES } from '../client/src/lib/fieldDefinitionsRemaining';
import { VINTAGE_TOYS_LEGO_FIELDS } from '../client/src/lib/fieldDefinitionsLego';
import { ITEM_TYPE_LAYOUTS } from '../client/src/lib/layoutConfigs/itemTypeLayouts';

describe('Vintage Toys LEGO item type', () => {
  it('registers LEGO in the Vintage Toys item-type map', () => {
    expect(CATEGORY_ITEM_TYPES.vintage_toys.lego).toBe(VINTAGE_TOYS_LEGO_FIELDS);
    expect(VINTAGE_TOYS_LEGO_FIELDS.map(field => field.name)).toEqual(expect.arrayContaining([
      'listingTitle', 'tradeValue', 'photos', 'isGraded', 'condition',
      'setNumber', 'theme', 'complete', 'quantity', 'packagingType',
      'instructionsIncluded', 'minifiguresIncluded', 'releaseYear', 'pieceCount',
      'retiredStatus', 'boxCondition', 'instructionCondition', 'minifigureDetails',
      'missingDetails', 'gradingCompany', 'grade', 'certificationNumber',
    ]));
  });

  it('keeps the compact field requirements and conditional triggers', () => {
    const field = (name: string) => VINTAGE_TOYS_LEGO_FIELDS.find(item => item.name === name);
    expect(field('listingTitle')?.requirement).toBe('required');
    expect(field('tradeValue')?.requirement).toBe('required');
    expect(field('photos')?.requirement).toBe('required');
    expect(field('isGraded')?.requirement).toBe('required');
    expect(field('condition')?.conditionalLogic).toBe('Is Graded = no');
    expect(field('gradingCompany')?.conditionalLogic).toBe('Is Graded = yes');
    expect(field('gradingCompany')?.dropdownOptions).toEqual(['AFA', 'CAS', 'UKG', 'Other']);
    expect(field('gradingCompany')?.supportsOther).toBe(true);
    expect(field('missingDetails')?.conditionalLogic).toBe('Complete = no');
    expect(field('boxCondition')?.conditionalLogic).toBe('Packaging Type = opened');
    expect(field('instructionCondition')?.conditionalLogic).toBe('Instructions Included = yes');
    expect(field('minifigureDetails')?.conditionalLogic).toBe('Minifigures Included = yes');
  });

  it('has an independent layout with the approved section placement', () => {
    const layout = ITEM_TYPE_LAYOUTS.vintage_toys_lego;
    expect(layout.itemType).toBe('lego');
    expect(layout.category).toBe('vintage_toys');
    expect(layout.sections.required.fieldLayout.listingTitle).toBeDefined();
    expect(layout.sections.recommended.fieldLayout.setNumber).toBeDefined();
    expect(layout.sections.optional.fieldLayout.releaseYear).toBeDefined();
    expect(layout.conditionalFieldPlacement.isGraded).toBe('right');
  });
});
