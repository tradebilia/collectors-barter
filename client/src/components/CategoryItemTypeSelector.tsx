/**
 * Category & Item Type Selector Component
 * Two-level dropdown selection: Category → Item Type
 * Handles form reset on selection change
 */

import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { COLLECTIBLE_CATEGORIES, CollectibleCategory } from '@/lib/formFieldDefinitions';
import { ALL_FIELD_DEFINITIONS } from '@/lib/fieldDefinitionsComplete';
import { REMAINING_FIELD_DEFINITIONS } from '@/lib/fieldDefinitionsRemaining';

// Combine all field definitions
const ALL_DEFINITIONS: Record<string, Record<string, any>> = {
  ...ALL_FIELD_DEFINITIONS,
  ...REMAINING_FIELD_DEFINITIONS,
};

// Map category names to display names
const CATEGORY_DISPLAY_NAMES: Record<CollectibleCategory, string> = {
  sports_cards: 'Sports Cards',
  comics: 'Comics',
  coins: 'Coins',
  stamps: 'Stamps',
  video_games: 'Video Games',
  movies: 'Movies',
  autographs: 'Autographs',
  vintage_toys: 'Vintage Toys',
  disney_pins: 'Disney Pins',
  pokemon: 'Pokémon',
};

// Map item type names to display names
const ITEM_TYPE_DISPLAY_NAMES: Record<string, string> = {
  single_card: 'Single Card',
  unopened_product: 'Unopened Product',
  set: 'Set',
  card_set: 'Set',
  collection_lot: 'Collection / Lot',
  single_comic: 'Single Comic',
  original_art: 'Original Art',
  single_coin: 'Single Coin',
  coin_set: 'Coin Set',
  paper_money: 'Paper Money / Banknotes',
  single_stamp: 'Single Stamp',
  stamp_set: 'Stamp Set / Sheet',
  game: 'Game',
  console: 'Console',
  accessory: 'Accessory',
  individual_movie: 'Individual Movie',
  box_set: 'Box Set',
  movies_collection_lot: 'Collection / Lot',
  signed_item: 'Signed Item',
  action_figure: 'Action Figure / Doll',
  vehicle: 'Vehicle',
  playset: 'Playset',
  board_game: 'Board Game / Puzzle',
  plush_toy: 'Plush / Stuffed Toy',
  electronic_toy: 'Electronic Toy',
  model_kit: 'Model / Kit',
  die_cast_car: 'Die-Cast Car',
  single_pin: 'Individual Pin',
  individual_pin: 'Individual Pin',
  pin_set: 'Pin Set',
};

interface CategoryItemTypeSelectorProps {
  selectedCategory: CollectibleCategory | '';
  selectedItemType: string | '';
  onCategoryChange: (category: CollectibleCategory) => void;
  onItemTypeChange: (itemType: string) => void;
  error?: string;
}

export const CategoryItemTypeSelector: React.FC<CategoryItemTypeSelectorProps> = ({
  selectedCategory,
  selectedItemType,
  onCategoryChange,
  onItemTypeChange,
  error,
}) => {
  const [itemTypes, setItemTypes] = useState<string[]>([]);
  
  React.useEffect(() => {
    console.log('[CategoryItemTypeSelector] Props updated:', { selectedCategory, selectedItemType, itemTypesCount: itemTypes.length });
  }, [selectedCategory, selectedItemType, itemTypes]);

  // Update item types when category changes
  useEffect(() => {
    if (selectedCategory && selectedCategory in ALL_DEFINITIONS) {
      const types = Object.keys(ALL_DEFINITIONS[selectedCategory as any] || {});
      // Sort so that "single" item types appear first
      const sorted = types.sort((a, b) => {
        const aIsSingle = a.includes('single');
        const bIsSingle = b.includes('single');
        if (aIsSingle && !bIsSingle) return -1;
        if (!aIsSingle && bIsSingle) return 1;
        return 0;
      });
      setItemTypes(sorted);
    } else {
      setItemTypes([]);
    }
  }, [selectedCategory]);

  const handleCategoryChange = (category: string) => {
    onCategoryChange(category as CollectibleCategory);
    onItemTypeChange(''); // Reset item type when category changes
  };

  const handleItemTypeChange = (itemType: string) => {
    onItemTypeChange(itemType);
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900 rounded-lg border border-gray-700">
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">1. Select Category and Item Type</h2>
        <p className="text-sm text-gray-300 mb-4">
          Choose your collectible category first, then select the specific item type.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Selector */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-medium text-white">
            Category <span className="text-red-400">*</span>
          </Label>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger 
              id="category"
              className={error && !selectedCategory ? 'border-red-500' : ''}
            >
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {COLLECTIBLE_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {CATEGORY_DISPLAY_NAMES[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Item Type Selector */}
        <div className="space-y-2">
          <Label htmlFor="itemType" className="text-sm font-medium text-white">
            Item Type <span className="text-red-400">*</span>
          </Label>
          <Select 
            value={selectedItemType} 
            onValueChange={handleItemTypeChange}
            disabled={!selectedCategory}
          >
            <SelectTrigger 
              id="itemType"
              className={error && !selectedItemType ? 'border-red-500' : ''}
            >
              <SelectValue placeholder={selectedCategory ? "Select an item type" : "Select category first"} />
            </SelectTrigger>
            <SelectContent>
              {itemTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {ITEM_TYPE_DISPLAY_NAMES[type] || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm p-3 bg-red-50 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default CategoryItemTypeSelector;
