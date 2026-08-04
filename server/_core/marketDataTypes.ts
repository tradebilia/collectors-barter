/**
 * Market Data Types and Interfaces
 * 
 * Defines standardized data structures for market data from any source.
 * These types ensure consistency across different data providers (eBay, PSA, CGC, etc.)
 */

/**
 * Standardized Item Information
 * Represents a collectible item independent of any specific source or listing
 */
export interface StandardizedItem {
  itemId: string; // Unique identifier (could be Tradebilia ID or source-specific ID)
  category: 'comics' | 'sports_cards' | 'vintage_toys' | 'video_games' | 'stamps' | 'coins' | 'pokemon' | 'movies' | 'autographs' | 'disney_pins';
  itemName: string;
  year?: string;
  manufacturer?: string;
  brand?: string;
  set?: string;
  series?: string;
  itemNumber?: string;
  playerSubject?: string;
  character?: string;
  variant?: string;
  parallel?: string;
  language?: string;
  description?: string;
  imageUrl?: string;
  sourceKey: string; // Which source this data came from (e.g., 'ebay', 'psa', 'cgc')
  sourceItemId?: string; // External source ID
  lastUpdated?: Date;
}

/**
 * Standardized Certification Information
 * Represents grading/certification data from any grading company
 */
export interface StandardizedCertification {
  certificationId: string;
  itemId: string;
  gradingCompany: 'psa' | 'cgc' | 'bgs' | 'sgc' | 'other';
  certificationNumber: string;
  grade?: string;
  gradeDesignation?: string;
  labelType?: string;
  certificationDate?: Date;
  sourceKey: string;
  sourceUrl?: string;
  rawData?: Record<string, any>; // Store original data for audit trail
  lastUpdated?: Date;
}

/**
 * Standardized Sales Data
 * Represents a completed sale from any marketplace
 */
export interface StandardizedSale {
  saleId: string;
  itemId: string;
  sourceKey: string; // 'ebay', 'psa', 'heritage', 'goldin', etc.
  sourceSaleId: string; // External sale ID
  sourceUrl?: string;
  saleDate: Date;
  salePrice: number;
  currency: string; // 'USD', 'EUR', etc.
  gradingCompany?: 'psa' | 'cgc' | 'bgs' | 'sgc' | 'ungraded' | 'other';
  grade?: string;
  gradeDesignation?: string;
  certificationNumber?: string;
  saleType?: 'auction' | 'fixed_price' | 'private_sale' | 'other';
  buyerPremiumAmount?: number;
  buyerPremiumPercentage?: number;
  imageUrl?: string;
  rawData?: Record<string, any>;
  lastUpdated?: Date;
}

/**
 * Standardized Population Data
 * Represents population/census data from grading companies
 */
export interface StandardizedPopulation {
  populationId: string;
  itemId: string;
  gradingCompany: 'psa' | 'cgc' | 'bgs' | 'sgc' | 'other';
  populationReportDate: Date; // When the source reported this data
  snapshotDate: Date; // When we captured it
  grade?: string;
  gradeDesignation?: string;
  populationCount?: number; // Population at this specific grade
  totalPopulation?: number; // Total across all grades
  sourceKey: string;
  sourceUrl?: string;
  rawData?: Record<string, any>;
  lastUpdated?: Date;
}

/**
 * Market Statistics
 * Calculated statistics from sales data
 */
export interface MarketStatistics {
  itemId: string;
  totalSales: number;
  averagePrice: number;
  medianPrice: number;
  highestPrice: number;
  lowestPrice: number;
  priceRange: number;
  priceStandardDeviation: number;
  mostRecentSaleDate: Date;
  oldestSaleDate: Date;
  pricePercentile25: number;
  pricePercentile75: number;
  dataConfidence: 'high' | 'medium' | 'low'; // Based on sample size and data freshness
  dataRecency: 'fresh' | 'recent' | 'stale'; // Based on last update time
  sources: string[]; // Which sources contributed to these stats
  lastCalculated: Date;
}

/**
 * Complete Market Data Package
 * All market information for a single item, ready for AI analysis
 */
export interface MarketDataPackage {
  item: StandardizedItem;
  certifications: StandardizedCertification[];
  recentSales: StandardizedSale[];
  populationData: StandardizedPopulation[];
  statistics: MarketStatistics;
  dataQuality: {
    completeness: number; // 0-100, how much data is available
    freshness: number; // 0-100, how recent is the data
    reliability: number; // 0-100, based on source and sample size
  };
  generatedAt: Date;
}

/**
 * Data Acquisition Request
 * Parameters for fetching market data
 */
export interface DataAcquisitionRequest {
  itemId?: string;
  certificationNumber?: string;
  category?: string;
  searchTerm?: string;
  sources?: string[]; // Which sources to query (e.g., ['ebay', 'psa'])
  includeHistorical?: boolean;
  cacheMaxAgeMinutes?: number;
}

/**
 * Data Acquisition Response
 * Result of a data acquisition attempt
 */
export interface DataAcquisitionResponse {
  success: boolean;
  data?: MarketDataPackage;
  error?: string;
  warnings?: string[];
  sourcesQueried: string[];
  executionTimeMs: number;
  cacheHit: boolean;
}

/**
 * Data Source Configuration
 * Configuration for each data source
 */
export interface DataSourceConfig {
  sourceKey: string; // Unique identifier (e.g., 'ebay', 'psa_apr', 'cgc')
  sourceName: string; // Display name
  sourceType: 'sales_data' | 'certification' | 'population' | 'item_info';
  isActive: boolean;
  rateLimit?: number; // Requests per minute
  cacheDurationMinutes?: number;
  retryAttempts?: number;
  timeout?: number; // Milliseconds
}

/**
 * Cache Entry
 * For temporary in-memory caching
 */
export interface CacheEntry<T> {
  key: string;
  data: T;
  expiresAt: Date;
  source: string;
  createdAt: Date;
}
