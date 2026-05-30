# Tradebilia Asset Inventory

**Last Updated:** May 30, 2026  
**Total Assets:** 37 files (PNG, JPG, SVG, WEBP)  
**Storage Location:** `/assets/` folder (committed to git)  
**Original Storage:** `/manus-storage/` (S3 via Manus Forge)

---

## Asset Organization

All assets are stored in `/home/ubuntu/collectors-barter/assets/` and are committed to the git repository. This ensures they persist across sessions and can be pulled by the next AI session.

### How to Use These Assets

**In Development:**
- Files are available locally in `/assets/` folder
- Reference them in code using relative paths or import statements
- Example: `import logo from '../assets/tradebilia-longform-no-navy-clean_d2f04453.png'`

**In Production:**
- Current code uses `/manus-storage/` URLs (S3 proxy)
- These URLs continue to work and persist
- Local files are for backup and reference only

---

## Asset Categories

### 1. Logo & Branding (5 files)

| File | Usage | Dimensions | Format | Notes |
|------|-------|-----------|--------|-------|
| `tradebilia-longform-no-navy-clean_d2f04453.png` | Main logo (longform) | - | PNG | Used in Account Settings, My Inventory pages |
| `tradebilia_final_darkest(1)_3e8b98df.svg` | Logo variant (dark) | - | SVG | Alternative dark theme logo |
| `tradebilia_final_transparent_443f029c.svg` | Logo variant (transparent) | - | SVG | Transparent background for overlays |
| `tradebilia_final_spin_fixed(1)_4a57dd7d.svg` | Spinning wheel logo | - | SVG | Animated spinning logo for homepage hero |
| `Tradebilialogo_886a61b7.webp` | Logo (WebP format) | - | WEBP | Optimized format for web delivery |

**Usage in Code:**
- `client/src/pages/Home.tsx` - Homepage hero section
- `client/src/pages/Inventory.tsx` - My Inventory page
- `client/src/pages/AccountSettings.tsx` - Account settings page
- `client/src/pages/CategoryPage.tsx` - Category pages (Sports Cards, Comics, etc.)

---

### 2. Category Background Images (10 files)

| File | Category | Dimensions | Format | Notes |
|------|----------|-----------|--------|-------|
| `sportscards2_50e2e734.png` | Sports Cards | Full-width | PNG | Teal & cream sports card marketplace aesthetic |
| `Comicpage2_6d086599.png` | Comics | Full-width | PNG | Comic book collection with graded slabs |
| `Pokemon_095946ab.png` | Pokemon | Full-width | PNG | Graded Pokemon cards with holographic shine |
| `VideoGames_dd67123d.png` | Video Games | Full-width | PNG | Retro arcade with neon lighting |
| `Stamps1_9eaf705a.png` | Stamps | Full-width | PNG | Lavender philatelic aesthetic |
| `Coins_353ff538.png` | Coins | Full-width | PNG | Numismatic collection background |
| `Vintagetoys2_b56d7fdc.png` | Vintage Toys | Full-width | PNG | Muted silver & gold vintage toy aesthetic |
| `Movies2_d17cc5ad.png` | Movies | Full-width | PNG | Movie poster collection background |
| `Autographs_5775ffb1.png` | Autographs | Full-width | PNG | Signed memorabilia collection |
| `Disney_e4ae94b5.png` | Disney Pins | Full-width | PNG | Elegant pin collection with gold frames |

**Usage in Code:**
- `client/src/pages/CategoryPage.tsx` - Dynamic category pages
- Each category uses a unique background image in the hero section
- Images are applied via CSS `backgroundImage` property with opacity overlay

**CSS Pattern:**
```css
backgroundImage: `url('/manus-storage/sportscards2_50e2e734.png')`
backgroundSize: 'cover'
backgroundPosition: 'center'
opacity: 0.35
```

---

### 3. UI Component Assets (8 files)

| File | Component | Usage | Format | Notes |
|------|-----------|-------|--------|-------|
| `AccountSetup_7b72a15a.svg` | Account Setup | Step indicator icon | SVG | Used in Account Setup wizard |
| `AccountSetup_ffa83564.svg` | Account Setup | Alternative step indicator | SVG | Variant for different states |
| `Myinventory_467a8c30.svg` | My Inventory | Page icon/header | SVG | Inventory page branding |
| `ReportaUser_001357ab.svg` | Report User | Page icon/header | SVG | Report user page branding |
| `HighestTradeValue_f34ed3ff.svg` | Dashboard | Stat card icon | SVG | Used in homepage stats section |
| `arrows_transparent_25a2bc2f.png` | Navigation | Directional arrows | PNG | Used in carousel/navigation |
| `ebay-logo_b3d303cb.png` | OAuth Integration | eBay branding | PNG | eBay connection button |
| `facebook-logo_1fd22cc7.png` | OAuth Integration | Facebook branding | PNG | Facebook login option (Account Setup Step 2) |

**Usage in Code:**
- `client/src/pages/AccountSetup.tsx` - Account setup wizard icons
- `client/src/pages/Inventory.tsx` - Inventory page header
- `client/src/pages/ReportUser.tsx` - Report user page header
- `client/src/components/EbayConnection.tsx` - eBay OAuth button
- `client/src/pages/Home.tsx` - Homepage stat cards

---

### 4. Sample Listing Images (14 files)

These are example collectible items displayed in the marketplace and category pages.

#### Sports Cards (5 files)
| File | Item | Year | Condition | Format |
|------|------|------|-----------|--------|
| `1986-87 Michael Jordan_a9dcf0a5.jpg` | Michael Jordan Rookie | 1986-87 | Graded | JPG |
| `michael-jordan-rookie_4440f620.jpg` | Michael Jordan Rookie | 1986 | Graded | JPG |
| `1981JoeMontana_f9fb9609.png` | Joe Montana Rookie | 1981 | Graded | PNG |
| `1990MartinBrodeur_b8430777.png` | Martin Brodeur Rookie | 1990 | Graded | PNG |
| `walter-payton-rookie_9fa05678.png` | Walter Payton Rookie | 1976 | Graded | PNG |

#### Pokemon Cards (3 files)
| File | Item | Year | Condition | Format |
|------|------|------|-----------|--------|
| `1999 Charizard - Holo_8a01b3b9.png` | Charizard Holo | 1999 | Mint | PNG |
| `2022 Charizard V_ca4f6c17.png` | Charizard V | 2022 | Mint | PNG |
| `2019 Sun & Moon_fd3c941d.png` | Sun & Moon Set | 2019 | Mint | PNG |

#### Other Collectibles (6 files)
| File | Item | Category | Format |
|------|------|----------|--------|
| `Edge of Spider-Verse 2_29f507ed.png` | Comic Book | Comics | PNG |
| `Star Wars 1_6bc27ee5.png` | Star Wars Poster | Movies | PNG |
| `rickey-henderson-rookie_49b0e3a1.png` | Rickey Henderson Card | Sports Cards | PNG |
| `paypal-logo_62835ee7.png` | PayPal Logo | UI Asset | PNG |
| `Pokemon_bf82cd71.png` | Pokemon Card | Pokemon | PNG |
| `DisneyPins_b2a9e148.png` | Disney Pins | Disney Pins | PNG |

**Usage in Code:**
- `server/db.ts` - Sample listings database seed
- `client/src/pages/CategoryPage.tsx` - Display in category pages
- `client/src/pages/Home.tsx` - Recently Added carousel

---

## Asset Statistics

| Metric | Value |
|--------|-------|
| Total Files | 37 |
| PNG Files | 28 |
| JPG Files | 2 |
| SVG Files | 5 |
| WEBP Files | 1 |
| Total Size | ~2 MB |
| Largest File | ~150 KB (category backgrounds) |
| Smallest File | ~5 KB (SVG icons) |

---

## How to Reference Assets in Code

### Current Production URLs (S3 via Manus Forge)
```typescript
// These URLs are currently used in production
const logoUrl = "/manus-storage/tradebilia-longform-no-navy-clean_d2f04453.png";
const categoryBg = "/manus-storage/sportscards2_50e2e734.png";
```

### Local File References (for development/fallback)
```typescript
// Import from local assets folder
import logo from '../assets/tradebilia-longform-no-navy-clean_d2f04453.png';
import sportscardsBg from '../assets/sportscards2_50e2e734.png';
```

### CSS Background Images
```css
/* Using manus-storage URLs */
background-image: url('/manus-storage/sportscards2_50e2e734.png');

/* Using local files (if migrating) */
background-image: url('/assets/sportscards2_50e2e734.png');
```

---

## File Naming Convention

All files use the format: `{DescriptiveName}_{UniqueHash}.{extension}`

- **DescriptiveName:** Human-readable name (e.g., "tradebilia-longform", "sportscards2")
- **UniqueHash:** 8-character hash (e.g., "d2f04453") - ensures uniqueness when re-uploading
- **Extension:** File type (.png, .jpg, .svg, .webp)

**Example:** `tradebilia-longform-no-navy-clean_d2f04453.png`

---

## Asset Recovery Instructions for Next Session

### If Assets Are Missing:

1. **Check Local Folder:**
   ```bash
   ls -la /home/ubuntu/collectors-barter/assets/
   ```

2. **If Local Files Exist:**
   - Copy them to `/home/ubuntu/webdev-static-assets/`
   - Re-upload using `manus-upload-file --webdev` to get new S3 URLs
   - Update code references

3. **If Local Files Missing:**
   - Pull from git: `git pull origin main`
   - Assets should be restored from git history

4. **If S3 URLs Broken:**
   - Use local files as backup
   - Re-upload to S3
   - Update code references

---

## Git Commit Information

**Commit Message:** "Add all 37 branding and UI assets to /assets/ folder for persistence"

**Files Added:**
- `/assets/` folder with 37 image files
- `ASSET_INVENTORY.md` (this file)

**Why This Matters:**
- Assets are now version-controlled in git
- Next session can pull changes and have all assets immediately available
- Backup of all S3-stored assets locally
- Clear documentation of what each asset is used for

---

## Troubleshooting

### Images Not Loading in Development

**Problem:** Images show broken links or 404 errors

**Solution:**
1. Verify `/assets/` folder exists: `ls /home/ubuntu/collectors-barter/assets/`
2. Check file permissions: `chmod 644 /home/ubuntu/collectors-barter/assets/*`
3. Verify git pull included assets: `git log --name-status | head -20`
4. Re-upload to S3 if needed: `manus-upload-file --webdev assets/*`

### Images Not Loading in Production

**Problem:** `/manus-storage/` URLs returning 404

**Solution:**
1. Check if S3 files still exist (they should persist)
2. Verify URL format is correct (no spaces, proper encoding)
3. Use local `/assets/` files as fallback
4. Re-upload using `manus-upload-file --webdev` to get new URLs

### File Size Issues

**Problem:** Build or deployment failing due to large files

**Solution:**
1. Compress PNG files: `pngquant --quality=70-90 *.png`
2. Convert to WebP: `cwebp -q 80 image.png -o image.webp`
3. Optimize SVGs: Use SVGO tool
4. Store only in S3, not in git (if size becomes issue)

---

## Next Steps for Session 2

1. **Pull Latest Code:**
   ```bash
   cd /home/ubuntu/collectors-barter
   git pull origin main
   ```

2. **Verify Assets:**
   ```bash
   ls -la assets/ | wc -l  # Should show 37 files
   ```

3. **If Assets Missing:**
   - Refer to "Asset Recovery Instructions" section above
   - Re-upload to S3 if needed

4. **Continue Development:**
   - Assets are ready to use
   - No need to re-generate or re-upload
   - All URLs remain the same

---

## Related Documentation

- **PROJECT_CONTEXT.md** - Complete project overview
- **ROADMAP.md** - Development priorities
- **API_ARCHITECTURE.md** - API endpoints
- **DATABASE_SCHEMA.md** - Database tables
- **KNOWN_ISSUES.md** - Known bugs and issues
- **AI_RULES.md** - Coding standards
- **NEXT_SESSION_PROMPT.md** - Session 2 instructions

---

**Created By:** Manus AI (Session 1)  
**Date:** May 30, 2026  
**Version:** 1.0  
**Status:** Ready for Session 2
