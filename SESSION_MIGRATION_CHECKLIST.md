# Session Migration Checklist - S3 to GitHub Image URLs

## CRITICAL: Before Moving to a New Session

This document outlines the required steps to transition from temporary S3 image URLs to permanent GitHub image URLs before ending the current session.

### Why This Is Needed

- **Manus Checkpoint Limitation:** Files >1MB cannot be committed to the repository, blocking checkpoint saves
- **Workaround:** Use temporary S3 URLs to enable checkpoints, then switch to GitHub URLs before session ends
- **Problem:** S3 images are session-specific and won't be accessible in the next session
- **Solution:** Replace S3 URLs with GitHub URLs before ending the session

### Background Images on GitHub

All background images are permanently stored on GitHub:
- ✅ CoinsBackground.png - HTTP 200
- ✅ StampsBackground.png - HTTP 200
- ✅ VintageToysBackground.png - HTTP 200
- ✅ AutoBackground.png - HTTP 200
- ✅ VHSBackground.png - HTTP 200

All title images are permanently stored on GitHub:
- ✅ ComicsTitle.png
- ✅ DisneyPinsTitle.png
- ✅ MoviesTitle.png
- ✅ PokemonTitle.png
- ✅ SportsCardsTitle.png
- ✅ VintageToysTitle.png
- ✅ CoinsTitle.webp
- ✅ StampsTitle.webp
- ✅ VideoGamesTitle.webp

### Steps to Execute Before Ending Session

**Step 1: Update CategoryPage.tsx**
- Replace all S3 image URLs with GitHub raw URLs
- File location: `/home/ubuntu/collectors-barter/client/src/pages/CategoryPage.tsx`
- Search for: `https://manus-storage` or S3 URLs
- Replace with: `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/[filename]`

**Step 2: Verify Images Load Correctly**
- Navigate to each category page in the browser
- Confirm all background images display
- Confirm all title images display

**Step 3: Commit and Push Changes**
```bash
cd /home/ubuntu/collectors-barter
git add client/src/pages/CategoryPage.tsx
git commit -m "Switch image URLs from S3 to GitHub"
git push github main
```

**Step 4: Save Final Checkpoint**
- Run `webdev_save_checkpoint` with description: "Switch to GitHub image URLs before session end"
- This checkpoint will have GitHub URLs embedded in the code

**Step 5: End Session**
- S3 images are no longer needed
- GitHub images are permanent and will work in next session

### Next Session Recovery

When starting a new session:
1. Code will load with GitHub URLs already in place
2. All images will load from GitHub (permanent storage)
3. No broken S3 links
4. No additional migration needed
5. Everything works seamlessly

### Current Session Status

**Current URL Type:** S3 (temporary) ✅ ACTIVE
**Target URL Type:** GitHub (permanent) ⏳ PENDING
**Status:** S3 URLs currently in use - Ready to switch to GitHub before session end
**Checkpoint Saved:** Version 745fa979 (with S3 URLs)

### S3 ↔ GitHub URL Mapping (CRITICAL FOR SESSION SWITCH)

**Background Images - S3 to GitHub Mapping:**

| Category | S3 URL (Current) | GitHub URL (Target) | File Name |
|----------|------------------|-------------------|----------|
| Home Page | `/manus-storage/Mainpage_9b45311d.jpg` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Mainpage.jpg` | Mainpage.jpg |
| Sports Cards | `/manus-storage/Sportscardwallpaper_bc1c7d7a.webp` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Sportscardwallpaper.webp` | Sportscardwallpaper.webp |
| Video Games | `/manus-storage/video-games-background-kyx4vVUqTYCMC3kMbtokYU_c9f7dffa.webp` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp` | video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp |
| Coins | `/manus-storage/CoinsBackground_ef9aac41.png` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/CoinsBackground.png` | CoinsBackground.png |
| Stamps | `/manus-storage/StampsBackground_381d3e98.png` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/StampsBackground.png` | StampsBackground.png |
| Vintage Toys | `/manus-storage/VintageToysBackground_8ab6860f.png` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/VintageToysBackground.png` | VintageToysBackground.png |
| Autographs | `/manus-storage/AutoBackground_d025a571.png` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/AutoBackground.png` | AutoBackground.png |
| Movies | `/manus-storage/VHSBackground_99756671.png` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/VHSBackground.png` | VHSBackground.png |
| Comics | `/manus-storage/comics-background-YZiiH2cyV8YJx6GFQj4PKC_2cc313bb.webp` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp` | comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp |
| Pokemon | `/manus-storage/pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj_d1df88b6.webp` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp` | pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp |
| Disney Pins | `/manus-storage/disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8_172dee25.webp` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp` | disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp |

**Logo - S3 to GitHub Mapping:**

| Asset | S3 URL (Current) | GitHub URL (Target) | File Name |
|-------|------------------|-------------------|----------|
| Tradebilia Logo | `/manus-storage/tradebilia-logo_c676d640.svg` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/tradebilia-logo.svg` | tradebilia-logo.svg |

**Title Images - S3 to GitHub Mapping:**

| Category | S3 URL (Current) | GitHub URL (Target) | File Name |
|----------|------------------|-------------------|----------|
| Comics | `/manus-storage/ComicsTitle_b915b61d.png` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/ComicsTitle.png` | ComicsTitle.png |
| Disney Pins | `/manus-storage/DisneyPinsTitle_dc12f61b.png` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/DisneyPinsTitle.png` | DisneyPinsTitle.png |
| Pokemon | `/manus-storage/PokemonTitle_eaf0db72.png` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/PokemonTitle.png` | PokemonTitle.png |
| Sports Cards | `/manus-storage/SportsCardsTitle_db2535b2.png` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/SportsCardsTitle.png` | SportsCardsTitle.png |
| Vintage Toys | `/manus-storage/VintageToysTitle_11b8cdd9.png` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/VintageToysTitle.png` | VintageToysTitle.png |
| Coins | `/manus-storage/CoinsTitle_40d49d1d.webp` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/CoinsTitle.webp` | CoinsTitle.webp (updated with improved transparent background) |
| Stamps | `/manus-storage/StampsTitle_cc0e76c3.webp` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/StampsTitle.webp` | StampsTitle.webp |
| Video Games | `/manus-storage/VideoGamesTitle_af9bf208.webp` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/VideoGamesTitle.webp` | VideoGamesTitle.webp |
| Movies | `/manus-storage/MoviesTitle_0e6931a4.png` | `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/MoviesTitle.png` | MoviesTitle.png |

### Quick Reference

**S3 URL Pattern:**
```
https://manus-storage/[key]
```

**GitHub URL Pattern:**
```
https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/[filename]
```

### Files to Update

- `client/src/pages/CategoryPage.tsx` - Contains all image URL references

### Verification Commands

Check if images are on GitHub:
```bash
curl -I "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/CoinsBackground.png"
```

Should return: `HTTP/2 200`
