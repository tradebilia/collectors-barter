# Tradebilia Changelog

## [Latest] - Jun 14, 2026

### Features Added

#### Favorites & View Count Tracking System
- **View Tracking**: Automatic view count increment when users visit item detail pages
- **Favorites Management**: Users can add/remove items to favorites with duplicate prevention
- **Database Schema**: 
  - Added `viewCount` column to listings table
  - Created new `favorites` table with unique constraint on (userId, listingId)
- **Backend Procedures**: 7 new helper functions in `server/db.ts`
  - `trackListingView(listingId)` - Increments view count
  - `addToFavorites(userId, listingId)` - Adds to favorites
  - `removeFromFavorites(userId, listingId)` - Removes from favorites
  - `isFavorited(userId, listingId)` - Checks favorite status
  - `getTopMostFavoritedItems()` - Returns top 10 favorited items
  - `getTopMostViewedItems()` - Returns top 10 viewed items
- **tRPC Endpoints**: 6 new endpoints in `server/routers.ts`
  - `favorites.trackView` - Public endpoint for view tracking
  - `favorites.addToFavorites` - Protected endpoint
  - `favorites.removeFromFavorites` - Protected endpoint
  - `favorites.isFavorited` - Protected endpoint
  - `favorites.getTopMostFavorited` - Public endpoint
  - `favorites.getTopMostViewed` - Public endpoint

#### Ranking Sections with Thumbnails & Interactions
- **Visual Improvements**:
  - Added item thumbnails (8×8px) to Most Viewed section
  - Added item thumbnails (8×8px) to Most Favorited section
  - Added member avatar thumbnails (8×8px, rounded) to Top Rated Traders section
  - All thumbnails use proper image resolution with fallback to placeholder images

- **Interactive Features**:
  - **Most Viewed & Most Favorited**: 
    - Hover over item thumbnail to see preview dialog
    - Preview dialog displays full image and estimated value
    - Click item or thumbnail to navigate to item detail page
    - Smooth hover background color transitions
  - **Top Rated Traders**:
    - Hover effect with background color change
    - Opacity transitions on avatar hover
  - **Component Architecture**:
    - Created `RankingListingItem` component for consistent listing behavior
    - Reusable hover/preview logic across ranking sections

#### Homepage Updates
- Renamed "Most Popular" to "Most Viewed" (sorted by viewCount)
- Renamed "Most Wanted" to "Most Favorited" (sorted by favorite count)
- Rankings refresh every 5 minutes automatically
- All ranking sections now provide better visual context with thumbnails

### Technical Implementation

#### Database
- Schema changes applied via migration
- New `favorites` table with proper indexing
- `viewCount` column added to listings table with default value 0

#### Backend
- New procedures follow existing tRPC patterns
- Protected procedures use `protectedProcedure` for auth
- Public procedures accessible without authentication
- Comprehensive error handling and type safety

#### Frontend
- ItemDetail.tsx: Automatic view tracking on page load
- Home.tsx: Updated ranking queries and display logic
- RankingListingItem component: Reusable interactive component
- Dialog-based preview system for item inspection

### Testing
- Created comprehensive test file: `server/favorites.test.ts`
- Tests cover all new functionality
- Vitest integration for automated testing

### Git History
- Commit: b680cb1 - Added interactive hover preview dialogs
- Commit: 85f1d7e - Added item thumbnails to ranking sections
- Commit: 6a8534e - Implemented favorites and view count tracking

---

## Previous Releases

See git history for complete changelog of earlier features and fixes.
