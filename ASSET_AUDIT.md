# Asset Audit Report - Tradebilia Project

**Date:** June 2, 2026  
**Status:** Complete inventory of all media assets

---

## Summary

- **Total Images:** 41 files
- **Total Size:** ~27 MB
- **Categories:** Logos, Category Backgrounds, UI Icons, Sample Listings, SVG Assets
- **Storage Locations:** 
  - Local: `client/public/images/` (38 files)
  - Backgrounds folder: `./backgrounds/` (4 files)
  - Manus S3 URLs: 3 category logos (Comics, Sports Cards, Vintage Toys)

---

## Asset Inventory by Category

### 1. Core Branding & Logos

| File | Size | Current Path | Used In | Status |
|------|------|--------------|---------|--------|
| tradebilia-logo.svg | 4.2K | `/images/tradebilia-logo.svg` | Home, Inventory, Profile, AccountSettings, ItemDetail, etc. | ✅ Active |
| tradebilia_final_darkest(1)_3e8b98df.svg | 56K | `/images/tradebilia_final_darkest(1)_3e8b98df.svg` | Unused | ⚠️ Cleanup |
| tradebilia_final_spin_fixed(1)_4a57dd7d.svg | 56K | `/images/tradebilia_final_spin_fixed(1)_4a57dd7d.svg` | Unused | ⚠️ Cleanup |
| tradebilia_final_transparent_443f029c.svg | 56K | `/images/tradebilia_final_transparent_443f029c.svg` | Unused | ⚠️ Cleanup |

### 2. Category Background Images (Large)

| File | Size | Current Path | Used In | Status |
|------|------|--------------|---------|--------|
| Sportscardwallpaper.webp | 439K | `/images/Sportscardwallpaper.webp` | CategoryPage, AccountSettings, ItemDetail | ✅ Active |
| comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp | 358K | `/images/comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp` + `/backgrounds/` | CategoryPage, ItemDetail | ✅ Active |
| pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp | 386K | `/images/pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp` + `/backgrounds/` | CategoryPage, ItemDetail | ✅ Active |
| video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp | 176K | `/images/video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp` + `/backgrounds/` | CategoryPage, ItemDetail | ✅ Active |
| disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp | 277K | `/images/disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp` + `/backgrounds/` | CategoryPage, ItemDetail | ✅ Active |
| Auto2.png | 2.6M | `/images/Auto2.png` | CategoryPage, ItemDetail | ✅ Active |
| Coins2.png | 3.1M | `/images/Coins2.png` | CategoryPage, ItemDetail | ✅ Active |
| Stamps5.png | 3.3M | `/images/Stamps5.png` | CategoryPage, ItemDetail | ✅ Active |
| VHS1.png | 2.7M | `/images/VHS1.png` | CategoryPage, ItemDetail | ✅ Active |
| VintageToys.png | 2.7M | `/images/VintageToys.png` | CategoryPage, ItemDetail | ✅ Active |

### 3. Category Logo Images (Manus S3 - Session Dependent)

| File | Size | Current URL | Used In | Status |
|------|------|-------------|---------|--------|
| Comics4_ef989684.png | Unknown | `/manus-storage/Comics4_ef989684.png` | CategoryPage | ⚠️ Session-Dependent |
| SportsCards1_ff8b8611.png | Unknown | `/manus-storage/SportsCards1_ff8b8611.png` | CategoryPage | ⚠️ Session-Dependent |
| VintageToys_dcc69e1c.png | Unknown | `/manus-storage/VintageToys_dcc69e1c.png` | CategoryPage | ⚠️ Session-Dependent |

### 4. UI Icons & SVG Assets

| File | Size | Current Path | Used In | Status |
|------|------|--------------|---------|--------|
| AccountSettings.svg | 4.0K | `/images/AccountSettings.svg` | AccountSettings | ✅ Active |
| AccountSetup_7b72a15a.svg | 55K | `/images/AccountSetup_7b72a15a.svg` | AccountSetup | ✅ Active |
| AccountSetup_ffa83564.svg | 55K | `/images/AccountSetup_ffa83564.svg` | Unused | ⚠️ Cleanup |
| Add_To_Your_Inventory.svg | 4.0K | `/images/Add_To_Your_Inventory.svg` | AddInventory | ✅ Active |
| HighestTradeValue_f34ed3ff.svg | 55K | `/images/HighestTradeValue_f34ed3ff.svg` | Unused | ⚠️ Cleanup |
| Inbox.svg | 3.9K | `/images/Inbox.svg` | Messages | ✅ Active |
| MostRequested.svg | 4.0K | `/images/MostRequested.svg` | Unused | ⚠️ Cleanup |
| MostViewed.svg | 3.9K | `/images/MostViewed.svg` | Unused | ⚠️ Cleanup |
| Myinventory_467a8c30.svg | 4.3K | `/images/Myinventory_467a8c30.svg` | Inventory | ✅ Active |
| Profile.svg | 3.9K | `/images/Profile.svg` | Unused | ⚠️ Cleanup |
| RatingsandReview.svg | 4.0K | `/images/RatingsandReview.svg` | Unused | ⚠️ Cleanup |
| ReportaUser_001357ab.svg | 3.9K | `/images/ReportaUser_001357ab.svg` | ReportUser | ✅ Active |
| TopRatedTraders.svg | 4.0K | `/images/TopRatedTraders.svg` | Unused | ⚠️ Cleanup |
| TradeHistory.svg | 3.9K | `/images/TradeHistory.svg` | Unused | ⚠️ Cleanup |
| TradeProposal.svg | 4.0K | `/images/TradeProposal.svg` | Unused | ⚠️ Cleanup |
| TradeRequest.svg | 3.9K | `/images/TradeRequest.svg` | Unused | ⚠️ Cleanup |

### 5. Sample Listing Images

| File | Size | Current Path | Used In | Status |
|------|------|--------------|---------|--------|
| sportscards2_50e2e734.png | 111K | `/images/sportscards2_50e2e734.png` | Home (sample listings) | ✅ Active |
| Vintagetoys2_b56d7fdc.png | Unknown | `/images/Vintagetoys2_b56d7fdc.png` | Home (sample listings) | ✅ Active |
| Comicpage2_6d086599.png | Unknown | `/images/Comicpage2_6d086599.png` | Home (sample listings) | ✅ Active |
| Mainpage.jpg | 111K | `/images/Mainpage.jpg` | Home (hero background) | ✅ Active |
| pasted_file_BlVRoF_image.png | 521K | `/images/pasted_file_BlVRoF_image.png` | Unused | ⚠️ Cleanup |
| pasted_file_jGuwJZ_image.png | 26K | `/images/pasted_file_jGuwJZ_image.png` | Unused | ⚠️ Cleanup |
| pasted_file_mngfJz_image.png | 24K | `/images/pasted_file_mngfJz_image.png` | Unused | ⚠️ Cleanup |
| pasted_file_nipbm4_image.png | 14K | `/images/pasted_file_nipbm4_image.png` | Unused | ⚠️ Cleanup |
| pasted_file_yhRgo4_image.png | 54K | `/images/pasted_file_yhRgo4_image.png` | Unused | ⚠️ Cleanup |

### 6. Third-Party Logo Assets

| File | Size | Current Path | Used In | Status |
|------|------|--------------|---------|--------|
| paypal-logo_62835ee7.png | Unknown | `/images/paypal-logo_62835ee7.png` | AccountSettings | ✅ Active |
| facebook-logo_1fd22cc7.png | Unknown | `/images/facebook-logo_1fd22cc7.png` | AccountSettings | ✅ Active |
| ebay-logo_b3d303cb.png | Unknown | `/images/ebay-logo_b3d303cb.png` | Unused | ⚠️ Cleanup |

---

## Migration Strategy

### Phase 1: Organize Assets
- ✅ Identify all active images (used in code)
- ✅ Identify unused images (cleanup candidates)
- ✅ Identify session-dependent URLs (Manus S3 - need migration)

### Phase 2: Create Google Drive Structure
```
Tradebilia Assets/
├── Logos/
│   ├── tradebilia-logo.svg
│   ├── paypal-logo.png
│   ├── facebook-logo.png
│   └── ebay-logo.png
├── Category Backgrounds/
│   ├── sports-cards/
│   ├── comics/
│   ├── pokemon/
│   ├── video-games/
│   ├── disney-pins/
│   ├── vintage-toys/
│   ├── coins/
│   ├── stamps/
│   ├── autographs/
│   └── movies/
├── UI Icons/
│   ├── account-settings.svg
│   ├── inbox.svg
│   ├── inventory.svg
│   └── report-user.svg
├── Sample Listings/
│   ├── sports-cards.png
│   ├── vintage-toys.png
│   ├── comics.png
│   └── mainpage.jpg
└── Category Logos (Manus S3)/
    ├── comics-logo.png
    ├── sports-cards-logo.png
    └── vintage-toys-logo.png
```

### Phase 3: Upload & Generate Links
- Upload all active images to Google Drive
- Generate shareable links (view-only)
- Create mapping document

### Phase 4: Update Code References
- Replace local paths with Google Drive URLs
- Replace Manus S3 URLs with Google Drive URLs
- Verify all pages render correctly

### Phase 5: Cleanup
- Remove unused image files from repository
- Remove duplicate images (e.g., webp in both locations)
- Update documentation

---

## Active Images to Migrate (Priority)

**Total: 23 active images**

### Critical (Used on Multiple Pages)
1. tradebilia-logo.svg - 4.2K
2. Sportscardwallpaper.webp - 439K
3. comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp - 358K
4. pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp - 386K
5. video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp - 176K
6. disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp - 277K
7. Auto2.png - 2.6M
8. Coins2.png - 3.1M
9. Stamps5.png - 3.3M
10. VHS1.png - 2.7M
11. VintageToys.png - 2.7M

### High Priority (UI & Category Pages)
12. AccountSettings.svg - 4.0K
13. AccountSetup_7b72a15a.svg - 55K
14. Add_To_Your_Inventory.svg - 4.0K
15. Inbox.svg - 3.9K
16. Myinventory_467a8c30.svg - 4.3K
17. ReportaUser_001357ab.svg - 3.9K
18. paypal-logo_62835ee7.png
19. facebook-logo_1fd22cc7.png

### Medium Priority (Sample Listings & Home)
20. sportscards2_50e2e734.png - 111K
21. Vintagetoys2_b56d7fdc.png
22. Comicpage2_6d086599.png
23. Mainpage.jpg - 111K

### Session-Dependent (Manus S3 - Must Migrate)
24. Comics4_ef989684.png
25. SportsCards1_ff8b8611.png
26. VintageToys_dcc69e1c.png

---

## Cleanup Candidates (Unused - 16 files)

These images are not referenced in the codebase and can be removed after migration:

1. tradebilia_final_darkest(1)_3e8b98df.svg - 56K
2. tradebilia_final_spin_fixed(1)_4a57dd7d.svg - 56K
3. tradebilia_final_transparent_443f029c.svg - 56K
4. AccountSetup_ffa83564.svg - 55K
5. HighestTradeValue_f34ed3ff.svg - 55K
6. MostRequested.svg - 4.0K
7. MostViewed.svg - 3.9K
8. Profile.svg - 3.9K
9. RatingsandReview.svg - 4.0K
10. TopRatedTraders.svg - 4.0K
11. TradeHistory.svg - 3.9K
12. TradeProposal.svg - 4.0K
13. TradeRequest.svg - 3.9K
14. ebay-logo_b3d303cb.png
15. pasted_file_BlVRoF_image.png - 521K
16. pasted_file_jGuwJZ_image.png - 26K
17. pasted_file_mngfJz_image.png - 24K
18. pasted_file_nipbm4_image.png - 14K
19. pasted_file_yhRgo4_image.png - 54K

---

## Next Steps

1. ✅ Complete asset audit (THIS DOCUMENT)
2. Create Google Drive folder structure
3. Upload active images to Google Drive
4. Generate shareable links
5. Create ASSET_MAPPING.md with old→new URL mappings
6. Update website code with Google Drive URLs
7. Verify all pages render correctly
8. Clean up unused images from repository
9. Create PROJECT_HANDOFF.md
10. Create SESSION_RECOVERY.md
11. Commit and push to GitHub

---

**Status:** Phase 1 Complete - Ready for Phase 2 (Google Drive Upload)
