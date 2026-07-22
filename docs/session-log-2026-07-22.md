# Tradebilia Development Session Log — July 22, 2026

## Summary
This session covered LinkedIn OAuth integration, public profile page fixes, category page bug resolution, and various UI experiments on the category bar.

---

## 1. LinkedIn OAuth 2.0 Integration

### What Was Built
Full LinkedIn OAuth 2.0 sign-in flow using the **OpenID Connect** product.

| Layer | File | Change |
|---|---|---|
| Database Schema | `drizzle/schema.ts` | Added 8 LinkedIn columns to `users` table |
| Live Database | MySQL (TiDB Cloud) | Ran `ALTER TABLE` to add all 8 columns |
| Server Helper | `server/_core/linkedin.ts` | OAuth URL builder, token exchange, profile fetcher |
| Server Callback | `server/_core/linkedinCallback.ts` | Handles OAuth redirect, saves profile with AES-256-GCM encryption |
| Server Route | `server/_core/index.ts` | Registered `/api/linkedin/callback` Express route |
| tRPC Router | `server/routers.ts` | Added `linkedin.getAuthUrl`, `linkedin.getInfo`, `linkedin.disconnect` |
| DB Helper | `server/db.ts` | Added `getUserLinkedInInfo()` function |
| Env Config | `server/_core/env.ts` | Added `linkedinClientId`, `linkedinClientSecret`, `linkedinRedirectUri` getters |
| Env File | `.env` | Added LinkedIn credentials |
| Frontend Component | `client/src/components/LinkedInConnection.tsx` | Full connect/disconnect UI component |
| Account Settings | `client/src/pages/AccountSettings.tsx` | Imported and rendered `<LinkedInConnection />` in Integrations tab |

### LinkedIn API Data Available (OpenID Connect Scopes)
| Field | DB Column | Notes |
|---|---|---|
| LinkedIn ID | `linkedinId` | Internal token, not a vanity URL |
| Full Name | `linkedinName` | |
| Email | `linkedinEmail` | |
| Profile Picture | `linkedinPicture` | URL to profile photo |
| Headline | `linkedinHeadline` | Returns `null` — not available via OpenID Connect |
| Profile URL | `linkedinProfileUrl` | Returns `null` — not available via OpenID Connect |
| Connected At | `linkedinConnectedAt` | Timestamp of when user connected |
| Access Token | `linkedinAccessToken` | AES-256-GCM encrypted at rest |

### Credentials
- **Client ID:** `86tcdohr5g8pmb`
- **Client Secret:** Stored in `.env` as `LINKEDIN_CLIENT_SECRET`
- **Redirect URI (Dev):** `https://3000-iks4l1bf2kqgx3v3iqdm3-f55f10fe.us1.manus.computer/api/linkedin/callback`
- **Redirect URI (Production):** Update to `https://tradebilia.com/api/linkedin/callback` before go-live

### Required LinkedIn App Setup
- Product: **"Sign In with LinkedIn using OpenID Connect"** must be added and approved in the LinkedIn Developer Portal
- Scopes: `openid profile email`

---

## 2. LinkedIn Data on Public Profile Page

### What Was Added
A LinkedIn card on the public profile page (`client/src/pages/PublicProfile.tsx`) that shows:
- Profile picture (or initial avatar fallback)
- Full name with "Verified Professional" badge
- Email address
- Connected since date

The card only renders when `user.linkedinId` is present (i.e., the user has connected LinkedIn).

### What Was Removed (by design)
- **Headline:** Not returned by LinkedIn's OpenID Connect API — removed from display
- **Profile URL button:** LinkedIn does not return a vanity URL via OpenID Connect — removed to avoid fabricated links
- **Facebook profile URL button:** Facebook `user_link` permission requires App Review — removed for the same reason

---

## 3. Category Page Bug Fix (TiDB Subquery Incompatibility)

### Problem
All category pages showed "0 results" despite listings existing in the database.

### Root Cause
The `getMarketplaceFeed` function in `server/db.ts` used a **subquery inside a `JOIN ON` clause** — a pattern not supported by TiDB (the cloud database provider).

```sql
-- BROKEN (TiDB does not support subqueries in ON clause)
JOIN (SELECT ...) AS sub ON sub.id = listings.id
```

### Fix
Rewrote the query to use a standard `LEFT JOIN` on `tradeProposalItems` first, then join `listings` — fully TiDB-compatible.

**File:** `server/db.ts` — `getMarketplaceFeed()` function

---

## 4. Public Profile Page — Stats Field Name Fix

### Problem
The Collector Reputation section showed `0.0` for all ratings despite reviews existing in the database.

### Root Cause
Field name mismatch between the server response and the frontend:

| Server Returns | Frontend Was Reading |
|---|---|
| `avgRating` | `averageRating` |
| `avgCommunication` | `communication` |
| `avgItemCondition` | `accuracy` |
| `avgShippingSpeed` | `speed` |

### Fix
Updated `client/src/pages/PublicProfile.tsx` to use the correct field names from the server response.

---

## 5. Public Profile Page — Full Restore

### Problem
During color theme experiments, the entire `PublicProfile.tsx` was rewritten multiple times, causing the following to be accidentally removed:
- eBay feedback score, percentage, member since, star rating, 12-month feedback counts
- Original Bio & Collecting Interests combined card layout
- Original Trader Rating section layout and column proportions
- LinkedIn logo URL (was set to a missing local file `/images/linkedin-logo.png`)

### Fix
Restored the file from git commit `18472e7a` (last known good state before color experiments), then applied only the stats field name fix and the LinkedIn logo URL fix on top.

**LinkedIn logo:** Changed from `/images/linkedin-logo.png` to `https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png`

---

## 6. Category Bar UI Experiments (All Reverted)

The following category bar styles were tried and reverted at the user's request:

| Attempt | Description | Result |
|---|---|---|
| Option B + D | Gold bottom-border active tab + hover slide-in underline | Reverted |
| Reference image match | Dark navy, icons above labels, blue left accent | Reverted |
| Pill-style nav | Dark rounded container, active pill highlight | Reverted |
| Hero title logo images | Replaced text with `.webp` category title images | Reverted |

**Current state:** Original black bar with white uppercase text — unchanged.

---

## 7. Server Configuration Notes

### Dev Server Startup
The server must be started with `NODE_ENV=development` to enable Vite HMR for the frontend:
```bash
NODE_ENV=development setsid pnpm tsx watch server/_core/index.ts > /tmp/server.log 2>&1 &
```

Without `NODE_ENV=development`, the server starts but does not serve the React frontend (returns a blank page).

### Dev URL
`https://3000-iks4l1bf2kqgx3v3iqdm3-f55f10fe.us1.manus.computer`

---

## Open Items / Pre-Launch Checklist

- [ ] Update `LINKEDIN_REDIRECT_URI` in `.env` to production domain before go-live
- [ ] Add production redirect URI to LinkedIn Developer Portal
- [ ] Update `FACEBOOK_REDIRECT_URI` to production domain
- [ ] Update `EBAY_REDIRECT_URI` to production domain
- [ ] Review `ebayFeedbackPercentage` — currently showing `0.00%` for test account
- [ ] Consider requesting `r_liteprofile` LinkedIn scope for headline data (requires partner review)
- [ ] Consider requesting `user_link` Facebook permission for profile URL (requires App Review)
