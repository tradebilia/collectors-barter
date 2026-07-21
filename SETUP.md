# Tradebilia — Setup, Architecture & Pre-Launch Guide

**Last Updated**: July 21, 2026  
**Project Version**: 1.2.0  
**Status**: High-polish phase — eBay and Facebook integrations complete, UI optimised

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Variables](#environment-variables)
3. [Project Structure](#project-structure)
4. [Key Features & Status](#key-features--status)
5. [eBay Integration](#ebay-integration)
6. [Facebook Integration](#facebook-integration)
7. [Public Profile System](#public-profile-system)
8. [Database Schema](#database-schema)
9. [Authentication Flow](#authentication-flow)
10. [Development Workflow](#development-workflow)
11. [Known TypeScript Errors](#known-typescript-errors)
12. [Pre-Launch Checklist](#pre-launch-checklist)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Clone and Install
```bash
gh repo clone tradebilia/collectors-barter
cd collectors-barter
pnpm install
```

### 2. Environment Setup
Copy the variables below into a `.env` file in the project root (see [Environment Variables](#environment-variables) for full reference).

### 3. Start Development Server
```bash
# Must use NODE_ENV=development to enable Vite middleware (serves the frontend)
NODE_ENV=development node ./node_modules/.bin/../tsx/dist/cli.mjs watch server/_core/index.ts </dev/null > /tmp/server.log 2>&1 &
```

Server runs on **http://localhost:3000**. The public proxy URL is:
```
https://3000-iks4l1bf2kqgx3v3iqdm3-f55f10fe.us1.manus.computer
```

> **Important**: If the server is started without `NODE_ENV=development`, the Vite frontend middleware will not load and the homepage will return a 404. Always set this variable.

---

## Environment Variables

```env
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=mysql://user:password@host/database?ssl=...

# ── Authentication ────────────────────────────────────────────────────────────
JWT_SECRET=your_jwt_secret_here
VITE_APP_ID=your_manus_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im

# ── eBay Integration ──────────────────────────────────────────────────────────
# Currently configured for SANDBOX. See Pre-Launch Checklist to switch to Production.
EBAY_CLIENT_ID=your_ebay_sandbox_client_id
EBAY_CLIENT_SECRET=your_ebay_sandbox_cert_id
EBAY_REDIRECT_URI=https://yourdomain.com/api/ebay/callback

# ── Facebook Integration ──────────────────────────────────────────────────────
# Obtain from: https://developers.facebook.com → Your App → Settings → Basic
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=https://yourdomain.com/api/facebook/callback

# ── Manus APIs ────────────────────────────────────────────────────────────────
BUILT_IN_FORGE_API_URL=https://forge.manus.ai
BUILT_IN_FORGE_API_KEY=your_forge_api_key
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai
VITE_FRONTEND_FORGE_API_KEY=your_frontend_forge_api_key

# ── App Branding ──────────────────────────────────────────────────────────────
VITE_APP_TITLE=Tradebilia

# ── Analytics ─────────────────────────────────────────────────────────────────
VITE_ANALYTICS_ENDPOINT=https://analytics.tradebilia.com
VITE_ANALYTICS_WEBSITE_ID=tradebilia-production-id
```

---

## Project Structure

```
collectors-barter/
├── client/                         # React 19 + Vite frontend
│   └── src/
│       ├── pages/                  # Full-page components
│       │   ├── PublicProfile.tsx   # Two-column collector profile dashboard
│       │   ├── AccountSettings.tsx # Profile/Integrations/Security tabs
│       │   └── ...
│       ├── components/             # Reusable UI components
│       │   ├── EbayFeedbackPreview.tsx   # eBay feedback trust card
│       │   ├── FacebookConnection.tsx    # Facebook connect/disconnect UI
│       │   └── ...
│       └── lib/                    # Utilities (trpc client, helpers)
├── server/                         # Express + tRPC backend
│   ├── routers.ts                  # All tRPC procedure definitions
│   ├── db.ts                       # Database query helpers
│   └── _core/                      # Core infrastructure
│       ├── index.ts                # Server entry point (Express setup, routes)
│       ├── env.ts                  # Lazy environment variable getters
│       ├── ebay.ts                 # eBay OAuth + Trading/Identity API logic
│       ├── ebayCallback.ts         # eBay OAuth callback handler
│       ├── facebook.ts             # Facebook OAuth + Graph API logic
│       ├── facebookCallback.ts     # Facebook OAuth callback handler
│       └── trpc.ts                 # tRPC context and middleware
├── drizzle/
│   └── schema.ts                   # Drizzle ORM table definitions (source of truth)
├── storage/                        # S3 file storage helpers
├── SETUP.md                        # This file
└── .env                            # Local environment variables (never commit)
```

---

## Key Features & Status

### ✅ Fully Implemented

| Feature | Notes |
|---|---|
| **Authentication** | JWT-based with bcrypt; Manus OAuth integration |
| **User Profiles** | Two-column dashboard layout with trust signals |
| **Inventory Management** | Add/edit/delete collectibles with photos |
| **Marketplace** | Browse, search, filter by category/condition |
| **Trade System** | Proposals, negotiation, completion flow |
| **eBay Integration** | Full OAuth, feedback score, star rating, 12-month summary, Store Owner badge |
| **Facebook Integration** | Full OAuth, profile picture, location, email, likes, profile link |
| **Admin Dashboard** | User management, moderation, platform statistics |
| **Collecting Interests** | Category preferences displayed on profile |
| **Trade History** | Completed trades shown on public profile |

### 🔄 Pending / In Progress

| Feature | Notes |
|---|---|
| **PayPal Integration** | UI placeholder exists; backend not yet built |
| **Instagram Integration** | UI placeholder exists; backend not yet built |
| **X / Twitter Integration** | UI placeholder exists; backend not yet built |
| **Email/SMS OTP** | Infrastructure ready; needs API keys (Twilio/SendGrid) |
| **Real-time Messaging** | Currently email-based; real-time deferred |

---

## eBay Integration

### Architecture

| File | Purpose |
|---|---|
| `server/_core/ebay.ts` | Auth URL generation, token exchange, Trading API (feedback), Identity API (user info) |
| `server/_core/ebayCallback.ts` | Handles `/api/ebay/callback` redirect; saves all fields to DB |
| `server/routers.ts` → `ebay.*` | tRPC procedures: `getAuthUrl`, `getInfo`, `disconnect` |
| `client/src/components/EbayFeedbackPreview.tsx` | Renders last 5 feedback entries |
| `client/src/pages/AccountSettings.tsx` | Connect/Disconnect UI in Integrations tab |
| `client/src/pages/PublicProfile.tsx` | eBay trust card in right sidebar |

### Database Fields (on `users` table)

| Column | Type | Description |
|---|---|---|
| `ebayUsername` | varchar(64) | eBay username |
| `ebayUserId` | varchar(64) | eBay internal user ID |
| `ebayFeedbackScore` | int | Total feedback score |
| `ebayFeedbackPercentage` | decimal(5,2) | Positive feedback % |
| `ebayMemberSince` | timestamp | Account creation date |
| `ebaySellerLevel` | varchar(50) | "Top Rated", "Above Standard", etc. |
| `ebayIdVerified` | tinyint | 1 = ID Verified badge |
| `ebayStar` | varchar(50) | Star colour (Yellow, Blue, Purple, etc.) |
| `ebayPositive12mo` | int | Positive feedback in last 12 months |
| `ebayNeutral12mo` | int | Neutral feedback in last 12 months |
| `ebayNegative12mo` | int | Negative feedback in last 12 months |
| `ebayIsStoreOwner` | tinyint | 1 = eBay Store Owner badge |
| `ebayConnectedAt` | timestamp | When the account was connected |
| `ebayAccessToken` | text | OAuth access token |
| `ebayRefreshToken` | text | OAuth refresh token |
| `ebayTokenExpiresAt` | timestamp | Token expiry |

### Current Mode
The integration is running in **Sandbox** mode. See [Pre-Launch Checklist](#pre-launch-checklist) to switch to Production.

---

## Facebook Integration

### Architecture

| File | Purpose |
|---|---|
| `server/_core/facebook.ts` | Auth URL generation, token exchange, Graph API profile + likes fetch |
| `server/_core/facebookCallback.ts` | Handles `/api/facebook/callback`; saves all fields to DB |
| `server/routers.ts` → `facebook.*` | tRPC procedures: `getAuthUrl`, `getInfo`, `disconnect` |
| `client/src/components/FacebookConnection.tsx` | Connect/Disconnect UI with success/error handling |
| `client/src/pages/AccountSettings.tsx` | Wired into Integrations tab |
| `client/src/pages/PublicProfile.tsx` | Facebook trust card in right sidebar |

### OAuth Scopes Requested

| Scope | Requires App Review? | What It Provides |
|---|---|---|
| `public_profile` | No | Name, profile picture, Facebook ID |
| `email` | No | Email address |
| `user_location` | **Yes (before going live)** | City/region |
| `user_likes` | **Yes (before going live)** | Pages the user has liked (interests) |

> **Development Mode**: All scopes work for the app owner and any users added as Testers in the Meta Developer Portal. App Review is only required before publishing the app to the general public.

### Database Fields (on `users` table)

| Column | Type | Description |
|---|---|---|
| `facebookId` | varchar(64) | Facebook user ID |
| `facebookName` | varchar(255) | Full name from Facebook |
| `facebookVerified` | tinyint | 1 = account verified |
| `facebookConnectedAt` | timestamp | When the account was connected |
| `facebookAccessToken` | text | OAuth access token |
| `facebookEmail` | varchar(255) | Email from Facebook |
| `facebookPicture` | text | Profile picture URL (large size) |
| `facebookLocation` | varchar(255) | City/region (e.g. "New York, New York") |
| `facebookLink` | varchar(512) | Link to the user's Facebook profile page |
| `facebookLikes` | json | Array of `{ id, name }` for up to 50 liked pages |

### Public Profile Display

When a user has connected Facebook, the public profile shows:
- **Avatar**: Falls back to Facebook profile picture if no Tradebilia avatar is set
- **Location**: Falls back to Facebook location if no Tradebilia location is set
- **Facebook Trust Card** (right sidebar): Profile picture, name, email, location, interest tags (from likes), and a "View Facebook Profile" button

### Meta Developer App Setup

1. Go to [developers.facebook.com](https://developers.facebook.com) and log in
2. Create App → Use Case: **"Authenticate and request data from users with Facebook Login"**
3. App Settings → Basic: note your **App ID** and **App Secret**
4. Facebook Login → Settings → Valid OAuth Redirect URIs: add your callback URL
5. App Domains: add your domain (without `https://`)

---

## Public Profile System

The public profile (`/profile/:userId`) uses a **two-column dashboard layout**:

### Left Column (8/12 width)
- Profile header (avatar, name, location, join date, action buttons)
- Navigation tabs: Overview, Collection, Trades, Reviews
- **Overview tab**: Bio, collecting interests, trade rating breakdown, review histogram, recent reviews
- **Collection tab**: Active listings with photos, condition, and value
- **Trades tab**: Completed trades with partner, items, and date
- **Reviews tab**: Full trade review history

### Right Column (4/12 width)
- eBay Reputation Card (if connected): username, feedback %, score, 12-month summary, feedback preview
- Facebook Card (if connected): picture, name, email, location, interest tags, profile link
- Other Verifications: PayPal, Instagram, X (pending)

### Avatar Fallback Chain
1. Tradebilia uploaded avatar (`userProfiles.avatarUrl`)
2. Facebook profile picture (`users.facebookPicture`)
3. Default user icon

### Location Fallback Chain
1. Tradebilia profile location (`userProfiles.location`)
2. Facebook location (`users.facebookLocation`)

---

## Database Schema

### Core Tables

| Table | Purpose |
|---|---|
| `users` | Accounts, roles, eBay fields, Facebook fields |
| `userProfiles` | Display name, bio, avatar, location, preferences |
| `listings` | Collectible items for trade |
| `listingPhotos` | Images associated with listings |
| `tradeProposals` | Trade offers between users |
| `tradeProposalItems` | Items in each trade proposal |
| `tradeReviews` | Post-trade ratings and reviews |
| `tradeMessages` | In-trade chat messages |
| `ebayFeedbackHistory` | Cached eBay feedback entries |
| `itemInquiries` | Messages about specific listings |
| `referralRequests` | Referral invitation system |
| `conventions` | Collectibles conventions/events |
| `forumPosts` / `forumReplies` | Community forum |

### Key Enums

```
categories: comics | sports_cards | vintage_toys | video_games | stamps | coins | pokemon | movies | autographs | disney_pins
conditions: mint | near_mint | excellent | very_good | good | fair | poor
roles: user | admin
trade_status: pending | negotiating | accepted | shipping | completed | declined | cancelled
```

---

## Authentication Flow

1. User clicks "Sign In" → redirected to Manus OAuth portal
2. After auth → redirected to `/api/oauth/callback?code=...`
3. Server exchanges code for token, creates/updates user in DB
4. Session cookie set with JWT
5. Frontend reads auth state via `trpc.auth.me.useQuery()`

### Protected Routes
- Frontend: `ProtectedRoute` component wrapper
- Backend: `protectedProcedure` (requires valid session)
- Admin: `adminProcedure` (requires `role === 'admin'`)

---

## Development Workflow

### Adding a New Integration (e.g. PayPal)

1. Add columns to `drizzle/schema.ts`
2. Run the ALTER TABLE statements directly on the DB (or use `pnpm drizzle-kit push`)
3. Create `server/_core/paypal.ts` — auth URL, token exchange, user info
4. Create `server/_core/paypalCallback.ts` — callback handler
5. Register the `/api/paypal/callback` route in `server/_core/index.ts`
6. Add lazy getters to `server/_core/env.ts`
7. Add DB helpers to `server/db.ts`
8. Add tRPC router in `server/routers.ts`
9. Create `client/src/components/PayPalConnection.tsx`
10. Wire into `AccountSettings.tsx` Integrations tab
11. Add trust card to `PublicProfile.tsx`
12. Add env vars to `.env`
13. Commit and push

### ENV Lazy Getters Pattern

All environment variables **must** use lazy getters in `server/_core/env.ts`:

```typescript
// ✅ Correct — read at call time, after dotenv.config() has run
get facebookAppId() {
  return process.env.FACEBOOK_APP_ID ?? "";
}

// ❌ Wrong — captured at module load time, before dotenv runs
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID ?? "";
```

---

## Known TypeScript Errors

There are **6 pre-existing TypeScript errors** that do not affect runtime behaviour. They existed before the Facebook integration was added and are not introduced by any recent changes.

| File | Error | Root Cause |
|---|---|---|
| `server/_core/context.ts` | `User` not exported from schema | Schema exports `users` (table), not `User` (type) |
| `server/_core/customAuth.ts` | Same | Same |
| `server/_core/sdk.ts` | Same | Same |
| `server/db.ts` | `InsertUser` / `User` not exported | Same root cause |
| `server/routers.ts:1416` | `ebayIdVerified` missing in eBay update call | eBay update function signature mismatch |

These are safe to leave until a dedicated TypeScript cleanup pass. They do not cause any runtime failures.

---

## Pre-Launch Checklist

Everything that must be done before Tradebilia is launched to the public.

---

### 1. eBay: Switch from Sandbox to Production

#### eBay Developer Portal
| Item | Action |
|---|---|
| **App ID** | Replace Sandbox App ID with Production App ID |
| **Cert ID** | Replace Sandbox Cert ID with Production Cert ID |
| **Auth Accepted URL** | Update to `https://tradebilia.com/api/ebay/callback` |
| **Auth Declined URL** | Update to `https://tradebilia.com/api/ebay/callback` |
| **RuName** | Register a new Production RuName |
| **Application Review** | Submit for eBay production approval |

#### `.env` Changes
```env
EBAY_CLIENT_ID=your_production_app_id
EBAY_CLIENT_SECRET=your_production_cert_id
EBAY_REDIRECT_URI=https://tradebilia.com/api/ebay/callback
```

#### Code Changes in `server/_core/ebay.ts`
| Replace (Sandbox) | With (Production) |
|---|---|
| `https://auth.sandbox.ebay.com/oauth2/authorize` | `https://auth.ebay.com/oauth2/authorize` |
| `https://api.sandbox.ebay.com/identity/v1/oauth2/token` | `https://api.ebay.com/identity/v1/oauth2/token` |
| `https://apiz.sandbox.ebay.com/commerce/identity/v1/user/` | `https://apiz.ebay.com/commerce/identity/v1/user/` |
| `https://api.sandbox.ebay.com/ws/api.dll` | `https://api.ebay.com/ws/api.dll` |

Also update the hardcoded RuName in `getEbayAuthUrl()`.

---

### 2. Facebook: App Review Before Public Launch

The Facebook app is currently in **Development Mode** — only the app owner and added Testers can connect. Before going live:

| Item | Action |
|---|---|
| **App Icon** | Upload a 1024×1024 app icon |
| **Privacy Policy URL** | Add URL to your privacy policy page |
| **User Data Deletion** | Add a data deletion callback URL or instructions URL |
| **Category** | Select a category for the app |
| **App Review** | Submit `user_location` and `user_likes` permissions for review |
| **App Domains** | Update to `tradebilia.com` |
| **Valid OAuth Redirect URI** | Update to `https://tradebilia.com/api/facebook/callback` |

#### `.env` Changes
```env
FACEBOOK_REDIRECT_URI=https://tradebilia.com/api/facebook/callback
```

---

### 3. General Pre-Launch Items

| Item | Status | Notes |
|---|---|---|
| **Custom Domain** | Pending | Register and configure `tradebilia.com` |
| **SSL Certificate** | Pending | Required for all OAuth redirects (`https://`) |
| **PayPal Integration** | Not started | UI placeholder exists |
| **Instagram Integration** | Not started | UI placeholder exists |
| **X / Twitter Integration** | Not started | UI placeholder exists |
| **Email/SMS OTP** | Deferred | Needs Twilio/SendGrid API keys |
| **Privacy Policy Page** | Pending | Required by eBay, Facebook, and general law |
| **Terms of Service Page** | Pending | Required before public launch |
| **Analytics** | Pending | Update `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID` |
| **Admin Account** | Pending | Set `OWNER_OPEN_ID` in `.env` to correct admin user ID |
| **Remove Test Data** | Pending | Clear test users and listings before launch |
| **TypeScript Cleanup** | 6 errors | See [Known TypeScript Errors](#known-typescript-errors) |
| **NODE_ENV** | Pending | Ensure production server sets `NODE_ENV=production` |

---

## Deployment

### Manus Hosting (Recommended)
1. Ensure all env vars are set in Manus project settings
2. Click **Publish** in the Manus UI
3. Site deploys to `tradebilia-*.manus.space`
4. Custom domain support available

### External Hosting
- Node.js 22+ runtime required
- Set all environment variables
- Database must be accessible from the server
- S3 credentials required for file storage
- Set `NODE_ENV=production` — the server will serve the built Vite bundle

---

## Troubleshooting

### Homepage Returns 404
The server was started without `NODE_ENV=development`. The Vite middleware only loads in development mode. Restart with:
```bash
NODE_ENV=development node ./node_modules/.bin/../tsx/dist/cli.mjs watch server/_core/index.ts
```

### Facebook Connection Not Saving New Fields
The user connected Facebook before the expanded scopes (`user_location`, `user_likes`) were added. They must **disconnect and reconnect** to grant the new permissions.

### eBay "Invalid Token" Error
The sandbox access token has expired (they expire after 2 hours). The user must reconnect eBay from Account Settings → Integrations.

### Port Already in Use
The dev server automatically finds the next available port. Check the console output for the actual URL.

### Database Connection Failed
- Verify `DATABASE_URL` is correct and includes SSL parameters
- Ensure the TiDB Cloud IP allowlist includes the server IP
- Check network connectivity

### Server Won't Start After Session Resume
The sandbox may have hibernated and killed the server process. Restart it:
```bash
cd /home/ubuntu/collectors-barter
NODE_ENV=development node ./node_modules/.bin/../tsx/dist/cli.mjs watch server/_core/index.ts </dev/null > /tmp/server.log 2>&1 &
```

---

## Important Notes

1. **Never commit `.env`** — it contains secrets and is in `.gitignore`
2. **Lazy env getters** — always use `ENV.facebookAppId` pattern, never capture `process.env.*` at module load time
3. **Database migrations** — for new columns, run `ALTER TABLE` directly; for new tables, use `pnpm drizzle-kit push`
4. **Git history** — all code changes are tracked and pushed to `tradebilia/collectors-barter`
5. **Facebook reconnect** — after changing OAuth scopes, existing users must disconnect and reconnect to grant new permissions
