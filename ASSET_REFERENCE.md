# Tradebilia Asset Reference

**Status:** All assets are stored in S3 via Manus Forge  
**Access Method:** `/manus-storage/` proxy URLs (persistent and reliable)  
**Last Updated:** May 30, 2026

---

## Important Note

All Tradebilia branding and UI assets are stored in **S3 via Manus Forge** and are accessible through persistent `/manus-storage/` URLs. These URLs work in both development and production environments.

**Do NOT attempt to store binary image files in git.** The `/manus-storage/` URLs are the source of truth for all assets.

---

## Asset Categories & URLs

### 1. Logo & Branding (5 assets)

| Asset | URL | Usage | Format |
|-------|-----|-------|--------|
| Tradebilia Longform Logo | `/manus-storage/tradebilia-longform-no-navy-clean_d2f04453.png` | Account Settings, My Inventory pages | PNG |
| Tradebilia Dark Logo | `/manus-storage/tradebilia_final_darkest(1)_3e8b98df.svg` | Alternative dark theme | SVG |
| Tradebilia Transparent Logo | `/manus-storage/tradebilia_final_transparent_443f029c.svg` | Overlays and backgrounds | SVG |
| Tradebilia Spinning Wheel | `/manus-storage/tradebilia_final_spin_fixed(1)_4a57dd7d.svg` | Homepage hero animation | SVG |
| Tradebilia WebP Logo | `/manus-storage/Tradebilialogo_886a61b7.webp` | Optimized web format | WEBP |

**Code Usage:**
```typescript
// client/src/pages/Home.tsx
const LOGO_URL = "/manus-storage/tradebilia-longform-no-navy-clean_d2f04453.png";

// client/src/pages/CategoryPage.tsx
const logoUrl = "/manus-storage/tradebilia_final_spin_fixed(1)_4a57dd7d.svg";
```

---

### 2. Category Background Images (10 assets)

Each category page has a unique hero background image.

| Category | URL | Format | Usage |
|----------|-----|--------|-------|
| Sports Cards | `/manus-storage/sportscards2_50e2e734.png` | PNG | Hero background with teal & cream aesthetic |
| Comics | `/manus-storage/Comicpage2_6d086599.png` | PNG | Comic book collection with graded slabs |
| Pokemon | `/manus-storage/Pokemon_095946ab.png` | PNG | Graded Pokemon cards with holographic shine |
| Video Games | `/manus-storage/VideoGames_dd67123d.png` | PNG | Retro arcade with neon lighting |
| Stamps | `/manus-storage/Stamps1_9eaf705a.png` | PNG | Lavender philatelic collection |
| Coins | `/manus-storage/Coins_353ff538.png` | PNG | Numismatic collection background |
| Vintage Toys | `/manus-storage/Vintagetoys2_b56d7fdc.png` | PNG | Muted silver & gold vintage aesthetic |
| Movies | `/manus-storage/Movies2_d17cc5ad.png` | PNG | Movie poster collection |
| Autographs | `/manus-storage/Autographs_5775ffb1.png` | PNG | Signed memorabilia collection |
| Disney Pins | `/manus-storage/Disney_e4ae94b5.png` | PNG | Elegant pin collection with gold frames |

**Code Usage:**
```typescript
// client/src/pages/CategoryPage.tsx
const CATEGORY_BACKGROUNDS: Record<string, string> = {
  sports_cards: "/manus-storage/sportscards2_50e2e734.png",
  comics: "/manus-storage/Comicpage2_6d086599.png",
  pokemon: "/manus-storage/Pokemon_095946ab.png",
  video_games: "/manus-storage/VideoGames_dd67123d.png",
  stamps: "/manus-storage/Stamps1_9eaf705a.png",
  coins: "/manus-storage/Coins_353ff538.png",
  vintage_toys: "/manus-storage/Vintagetoys2_b56d7fdc.png",
  movies: "/manus-storage/Movies2_d17cc5ad.png",
  autographs: "/manus-storage/Autographs_5775ffb1.png",
  disney_pins: "/manus-storage/Disney_e4ae94b5.png",
};

// CSS usage
style={{
  backgroundImage: `url('${CATEGORY_BACKGROUNDS[category]}')`
}}
```

---

### 3. UI Component Assets (8 assets)

| Component | URL | Usage | Format |
|-----------|-----|-------|--------|
| Account Setup Icon 1 | `/manus-storage/AccountSetup_7b72a15a.svg` | Account Setup wizard step indicator | SVG |
| Account Setup Icon 2 | `/manus-storage/AccountSetup_ffa83564.svg` | Alternative Account Setup indicator | SVG |
| My Inventory Icon | `/manus-storage/Myinventory_467a8c30.svg` | My Inventory page header | SVG |
| Report User Icon | `/manus-storage/ReportaUser_001357ab.svg` | Report User page header | SVG |
| Highest Trade Value Icon | `/manus-storage/HighestTradeValue_f34ed3ff.svg` | Dashboard stat card icon | SVG |
| Navigation Arrows | `/manus-storage/arrows_transparent_25a2bc2f.png` | Carousel navigation | PNG |
| eBay Logo | `/manus-storage/ebay-logo_b3d303cb.png` | eBay OAuth connection button | PNG |
| Facebook Logo | `/manus-storage/facebook-logo_1fd22cc7.png` | Facebook login option (Account Setup) | PNG |

**Code Usage:**
```typescript
// client/src/components/EbayConnection.tsx
<img src="/manus-storage/ebay-logo_b3d303cb.png" alt="eBay" />

// client/src/pages/Home.tsx
<img src="/manus-storage/HighestTradeValue_f34ed3ff.svg" alt="Trades" />
```

---

### 4. Sample Listing Images (14 assets)

These are example collectible items displayed in the marketplace.

#### Sports Cards
| Item | URL | Year | Format |
|------|-----|------|--------|
| Michael Jordan Rookie | `/manus-storage/1986-87%20Michael%20Jordan_a9dcf0a5.jpg` | 1986-87 | JPG |
| Michael Jordan Rookie Alt | `/manus-storage/michael-jordan-rookie_4440f620.jpg` | 1986 | JPG |
| Joe Montana Rookie | `/manus-storage/1981JoeMontana_f9fb9609.png` | 1981 | PNG |
| Martin Brodeur Rookie | `/manus-storage/1990MartinBrodeur_b8430777.png` | 1990 | PNG |
| Walter Payton Rookie | `/manus-storage/walter-payton-rookie_9fa05678.png` | 1976 | PNG |

#### Pokemon Cards
| Item | URL | Year | Format |
|------|-----|------|--------|
| Charizard Holo | `/manus-storage/1999%20Charizard%20-%20Holo_8a01b3b9.png` | 1999 | PNG |
| Charizard V | `/manus-storage/2022%20Charizard%20V_ca4f6c17.png` | 2022 | PNG |
| Sun & Moon Set | `/manus-storage/2019%20Sun%20%26%20Moon_fd3c941d.png` | 2019 | PNG |

#### Other Collectibles
| Item | URL | Category | Format |
|------|-----|----------|--------|
| Edge of Spider-Verse 2 | `/manus-storage/Edge%20of%20Spider-Verse%202_29f507ed.png` | Comics | PNG |
| Star Wars Poster | `/manus-storage/Star%20Wars%201_6bc27ee5.png` | Movies | PNG |
| Rickey Henderson Card | `/manus-storage/rickey-henderson-rookie_49b0e3a1.png` | Sports Cards | PNG |
| PayPal Logo | `/manus-storage/paypal-logo_62835ee7.png` | UI Asset | PNG |
| Pokemon Card Alt | `/manus-storage/Pokemon_bf82cd71.png` | Pokemon | PNG |
| Disney Pins | `/manus-storage/DisneyPins_b2a9e148.png` | Disney Pins | PNG |

**Code Usage:**
```typescript
// server/db.ts - Sample listings
const SAMPLE_LISTINGS = [
  {
    imageUrl: "/manus-storage/1986-87%20Michael%20Jordan_a9dcf0a5.jpg",
    title: "1986-87 Michael Jordan Rookie",
    category: "sports_cards",
  },
  // ... more listings
];
```

---

## How to Use These URLs

### In React Components
```typescript
// Direct image tag
<img src="/manus-storage/tradebilia-longform-no-navy-clean_d2f04453.png" alt="Logo" />

// Background image
<div style={{
  backgroundImage: `url('/manus-storage/sportscards2_50e2e734.png')`
}}>
  Content
</div>
```

### In CSS
```css
.hero-background {
  background-image: url('/manus-storage/sportscards2_50e2e734.png');
  background-size: cover;
  background-position: center;
}
```

### In TypeScript
```typescript
const LOGO_URL = "/manus-storage/tradebilia-longform-no-navy-clean_d2f04453.png";
const imageSrc = "/manus-storage/1986-87%20Michael%20Jordan_a9dcf0a5.jpg";
```

---

## URL Encoding Notes

Some URLs contain spaces or special characters that are URL-encoded:

| Original | Encoded |
|----------|---------|
| `1986-87 Michael Jordan` | `1986-87%20Michael%20Jordan` |
| `1999 Charizard - Holo` | `1999%20Charizard%20-%20Holo` |
| `2019 Sun & Moon` | `2019%20Sun%20%26%20Moon` |
| `Edge of Spider-Verse 2` | `Edge%20of%20Spider-Verse%202` |
| `Star Wars 1` | `Star%20Wars%201` |

**Always use the encoded version in code** to ensure URLs work correctly in all browsers and environments.

---

## Asset Persistence

✅ **All `/manus-storage/` URLs are persistent and permanent**

- Stored in S3 via Manus Forge
- Will not expire or change
- Accessible from any environment (dev, staging, production)
- No additional authentication required
- Automatic CDN caching for performance

---

## If Assets Are Missing

### Troubleshooting Steps

1. **Verify URL is correct:**
   ```bash
   # Check if URL is accessible
   curl -I https://collexchange-nax6atm2.manus.space/manus-storage/tradebilia-longform-no-navy-clean_d2f04453.png
   ```

2. **Check for URL encoding issues:**
   - Spaces should be `%20`
   - Ampersands should be `%26`
   - Parentheses should be `%28` and `%29`

3. **Verify in browser:**
   - Open the full URL in browser
   - Should display the actual image, not an error page
   - If you see HTML error page, the asset may be missing from S3

4. **Re-upload if needed:**
   ```bash
   # Use manus-upload-file to re-upload
   manus-upload-file --webdev path/to/image.png
   # This will generate a new /manus-storage/ URL
   ```

---

## Session 2 Instructions

When starting Session 2:

1. **Do NOT attempt to download or commit binary image files to git**
2. **Use the `/manus-storage/` URLs directly** - they are the source of truth
3. **Reference this file** (ASSET_REFERENCE.md) for all asset URLs
4. **If any URL is broken:**
   - Check the URL encoding
   - Verify the asset exists in S3
   - Re-upload using `manus-upload-file --webdev` if needed

---

## Related Documentation

- **ASSET_INVENTORY.md** - Detailed asset descriptions and usage patterns (deprecated - use this file instead)
- **PROJECT_CONTEXT.md** - Complete project overview
- **NEXT_SESSION_PROMPT.md** - Session 2 instructions

---

**Created By:** Manus AI (Session 1)  
**Date:** May 30, 2026  
**Version:** 1.0  
**Status:** Ready for Session 2

**Note:** This file replaces the previous ASSET_INVENTORY.md which contained corrupt binary files. All assets are now referenced by their persistent `/manus-storage/` URLs.
