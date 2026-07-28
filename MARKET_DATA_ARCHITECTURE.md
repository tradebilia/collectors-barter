# Market Data Architecture

## Overview

The Market Data Architecture is a **source-agnostic, modular system** for acquiring, normalizing, and analyzing market data from multiple collectibles sources (eBay, PSA, CGC, Heritage, Goldin, etc.).

The system is designed to:
- ✅ Fetch data from multiple sources without database persistence
- ✅ Normalize data to a standard format regardless of source
- ✅ Cache data temporarily during user sessions
- ✅ Calculate market statistics and confidence metrics
- ✅ Integrate with AI for intelligent trade analysis
- ✅ Scale to support new data sources easily

## Architecture Layers

### 1. Data Source Layer
**Files**: `_core/ebayDataAcquisition.ts` (+ future: psaDataAcquisition.ts, cgcDataAcquisition.ts, etc.)

Each data source has its own acquisition module that:
- Handles source-specific API calls
- Implements retry logic and error handling
- Normalizes raw source data to standard format

**Example: eBay Data Acquisition**
```typescript
// Fetch sales data from eBay
const sales = await fetchEbaySalesData('2012 Panini Prizm LeBron James');

// Search for items
const items = await searchEbayForItem('sports cards', { condition: 'New' });
```

### 2. Standardization Layer
**File**: `_core/marketDataTypes.ts`

Defines standardized interfaces for all data types:
- `StandardizedItem` - Item information
- `StandardizedSale` - Sales data
- `StandardizedCertification` - Grading data
- `StandardizedPopulation` - Population data
- `MarketStatistics` - Calculated statistics
- `MarketDataPackage` - Complete data bundle

### 3. Cache Layer
**File**: `_core/marketDataCache.ts`

Temporary in-memory caching system:
- Stores data with automatic expiration
- Generates cache keys from request parameters
- Removes expired entries automatically
- Provides cache statistics

**Usage**:
```typescript
// Store data
marketDataCache.set('ebay', { searchTerm: 'LeBron' }, data, 60);

// Retrieve data
const cached = marketDataCache.get('ebay', { searchTerm: 'LeBron' });

// Check if cached
if (marketDataCache.has('ebay', { searchTerm: 'LeBron' })) {
  // Use cached data
}
```

### 4. Orchestration Layer
**File**: `_core/marketDataOrchestrator.ts`

Central coordinator that:
- Manages multiple data sources
- Acquires data from specified sources
- Normalizes all data to standard format
- Calculates market statistics
- Assesses data quality
- Handles caching

**Usage**:
```typescript
const orchestrator = new MarketDataOrchestrator();

const response = await orchestrator.acquireMarketData({
  searchTerm: '2012 Panini Prizm LeBron James',
  sources: ['ebay', 'psa'],
  cacheMaxAgeMinutes: 60,
});

if (response.success) {
  const { item, recentSales, statistics, dataQuality } = response.data;
}
```

### 5. API Layer
**File**: `_core/marketDataRouter.ts`

TRPC endpoints for frontend integration:
- `acquireMarketData` - Get complete market data package
- `searchItems` - Search for items
- `getSalesHistory` - Get recent sales with trends
- `getMarketStatistics` - Get price statistics
- `getCompleteMarketData` - Get all available data

**Usage from Frontend**:
```typescript
// React/client code
const { data } = await trpc.marketData.acquireMarketData.query({
  searchTerm: '2012 Panini Prizm LeBron James',
  sources: ['ebay'],
});
```

### 6. AI Analysis Layer
**File**: `_core/tradeRoomAI.ts`

Integrates market data with LLM for intelligent analysis:
- Analyzes trade proposals
- Calculates fairness scores
- Provides recommendations (steal/fair/pass)
- Identifies risks and opportunities
- Generates market insights

**Usage**:
```typescript
const analysis = await analyzeTradeProposal({
  requestedItem: {
    title: 'LeBron James Card',
    estimatedValue: 500,
    marketData: marketDataPackage,
  },
  offeredItems: [
    {
      title: 'Michael Jordan Card',
      estimatedValue: 450,
      marketData: marketDataPackage,
    },
  ],
});

// Returns: fairnessScore, recommendation, reasoning, risks, opportunities
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Request                          │
│        (Search for item or analyze trade)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  Market Data Router (TRPC)         │
        │  - Validates input                 │
        │  - Calls orchestrator              │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │  Market Data Orchestrator          │
        │  - Check cache                     │
        │  - Route to data sources           │
        └────────────┬───────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   ┌─────────────┐          ┌──────────────┐
   │ eBay Module │          │ PSA Module   │ (future)
   │ - Fetch API │          │ - Scrape     │
   │ - Normalize │          │ - Normalize  │
   └──────┬──────┘          └──────┬───────┘
          │                        │
          └────────────┬───────────┘
                       │
                       ▼
        ┌────────────────────────────────────┐
        │  Standardization Layer             │
        │  - Convert to standard format      │
        │  - Merge data from sources         │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │  Statistics Calculator             │
        │  - Average price                   │
        │  - Median price                    │
        │  - Percentiles                     │
        │  - Confidence levels               │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │  Cache Layer                       │
        │  - Store result                    │
        │  - Set expiration                  │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │  Market Data Package               │
        │  - Item info                       │
        │  - Sales data                      │
        │  - Statistics                      │
        │  - Data quality metrics            │
        └────────────┬───────────────────────┘
                     │
        ┌────────────┴──────────────────┐
        │                               │
        ▼                               ▼
   ┌──────────────┐          ┌─────────────────┐
   │ Return to    │          │ AI Analysis     │
   │ Frontend     │          │ - Trade eval    │
   │              │          │ - Fairness      │
   └──────────────┘          │ - Risks/Opps    │
                             └─────────────────┘
```

## Adding a New Data Source

To add a new data source (e.g., PSA, CGC, Heritage):

### 1. Create Source Module
```typescript
// server/_core/psaDataAcquisition.ts
export const psaDataSourceConfig: DataSourceConfig = {
  sourceKey: 'psa',
  sourceName: 'PSA',
  sourceType: 'sales_data',
  isActive: true,
  rateLimit: 50,
  cacheDurationMinutes: 1440,
};

export async function fetchPsaSalesData(searchTerm: string): Promise<StandardizedSale[]> {
  // Implement PSA-specific fetching
  // Normalize to StandardizedSale format
}
```

### 2. Update Orchestrator
```typescript
// In marketDataOrchestrator.ts
private async acquireSales(...) {
  for (const source of sources) {
    if (source === 'psa') {
      const psaSales = await fetchPsaSalesData(request.searchTerm);
      allSales.push(...psaSales);
    }
  }
}
```

### 3. Update Router
```typescript
// In marketDataRouter.ts
// Already supports any source via the sources array parameter
```

## Performance Considerations

### Caching Strategy
- **Default cache duration**: 24 hours (configurable per source)
- **Cache key**: Hash of request parameters
- **Automatic cleanup**: Expired entries removed every 5 minutes
- **Memory efficient**: Entries only stored while needed

### Rate Limiting
- eBay: 100 requests/minute
- PSA: 50 requests/minute (when implemented)
- Configurable per source

### Timeout Handling
- Default timeout: 30 seconds per API call
- Automatic retries: 3 attempts (configurable)
- Graceful degradation: Returns partial data if some sources fail

## Data Quality Metrics

Each market data package includes quality metrics:

```typescript
{
  completeness: 0-100,  // How much data is available
  freshness: 0-100,     // How recent is the data
  reliability: 0-100    // Based on source and sample size
}
```

## Testing

Run the test suite:
```bash
npm test server/marketDataPipeline.test.ts
```

Tests cover:
- Data acquisition from sources
- Caching behavior
- Statistics calculation
- Trade analysis
- Error handling
- Cache management

## Future Enhancements

1. **Permanent Storage Mode**
   - Option to persist data to database
   - Historical trend analysis
   - Population growth tracking

2. **Additional Data Sources**
   - PSA (Population, Certification, Sales)
   - CGC, BGS, SGC
   - Heritage Auctions
   - Goldin Auctions
   - StockX (for modern cards)

3. **Advanced Analytics**
   - Price trend prediction
   - Market anomaly detection
   - Seasonal trend analysis
   - Grade-specific pricing

4. **Real-time Updates**
   - WebSocket integration for live price updates
   - Notification system for price changes
   - Alert system for deals

## Configuration

### Environment Variables
```env
EBAY_CLIENT_ID=your_client_id
EBAY_CLIENT_SECRET=your_client_secret
```

### Source Configuration
```typescript
// Customize per source
const config: DataSourceConfig = {
  sourceKey: 'ebay',
  rateLimit: 100,
  cacheDurationMinutes: 1440,
  retryAttempts: 3,
  timeout: 30000,
};
```

## Troubleshooting

### No data returned
- Check cache first: `marketDataCache.getStats()`
- Verify API credentials in environment variables
- Check API rate limits
- Review error logs for specific failures

### Slow performance
- Check cache hit rate
- Verify network connectivity
- Monitor API response times
- Consider increasing cache duration

### Stale data
- Reduce cache duration
- Clear cache manually: `marketDataCache.clearAll()`
- Check data source freshness settings

## References

- [Market Data Types](./server/_core/marketDataTypes.ts)
- [eBay Acquisition Module](./server/_core/ebayDataAcquisition.ts)
- [Cache Manager](./server/_core/marketDataCache.ts)
- [Orchestrator](./server/_core/marketDataOrchestrator.ts)
- [TRPC Router](./server/_core/marketDataRouter.ts)
- [AI Analysis](./server/_core/tradeRoomAI.ts)
- [Tests](./server/marketDataPipeline.test.ts)
