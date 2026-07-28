import { mysqlTable, mysqlSchema, AnyMySqlColumn, index, int, mysqlEnum, varchar, text, timestamp, foreignKey, decimal, datetime, tinyint, json } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

/**
 * MARKET DATA SCHEMA
 * 
 * This schema defines tables for storing market data from external sources.
 * It follows the architecture outlined in the Tradebilia PSA Data Integration Foundation.
 * 
 * Key principles:
 * - Source-agnostic: Can accommodate data from PSA, eBay, CGC, BGS, SGC, and other sources
 * - Modular: Each data type (Sales, Certifications, Population) is independently stored
 * - Audit trail: Tracks data source, retrieval time, and data freshness
 * - Future-proof: Designed for both on-demand and permanent storage modes
 */

/**
 * dataSources
 * Tracks all external data sources that Tradebilia integrates with.
 * Each source is independently identifiable and configurable.
 */
export const dataSources = mysqlTable("dataSources", {
	id: int().autoincrement().notNull(),
	sourceKey: varchar({ length: 100 }).notNull(), // 'psa_apr', 'psa_cert', 'ebay', 'cgc', etc.
	sourceName: varchar({ length: 255 }).notNull(), // 'PSA Auction Prices Realized', 'eBay', etc.
	sourceType: mysqlEnum(['sales_data', 'certification', 'population', 'item_info']).notNull(),
	description: text(),
	isActive: tinyint().default(1).notNull(),
	apiEndpoint: varchar({ length: 500 }),
	rateLimit: int(), // requests per minute
	retryAttempts: int().default(3).notNull(),
	cacheDurationMinutes: int().default(1440).notNull(), // default 24 hours
	lastSuccessfulFetch: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("dataSources_sourceKey_unique").on(table.sourceKey),
	index("dataSources_sourceType_idx").on(table.sourceType),
	index("dataSources_isActive_idx").on(table.isActive),
]);

/**
 * tradebeliaItems
 * Standardized item information, independent of listings or certifications.
 * Each item has a unique Tradebilia Item ID that connects to all related data.
 */
export const tradebeliaItems = mysqlTable("tradebeliaItems", {
	id: int().autoincrement().notNull(),
	tradebeliaItemId: varchar({ length: 50 }).notNull(), // 'TRADEBILIA-ITEM-12345'
	category: mysqlEnum(['comics', 'sports_cards', 'vintage_toys', 'video_games', 'stamps', 'coins', 'pokemon', 'movies', 'autographs', 'disney_pins']).notNull(),
	itemName: varchar({ length: 255 }).notNull(),
	year: varchar({ length: 10 }),
	manufacturer: varchar({ length: 255 }),
	brand: varchar({ length: 255 }),
	set: varchar({ length: 255 }),
	series: varchar({ length: 255 }),
	itemNumber: varchar({ length: 100 }),
	playerSubject: varchar({ length: 255 }),
	character: varchar({ length: 255 }),
	variant: varchar({ length: 255 }),
	parallel: varchar({ length: 255 }),
	language: varchar({ length: 50 }),
	description: text(),
	imageUrl: text(),
	rawSourceData: json(), // Store original data from source for audit trail
	sourceKey: varchar({ length: 100 }).notNull().references(() => dataSources.sourceKey),
	sourceItemId: varchar({ length: 255 }), // External source ID (e.g., PSA set ID)
	lastUpdatedFromSource: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("tradebeliaItems_tradebeliaItemId_unique").on(table.tradebeliaItemId),
	index("tradebeliaItems_category_idx").on(table.category),
	index("tradebeliaItems_sourceKey_idx").on(table.sourceKey),
	index("tradebeliaItems_sourceItemId_idx").on(table.sourceItemId),
]);

/**
 * gradingCertifications
 * Stores certification data from grading companies (PSA, CGC, BGS, SGC, etc.)
 * Links to Tradebilia Items via tradebeliaItemId.
 */
export const gradingCertifications = mysqlTable("gradingCertifications", {
	id: int().autoincrement().notNull(),
	tradebeliaItemId: varchar({ length: 50 }).notNull().references(() => tradebeliaItems.tradebeliaItemId),
	gradingCompany: mysqlEnum(['psa', 'cgc', 'bgs', 'sgc', 'other']).notNull(),
	certificationNumber: varchar({ length: 100 }).notNull(),
	grade: varchar({ length: 20 }),
	gradeDesignation: varchar({ length: 100 }),
	labelType: varchar({ length: 100 }),
	certificationDate: timestamp({ mode: 'string' }),
	sourceKey: varchar({ length: 100 }).notNull().references(() => dataSources.sourceKey),
	sourceUrl: varchar({ length: 500 }),
	rawSourceData: json(),
	firstCollectedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	lastUpdatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("gradingCertifications_tradebeliaItemId_idx").on(table.tradebeliaItemId),
	index("gradingCertifications_certificationNumber_unique").on(table.certificationNumber),
	index("gradingCertifications_gradingCompany_idx").on(table.gradingCompany),
	index("gradingCertifications_sourceKey_idx").on(table.sourceKey),
]);

/**
 * sales
 * Historical sales data from all sources (PSA, eBay, Heritage, Goldin, etc.)
 * Each sale is linked to a Tradebilia Item and includes pricing, condition, and source information.
 */
export const sales = mysqlTable("sales", {
	id: int().autoincrement().notNull(),
	tradebeliaItemId: varchar({ length: 50 }).notNull().references(() => tradebeliaItems.tradebeliaItemId),
	sourceKey: varchar({ length: 100 }).notNull().references(() => dataSources.sourceKey),
	sourceSaleId: varchar({ length: 255 }).notNull(), // External sale ID (e.g., eBay item ID)
	sourceUrl: varchar({ length: 500 }),
	saleDate: timestamp({ mode: 'string' }).notNull(),
	salePrice: decimal({ precision: 12, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('USD').notNull(),
	gradingCompany: mysqlEnum(['psa', 'cgc', 'bgs', 'sgc', 'ungraded', 'other']).default('ungraded').notNull(),
	grade: varchar({ length: 20 }),
	gradeDesignation: varchar({ length: 100 }),
	certificationNumber: varchar({ length: 100 }),
	saleType: mysqlEnum(['auction', 'fixed_price', 'private_sale', 'other']).default('other').notNull(),
	buyerPremiumAmount: decimal({ precision: 12, scale: 2 }),
	buyerPremiumPercentage: decimal({ precision: 5, scale: 2 }),
	imageUrl: text(),
	rawSourceData: json(),
	firstCollectedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	lastUpdatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("sales_tradebeliaItemId_idx").on(table.tradebeliaItemId),
	index("sales_sourceKey_idx").on(table.sourceKey),
	index("sales_sourceSaleId_unique").on(table.sourceSaleId),
	index("sales_saleDate_idx").on(table.saleDate),
	index("sales_salePrice_idx").on(table.salePrice),
	index("sales_gradingCompany_idx").on(table.gradingCompany),
]);

/**
 * populationSnapshots
 * Time-series snapshots of population data from grading companies.
 * Allows tracking population growth and market trends over time.
 */
export const populationSnapshots = mysqlTable("populationSnapshots", {
	id: int().autoincrement().notNull(),
	tradebeliaItemId: varchar({ length: 50 }).notNull().references(() => tradebeliaItems.tradebeliaItemId),
	gradingCompany: mysqlEnum(['psa', 'cgc', 'bgs', 'sgc', 'other']).notNull(),
	populationReportDate: timestamp({ mode: 'string' }).notNull(), // Date from the source
	snapshotDate: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(), // When we captured it
	grade: varchar({ length: 20 }),
	gradeDesignation: varchar({ length: 100 }),
	populationCount: int(), // Population at this specific grade
	totalPopulation: int(), // Total population across all grades
	sourceKey: varchar({ length: 100 }).notNull().references(() => dataSources.sourceKey),
	sourceUrl: varchar({ length: 500 }),
	rawSourceData: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("populationSnapshots_tradebeliaItemId_idx").on(table.tradebeliaItemId),
	index("populationSnapshots_gradingCompany_idx").on(table.gradingCompany),
	index("populationSnapshots_snapshotDate_idx").on(table.snapshotDate),
	index("populationSnapshots_populationReportDate_idx").on(table.populationReportDate),
]);

/**
 * marketDataCache
 * Temporary cache for on-demand data retrieval.
 * Used in the current "temporary mode" to avoid redundant API calls.
 */
export const marketDataCache = mysqlTable("marketDataCache", {
	id: int().autoincrement().notNull(),
	cacheKey: varchar({ length: 255 }).notNull(), // Hash of request parameters
	sourceKey: varchar({ length: 100 }).notNull().references(() => dataSources.sourceKey),
	dataType: mysqlEnum(['sales', 'certification', 'population', 'item_info']).notNull(),
	cachedData: json().notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("marketDataCache_cacheKey_unique").on(table.cacheKey),
	index("marketDataCache_sourceKey_idx").on(table.sourceKey),
	index("marketDataCache_expiresAt_idx").on(table.expiresAt),
]);

/**
 * dataAcquisitionLog
 * Audit trail for all data acquisition attempts.
 * Tracks successes, failures, and performance metrics.
 */
export const dataAcquisitionLog = mysqlTable("dataAcquisitionLog", {
	id: int().autoincrement().notNull(),
	sourceKey: varchar({ length: 100 }).notNull().references(() => dataSources.sourceKey),
	dataType: mysqlEnum(['sales', 'certification', 'population', 'item_info']).notNull(),
	requestParameters: json(),
	status: mysqlEnum(['success', 'failure', 'partial', 'rate_limited', 'timeout']).notNull(),
	recordsRetrieved: int().default(0).notNull(),
	errorMessage: text(),
	responseTimeMs: int(),
	requestedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp({ mode: 'string' }),
},
(table) => [
	index("dataAcquisitionLog_sourceKey_idx").on(table.sourceKey),
	index("dataAcquisitionLog_status_idx").on(table.status),
	index("dataAcquisitionLog_requestedAt_idx").on(table.requestedAt),
]);

// ─── Type Aliases ─────────────────────────────────────────────────────────
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
export type DataSource = InferSelectModel<typeof dataSources>;
export type InsertDataSource = InferInsertModel<typeof dataSources>;
export type TradebeliaItem = InferSelectModel<typeof tradebeliaItems>;
export type InsertTradebeliaItem = InferInsertModel<typeof tradebeliaItems>;
export type GradingCertification = InferSelectModel<typeof gradingCertifications>;
export type InsertGradingCertification = InferInsertModel<typeof gradingCertifications>;
export type Sale = InferSelectModel<typeof sales>;
export type InsertSale = InferInsertModel<typeof sales>;
export type PopulationSnapshot = InferSelectModel<typeof populationSnapshots>;
export type InsertPopulationSnapshot = InferInsertModel<typeof populationSnapshots>;
export type MarketDataCache = InferSelectModel<typeof marketDataCache>;
export type InsertMarketDataCache = InferInsertModel<typeof marketDataCache>;
export type DataAcquisitionLog = InferSelectModel<typeof dataAcquisitionLog>;
export type InsertDataAcquisitionLog = InferInsertModel<typeof dataAcquisitionLog>;
