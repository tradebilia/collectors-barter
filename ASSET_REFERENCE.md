# Asset Reference Guide

## Overview
This document tracks all image assets used in the Tradebilia website, including their storage locations and usage.

## Storage Strategy

### Local Storage (client/public/images/)
Large background images are stored locally in `client/public/images/` for development and production use. These files are referenced directly in the code via `/images/{filename}`.

**Why local storage for these files:**
- They are required for the site to display correctly
- The `/manus-storage/` proxy doesn't work reliably in development
- They are already uploaded to S3 as backups (see S3 Storage section below)

### S3 Storage (Backup)
All background images have been uploaded to S3 via `manus-upload-file --webdev` and are stored with the following naming convention:
- Format: `https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/{filename}`

**Important:** These S3 URLs are backups. The code currently uses local paths for reliability.

## Background Images

### Homepage Hero Background
- **Filename:** `Mainpage.jpg`
- **Location:** `client/public/images/Mainpage.jpg`
- **Size:** ~3.5 MB
- **Description:** Collectibles-themed background with graded cards, coins, and memorabilia
- **Used in:** `client/src/pages/Home.tsx` (line 467)
- **Code reference:** `backgroundImage: 'url(/images/Mainpage.jpg)'`
- **S3 Backup:** `Mainpage_aa93799d.jpg`

### Category Page Backgrounds

#### Sports Cards
- **Filename:** `Sportscardwallpaper.webp`
- **Location:** `client/public/images/Sportscardwallpaper.webp`
- **Size:** ~180 KB
- **Description:** Sports card collection background
- **Used in:** `client/src/pages/CategoryPage.tsx` (line 254)
- **S3 Backup:** `Sportscardwallpaper_7d372f7d.webp`

#### Coins
- **Filename:** `Coins2.png`
- **Location:** `client/public/images/Coins2.png`
- **Size:** ~3.0 MB
- **Description:** Coin collection background with graded coins
- **Used in:** `client/src/pages/CategoryPage.tsx` (line 254)
- **S3 Backup:** `Coins2_54d5f0d9.png`

#### Stamps
- **Filename:** `Stamps5.png`
- **Location:** `client/public/images/Stamps5.png`
- **Size:** ~3.2 MB
- **Description:** Vintage stamp collection background
- **Used in:** `client/src/pages/CategoryPage.tsx` (line 254)
- **S3 Backup:** `Stamps5_7feb0c7e.png`

#### Vintage Toys
- **Filename:** `VintageToys.png`
- **Location:** `client/public/images/VintageToys.png`
- **Size:** ~2.7 MB
- **Description:** Vintage toys and collectibles background
- **Used in:** `client/src/pages/CategoryPage.tsx` (line 254)
- **S3 Backup:** `Toys4_70f212d6.png`

#### Autographs
- **Filename:** `Auto2.png`
- **Location:** `client/public/images/Auto2.png`
- **Size:** ~2.6 MB
- **Description:** Autographs and memorabilia background
- **Used in:** `client/src/pages/CategoryPage.tsx` (line 254)
- **S3 Backup:** `Auto2_41464c02.png`

#### Movies
- **Filename:** `VHS1.png`
- **Location:** `client/public/images/VHS1.png`
- **Size:** ~2.7 MB
- **Description:** VHS and movie collection background
- **Used in:** `client/src/pages/CategoryPage.tsx` (line 254)
- **S3 Backup:** `VHS1_4fe4bb67.png`

### External CDN Backgrounds (Working)
The following backgrounds are served via external CDN and are working reliably:

#### Comics
- **CDN URL:** `https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp`
- **Used in:** `client/src/pages/CategoryPage.tsx` (line 254)

#### Pokemon
- **CDN URL:** `https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp`
- **Used in:** `client/src/pages/CategoryPage.tsx` (line 254)

#### Video Games
- **CDN URL:** `https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp`
- **Used in:** `client/src/pages/CategoryPage.tsx` (line 254)

#### Disney Pins
- **CDN URL:** `https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp`
- **Used in:** `client/src/pages/CategoryPage.tsx` (line 254)

## Checkpoint Save Limitation

**Important Note for Next Session:**
The large background image files (>1MB each) in `client/public/images/` prevent the checkpoint save from completing. This is a WebDev system limitation.

**Workaround:**
1. Before saving a checkpoint, temporarily remove the large files:
   ```bash
   rm -f client/public/images/Mainpage.jpg client/public/images/Sportscardwallpaper.webp client/public/images/Coins2.png client/public/images/Stamps5.png client/public/images/VintageToys.png client/public/images/Auto2.png client/public/images/VHS1.png
   ```

2. Save the checkpoint

3. Restore the files:
   ```bash
   cp /home/ubuntu/upload/Mainpage.jpg client/public/images/Mainpage.jpg
   cp /home/ubuntu/upload/Sportscardwallpaper.webp client/public/images/Sportscardwallpaper.webp
   cp /home/ubuntu/upload/Coins2.png client/public/images/Coins2.png
   cp /home/ubuntu/upload/Stamps5.png client/public/images/Stamps5.png
   cp /home/ubuntu/upload/VintageToys.png client/public/images/VintageToys.png
   cp /home/ubuntu/upload/Auto2.png client/public/images/Auto2.png
   cp /home/ubuntu/upload/VHS1.png client/public/images/VHS1.png
   ```

## Other Assets

### Logo
- **Filename:** `tradebilia-logo.svg`
- **Location:** `client/public/images/tradebilia-logo.svg`
- **Used in:** Multiple pages as the main brand logo

### Favicon
- **Filename:** `favicon.ico`
- **Location:** `client/public/favicon.ico`

## Future Improvements

For future sessions, consider:
1. Optimizing image sizes (compress PNG/WebP files)
2. Implementing lazy loading for backgrounds
3. Creating responsive background images for mobile devices
4. Using WebP format for all backgrounds (smaller file size)

## Related Files
- `client/src/pages/Home.tsx` - Homepage with hero background
- `client/src/pages/CategoryPage.tsx` - Category pages with category-specific backgrounds
- `backgrounds/` - Local directory with additional background files (not currently used)


## Category Title Images (S3 Storage)

All category title images are stored in S3 via `/manus-storage/` proxy and are referenced in `client/src/pages/CategoryPage.tsx`.

### Title Images Reference

| Category | S3 URL | File ID | Used in |
|----------|--------|---------|---------|
| Sports Cards | `/manus-storage/SportsCardsTitle_db2535b2.png` | db2535b2 | CategoryPage.tsx:289 |
| Vintage Toys | `/manus-storage/VintageToysTitle_11b8cdd9.png` | 11b8cdd9 | CategoryPage.tsx:291 |
| Video Games | `/manus-storage/VideoGamesTitle_e5b075b7.webp` | e5b075b7 | CategoryPage.tsx:297 |
| Stamps | `/manus-storage/StampsTitle_cc0e76c3.webp` | cc0e76c3 | CategoryPage.tsx:295 |
| Coins | `/manus-storage/CoinsTitle_40d49d1d.webp` | 40d49d1d | CategoryPage.tsx:293 |
| Comics | `/manus-storage/ComicsTitle_b915b61d.png` | b915b61d | CategoryPage.tsx:287 |
| Pokemon | `/manus-storage/PokemonTitle_eaf0db72.png` | eaf0db72 | CategoryPage.tsx:285 |
| Movies | `/manus-storage/MoviesTitle_0e6931a4.png` | 0e6931a4 | CategoryPage.tsx:299 |
| Autographs | `/manus-storage/AutographsTitle_85ad05d3.png` | 85ad05d3 | CategoryPage.tsx:301 |
| Disney Pins | `/manus-storage/DisneyPinsTitle_dc12f61b.png` | dc12f61b | CategoryPage.tsx:283 |

### Category Background Images (S3 Storage)

| Category | S3 URL | File ID | Used in |
|----------|--------|---------|---------|
| Sports Cards | `/manus-storage/Sportscardwallpaper_bc1c7d7a.webp` | bc1c7d7a | CategoryPage.tsx:254 |
| Comics | `/manus-storage/comics-background-YZiiH2cyV8YJx6GFQj4PKC_2cc313bb.webp` | 2cc313bb | CategoryPage.tsx:254 |
| Pokemon | `/manus-storage/pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj_d1df88b6.webp` | d1df88b6 | CategoryPage.tsx:254 |
| Video Games | `/manus-storage/video-games-background-kyx4vVUqTYCMC3kMbtokYU_c9f7dffa.webp` | c9f7dffa | CategoryPage.tsx:254 |
| Disney Pins | `/manus-storage/disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8_172dee25.webp` | 172dee25 | CategoryPage.tsx:254 |
| Coins | `/manus-storage/CoinsBackground_ef9aac41.png` | ef9aac41 | CategoryPage.tsx:254 |
| Stamps | `/manus-storage/StampsBackground_381d3e98.png` | 381d3e98 | CategoryPage.tsx:254 |
| Vintage Toys | `/manus-storage/VintageToysBackground_8ab6860f.png` | 8ab6860f | CategoryPage.tsx:254 |
| Autographs | `/manus-storage/AutoBackground_d025a571.png` | d025a571 | CategoryPage.tsx:254 |
| Movies | `/manus-storage/VHSBackground_99756671.png` | 99756671 | CategoryPage.tsx:254 |

## GitHub Repository

**Repository:** `tradebilia/collectors-barter`
**GitHub URL:** https://github.com/tradebilia/collectors-barter
**Branch:** main
**Latest Commits:**
- Restore Disney Pins title size to 475px with proper positioning
- Update category titles: Pokemon, Coins, Movies, Autographs
- Checkpoint: Adjusted category title sizes and positioning

## Recent Changes (Current Session)

### Eyebrow Text Styling
- **File:** `client/src/pages/CategoryPage.tsx` (line 265)
- **Change:** Made all eyebrow text bright white across all 10 category pages
- **Details:**
  - Removed `opacity-80` class (was 80% opacity)
  - Added `opacity: 1` inline style (100% opacity)
  - Added `color: "#ffffff"` inline style (bright white)
  - Applied to: Comics, Sports Cards, Vintage Toys, Video Games, Stamps, Coins, Pokemon (hidden), Movies, Autographs, Disney Pins

### Disney Pins Title Positioning
- **File:** `client/src/pages/CategoryPage.tsx` (line 283)
- **Original:** `marginTop: 65px`
- **Current:** `marginTop: 130px`
- **Change:** Moved title down 65px total (50px from original, then 15px more)
- **Other properties:** `maxHeight: 475px`, `marginBottom: 30px`

## S3 Storage Access

All S3 assets are accessed via the `/manus-storage/` proxy path, which automatically redirects to the CloudFront CDN:
- **Base URL:** `/manus-storage/{filename_with_id}`
- **CDN Base:** `https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/`
- **Full CDN URL Example:** `https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/DisneyPinsTitle_dc12f61b.png`

## Notes

- All S3 URLs use the `/manus-storage/` proxy for reliability and automatic redirects
- File IDs (e.g., `dc12f61b`) are unique identifiers for each asset version
- The proxy handles CDN routing and caching automatically
- No manual URL management needed - use `/manus-storage/{filename}` format in code


## Contact Page Assets (S3 Storage)

### Contact Us Hero SVG
- **Filename:** `Contact_Us.svg`
- **S3 URL:** `/manus-storage/Contact_Us_8b246a6c.svg`
- **File ID:** 8b246a6c
- **Description:** Colorful arrows in a circle design for Contact page hero section
- **Used in:** `client/src/pages/Contact.tsx` (line 14)
- **Git Commit:** 58efe26 - feat: Contact page refinements
- **Upload Date:** June 5, 2026
- **Design:** Multicolor arrows (blue, purple, red, orange, green, pink) arranged in a circle

## Recent Session Changes (June 5, 2026)

### Contact Page Refinements
- **Commit:** 58efe26
- **Changes:**
  - Added hero section to Contact page with Contact_Us.svg
  - Updated email from rich@tradebilia.com to admin@tradebilia.com
  - Changed button colors from purple-pink gradient to blue (bg-blue-600, hover:bg-blue-700)
  - Fixed Watchlist button in category page list view (heart icon only, red outline/fill)
  - Repositioned Member Online indicator above image without overlapping
  - Removed redundant red heart button from list view
- **Files Modified:**
  - `client/src/pages/Contact.tsx`
  - `client/src/pages/CategoryPage.tsx`
- **S3 Assets Added:**
  - Contact_Us_8b246a6c.svg

### Category Page Watchlist Button Refinements
- **Commit:** 58efe26
- **Changes:**
  - Removed redundant red heart icon button
  - Modified Watchlist button to show only heart icon (no text)
  - Heart displays with red outline by default (text-red-500)
  - Heart fills with red when saved (fill-red-500 text-red-500)
  - Repositioned Member Online indicator inside card without overlapping image
- **Files Modified:**
  - `client/src/pages/CategoryPage.tsx`


## TopBar Layout Refinement (June 5, 2026)

### Search Bar Centering
- **Commit:** 5affd8b
- **File Modified:** `client/src/components/TopBar.tsx`
- **Changes:**
  - Changed main container from `flex items-center justify-between` to `flex items-center justify-center relative`
  - Logo now uses `absolute left-2` positioning
  - Search bar centered with `max-w-2xl w-full` constraint
  - Icons/Auth now uses `absolute right-4` positioning
  - Improves visual hierarchy with search bar as focal point


## Messages Page Navigation Update (June 5, 2026)

### TopBar and CategoryBar Integration
- **Commit:** 728c7df
- **File Modified:** `client/src/pages/Messages.tsx`
- **Changes:**
  - Replaced custom header with TopBar component
  - Added CategoryBar component for consistent navigation
  - Maintained Inbox hero section with image and stats
  - Ensures visual consistency with other pages (Home, Contact, Category pages)
- **Result:** Messages page now matches the visual style and navigation of the rest of the site


## Messages Page Hero Image Centering (June 5, 2026)

### Hero Image Styling Update
- **Commit:** 4d97c2b
- **File Modified:** `client/src/pages/Messages.tsx`
- **Changes:**
  - Centered Inbox hero image in Messages page
  - Matched responsive sizing to main page (h-64/sm:h-72/lg:h-80)
  - Used same layout pattern as main page for visual consistency
- **Result:** Messages page hero now matches main page styling and sizing


## Online Presence Bug Fix (Commit 742c3c5)
- Updated logout procedure to clear `lastActivityAt` timestamp when user logs out
- Enhanced OnlineIndicator component to invalidate cache on mount and refetch every 10 seconds
- Manually cleared AdminTavani's `lastActivityAt` in database to fix existing false positive
- Prevents Member Online indicator from showing for logged-out users


## Member Offline Indicator (Commit e0ff464)
- Updated OnlineIndicator component to show "Member Offline" in red with red X icon when user is offline
- Component logic updated but indicator not displaying correctly yet - server may not be returning correct isOnline status
- Requires debugging to verify server-side online status detection is working properly


## Category Page Layout Improvement
- **Commit**: 920cfed
- **Date**: 2026-06-05
- **Changes**: Moved Per page dropdown next to Best Match dropdown, removed extra spacing to prevent bottom cutoff
- **Files Modified**: client/src/pages/CategoryPage.tsx, todo.md


## Grid View Image Cutoff Fix
- **Commit**: 4746e9f
- **Date**: 2026-06-05
- **Changes**: Moved OnlineIndicator outside image container, positioned absolutely to prevent image cutoff
- **Files Modified**: client/src/pages/CategoryPage.tsx, todo.md


## Member Online Indicator Visibility Fix
- **Commit**: 1870d4b
- **Date**: 2026-06-05
- **Changes**: Added relative positioning to Card component for absolute positioned OnlineIndicator
- **Files Modified**: client/src/pages/CategoryPage.tsx, todo.md


## Centered Member Online Indicator
- **Commit**: ca67d5f
- **Date**: 2026-06-05
- **Changes**: Centered Member Online indicator on grid view cards using absolute positioning with transform
- **Files Modified**: client/src/pages/CategoryPage.tsx, todo.md


## OnlineIndicator Positioning Fix
- **Commit**: 790467d
- **Date**: 2026-06-05
- **Changes**: Fixed OnlineIndicator positioning to show at top-center of cards instead of middle
- **Files Modified**: client/src/pages/CategoryPage.tsx, todo.md
