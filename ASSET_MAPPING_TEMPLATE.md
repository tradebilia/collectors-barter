# Asset Mapping - Old URLs to Google Drive URLs

**Purpose:** Track all image URL migrations from local/Manus S3 to Google Drive

**Status:** Template - To be filled after Google Drive upload

---

## Instructions

After uploading all files to Google Drive:

1. For each file, right-click and select **Share**
2. Change to "Viewer" access
3. Copy the shareable link
4. Replace the `[GOOGLE_DRIVE_LINK]` placeholders below with actual links
5. Save this file as `ASSET_MAPPING.md`

---

## Mapping Reference

### Logos

| Old URL | New Google Drive URL | File Size | Status |
|---------|---------------------|-----------|--------|
| `/images/tradebilia-logo.svg` | [GOOGLE_DRIVE_LINK] | 4.2K | ⏳ Pending |
| `/images/paypal-logo_62835ee7.png` | [GOOGLE_DRIVE_LINK] | ~50K | ⏳ Pending |
| `/images/facebook-logo_1fd22cc7.png` | [GOOGLE_DRIVE_LINK] | ~50K | ⏳ Pending |
| `/images/ebay-logo_b3d303cb.png` | [GOOGLE_DRIVE_LINK] | ~50K | ⏳ Pending |

### Category Backgrounds

| Old URL | New Google Drive URL | Category | Status |
|---------|---------------------|----------|--------|
| `/images/Sportscardwallpaper.webp` | [GOOGLE_DRIVE_LINK] | Sports Cards | ⏳ Pending |
| `https://d2xsxph8kpxj0f.cloudfront.net/.../comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp` | [GOOGLE_DRIVE_LINK] | Comics | ⏳ Pending |
| `https://d2xsxph8kpxj0f.cloudfront.net/.../pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp` | [GOOGLE_DRIVE_LINK] | Pokemon | ⏳ Pending |
| `https://d2xsxph8kpxj0f.cloudfront.net/.../video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp` | [GOOGLE_DRIVE_LINK] | Video Games | ⏳ Pending |
| `https://d2xsxph8kpxj0f.cloudfront.net/.../disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp` | [GOOGLE_DRIVE_LINK] | Disney Pins | ⏳ Pending |
| `/images/VintageToys.png` | [GOOGLE_DRIVE_LINK] | Vintage Toys | ⏳ Pending |
| `/images/Coins2.png` | [GOOGLE_DRIVE_LINK] | Coins | ⏳ Pending |
| `/images/Stamps5.png` | [GOOGLE_DRIVE_LINK] | Stamps | ⏳ Pending |
| `/images/Auto2.png` | [GOOGLE_DRIVE_LINK] | Autographs | ⏳ Pending |
| `/images/VHS1.png` | [GOOGLE_DRIVE_LINK] | Movies | ⏳ Pending |

### UI Icons

| Old URL | New Google Drive URL | Used In | Status |
|---------|---------------------|---------|--------|
| `/images/AccountSettings.svg` | [GOOGLE_DRIVE_LINK] | AccountSettings | ⏳ Pending |
| `/images/AccountSetup_7b72a15a.svg` | [GOOGLE_DRIVE_LINK] | AccountSetup | ⏳ Pending |
| `/images/Add_To_Your_Inventory.svg` | [GOOGLE_DRIVE_LINK] | AddInventory | ⏳ Pending |
| `/images/Inbox.svg` | [GOOGLE_DRIVE_LINK] | Messages | ⏳ Pending |
| `/images/Myinventory_467a8c30.svg` | [GOOGLE_DRIVE_LINK] | Inventory | ⏳ Pending |
| `/images/ReportaUser_001357ab.svg` | [GOOGLE_DRIVE_LINK] | ReportUser | ⏳ Pending |

### Sample Listings

| Old URL | New Google Drive URL | Used In | Status |
|---------|---------------------|---------|--------|
| `/images/sportscards2_50e2e734.png` | [GOOGLE_DRIVE_LINK] | Home | ⏳ Pending |
| `/images/Vintagetoys2_b56d7fdc.png` | [GOOGLE_DRIVE_LINK] | Home | ⏳ Pending |
| `/images/Comicpage2_6d086599.png` | [GOOGLE_DRIVE_LINK] | Home | ⏳ Pending |
| `/images/Mainpage.jpg` | [GOOGLE_DRIVE_LINK] | Home | ⏳ Pending |

### Category Logos (Manus S3 - Session Dependent)

| Old URL | New Google Drive URL | Category | Status |
|---------|---------------------|----------|--------|
| `/manus-storage/Comics4_ef989684.png` | [GOOGLE_DRIVE_LINK] | Comics | ⏳ Pending |
| `/manus-storage/SportsCards1_ff8b8611.png` | [GOOGLE_DRIVE_LINK] | Sports Cards | ⏳ Pending |
| `/manus-storage/VintageToys_dcc69e1c.png` | [GOOGLE_DRIVE_LINK] | Vintage Toys | ⏳ Pending |

---

## Google Drive Link Format

Each shareable link will look like:
```
https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
```

Example:
```
https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p/view?usp=sharing
```

---

## How to Generate Shareable Links

1. Go to Google Drive
2. Find the file in `Tradebilia Assets` folder
3. Right-click → **Share**
4. Change access to **Viewer**
5. Copy link
6. Paste into this document

---

## Code Update Reference

After filling in all Google Drive URLs, update these files:

### Files to Update:
- `client/src/pages/CategoryPage.tsx` - Category background URLs
- `client/src/pages/ItemDetail.tsx` - Category background URLs
- `client/src/pages/Home.tsx` - Sample listing images, hero background
- `client/src/pages/AccountSettings.tsx` - Logo and background URLs
- `client/src/pages/AccountSetup.tsx` - Logo and background URLs
- `client/src/pages/AddInventory.tsx` - Logo and background URLs
- `client/src/pages/Inventory.tsx` - Logo and background URLs
- `client/src/pages/Profile.tsx` - Logo URLs
- `client/src/pages/PublicProfile.tsx` - Logo URLs
- `client/src/pages/Messages.tsx` - Icon URLs
- `client/src/pages/ReportUser.tsx` - Logo and icon URLs
- `client/src/pages/ReferralRequest.tsx` - Logo URLs
- `client/src/pages/Watchlist.tsx` - Logo URLs
- `client/src/lib/tradebilia.ts` - Logo constant
- `client/src/lib/listingImages.ts` - Sample listing images

---

## Verification

After updating all URLs, verify:

- [ ] All 23 Google Drive links are valid
- [ ] Links are shareable (not requiring login)
- [ ] Images load correctly in browser
- [ ] No broken image references
- [ ] All category pages display backgrounds
- [ ] All UI icons appear correctly
- [ ] Sample listings show images

---

## Session Recovery

In a new session, use this mapping to:

1. Verify all Google Drive links still work
2. Update any broken references
3. Ensure no images are missing
4. Confirm session continuity

---

**Status:** Template - Ready for Google Drive upload and link generation

**Next Steps:**
1. Upload all files to Google Drive (see GOOGLE_DRIVE_SETUP.md)
2. Generate shareable links
3. Fill in this mapping document
4. Update website code
5. Verify all images load
6. Commit to GitHub
