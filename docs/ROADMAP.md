# Tradebilia Development Roadmap

**Last Updated:** Jul 19, 2026

---

## Completed ✅

- Core platform (auth, profiles, listings, marketplace, search)
- Trade proposal workflow + War Room
- Ratings & reviews system
- Watchlist (Saved Items + Saved Traders tabs)
- Save Trader button on Public Profile
- Member search and discovery
- Branding & visual design (logo, hero, categories, item detail)
- Admin Dashboard (stats, users, listings, trades, reports, referrals, conventions)
- Admin: Suspend / Unsuspend users
- Admin: Delete users
- Admin: **Warn User** (with message, warnCount tracking)
- Admin: **Permanent Ban** (with reason, bannedAt)
- Admin: **Moderation Audit Log** (all actions logged)
- Admin: Banned Users tab
- eBay OAuth foundation (DB schema, API helpers, UI component)
- War Room chat avatars (grouped by sender)
- Recent Trades backend (referenceNumber column, getRecentTrades endpoint)
- Trade reference number **auto-assigned** on completion (TR-XXXXX)
- Homepage leaderboard redesign (card-based, borders, typography)
- Public Profile: Bio in Overview tab, About tab removed

---

## Pending Tasks — Ranked Easiest to Hardest

---

### 1. Enforce Ban at Login & Trade Initiation ⚡ Easy (30 min)
**What:** Banned users can still technically log in and initiate trades. The `isBanned` flag exists in the DB but is not checked anywhere in the auth or trade flow.
**What to do:**
- In `server/_core/customAuth.ts` — reject session if `isBanned = 1`
- In `server/tradeFlowRouter.ts` — add ban check alongside the existing `isSuspended` check at trade initiation

---

### 2. Recent Trades Feed — Frontend Component ⚡ Easy (1 hr)
**What:** The backend (`getRecentTrades` endpoint) is fully built. We just need to pick a visual direction (Option 1: Live Feed was the favourite) and build the React component.
**What to do:**
- Create `client/src/components/RecentTradesFeed.tsx`
- Wire to `trpc.market.getRecentTrades`
- Drop into `Home.tsx` between the carousel and the Top 10 rankings
- Add fade-in animation and auto-refresh polling

---

### 3. Warn User — Show Warning to the User 🟡 Easy–Medium (1 hr)
**What:** Warnings are stored and visible to admins, but the user themselves never sees them. They should receive a notification or banner when they log in.
**What to do:**
- Add a `trpc.market.getMyWarnings` endpoint (query `userWarnings` for the logged-in user)
- Show a dismissible alert banner on the homepage or dashboard when there are unread warnings

---

### 4. Wanted Items / Wishlist Page 🟡 Medium (2–3 hrs)
**What:** Users can post what they're looking for (category, condition, keywords, price range). Other collectors can browse wanted items. Platform notifies users when a match is listed.
**What to do:**
- Add `wantedItems` table to schema + migrate
- Add tRPC endpoints: `createWantedItem`, `getMyWantedItems`, `deleteWantedItem`, `searchWantedItems`
- Build `client/src/pages/WantedItems.tsx`
- Add nav link in TopBar

---

### 5. eBay OAuth — Complete the Flow 🟡 Medium (2–3 hrs)
**What:** The eBay connection UI exists but the OAuth callback is not wired. Users can click "Connect eBay" but the token exchange never completes.
**What to do:**
- Register `/api/oauth/callback` route in `server/_core/index.ts`
- Implement callback: extract code → call `exchangeCodeForToken()` → store token → fetch feedback → redirect to `/account-settings`
- Update `EbayConnection.tsx` to handle post-redirect state
- Display eBay feedback badge on Public Profile (`EbayProfileBadge.tsx` already exists)

---

### 6. Real-Time Notifications (WebSocket) 🔴 Hard (3–5 hrs)
**What:** Currently, trade alerts and messages require a page refresh. Users should get live notifications for: new trade proposals, new messages, trade status changes, warnings.
**What to do:**
- Add WebSocket server to `server/_core/index.ts` (using `ws` package)
- Create a notification context in the frontend
- Push events from the server on trade/message/alert creation
- Show a notification bell with unread count in the TopBar

---

### 7. Advanced Search Filters 🔴 Hard (3–4 hrs)
**What:** The current search only filters by category and keyword. Collectors need to filter by grade, certification company, condition, estimated value range, and item type.
**What to do:**
- Extend the search tRPC endpoint with additional filter params
- Update `SearchResults.tsx` with a filter sidebar/panel
- Add filter state management and URL params for shareable searches

---

### 8. Email / SMS Notifications 🔴 Hard (3–5 hrs)
**What:** No email or SMS is sent for any event (new trade proposal, message, warning, ban). This is critical for user retention.
**What to do:**
- Integrate SendGrid (email) — requires API key from Rich
- Integrate Twilio (SMS) — requires API key from Rich
- Create `server/_core/email.ts` and `server/_core/sms.ts` helpers
- Wire to: new trade proposal, new message, trade completed, warning issued

---

## Phase 3+ (Future)

| Feature | Notes |
|---|---|
| Merchant program (seller badges, bulk listing) | Long-term |
| Bulk item import via CSV | Medium-term |
| Auction-style bidding | Long-term |
| Google Maps (member locations) | Medium-term |
| Mobile app (iOS/Android) | Long-term |
| Stripe payment processing | Long-term |
| Community blog | Long-term |

---

## Quick Reference — Effort Estimate

| # | Task | Effort |
|---|---|---|
| 1 | Enforce ban at login/trade | 30 min |
| 2 | Recent Trades Feed (frontend) | 1 hr |
| 3 | Show warnings to user | 1 hr |
| 4 | Wanted Items / Wishlist page | 2–3 hrs |
| 5 | eBay OAuth complete flow | 2–3 hrs |
| 6 | Real-time notifications (WebSocket) | 3–5 hrs |
| 7 | Advanced search filters | 3–4 hrs |
| 8 | Email / SMS notifications | 3–5 hrs |
