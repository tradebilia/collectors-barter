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

**Current URL Type:** S3 (temporary)
**Target URL Type:** GitHub (permanent)
**Status:** ⏳ PENDING - Execute steps above before session end

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
