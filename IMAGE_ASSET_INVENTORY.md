# Image Asset Inventory

**Purpose:** Track all images currently in S3 and plan migration to GitHub  
**Last Updated:** August 11, 2026  
**Status:** Ready for migration

---

## Migration Strategy

All images should be migrated from S3 (`/manus-storage/...`) to GitHub (`/public/assets/...`) to ensure persistence across sessions.

### Directory Structure in GitHub

```
public/
└── assets/
    ├── backgrounds/
    │   ├── hero-main.jpg                    (Background_48b923f1.jpg)
    │   ├── category-sports-cards.webp
    │   ├── category-comics.webp
    │   ├── category-vintage-toys.png
    │   ├── category-video-games.webp
    │   ├── category-stamps.png
    │   ├── category-coins.png
    │   ├── category-pokemon.webp
    │   ├── category-movies.png
    │   ├── category-disney-pins.webp
    │   └── category-autographs.png
    ├── logos/
    │   ├── tradebilia-main.svg              (tradebilia_final_transparent_58812c5a.svg)
    │   ├── tradebilia-alt.svg               (tradebilia_final_transparent_d37f9c4f.svg)
    │   ├── tradebilia-icon.svg              (tradebilia-logo_12c07bbf.svg)
    │   └── tradebilia-long.svg              (tradebilia-logo_c676d640.svg)
    ├── category-titles/
    │   ├── sports-cards.png                 (SportsCardsTitle_f996b932.png)
    │   ├── comics.png                       (ComicsTitle_750f38ea.png)
    │   ├── vintage-toys.png                 (VintageToysTitle_d0118110.png)
    │   ├── video-games.webp                 (VideoGamesTitle_220b9231.webp)
    │   ├── stamps.webp                      (StampsTitle_94a26b4f.webp)
    │   ├── pokemon.png                      (PokemonTitle_a67678b5.png)
    │   ├── movies.png                       (MoviesTitle_d6a245f8.png)
    │   └── disney-pins.png                  (DisneyPinsTitle_1400d285.png)
    ├── page-titles/
    │   ├── messages.svg                     (Messages_36f2edc7.svg)
    │   ├── verified-merchants.webp          (VerifiedMerchants_c2e2db11.webp)
    │   ├── account-setup.webp               (AccountSetup_8c053a9e.webp)
    │   ├── account-settings.webp            (AccountSettingsTitle_d9a1337d.webp)
    │   ├── contact-us.svg                   (Contact_Us_5330618e.svg)
    │   ├── report-user.svg                  (ReportaUser_06c412db.svg)
    │   ├── trade-hub.svg                    (TradeHub_26e41e1b.svg)
    │   ├── add-inventory.svg                (Add_To_Your_Inventory_e3ab8e8a.svg)
    │   ├── profile.svg                      (Profile_faf54d36.svg)
    │   ├── referral-request.webp            (ReferralRequest_bd6d0e60.webp)
    │   ├── traders-showcase.svg             (TRADERSSHOWCASE_826bf6f2.svg)
    │   ├── watchlist.svg                    (Watchlist_8816bd63.svg)
    │   └── community-trade-eval.webp        (CommunityTradeEvaluation_0423088f.webp)
    ├── integrations/
    │   ├── ebay.png                         (Ebaylogo_f6331705.png)
    │   ├── facebook.png                     (Facebooklogo_19970ec8.png)
    │   ├── linkedin.webp                    (LinkedIn_dc442074.webp)
    │   └── paypal.png                       (Paypal_ace464a4.png)
    ├── navigation/
    │   ├── collectors-forum.svg             (Collectorsforum_035c9c2c.svg)
    │   ├── collectors-forum-alt.svg         (Collectorsforum_85b04342.svg)
    │   ├── conventions.webp                 (Conventions_b7b8fc4e.webp)
    │   ├── my-inventory.svg                 (Myinventory_425bbb04.svg)
    │   ├── profile-nav.svg                  (Profile_db1a0ae7.svg)
    │   ├── most-viewed.svg                  (MostViewed_100f9c6d.svg)
    │   └── wheel-icon.png                   (pasted_file_BlVRoF_image_4beb4b70.png)
    └── misc/
        └── auto-background.png              (AutoBackground_77c0fc6a.png)
```

---

## Image Inventory by Category

### Hero & Background Images

| Current S3 URL | Purpose | Recommended GitHub Path | Format | Size | Used In |
|---|---|---|---|---|---|
| `/manus-storage/Background_48b923f1.jpg` | Main hero background (all pages) | `/assets/backgrounds/hero-main.jpg` | JPG | ~500KB | Home, Messages, VerifiedMerchants, CategoryPages |
| `/manus-storage/SportsCardBackground_e2e711d1.webp` | Sports Cards category background | `/assets/backgrounds/category-sports-cards.webp` | WebP | ~300KB | CategoryPage (sports_cards) |
| `/manus-storage/ComicsBackground_798a970b.webp` | Comics category background | `/assets/backgrounds/category-comics.webp` | WebP | ~300KB | CategoryPage (comics) |
| `/manus-storage/VintageToysBackground_a95e7b30.png` | Vintage Toys category background | `/assets/backgrounds/category-vintage-toys.png` | PNG | ~400KB | CategoryPage (vintage_toys) |
| `/manus-storage/VideoGamesBackground_f9315289.webp` | Video Games category background | `/assets/backgrounds/category-video-games.webp` | WebP | ~300KB | CategoryPage (video_games) |
| `/manus-storage/StampsBackground_1bb5af50.png` | Stamps category background | `/assets/backgrounds/category-stamps.png` | PNG | ~400KB | CategoryPage (stamps) |
| `/manus-storage/CoinsBackground_8f7db775.png` | Coins category background | `/assets/backgrounds/category-coins.png` | PNG | ~400KB | CategoryPage (coins) |
| `/manus-storage/PokemonBackground_d2f9e795.webp` | Pokemon category background | `/assets/backgrounds/category-pokemon.webp` | WebP | ~300KB | CategoryPage (pokemon) |
| `/manus-storage/MoviesBackground_603eb7a8.png` | Movies category background | `/assets/backgrounds/category-movies.png` | PNG | ~400KB | CategoryPage (movies) |
| `/manus-storage/DisneyPinsBackground_68498869.webp` | Disney Pins category background | `/assets/backgrounds/category-disney-pins.webp` | WebP | ~300KB | CategoryPage (disney_pins) |
| `/manus-storage/AutoBackground_77c0fc6a.png` | Autographs category background | `/assets/backgrounds/category-autographs.png` | PNG | ~400KB | CategoryPage (autographs) |

### Logo Assets

| Current S3 URL | Purpose | Recommended GitHub Path | Format | Size | Used In |
|---|---|---|---|---|---|
| `/manus-storage/tradebilia_final_transparent_58812c5a.svg` | Main Tradebilia logo (transparent) | `/assets/logos/tradebilia-main.svg` | SVG | ~50KB | Home page, various pages |
| `/manus-storage/tradebilia_final_transparent_d37f9c4f.svg` | Alt Tradebilia logo (transparent) | `/assets/logos/tradebilia-alt.svg` | SVG | ~50KB | TopBar, fallback logo |
| `/manus-storage/tradebilia-logo_12c07bbf.svg` | Tradebilia icon logo | `/assets/logos/tradebilia-icon.svg` | SVG | ~30KB | TopBar, various pages |
| `/manus-storage/tradebilia-logo_c676d640.svg` | Tradebilia long logo | `/assets/logos/tradebilia-long.svg` | SVG | ~50KB | Sports Cards page |

### Category Title Images

| Current S3 URL | Purpose | Recommended GitHub Path | Format | Size | Used In |
|---|---|---|---|---|---|
| `/manus-storage/SportsCardsTitle_f996b932.png` | Sports Cards category title | `/assets/category-titles/sports-cards.png` | PNG | ~200KB | CategoryPage (sports_cards) |
| `/manus-storage/ComicsTitle_750f38ea.png` | Comics category title | `/assets/category-titles/comics.png` | PNG | ~200KB | CategoryPage (comics) |
| `/manus-storage/VintageToysTitle_d0118110.png` | Vintage Toys category title | `/assets/category-titles/vintage-toys.png` | PNG | ~200KB | CategoryPage (vintage_toys) |
| `/manus-storage/VideoGamesTitle_220b9231.webp` | Video Games category title | `/assets/category-titles/video-games.webp` | WebP | ~150KB | CategoryPage (video_games) |
| `/manus-storage/StampsTitle_94a26b4f.webp` | Stamps category title | `/assets/category-titles/stamps.webp` | WebP | ~150KB | CategoryPage (stamps) |
| `/manus-storage/PokemonTitle_a67678b5.png` | Pokemon category title | `/assets/category-titles/pokemon.png` | PNG | ~200KB | CategoryPage (pokemon) |
| `/manus-storage/MoviesTitle_d6a245f8.png` | Movies category title | `/assets/category-titles/movies.png` | PNG | ~200KB | CategoryPage (movies) |
| `/manus-storage/DisneyPinsTitle_1400d285.png` | Disney Pins category title | `/assets/category-titles/disney-pins.png` | PNG | ~200KB | CategoryPage (disney_pins) |

### Page Title Images

| Current S3 URL | Purpose | Recommended GitHub Path | Format | Size | Used In |
|---|---|---|---|---|---|
| `/manus-storage/Messages_36f2edc7.svg` | Messages page hero title | `/assets/page-titles/messages.svg` | SVG | ~50KB | Messages page hero |
| `/manus-storage/VerifiedMerchants_c2e2db11.webp` | Verified Merchants page hero title | `/assets/page-titles/verified-merchants.webp` | WebP | ~100KB | VerifiedMerchants page hero |
| `/manus-storage/AccountSetup_8c053a9e.webp` | Account Setup page title | `/assets/page-titles/account-setup.webp` | WebP | ~100KB | AccountSetup page |
| `/manus-storage/AccountSettingsTitle_d9a1337d.webp` | Account Settings page title | `/assets/page-titles/account-settings.webp` | WebP | ~100KB | AccountSettings page |
| `/manus-storage/Contact_Us_5330618e.svg` | Contact Us page title | `/assets/page-titles/contact-us.svg` | SVG | ~50KB | Contact page |
| `/manus-storage/ReportaUser_06c412db.svg` | Report User page title | `/assets/page-titles/report-user.svg` | SVG | ~50KB | ReportUser page |
| `/manus-storage/TradeHub_26e41e1b.svg` | Trade Hub page title | `/assets/page-titles/trade-hub.svg` | SVG | ~50KB | Trade Hub page |
| `/manus-storage/Add_To_Your_Inventory_e3ab8e8a.svg` | Add Inventory page title | `/assets/page-titles/add-inventory.svg` | SVG | ~50KB | AddInventory page |
| `/manus-storage/Profile_faf54d36.svg` | Profile page title | `/assets/page-titles/profile.svg` | SVG | ~50KB | Profile page |
| `/manus-storage/ReferralRequest_bd6d0e60.webp` | Referral Request page title | `/assets/page-titles/referral-request.webp` | WebP | ~100KB | ReferralRequest page |
| `/manus-storage/TRADERSSHOWCASE_826bf6f2.svg` | Traders Showcase page title | `/assets/page-titles/traders-showcase.svg` | SVG | ~50KB | TradersShowcase page |
| `/manus-storage/Watchlist_8816bd63.svg` | Watchlist page title | `/assets/page-titles/watchlist.svg` | SVG | ~50KB | Watchlist page |
| `/manus-storage/CommunityTradeEvaluation_0423088f.webp` | Community Trade Evaluation title | `/assets/page-titles/community-trade-eval.webp` | WebP | ~100KB | Community page |

### Integration Logos

| Current S3 URL | Purpose | Recommended GitHub Path | Format | Size | Used In |
|---|---|---|---|---|---|
| `/manus-storage/Ebaylogo_f6331705.png` | eBay integration logo | `/assets/integrations/ebay.png` | PNG | ~50KB | ItemDetail, TestAI pages |
| `/manus-storage/Facebooklogo_19970ec8.png` | Facebook OAuth logo | `/assets/integrations/facebook.png` | PNG | ~50KB | Login page (future) |
| `/manus-storage/LinkedIn_dc442074.webp` | LinkedIn OAuth logo | `/assets/integrations/linkedin.webp` | WebP | ~40KB | Login page (future) |
| `/manus-storage/Paypal_ace464a4.png` | PayPal logo | `/assets/integrations/paypal.png` | PNG | ~50KB | Checkout (future) |

### Navigation & Misc Images

| Current S3 URL | Purpose | Recommended GitHub Path | Format | Size | Used In |
|---|---|---|---|---|---|
| `/manus-storage/Collectorsforum_035c9c2c.svg` | Collectors Forum nav icon | `/assets/navigation/collectors-forum.svg` | SVG | ~30KB | Sidebar navigation |
| `/manus-storage/Collectorsforum_85b04342.svg` | Collectors Forum nav icon (alt) | `/assets/navigation/collectors-forum-alt.svg` | SVG | ~30KB | Sidebar navigation |
| `/manus-storage/Conventions_b7b8fc4e.webp` | Conventions nav icon | `/assets/navigation/conventions.webp` | WebP | ~50KB | Sidebar navigation |
| `/manus-storage/Myinventory_425bbb04.svg` | My Inventory nav icon | `/assets/navigation/my-inventory.svg` | SVG | ~30KB | Sidebar navigation |
| `/manus-storage/Profile_db1a0ae7.svg` | Profile nav icon | `/assets/navigation/profile-nav.svg` | SVG | ~30KB | Sidebar navigation |
| `/manus-storage/MostViewed_100f9c6d.svg` | Most Viewed icon | `/assets/navigation/most-viewed.svg` | SVG | ~30KB | Home page carousel |
| `/manus-storage/pasted_file_BlVRoF_image_4beb4b70.png` | Wheel icon | `/assets/navigation/wheel-icon.png` | PNG | ~50KB | Misc UI |
| `/manus-storage/AutoBackground_77c0fc6a.png` | Autographs background | `/assets/backgrounds/category-autographs.png` | PNG | ~400KB | CategoryPage (autographs) |

---

## Migration Checklist for Next Session

```
[ ] 1. Download all images from S3 (use manus-upload-file or direct S3 access)
[ ] 2. Create /public/assets/ directory structure in GitHub
[ ] 3. Commit all images to GitHub with semantic naming
[ ] 4. Update all /manus-storage/ URLs in codebase to /assets/...
    - Search: grep -rn "manus-storage" client/src
    - Replace in each file
[ ] 5. Test image loading in dev server (pnpm dev)
[ ] 6. Test image loading in production (https://tradebilia.manus.space)
[ ] 7. Verify no 404 errors in browser console
[ ] 8. Commit URL changes to GitHub
[ ] 9. Delete this file (no longer needed after migration)
```

---

## Notes

- **Total estimated size:** ~5-6 MB of images
- **Recommended format:** WebP for backgrounds (better compression), PNG for titles/logos, SVG for icons
- **GitHub LFS:** Consider using Git LFS for large images if they exceed 100MB total
- **CDN:** GitHub raw URLs are not ideal for production. Consider:
  - jsDelivr CDN: `https://cdn.jsdelivr.net/gh/tradebilia/collectors-barter@main/public/assets/...`
  - Cloudflare Pages: Automatic CDN for GitHub repos
  - AWS CloudFront: Custom CDN for better performance

---

**End of Image Asset Inventory**
