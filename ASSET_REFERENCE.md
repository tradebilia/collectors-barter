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
