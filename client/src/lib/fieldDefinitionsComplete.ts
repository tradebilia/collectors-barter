/**
 * Complete Field Definitions for All Categories
 * Merged from auto-generated field definitions and common fields
 */

import {
  FieldDefinition,
  ItemTypeDefinition,
  COMMON_FIELDS,
} from './formFieldDefinitions';
import * as GeneratedFields from './fieldDefinitionsGenerated';

// Helper function to apply layout properties to fields
function applyLayoutProperties(fields: FieldDefinition[]): FieldDefinition[] {
  return fields.map(field => {
    const updated: FieldDefinition = { ...field };
    
    // Apply half-width to short numeric fields
    if (['year', 'quantity', 'issueNumber', 'cardNumber', 'grade', 'serialNumber', 'volume'].includes(field.name)) {
      updated.gridColumn = 'half' as const;
    }
    
    // Apply full-width to long text fields
    if (['listingTitle', 'description', 'signersIncluded', 'notableItems', 'itemTypesIncluded'].includes(field.name)) {
      updated.gridColumn = 'full' as const;
    }
    
    return updated;
  });
}

// Helper function to merge common fields with category-specific fields
function mergeFieldDefinitions(generatedFields: FieldDefinition[]): FieldDefinition[] {
  // Filter out common fields from generated (they'll be added separately or handled elsewhere)
  // Note: photos is excluded because it has its own dedicated sticky panel
  const commonFieldNames = [
    'listingTitle', 'tradeValue', 'condition', 'photos', 'description', 
    'quantity', 'shippingAvailable'
  ];
  
  const categorySpecificFields = generatedFields.filter(
    f => !commonFieldNames.includes(f.name)
  );
  
  // Also remove any photos fields that might have slipped through
  const fieldsWithoutPhotos = categorySpecificFields.filter(
    f => f.name !== 'photos'
  );
  
  // Combine: common fields first, then category-specific
  // Note: PHOTOS_FIELD is excluded here because it has its own dedicated sticky panel
  const commonFieldsArray: FieldDefinition[] = [
    { ...COMMON_FIELDS.LISTING_TITLE_FIELD, gridColumn: 'full' as const },
    { ...COMMON_FIELDS.TRADE_VALUE_FIELD, gridColumn: 'half' as const },
    COMMON_FIELDS.CONDITION_FIELD,
    COMMON_FIELDS.DESCRIPTION_FIELD,
    { ...COMMON_FIELDS.QUANTITY_FIELD, gridColumn: 'half' as const, defaultValue: '1' },
    COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  ];
  
  return applyLayoutProperties([...commonFieldsArray, ...fieldsWithoutPhotos]);
}

// ============================================================================
// ALL FIELD DEFINITIONS EXPORT
// ============================================================================

export const ALL_FIELD_DEFINITIONS: Record<string, Record<string, FieldDefinition[]>> = {
  'autographs': {
    'collection_lot': mergeFieldDefinitions(GeneratedFields.AUTOGRAPHS_COLLECTION_LOT_FIELDS),
    'signed_item': mergeFieldDefinitions(GeneratedFields.AUTOGRAPHS_SIGNED_ITEM_FIELDS),
  },
  'comics': {
    'collection_lot': mergeFieldDefinitions(GeneratedFields.COMICS_COLLECTION_LOT_FIELDS),
    'original_art': mergeFieldDefinitions(GeneratedFields.COMICS_ORIGINAL_ART_FIELDS),
    'single_comic': mergeFieldDefinitions(GeneratedFields.COMICS_SINGLE_COMIC_FIELDS),
  },
  'coins': {
    'collection_lot': mergeFieldDefinitions(GeneratedFields.COINS_COLLECTION_LOT_FIELDS),
    'coin_set': mergeFieldDefinitions(GeneratedFields.COINS_COIN_SET_FIELDS),
    'paper_money': mergeFieldDefinitions(GeneratedFields.COINS_PAPER_MONEY_BANKNOTES_FIELDS),
    'single_coin': mergeFieldDefinitions(GeneratedFields.COINS_SINGLE_COIN_FIELDS),
  },
  'disney_pins': {
    'collection_lot': mergeFieldDefinitions(GeneratedFields.DISNEY_PINS_COLLECTION_LOT_FIELDS),
    'individual_pin': mergeFieldDefinitions(GeneratedFields.DISNEY_PINS_INDIVIDUAL_PIN_FIELDS),
    'pin_set': mergeFieldDefinitions(GeneratedFields.DISNEY_PINS_PIN_SET_FIELDS),
  },
  'movies': {
    'box_set': mergeFieldDefinitions(GeneratedFields.MOVIES_BOX_SET_FIELDS),
    'collection_lot': mergeFieldDefinitions(GeneratedFields.MOVIES_COLLECTION_LOT_FIELDS),
    'individual_movie': mergeFieldDefinitions(GeneratedFields.MOVIES_INDIVIDUAL_MOVIE_FIELDS),
  },
  'pokemon': {
    'collection_lot': mergeFieldDefinitions(GeneratedFields.POKEMON_COLLECTION_LOT_FIELDS),
    'set': mergeFieldDefinitions(GeneratedFields.POKEMON_SET_FIELDS),
    'single_card': mergeFieldDefinitions(GeneratedFields.POKEMON_SINGLE_CARD_FIELDS),
    'unopened_product': mergeFieldDefinitions(GeneratedFields.POKEMON_UNOPENED_PRODUCT_FIELDS),
  },
  'sports_cards': {
    'collection_lot': mergeFieldDefinitions(GeneratedFields.SPORTS_CARDS_COLLECTION_LOT_FIELDS),
    'set': mergeFieldDefinitions(GeneratedFields.SPORTS_CARDS_SET_FIELDS),
    'single_card': mergeFieldDefinitions(GeneratedFields.SPORTS_CARDS_SINGLE_CARD_FIELDS),
    'unopened_product': mergeFieldDefinitions(GeneratedFields.SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS),
  },
  'stamps': {
    'collection_lot': mergeFieldDefinitions(GeneratedFields.STAMPS_COLLECTION_LOT_FIELDS),
    'single_stamp': mergeFieldDefinitions(GeneratedFields.STAMPS_SINGLE_STAMP_FIELDS),
    'stamp_set': mergeFieldDefinitions(GeneratedFields.STAMPS_STAMP_SET_SHEET_FIELDS),
  },
  'video_games': {
    'accessory': mergeFieldDefinitions(GeneratedFields.VIDEO_GAMES_ACCESSORY_FIELDS),
    'collection_lot': mergeFieldDefinitions(GeneratedFields.VIDEO_GAMES_COLLECTION_LOT_FIELDS),
    'console': mergeFieldDefinitions(GeneratedFields.VIDEO_GAMES_CONSOLE_FIELDS),
    'game': mergeFieldDefinitions(GeneratedFields.VIDEO_GAMES_GAME_FIELDS),
  },
  'vintage_toys': {
    'action_figure': mergeFieldDefinitions(GeneratedFields.VINTAGE_TOYS_ACTION_FIGURE_DOLL_FIELDS),
    'board_game': mergeFieldDefinitions(GeneratedFields.VINTAGE_TOYS_BOARD_GAME_PUZZLE_FIELDS),
    'collection_lot': mergeFieldDefinitions(GeneratedFields.VINTAGE_TOYS_COLLECTION_LOT_FIELDS),
    'electronic_toy': mergeFieldDefinitions(GeneratedFields.VINTAGE_TOYS_ELECTRONIC_TOY_FIELDS),
    'model_kit': mergeFieldDefinitions(GeneratedFields.VINTAGE_TOYS_MODEL_KIT_FIELDS),
    'playset': mergeFieldDefinitions(GeneratedFields.VINTAGE_TOYS_PLAYSET_FIELDS),
    'plush_toy': mergeFieldDefinitions(GeneratedFields.VINTAGE_TOYS_PLUSH_STUFFED_TOY_FIELDS),
    'vehicle': mergeFieldDefinitions(GeneratedFields.VINTAGE_TOYS_VEHICLE_FIELDS),
  },
};
