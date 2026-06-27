/**
 * Layout Configuration System
 * 
 * Each item type has its own independent layout configuration that defines:
 * - Column counts for each field section
 * - Field positioning and sizing
 * - Spacing and padding
 * - Conditional field placement
 * 
 * Changes to one item type's layout have NO effect on other item types.
 */

export type ColSpan = 'full' | 'half' | 'third' | 'fourth';
export type ConditionalPlacement = 'right' | 'below';

export interface FieldLayoutConfig {
  colSpan: ColSpan;
  position?: number; // For custom field ordering within a section
}

export interface SectionLayoutConfig {
  columns: 1 | 2 | 3 | 4; // Number of columns in the grid
  fieldLayout: Record<string, FieldLayoutConfig>; // Field name -> layout config
}

export interface SpacingConfig {
  gap: string; // Tailwind gap class: 'gap-4', 'gap-6', 'gap-8', etc.
  padding: string; // Tailwind padding class: 'p-4', 'p-6', etc.
}

export interface ConditionalFieldPlacementConfig {
  [parentFieldName: string]: ConditionalPlacement; // Where conditional fields appear relative to parent
}

export interface ItemTypeLayoutConfig {
  itemType: string;
  category: string;
  sections: {
    required: SectionLayoutConfig;
    recommended: SectionLayoutConfig;
    optional: SectionLayoutConfig;
  };
  spacing: SpacingConfig;
  conditionalFieldPlacement: ConditionalFieldPlacementConfig;
}

import { getLayoutConfig as getLayoutConfigFromLayouts } from './itemTypeLayouts';

/**
 * Helper function to convert ColSpan to Tailwind classes
 */
export function getColSpanClass(colSpan: ColSpan, baseColumns: number): string {
  switch (colSpan) {
    case 'full':
      return `lg:col-span-${baseColumns}`;
    case 'half':
      return `lg:col-span-${Math.ceil(baseColumns / 2)}`;
    case 'third':
      return `lg:col-span-${Math.ceil(baseColumns / 3)}`;
    case 'fourth':
      return `lg:col-span-${Math.ceil(baseColumns / 4)}`;
    default:
      return '';
  }
}

/**
 * Helper function to get grid columns class
 */
export function getGridColumnsClass(columns: number): string {
  switch (columns) {
    case 1:
      return 'grid-cols-1 md:grid-cols-1 lg:grid-cols-1';
    case 2:
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';
    case 3:
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    case 4:
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    default:
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';
  }
}

/**
 * Get layout configuration for a specific item type
 * This function is imported from itemTypeLayouts.ts
 */
export function getLayoutConfig(itemType: string): ItemTypeLayoutConfig | null {
  return getLayoutConfigFromLayouts(itemType);
}
