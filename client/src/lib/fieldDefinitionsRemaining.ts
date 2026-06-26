import { FieldDefinition, GRADING_COMPANIES_BY_CATEGORY } from './formFieldDefinitions';
import { COMMON_FIELDS } from './formFieldDefinitions';
import { COUNTRIES_LIST } from './countries';
import {
  SPORTS_CARDS_SINGLE_CARD_FIELDS,
  SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS,
  SPORTS_CARDS_COLLECTION_LOT_FIELDS,
  SPORTS_CARDS_SET_FIELDS,
  COINS_COLLECTION_LOT_FIELDS,
  COINS_PAPER_MONEY_BANKNOTES_FIELDS,
  COINS_SINGLE_COIN_FIELDS,
  COINS_COIN_SET_FIELDS,
  COMICS_COLLECTION_LOT_FIELDS,
  COMICS_ORIGINAL_ART_FIELDS,
  COMICS_SINGLE_COMIC_FIELDS,
  AUTOGRAPHS_COLLECTION_LOT_FIELDS,
  AUTOGRAPHS_SIGNED_ITEM_FIELDS,
  VIDEO_GAMES_ACCESSORY_FIELDS,
  VIDEO_GAMES_COLLECTION_LOT_FIELDS,
  VIDEO_GAMES_GAME_FIELDS,
  VIDEO_GAMES_CONSOLE_FIELDS,
  VINTAGE_TOYS_ACTION_FIGURE_DOLL_FIELDS,
  VINTAGE_TOYS_BOARD_GAME_PUZZLE_FIELDS,
  VINTAGE_TOYS_PLAYSET_FIELDS,
  VINTAGE_TOYS_VEHICLE_FIELDS,
  VINTAGE_TOYS_ELECTRONIC_TOY_FIELDS,
  VINTAGE_TOYS_MODEL_KIT_FIELDS,
  VINTAGE_TOYS_COLLECTION_LOT_FIELDS,
  POKEMON_COLLECTION_LOT_FIELDS,
  POKEMON_UNOPENED_PRODUCT_FIELDS,
  POKEMON_SET_FIELDS,
  DISNEY_PINS_COLLECTION_LOT_FIELDS,
  DISNEY_PINS_PIN_SET_FIELDS,
  DISNEY_PINS_INDIVIDUAL_PIN_FIELDS,
  STAMPS_STAMP_SET_SHEET_FIELDS,
  STAMPS_COLLECTION_LOT_FIELDS,
  STAMPS_SINGLE_STAMP_FIELDS,
  MOVIES_BOX_SET_FIELDS,
  MOVIES_COLLECTION_LOT_FIELDS,
  MOVIES_INDIVIDUAL_MOVIE_FIELDS,
} from './fieldDefinitionsGenerated';

// ============================================================================
// COMICS - COMIC SET (unique to Remaining, not in Generated)
// ============================================================================

const COMICS_COMIC_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'issueRange',
    label: 'Issue Range',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'publisher',
    label: 'Publisher',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year Published',
    inputType: 'number',
    requirement: 'recommended',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.comics,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];



const VINTAGE_TOYS_PLUSH_TOY_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  COMMON_FIELDS.CONDITION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'toyName',
    label: 'Toy Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
];





// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

export const CATEGORY_ITEM_TYPES = {
  coins: {
    single_coin: COINS_SINGLE_COIN_FIELDS,
    coin_set: COINS_COIN_SET_FIELDS,
    paper_money: COINS_PAPER_MONEY_BANKNOTES_FIELDS,
    collection_lot: COINS_COLLECTION_LOT_FIELDS,
  },
  comics: {
    single_comic: COMICS_SINGLE_COMIC_FIELDS,
    original_art: COMICS_ORIGINAL_ART_FIELDS,
    collection_lot: COMICS_COLLECTION_LOT_FIELDS,
  },
  sports_cards: {
    single_card: SPORTS_CARDS_SINGLE_CARD_FIELDS,
    card_set: SPORTS_CARDS_SET_FIELDS,
    unopened_product: SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS,
    collection_lot: SPORTS_CARDS_COLLECTION_LOT_FIELDS,
  },
  stamps: {
    single_stamp: STAMPS_SINGLE_STAMP_FIELDS,
    stamp_set: STAMPS_STAMP_SET_SHEET_FIELDS,
    collection_lot: STAMPS_COLLECTION_LOT_FIELDS,
  },
  video_games: {
    game: VIDEO_GAMES_GAME_FIELDS,
    console: VIDEO_GAMES_CONSOLE_FIELDS,
    accessory: VIDEO_GAMES_ACCESSORY_FIELDS,
    collection_lot: VIDEO_GAMES_COLLECTION_LOT_FIELDS,
  },
  movies: {
    individual_movie: MOVIES_INDIVIDUAL_MOVIE_FIELDS,
    box_set: MOVIES_BOX_SET_FIELDS,
    collection_lot: MOVIES_COLLECTION_LOT_FIELDS,
  },
  autographs: {
    signed_item: AUTOGRAPHS_SIGNED_ITEM_FIELDS,
    collection_lot: AUTOGRAPHS_COLLECTION_LOT_FIELDS,
  },
  vintage_toys: {
    plush_toy: VINTAGE_TOYS_PLUSH_TOY_FIELDS,
    electronic_toy: VINTAGE_TOYS_ELECTRONIC_TOY_FIELDS,
    model_kit: VINTAGE_TOYS_MODEL_KIT_FIELDS,
    action_figure: VINTAGE_TOYS_ACTION_FIGURE_DOLL_FIELDS,
    vehicle: VINTAGE_TOYS_VEHICLE_FIELDS,
    playset: VINTAGE_TOYS_PLAYSET_FIELDS,
    board_game: VINTAGE_TOYS_BOARD_GAME_PUZZLE_FIELDS,
    collection_lot: VINTAGE_TOYS_COLLECTION_LOT_FIELDS,
  },

  disney_pins: {
    single_pin: DISNEY_PINS_INDIVIDUAL_PIN_FIELDS,
    pin_set: DISNEY_PINS_PIN_SET_FIELDS,
    collection_lot: DISNEY_PINS_COLLECTION_LOT_FIELDS,
  },
};

export const REMAINING_FIELD_DEFINITIONS = CATEGORY_ITEM_TYPES;
