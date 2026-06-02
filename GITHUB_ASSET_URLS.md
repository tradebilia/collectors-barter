# GitHub Asset URLs - Persistent Storage

**Status:** All images migrated to GitHub for session-independent access

**Base URL:** `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/`

---

## Image URLs

### Logos
- `tradebilia-logo.svg` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/tradebilia-logo.svg`

### Category Backgrounds
- `Sportscardwallpaper.webp` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Sportscardwallpaper.webp`
- `comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp`
- `pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp`
- `video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp`
- `disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp`
- `VintageToys.png` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/VintageToys.png`
- `Coins2.png` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Coins2.png`
- `Stamps5.png` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Stamps5.png`
- `Auto2.png` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Auto2.png`
- `VHS1.png` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/VHS1.png`

### UI Icons
- `AccountSettings.svg` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/AccountSettings.svg`
- `AccountSetup_7b72a15a.svg` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/AccountSetup_7b72a15a.svg`
- `Add_To_Your_Inventory.svg` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Add_To_Your_Inventory.svg`
- `Inbox.svg` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Inbox.svg`
- `Myinventory_467a8c30.svg` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Myinventory_467a8c30.svg`
- `ReportaUser_001357ab.svg` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/ReportaUser_001357ab.svg`

### Sample Listings
- `Mainpage.jpg` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Mainpage.jpg`

### Category Logos (Previously Manus S3)
- `Comics4_ef989684.png` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Comics4_ef989684.png`
- `SportsCards1_ff8b8611.png` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/SportsCards1_ff8b8611.png`
- `VintageToys_dcc69e1c.png` → `https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/VintageToys_dcc69e1c.png`

---

## Benefits

✅ **Persistent URLs** - Work across all sessions forever  
✅ **Version Control** - Track image changes in git history  
✅ **No External Dependencies** - Everything in one repository  
✅ **Free Unlimited Storage** - GitHub provides free storage  
✅ **CDN Delivery** - GitHub raw content is CDN-served  
✅ **Automatic Backups** - Backed up with git history  

---

## Usage in Code

Replace all image references with GitHub raw URLs:

**Before (Session-Dependent):**
```tsx
<img src="/manus-storage/Comics4_ef989684.png" alt="Comics" />
<img src="https://d2xsxph8kpxj0f.cloudfront.net/.../comics-background.webp" alt="Comics" />
```

**After (Persistent):**
```tsx
<img src="https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Comics4_ef989684.png" alt="Comics" />
<img src="https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp" alt="Comics" />
```

---

## Adding New Images

When adding new images:

1. Save to `assets/images/` folder
2. Commit to GitHub: `git add assets/images/* && git commit -m "Add new image"`
3. Push to main: `git push github main`
4. Use the GitHub raw URL in code

---

## Session Recovery

In a new session:

1. Clone the repository: `gh repo clone tradebilia/collectors-barter`
2. All images are automatically available in `assets/images/`
3. All GitHub URLs work immediately (no session-specific context)
4. No broken links or missing assets

---

**Status:** ✅ All images migrated to GitHub for persistent, session-independent storage
