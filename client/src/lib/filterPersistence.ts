/**
 * Filter persistence utilities for saving and loading user filter preferences
 * Stores filters in localStorage so users' last used filters are remembered
 */

import { type TradebiliaCategorySlug } from "./tradebilia";

const STORAGE_KEY_PREFIX = "tradebilia_filters_";

export interface SavedFilters {
  timestamp: number;
  filters: Record<string, any>;
}

/**
 * Saves filter state to localStorage for a specific category
 */
export function saveFiltersForCategory(
  category: TradebiliaCategorySlug,
  filters: Record<string, any>
): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${category}`;
    const data: SavedFilters = {
      timestamp: Date.now(),
      filters,
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to save filters to localStorage:", error);
  }
}

/**
 * Loads filter state from localStorage for a specific category
 */
export function loadFiltersForCategory(
  category: TradebiliaCategorySlug
): Record<string, any> | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${category}`;
    const data = localStorage.getItem(key);
    if (!data) return null;

    const parsed: SavedFilters = JSON.parse(data);
    // Only use filters if they're less than 7 days old
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > sevenDaysInMs) {
      clearFiltersForCategory(category);
      return null;
    }

    return parsed.filters;
  } catch (error) {
    console.warn("Failed to load filters from localStorage:", error);
    return null;
  }
}

/**
 * Clears saved filters for a specific category
 */
export function clearFiltersForCategory(category: TradebiliaCategorySlug): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${category}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to clear filters from localStorage:", error);
  }
}

/**
 * Clears all saved filters
 */
export function clearAllSavedFilters(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn("Failed to clear all filters from localStorage:", error);
  }
}

/**
 * Gets the timestamp of when filters were last saved for a category
 */
export function getFiltersSaveTime(category: TradebiliaCategorySlug): number | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${category}`;
    const data = localStorage.getItem(key);
    if (!data) return null;

    const parsed: SavedFilters = JSON.parse(data);
    return parsed.timestamp;
  } catch (error) {
    return null;
  }
}
