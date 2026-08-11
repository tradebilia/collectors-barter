# Tradebilia Platform — Master Handoff Guide

> **Historical reference only — do not use this file for setup, credentials, storage, or current status.** Use `SESSION_HANDOFF_GUIDE.md` as the authoritative master guide and `NEXT_SESSION_QUICK_START.md` for the new-session sequence.

**Last Updated:** August 10, 2026  
**Version:** 8fb129df (current HEAD)  
**Live URL:** https://tradebilia.manus.space  
**GitHub:** https://github.com/tradebilia/collectors-barter

---

## 1. Project Overview

Tradebilia is a collectibles trading exchange platform where collectors can list, browse, and trade items across categories including Comics, Sports Cards, Video Games, Vintage Toys, Disney Pins, Stamps, Coins, Pokemon, Movies, and Autographs. The platform includes a full trade negotiation system, messaging, reviews, external account verification (eBay, Facebook, LinkedIn, PayPal), and an AI-powered trade analyzer.

**Tech Stack:**
- **Frontend:** React 19, Tailwind CSS 4, Wouter (routing), shadcn/ui
- **Backend:** Express 4, tRPC 11, Drizzle ORM (MySQL/TiDB)
- **AI:** Manus Forge LLM (built-in)
- **Auth:** Manus OAuth
- **External APIs:** eBay Browse API, Sold-Comps API, Parse.bot PSA Card API, Daily.co (video), PayPal

---

## 2. Repository & Deployment

| Item | Value |
|---|---|
| GitHub Repo | `tradebilia/collectors-barter` |
| Live Domain | `tradebilia.manus.space` |
| Backup Domain | `tradebilia-vauewtpb.manus.space` |
| Deployment | Auto-publish on every Manus checkpoint |
| Database | TiDB (MySQL-compatible), managed via Drizzle ORM |

**To clone and run locally:**
```bash
gh repo clone tradebilia/collectors-barter
cd collectors-barter
pnpm install
pnpm dev
```

---

## 3. Key Files & Architecture

```
server/
  routers.ts              ← Main tRPC router (auth, inventory, trades, messaging, reviews)
  testAIRouter.ts         ← Admin Test AI sandbox router (eBay, Sold-Comps, PSA, AI analysis)
  tradeFlowRouter.ts      ← Trade negotiation flow (propose, counter, accept, ship, receive)
  db.ts                   ← All database query helpers
  storage.ts              ← S3 file storage helpers
  _core/llm.ts            ← Manus Forge LLM invocation
  _core/index.ts          ← Express server setup, OAuth callbacks, scheduled routes

client/src/
  pages/TestAI.tsx        ← Admin Test AI sandbox (main focus of current work)
  pages/TradeRoom.tsx     ← Trade negotiation UI
  pages/WarRoom.tsx       ← AI trade analyzer (production — DO NOT update until testing complete)
  lib/fieldDefinitionsGenerated.ts  ← Form field definitions for all collectible categories

drizzle/
  schema.ts               ← Database schema (46 tables)
```

---

## 4. Environment Variables / Secrets

All secrets are injected automatically in production. Key ones:

| Variable | Purpose |
|---|---|
| `EBAY_PROD_CLIENT_ID` / `EBAY_PROD_CLIENT_SECRET` | eBay Browse API (active listings) |
| `SOLD_COMPS_API_KEY` | Sold-Comps API (eBay sold history) |
| `PARSE_BOT_API_KEY` | Parse.bot PSA Card API (population reports + recent sales) |
| `PSA_API_TOKEN` | Official PSA API token (currently 403 — needs account approval from PSA) |
| `TRADEBILIA_OPENAI_API_KEY` | OpenAI key (currently unused — Manus Forge used instead) |
| `BUILT_IN_FORGE_API_KEY` / `BUILT_IN_FORGE_API_URL` | Manus Forge LLM |
| `RESEND_API_KEY` | Email notifications via Resend |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_ENV` | PayPal integration |
| `DAILY_API_KEY` | Daily.co video chat |
| `JWT_SECRET` | Session cookie signing |

---

## 5. Test AI Sandbox (`/test-ai`) — Current State

The Test AI page is an **admin-only** sandbox at `/test-ai` (linked from the Admin Dashboard). Its purpose is to validate data scraping and AI analysis logic before deploying to the production Trade Room AI Analyzer.

### 5.1 Architecture

The page has two item panels (Item A vs Item B). Each panel can load an item from:
1. **My Inventory** — select from the logged-in admin's inventory
2. **Cert ID** — enter a grading company cert number directly

Per item, the user selects which **data sources** to enable. Sources are isolated so bad data from one source doesn't contaminate another.

### 5.2 Live Data Sources

| Source | Status | What It Provides | Notes |
|---|---|---|---|
| **eBay Active Listings** | ✅ Live | Current fixed-price listings, avg/median/range/confidence | Category-specific query building |
| **Sold-Comps (eBay Sold)** | ✅ Live | Real eBay completed/sold listings, up to 90 days | Same query logic as eBay Active |
| **Parse.bot (PSA Data)** | ✅ Live | PSA cert details, full Grade 1-10 population breakdown, 3 recent sales | Via Parse.bot API (`get_cert_full` + `get_cert_sales`) |
| **PSA (Official API)** | 🔴 Blocked | Full PSA data | Token exists but needs PSA account approval |
| All others (CGC, BGS, PCGS, etc.) | 🚧 Placeholder | — | Scrapers not yet built |

### 5.3 Cert Mode — Auto-Query Building

When a user enters a PSA cert number and enables Parse.bot (PSA Data), the system:
1. Fetches cert details from Parse.bot (`year`, `brand`, `subject`, `cardNumber`, `grade`)
2. Silently builds a search query: `"2019 UPPER DECK QUINN HUGHES 249 PSA 10"`
3. Uses this query automatically for eBay Active Listings and Sold-Comps
4. Category `cert_direct` is used as a passthrough — the backend uses the title as-is without rebuilding

If Parse.bot is not enabled, eBay and Sold-Comps show a message: *"Enable Parse.bot (PSA Data) first to auto-build the search query from cert details."*

When switching to Cert ID mode, all data sources are cleared (no pre-selections). When switching back to My Inventory, eBay Active Listings is pre-selected by default.

### 5.4 eBay Search Query Logic (Category-Specific)

| Category | Query Fields |
|---|---|
| Comics | `comicTitle #issueNumber cert grade` (or condition if ungraded) |
| Sports Cards | `year manufacturer player cardNumber cert grade` |
| Video Games | `gameTitle platform cert grade` |
| Vintage Toys | `year title cert grade` |
| Disney Pins | `"Disney Pins" characterName pinName` |
| Stamps | `country scottNumber cert numericalGrade ±5 tolerance` |
| Movies | `title format cert grade` |
| Autographs | `signer itemType authCompany` |
| Coins | `title` (direct) |
| Pokemon | `year editionEra cardName cardNumber cert grade` |
| Cert Direct | `title` (pre-built, no rebuilding) |

### 5.5 AI Trade Analysis

The AI analyzer at the bottom of the Test AI page uses whichever data sources are enabled. Sold-Comps data is labeled PRIMARY (real transactions) and weighted over active listings. The prompt asks the LLM to analyze:
- Market value (preferred: sold prices > asking prices)
- Trade fairness and value gap
- Market trends and liquidity
- Grade cliff analysis
- Population/rarity context
- Risk flags and replacement cost
- Future potential

**Important:** The production AI Analyzer in the Trade Room (`/war-room`) must NOT be updated until testing in the Test AI sandbox is complete and the user explicitly confirms.

---

## 6. Parse.bot PSA API Integration

**Provider:** [Parse.bot](https://parse.bot/marketplace/e4bff78d-ff22-4603-b9d3-e3cbb455544e/psacard-com-api)  
**API Key:** Stored as `PARSE_BOT_API_KEY` in project secrets  
**Pricing:** Free tier = 200 credits/month (5 req/min); Hobby = $30/mo, 1,000 credits/month  
**Cost:** 2 credits per item lookup (1 for `get_cert_full` + 1 for `get_cert_sales`)

**Endpoints used:**

```
GET https://api.parse.bot/scraper/311daf8c-242f-4c68-af70-b50617fd1d13/get_cert_full?cert_number={cert}
GET https://api.parse.bot/scraper/311daf8c-242f-4c68-af70-b50617fd1d13/get_cert_sales?cert_number={cert}
```

**Response structure:**
- `get_cert_full`: `{ status: "success", data: { card_title, grade, year, brand, subject, card_number, variety, psa_estimate, front_image_url, back_image_url, Grade1..Grade10, GradeTotal, Total, ... } }`
- `get_cert_sales`: `{ status: "success", data: { sales: [ { date_sold, price, title, url }, ... ] } }`

**Backend procedure:** `testAI.getPSAData` in `server/testAIRouter.ts`

---

## 7. Official PSA API (Blocked — Future)

The official PSA API (`api.psacard.com/publicapi`) requires account-level approval from Collectors Holdings. Three tokens have been tested — all return `403 Forbidden: "Access to this API is limited to approved customers."` To unlock:
1. Go to https://www.psacard.com/publicapi/documentation
2. Sign in with your PSA account
3. Contact `collectors-apis@collectors.com` to request API access approval

Once approved, a new `PSA` data source (separate from `Parse.bot (PSA Data)`) should be added to the Test AI page.

---

## 8. eBay OAuth Integration

eBay OAuth uses production credentials. The callback URL is:
```
https://tradebilia.manus.space/api/ebay/callback
```
The eBay badge on the Trade Hub shows when a user has connected their eBay account (ebayUsername is set). The `ebayIdVerified` flag is not used as eBay rarely sets it.

---

## 9. Scheduled Jobs (Heartbeat)

Three cron jobs are registered via Manus Heartbeat:

| Job | Endpoint | Schedule |
|---|---|---|
| Cleanup Expired Drafts | `/api/scheduled/cleanupExpiredDrafts` | Daily |
| Referral Digest | `/api/scheduled/referralDigest` | Weekly |
| Trade Reminders | `/api/scheduled/tradeReminders` | Daily |

All scheduled endpoints require `X-Cron-Secret` header + `taskUid` for authorization.

---

## 10. Email Notifications

All email notifications use the Tradebilia logo image as the header (not text). The logo is hosted at the `/manus-storage/` path. Notification types: `tradeInitiated`, `counterProposal`, `proposalAccepted`, `proposalRejected`, `itemsShipped`, `itemsReceived`, `feedbackReceived`, `systemUpdates`, `marketingEmails`, `messages`.

---

## 11. Pre-Launch Checklist

- [ ] **Upgrade AI Model:** Switch from Manus Forge to a better LLM (GPT-4o or Claude) before going live
- [ ] **Complete Test AI Testing:** Test all categories and data sources in the sandbox before porting to production
- [ ] **Port to Production:** Once testing complete, apply same eBay/Sold-Comps/PSA logic to production AI Analyzer in Trade Room
- [ ] **PSA Official API:** Contact PSA for account approval to unlock official API
- [ ] **Additional Scrapers:** CGC, BGS, PCGS, NGC, CBCS, PWCC, Heritage, GoCollect, Comic Book Realm

---

## 12. Current Session Summary (August 10, 2026)

This session focused on integrating the Parse.bot PSA Card API into the Test AI sandbox:

1. **Investigated ChrisMuir/psa-scrape** — determined it's blocked by Cloudflare and requires set-level IDs, not cert numbers. Not suitable for production.
2. **Tested official PSA API** — three tokens all returned 403. Needs account-level approval from PSA.
3. **Investigated Parse.bot PSA API** — third-party wrapper, works immediately, no PSA approval needed.
4. **Integrated Parse.bot** — `get_cert_full` + `get_cert_sales` endpoints. Shows cert details, Grade 1-10 population breakdown, card images, PSA estimate, and 3 recent sales.
5. **Fixed response mapping** — Parse.bot wraps data under `response.data`, not top-level.
6. **Fixed sales mapping** — sales are under `response.data.sales`, not `response.data`.
7. **Auto-query building** — cert mode now silently builds eBay/Sold-Comps queries from PSA card data.
8. **cert_direct passthrough** — new backend category that uses `input.title` as-is without rebuilding.
9. **UX improvements** — no pre-selected sources in cert mode; helpful messages when Parse.bot not enabled.
10. **Renamed source** — "PSA" → "Parse.bot (PSA Data)" to avoid confusion with future official PSA API.
