/**
 * Item Type Layout Configurations Index
 * 
 * This file exports all layout configurations for all 37 item types.
 * Each configuration is completely independent and changes to one do NOT affect others.
 * 
 * Keys are in format: category_itemType (e.g., 'sports_cards_single_card', 'comics_single_comic')
 */

import { sports_cardsSinglecardLayout } from './layouts/sports_cards_single_card';
import { sports_cardsUnopenedproductLayout } from './layouts/sports_cards_unopened_product';
import { sports_cardsSetLayout } from './layouts/sports_cards_set';
import { sports_cardsCollectionlotLayout } from './layouts/sports_cards_collection_lot';
import { comicsSinglecomicLayout } from './layouts/comics_single_comic';
import { comicsOriginalartLayout } from './layouts/comics_original_art';
import { comicsCollectionlotLayout } from './layouts/comics_collection_lot';
import { video_gamesGameLayout } from './layouts/video_games_game';
import { video_gamesConsoleLayout } from './layouts/video_games_console';
import { video_gamesAccessoryLayout } from './layouts/video_games_accessory';
import { video_gamesCollectionlotLayout } from './layouts/video_games_collection_lot';
import { vintage_toysActionfiguredollLayout } from './layouts/vintage_toys_action_figure___doll';
import { vintage_toysVehicleLayout } from './layouts/vintage_toys_vehicle';
import { vintage_toysPlaysetLayout } from './layouts/vintage_toys_playset';
import { vintage_toysBoardgamepuzzleLayout } from './layouts/vintage_toys_board_game___puzzle';
import { vintage_toysPlushstuffedtoyLayout } from './layouts/vintage_toys_plush___stuffed_toy';
import { vintage_toysElectronictoyLayout } from './layouts/vintage_toys_electronic_toy';
import { vintage_toysModelkitLayout } from './layouts/vintage_toys_model___kit';
import { vintage_toysCollectionlotLayout } from './layouts/vintage_toys_collection_lot';
import { stampsSinglestampLayout } from './layouts/stamps_single_stamp';
import { stampsStampsetsheetLayout } from './layouts/stamps_stamp_set___sheet';
import { stampsCollectionlotLayout } from './layouts/stamps_collection_lot';
import { coinsSinglecoinLayout } from './layouts/coins_single_coin';
import { coinsCoinsetLayout } from './layouts/coins_coin_set';
import { coinsCollectionlotLayout } from './layouts/coins_collection_lot';
import { moviesIndividualmovieLayout } from './layouts/movies_individual_movie';
import { moviesBoxsetLayout } from './layouts/movies_box_set';
import { moviesCollectionlotLayout } from './layouts/movies_collection_lot';
import { autographsSigneditemLayout } from './layouts/autographs_signed_item';
import { autographsCollectionlotLayout } from './layouts/autographs_collection_lot';
import { disney_pinsIndividualpinLayout } from './layouts/disney_pins_individual_pin';
import { disney_pinsPinsetLayout } from './layouts/disney_pins_pin_set';
import { disney_pinsCollectionlotLayout } from './layouts/disney_pins_collection_lot';
import { pokemonSinglecardLayout } from './layouts/pokemon_single_card';
import { pokemonUnopenedproductLayout } from './layouts/pokemon_unopened_product';
import { pokemonSetLayout } from './layouts/pokemon_set';
import { pokemonCollectionlotLayout } from './layouts/pokemon_collection_lot';

/**
 * Master layout configuration map
 * Access via: ITEM_TYPE_LAYOUTS[itemType]
 */
export const ITEM_TYPE_LAYOUTS: Record<string, any> = {
  'sports_cards_single_card': sports_cardsSinglecardLayout,
  'sports_cards_unopened_product': sports_cardsUnopenedproductLayout,
  'sports_cards_set': sports_cardsSetLayout,
  'sports_cards_collection_lot': sports_cardsCollectionlotLayout,
  'comics_single_comic': comicsSinglecomicLayout,
  'comics_original_art': comicsOriginalartLayout,
  'comics_collection_lot': comicsCollectionlotLayout,
  'video_games_game': video_gamesGameLayout,
  'video_games_console': video_gamesConsoleLayout,
  'video_games_accessory': video_gamesAccessoryLayout,
  'video_games_collection_lot': video_gamesCollectionlotLayout,
  'vintage_toys_action_figure___doll': vintage_toysActionfiguredollLayout,
  'vintage_toys_vehicle': vintage_toysVehicleLayout,
  'vintage_toys_playset': vintage_toysPlaysetLayout,
  'vintage_toys_board_game___puzzle': vintage_toysBoardgamepuzzleLayout,
  'vintage_toys_plush___stuffed_toy': vintage_toysPlushstuffedtoyLayout,
  'vintage_toys_electronic_toy': vintage_toysElectronictoyLayout,
  'vintage_toys_model___kit': vintage_toysModelkitLayout,
  'vintage_toys_collection_lot': vintage_toysCollectionlotLayout,
  'stamps_single_stamp': stampsSinglestampLayout,
  'stamps_stamp_set___sheet': stampsStampsetsheetLayout,
  'stamps_collection_lot': stampsCollectionlotLayout,
  'coins_single_coin': coinsSinglecoinLayout,
  'coins_coin_set': coinsCoinsetLayout,
  'coins_collection_lot': coinsCollectionlotLayout,
  'movies_individual_movie': moviesIndividualmovieLayout,
  'movies_box_set': moviesBoxsetLayout,
  'movies_collection_lot': moviesCollectionlotLayout,
  'autographs_signed_item': autographsSigneditemLayout,
  'autographs_collection_lot': autographsCollectionlotLayout,
  'disney_pins_individual_pin': disney_pinsIndividualpinLayout,
  'disney_pins_pin_set': disney_pinsPinsetLayout,
  'disney_pins_collection_lot': disney_pinsCollectionlotLayout,
  'pokemon_single_card': pokemonSinglecardLayout,
  'pokemon_unopened_product': pokemonUnopenedproductLayout,
  'pokemon_set': pokemonSetLayout,
  'pokemon_collection_lot': pokemonCollectionlotLayout,
};

/**
 * Get layout configuration for a specific item type
 */
export function getLayoutConfig(itemType: string) {
  return ITEM_TYPE_LAYOUTS[itemType] || null;
}

/**
 * Get all available item types
 */
export function getAllItemTypes(): string[] {
  return Object.keys(ITEM_TYPE_LAYOUTS);
}
