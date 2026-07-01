# Tradebilia Changelog

## [Latest] - Jun 30, 2026 - Edit Form Pre-Population Complete

### Overview
Fixed critical issues preventing form fields from pre-populating with saved values when editing listings. All 10 collectible categories now properly load and display field values across all field types (dropdowns, text inputs, textareas, file uploads).

### Major Fixes

#### 1. Case Sensitivity in Dropdown Options
- Changed all 63 occurrences of `['Yes', 'No']` to `['yes', 'no']` in fieldDefinitionsGenerated.ts
- Added `displayLabels` to show capitalized labels to users while storing lowercase values
- Applied across all categories: Comics, Sports Cards, Pokemon, Video Games, Stamps, Coins, Vintage Toys, Movies, Autographs, Disney Pins

#### 2. Radix UI Select Component State Management
- Added internal state (`internalValue`) to track Select component value separately
- Implemented useEffect to sync prop value with internal state
- Added ref callback to SelectTrigger to force proper rendering
- Implemented logic to prevent value clearing when onChange is triggered with empty string

#### 3. Signatures Field Array Parsing
- Added special handling to detect signatures field and parse comma-separated string into array
- Allows individual signature inputs (Signature 1, Signature 2, etc.) to populate correctly

#### 4. React.memo Optimization
- Wrapped FieldWithCustomInput with React.memo to prevent unnecessary re-renders
- Reduces re-render cycles and improves form stability

#### 5. Batch Form Data Updates
- Consolidated all field updates into single `setFormData` call
- Ensures all fields update together in one render cycle
- Prevents state inconsistencies

#### 6. ItemType Auto-Selection in Edit Mode
- Added key prop to CategoryItemTypeSelector that includes both category and itemType
- Forces component re-creation when itemType changes
- Ensures Select component displays correct value

### Files Modified
- `client/src/lib/fieldDefinitionsGenerated.ts` - 63 case sensitivity replacements
- `client/src/components/DynamicFieldRenderer.tsx` - Select state management (+50 lines)
- `client/src/components/FieldWithCustomInput.tsx` - React.memo optimization
- `client/src/pages/AddInventory.tsx` - Batch updates, array parsing, itemType selection

### Testing Coverage
- ✅ Comics category with all field types
- ✅ All dropdown field types across all categories
- ✅ Conditional fields (fields dependent on other field values)
- ✅ Edit mode field pre-population
- ✅ Create mode with new items

### Impact
- Users can now edit listings without losing field values
- All form fields correctly persist and load
- Works across all 10 collectible categories
- Fixes apply universally to all field types

---

## [Previous] - Jun 14, 2026

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
