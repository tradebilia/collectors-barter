# Tradebilia Platform — Session Handoff Guide

**Last Updated:** August 11, 2026  
**Current Checkpoint:** `10ca96ee`  
**Status:** Ready for session transition  

---

## 🚨 CRITICAL: Do This First in Next Session

### 1. Set All Environment Variables (REQUIRED)
Before running `pnpm dev` or `pnpm test`, you MUST add these secrets via `webdev_request_secrets`. The system will prompt for input if they're missing.

**Command to use:**
```bash
webdev_request_secrets --brief "Restore Tradebilia API credentials and database config" \
  --secrets '[
    {"key": "CUSTOM_DATABASE_URL", "description": "Production database connection string"},
    {"key": "EBAY_PROD_CLIENT_ID", "description": "eBay API client ID"},
    {"key": "EBAY_PROD_CLIENT_SECRET", "description": "eBay API client secret"},
    {"key": "TWILIO_ACCOUNT_SID", "description": "Twilio account SID for SMS verification"},
    {"key": "TWILIO_AUTH_TOKEN", "description": "Twilio auth token"},
    {"key": "TWILIO_VERIFY_SERVICE_SID", "description": "Twilio Verify service SID"},
    {"key": "TRADEBILIA_OPENAI_API_KEY", "description": "OpenAI API key for trade analysis"},
    {"key": "PARSE_BOT_API_KEY", "description": "Parse.bot API key for PSA/Beckett data"},
    {"key": "SOLD_COMPS_API_KEY", "description": "Sold-Comps API key for sold data"},
    {"key": "FACEBOOK_APP_ID", "description": "Facebook OAuth app ID"},
    {"key": "FACEBOOK_APP_SECRET", "description": "Facebook OAuth app secret"},
    {"key": "FACEBOOK_REDIRECT_URI", "description": "Facebook OAuth redirect URI"},
    {"key": "LINKEDIN_CLIENT_ID", "description": "LinkedIn OAuth client ID"},
    {"key": "LINKEDIN_CLIENT_SECRET", "description": "LinkedIn OAuth client secret"},
    {"key": "LINKEDIN_REDIRECT_URI", "description": "LinkedIn OAuth redirect URI"},
    {"key": "ENCRYPTION_KEY", "description": "Encryption key for OAuth tokens at rest"}
  ]'
```

### 2. Verify Database Connection
After setting `CUSTOM_DATABASE_URL`, test the connection:
```bash
pnpm test  # Should pass all 67 tests if DB is correct
```

---

## 📋 Environment Variables Reference

| Variable | Purpose | Type | Notes |
|----------|---------|------|-------|
| `CUSTOM_DATABASE_URL` | Production MySQL/TiDB database | Connection String | **CRITICAL** — Points to real user data. Format: `mysql://user:pass@host:port/db?ssl=...` |
| `EBAY_PROD_CLIENT_ID` | eBay API authentication | String | Used for eBay Browse API and Sold-Comps integration |
| `EBAY_PROD_CLIENT_SECRET` | eBay API secret | String | Keep secure |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier | String | For SMS phone verification during account setup |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token | String | Keep secure |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify service ID | String | Specific to the SMS verification service |
| `TRADEBILIA_OPENAI_API_KEY` | OpenAI API key | String | Used for AI trade analysis (Manus Forge LLM) |
| `PARSE_BOT_API_KEY` | Parse.bot API key | String | For PSA and Beckett grading data lookups |
| `SOLD_COMPS_API_KEY` | Sold-Comps API key | String | For historical sales data |
| `FACEBOOK_APP_ID` | Facebook OAuth app ID | String | For Facebook login integration (future) |
| `FACEBOOK_APP_SECRET` | Facebook OAuth secret | String | Keep secure |
| `FACEBOOK_REDIRECT_URI` | Facebook OAuth callback URL | String | Should be `https://tradebilia.manus.space/api/oauth/callback` |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth client ID | String | For LinkedIn login integration (future) |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth secret | String | Keep secure |
| `LINKEDIN_REDIRECT_URI` | LinkedIn OAuth callback URL | String | Should be `https://tradebilia.manus.space/api/oauth/callback` |
| `ENCRYPTION_KEY` | OAuth token encryption | String | 32-byte hex key for encrypting OAuth tokens at rest |

---

## 🗄️ Database Configuration

### Current Setup
- **Type:** MySQL / TiDB (compatible)
- **Location:** External (user-provided via `CUSTOM_DATABASE_URL`)
- **Data:** Real production data with live users, listings, trades, messages
- **Backup Strategy:** User is responsible for backups (NOT in Manus sandbox)

### Connection String Format
```
mysql://username:password@host:port/database_name?ssl={"rejectUnauthorized":false}&charset=utf8mb4
```

### Key Tables
- `users` — User accounts, profiles, merchant info
- `listings` — Collectible items for trade
- `tradeProposals` — Trade agreements and negotiations
- `itemInquiries` — Questions about listings
- `inquiryReplies` — Replies to inquiries
- `directMessages` — Direct collector-to-collector messages
- `userProfiles` — Extended user profile data (display name, avatar, merchant fields)
- `userFollows` — Collector follow relationships

### Schema Migrations
All migrations are in `drizzle/migrations/`. To apply new migrations:
```bash
pnpm drizzle-kit generate  # Generate migration SQL
# Then apply via webdev_execute_sql tool
```

---

## 🖼️ Image Asset Management

### ⚠️ CRITICAL ISSUE: S3 URLs Will Expire

**Problem:** All images are currently stored in Manus S3 storage (`/manus-storage/...` URLs). When a new session starts, S3 access may be lost or URLs may become invalid.

**Solution: GitHub-Based Asset Storage (RECOMMENDED)**

Store all image assets in GitHub under `/public/assets/` directory:

```
tradebilia/collectors-barter/
├── public/
│   └── assets/
│       ├── logos/
│       │   ├── tradebilia_final_transparent.svg
│       │   ├── tradebilia-logo.svg
│       │   └── ...
│       ├── backgrounds/
│       │   ├── Background_hero.jpg
│       │   ├── SportsCardBackground.webp
│       │   └── ...
│       ├── category-titles/
│       │   ├── ComicsTitle.png
│       │   ├── SportsCardsTitle.png
│       │   └── ...
│       ├── integration-logos/
│       │   ├── Ebaylogo.png
│       │   ├── Facebooklogo.png
│       │   ├── LinkedIn.webp
│       │   ├── PayPal.png
│       │   └── ...
│       └── page-titles/
│           ├── Messages.svg
│           ├── VerifiedMerchants.webp
│           └── ...
```

**Implementation Steps for Next Session:**
1. Download all current images from S3 (see list below)
2. Commit them to GitHub in `/public/assets/` with semantic naming
3. Update all `/manus-storage/...` URLs to `/assets/...` in the codebase
4. Verify images load from GitHub in dev and production

### Current S3 Images (Need to be Migrated)

**Hero Backgrounds:**
- `/manus-storage/Background_48b923f1.jpg` → `/assets/backgrounds/Background_hero.jpg`
- `/manus-storage/SportsCardBackground_e2e711d1.webp`
- `/manus-storage/ComicsBackground_798a970b.webp`
- `/manus-storage/VintageToysBackground_a95e7b30.png`
- `/manus-storage/VideoGamesBackground_f9315289.webp`
- `/manus-storage/StampsBackground_1bb5af50.png`
- `/manus-storage/CoinsBackground_8f7db775.png`
- `/manus-storage/PokemonBackground_d2f9e795.webp`
- `/manus-storage/MoviesBackground_603eb7a8.png`
- `/manus-storage/DisneyPinsBackground_68498869.webp`
- `/manus-storage/AutoBackground_77c0fc6a.png`

**Category Title Images:**
- `/manus-storage/SportsCardsTitle_f996b932.png`
- `/manus-storage/ComicsTitle_750f38ea.png`
- `/manus-storage/VintageToysTitle_d0118110.png`
- `/manus-storage/VideoGamesTitle_220b9231.webp`
- `/manus-storage/StampsTitle_94a26b4f.webp`
- `/manus-storage/CoinsTitle_...` (if exists)
- `/manus-storage/PokemonTitle_a67678b5.png`
- `/manus-storage/MoviesTitle_d6a245f8.png`
- `/manus-storage/DisneyPinsTitle_1400d285.png`

**Logo Assets:**
- `/manus-storage/tradebilia_final_transparent_58812c5a.svg`
- `/manus-storage/tradebilia_final_transparent_d37f9c4f.svg`
- `/manus-storage/tradebilia-logo_12c07bbf.svg`
- `/manus-storage/tradebilia-logo_c676d640.svg`

**Page Title Images:**
- `/manus-storage/Messages_36f2edc7.svg`
- `/manus-storage/VerifiedMerchants_c2e2db11.webp`
- `/manus-storage/AccountSetup_8c053a9e.webp`
- `/manus-storage/AccountSettingsTitle_d9a1337d.webp`
- `/manus-storage/Contact_Us_5330618e.svg`
- `/manus-storage/ReportaUser_06c412db.svg`
- `/manus-storage/TradeHub_26e41e1b.svg`
- `/manus-storage/Add_To_Your_Inventory_e3ab8e8a.svg`
- `/manus-storage/Profile_faf54d36.svg`
- `/manus-storage/ReferralRequest_bd6d0e60.webp`
- `/manus-storage/TRADERSSHOWCASE_826bf6f2.svg`
- `/manus-storage/Watchlist_8816bd63.svg`
- `/manus-storage/CommunityTradeEvaluation_0423088f.webp`

**Integration Logos:**
- `/manus-storage/Ebaylogo_f6331705.png`
- `/manus-storage/Facebooklogo_19970ec8.png`
- `/manus-storage/LinkedIn_dc442074.webp`
- `/manus-storage/Paypal_ace464a4.png`

**Other:**
- `/manus-storage/MostViewed_100f9c6d.svg`
- `/manus-storage/Collectorsforum_035c9c2c.svg`
- `/manus-storage/Collectorsforum_85b04342.svg`
- `/manus-storage/Conventions_b7b8fc4e.webp`
- `/manus-storage/Myinventory_425bbb04.svg`
- `/manus-storage/Profile_db1a0ae7.svg`
- `/manus-storage/pasted_file_BlVRoF_image_4beb4b70.png`

---

## 🔑 API Integrations Summary

### eBay API
- **Purpose:** Browse active listings, get historical sales data
- **Endpoint:** `https://api.ebay.com/browse/v1/item_summary/search`
- **Auth:** OAuth 2.0 with `EBAY_PROD_CLIENT_ID` and `EBAY_PROD_CLIENT_SECRET`
- **Used in:** Test AI page, marketplace feed, search functionality

### Sold-Comps API
- **Purpose:** Historical collectible sales data
- **Endpoint:** `https://api.sold-comps.com/...`
- **Auth:** API key (`SOLD_COMPS_API_KEY`)
- **Used in:** Test AI page for sold data analysis

### Parse.bot API
- **Purpose:** PSA and Beckett grading data lookups
- **Endpoints:**
  - PSA: `https://parse.bot/marketplace/.../psacard-com-api`
  - Beckett: `https://parse.bot/marketplace/.../beckett-com-api`
- **Auth:** API key (`PARSE_BOT_API_KEY`)
- **Used in:** Test AI page for cert lookups and population data

### Twilio Verify
- **Purpose:** SMS phone verification during account setup
- **Endpoint:** `https://verify.twilio.com/v2/Services/{TWILIO_VERIFY_SERVICE_SID}/Verifications`
- **Auth:** `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`
- **Used in:** Account setup step 1, phone verification

### OpenAI (via Manus Forge)
- **Purpose:** AI trade analysis and item evaluation
- **Used in:** Trade Room AI Analyzer, Test AI page
- **Key:** `TRADEBILIA_OPENAI_API_KEY`

### OAuth Providers (Future)
- **Facebook:** For social login (not yet active)
- **LinkedIn:** For professional login (not yet active)

---

## 📊 Project Status & Remaining Work

### Completed Features
- ✅ Category marketplace pages (fixed URL length bug)
- ✅ Merchant verification system (admin verify/revoke, badges, directory)
- ✅ Account setup with Twilio SMS phone verification
- ✅ Test AI sandbox (eBay, Sold-Comps, Parse.bot PSA/Beckett data sources)
- ✅ Messages page with hero section and taglines
- ✅ Verified Merchants Only filter (instant-apply chip)

### Active Bugs (In Progress)
- [ ] BUG: Sender receives alert notification when they send a reply (identified, fix ready)
  - **Root Cause:** `sendInquiryReply` marks inquiry as unread for both recipient AND sender
  - **Fix:** Only mark as unread for original inquiry sender (recipient of reply)

### Remaining TODO Items
See `todo.md` for full list. Key priorities:
- [ ] Fix sender notification alert bug
- [ ] CGC population data integration for comics
- [ ] Port Test AI logic to production AI Analyzer (after testing complete)
- [ ] Additional scrapers (PCGS, NGC, CBCS)
- [ ] Merchant audit logging
- [ ] Playwright E2E test coverage

---

## 🚀 Day 1 Checklist for Next Session

```
[ ] 1. Clone the repository (if starting fresh)
    git clone https://github.com/tradebilia/collectors-barter.git
    cd collectors-barter

[ ] 2. Install dependencies
    pnpm install

[ ] 3. Set all environment variables via webdev_request_secrets
    (See "CRITICAL: Do This First" section above)

[ ] 4. Verify database connection
    pnpm test  # Should pass all 67 tests

[ ] 5. Start dev server
    pnpm dev

[ ] 6. Test critical flows:
    - Home page loads (carousel, hero, stats)
    - Category pages load (Sports Cards, Comics, etc.)
    - Account setup with phone verification works
    - Messages page displays correctly
    - Admin dashboard loads

[ ] 7. Migrate images to GitHub (if not already done)
    - Download all S3 images
    - Commit to /public/assets/
    - Update all /manus-storage/ URLs to /assets/
    - Test image loading

[ ] 8. Continue with remaining TODO items
    - Fix sender notification bug
    - Implement CGC integration
    - Port Test AI to production
```

---

## 📞 Support & Debugging

### Common Issues

**Issue:** "Database connection failed"
- **Cause:** `CUSTOM_DATABASE_URL` not set or incorrect
- **Fix:** Verify connection string format and credentials

**Issue:** "Images not loading" (404 errors)
- **Cause:** S3 URLs expired or GitHub migration incomplete
- **Fix:** Migrate images to GitHub and update URLs

**Issue:** "Tests failing (67 → fewer passing)"
- **Cause:** Missing environment variables or database issues
- **Fix:** Run `pnpm test` to see which tests fail; check env vars

**Issue:** "Twilio SMS not sending"
- **Cause:** `TWILIO_VERIFY_SERVICE_SID` incorrect or service disabled
- **Fix:** Verify Twilio console settings match env vars

### Useful Commands

```bash
# Test database connection
pnpm test

# Check current environment
grep -r "process.env" server/_core/env.ts

# List all S3 image URLs in use
grep -rn "manus-storage" client/src

# View recent git history
git log --oneline -20

# Check dev server logs
tail -f .manus-logs/devserver.log

# Check browser console logs
tail -f .manus-logs/browserConsole.log
```

---

## 📝 Notes for Next Session

- **Database is external:** Not managed by Manus. User is responsible for backups and maintenance.
- **Images need migration:** S3 URLs will not persist across sessions. GitHub is the recommended solution.
- **API keys are sensitive:** Never commit `.env` files. Always use `webdev_request_secrets`.
- **Test suite is comprehensive:** 67 tests cover auth, database, integrations, and UI flows. Use as regression check.
- **GitHub is source of truth:** All code changes must be committed. Manus checkpoints are for versioning but GitHub is the permanent record.

---

## 🔗 Quick Links

- **Production URL:** https://tradebilia.manus.space
- **GitHub Repo:** https://github.com/tradebilia/collectors-barter
- **Current Checkpoint:** `10ca96ee`
- **Last Updated:** August 11, 2026

---

**End of Handoff Guide**
