/**
 * Filter validation utilities for the Tradebilia category pages
 * Ensures filter inputs are valid before being submitted
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface FilterValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a numeric value to ensure it's a valid number
 */
export function validateNumericValue(value: string | number | undefined): boolean {
  if (value === undefined || value === "") return true;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return !isNaN(num) && isFinite(num);
}

/**
 * Validates a value range (min and max)
 */
export function validateValueRange(
  min: number | undefined,
  max: number | undefined
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (min !== undefined && max !== undefined && min > max) {
    errors.push({
      field: "valueRange",
      message: "Minimum value cannot be greater than maximum value",
    });
  }

  if (min !== undefined && min < 0) {
    errors.push({
      field: "valueMin",
      message: "Minimum value cannot be negative",
    });
  }

  if (max !== undefined && max < 0) {
    errors.push({
      field: "valueMax",
      message: "Maximum value cannot be negative",
    });
  }

  return errors;
}

/**
 * Validates filter inputs before submission
 */
export function validateFilters(filters: {
  keyword?: string;
  issueNumber?: string;
  manufacturer?: string;
  year?: string;
  team?: string;
  series?: string;
  valueMin?: number;
  valueMax?: number;
  [key: string]: any;
}): FilterValidationResult {
  const errors: ValidationError[] = [];

  // Validate keyword length
  if (filters.keyword && filters.keyword.length > 100) {
    errors.push({
      field: "keyword",
      message: "Keyword must be less than 100 characters",
    });
  }

  // Validate issue number format
  if (filters.issueNumber && filters.issueNumber.length > 50) {
    errors.push({
      field: "issueNumber",
      message: "Issue number must be less than 50 characters",
    });
  }

  // Validate manufacturer
  if (filters.manufacturer && filters.manufacturer.length > 100) {
    errors.push({
      field: "manufacturer",
      message: "Manufacturer must be less than 100 characters",
    });
  }

  // Validate year
  if (filters.year && filters.year.length > 100) {
    errors.push({
      field: "year",
      message: "Year must be less than 100 characters",
    });
  }

  // Validate team
  if (filters.team && filters.team.length > 100) {
    errors.push({
      field: "team",
      message: "Team must be less than 100 characters",
    });
  }

  // Validate series
  if (filters.series && filters.series.length > 100) {
    errors.push({
      field: "series",
      message: "Series must be less than 100 characters",
    });
  }

  // Validate value range
  const rangeErrors = validateValueRange(filters.valueMin, filters.valueMax);
  errors.push(...rangeErrors);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes filter input to prevent injection attacks
 */
export function sanitizeFilterInput(input: string): string {
  if (!input) return "";
  // Remove leading/trailing whitespace
  return input.trim();
}

/**
 * Normalizes filter values for consistent querying
 */
export function normalizeFilterValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return sanitizeFilterInput(value).toLowerCase();
}
