/**
 * Filter query optimization utilities
 * Optimizes filter queries for better performance and reduced database load
 */

/**
 * Debounces filter queries to reduce unnecessary API calls
 * Returns a function that delays execution until the specified time has passed
 */
export function debounceFilterQuery<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttles filter queries to limit how often they can be executed
 * Returns a function that only executes once per specified interval
 */
export function throttleFilterQuery<T extends (...args: any[]) => any>(
  func: T,
  limit: number = 1000
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Memoizes filter query results to avoid redundant API calls
 * Caches results based on filter parameters
 */
export function memoizeFilterQuery<T extends (...args: any[]) => Promise<any>>(
  func: T,
  maxCacheSize: number = 50
) {
  const cache = new Map<string, any>();

  return async function (...args: Parameters<T>) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = await func(...args);

    // Implement simple LRU cache eviction
    if (cache.size >= maxCacheSize) {
      const firstKey = cache.keys().next().value as string | undefined;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, result);
    return result;
  };
}

/**
 * Builds an optimized query string from filter parameters
 * Only includes non-empty filters to reduce query size
 */
export function buildOptimizedQueryString(filters: Record<string, any>): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    // Skip empty values
    if (value === undefined || value === null || value === "") {
      return;
    }

    // Convert arrays to comma-separated strings
    if (Array.isArray(value)) {
      const joinedValue = value.join(",");
      if (joinedValue) {
        params.append(key, joinedValue);
      }
    } else {
      const stringValue = String(value);
      if (stringValue) {
        params.append(key, stringValue);
      }
    }
  });

  return params.toString();
}

/**
 * Parses query string back into filter object
 */
export function parseQueryString(queryString: string | undefined): Record<string, any> {
  if (!queryString) return {};
  
  const params = new URLSearchParams(queryString);
  const filters: Record<string, any> = {};

  params.forEach((value, key) => {
    // Try to parse as number
    if (!isNaN(Number(value))) {
      filters[key] = Number(value);
    }
    // Try to parse as boolean
    else if (value === "true" || value === "false") {
      filters[key] = value === "true";
    }
    // Keep as string
    else {
      filters[key] = value;
    }
  });

  return filters;
}

/**
 * Compares two filter objects to detect changes
 * Useful for determining if a new query is needed
 */
export function hasFilterChanged(
  oldFilters: Record<string, any>,
  newFilters: Record<string, any>
): boolean {
  const oldKeys = Object.keys(oldFilters).sort();
  const newKeys = Object.keys(newFilters).sort();

  if (oldKeys.length !== newKeys.length) {
    return true;
  }

  for (let i = 0; i < oldKeys.length; i++) {
    const key = oldKeys[i];
    if (oldFilters[key] !== newFilters[key]) {
      return true;
    }
  }

  return false;
}

/**
 * Removes empty filters to create a clean filter object
 */
export function removeEmptyFilters(filters: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

/**
 * Validates that filter values are within acceptable ranges
 * Prevents malicious or invalid filter values from being sent to the server
 */
export function validateFilterValues(filters: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(filters)) {
    // Check string length
    if (typeof value === "string" && value.length > 1000) {
      console.warn(`Filter value for ${key} exceeds maximum length`);
      return false;
    }

    // Check array length
    if (Array.isArray(value) && value.length > 100) {
      console.warn(`Filter array for ${key} exceeds maximum length`);
      return false;
    }

    // Check number ranges
    if (typeof value === "number") {
      if (!isFinite(value)) {
        console.warn(`Filter value for ${key} is not a valid number`);
        return false;
      }
    }
  }

  return true;
}
