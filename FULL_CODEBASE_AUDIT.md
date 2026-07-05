# Tradebilia Codebase Audit & Cleanup Plan

**Date:** July 5, 2026  
**Auditor:** Manus  
**Scope:** Comprehensive line-by-line review of server, client, database, and storage architecture.

This report details the root causes of the stability, connection, and broken-link issues you have experienced, ranked by severity. It concludes with a structured plan to refactor the codebase for efficiency, stability, and simplicity.

---

## 1. Critical Stability & Security Issues (The "Why things break" list)

### A. Database Transactions Are Missing (Data Corruption Risk)
There are **zero database transactions** used anywhere in the 3,300 lines of `db.ts`. Operations that require multiple steps—such as creating a trade proposal (inserting the proposal, then inserting the items) or deleting a listing (deleting photos, then deleting the listing)—are executed as separate queries. If the server restarts, crashes, or loses connection halfway through, you are left with "orphaned" data and a broken database state. This directly explains why things randomly break or fail to connect properly after restarts.

### B. The Image Storage Conflict (The "Broken Links" Root Cause)
Image storage is currently scattered across four different systems, creating a fragile architecture:
1. **GitHub Raw URLs (10 of 14 listings):** Most listings point directly to `raw.githubusercontent.com`. GitHub is not a Content Delivery Network (CDN); it rate-limits unauthenticated requests (60 per hour per IP), causing images to fail to load for active users. Furthermore, because your `.env` file (containing your live database password) is currently public in this repository, you must eventually make the repository private. **The moment you make the repository private, all 10 of these images will permanently break.**
2. **S3 via Manus Storage (3 of 14 listings):** This is the correct, intended system, but it is barely used.
3. **Local `/images` Folder:** Contains 114 files, mixing UI assets with duplicated copies of user uploads.
4. **Hardcoded Keyword Overrides:** The function `resolveTradebiliaListingImage` intercepts user uploads. If a user uploads a photo of a "Rickey Henderson Rookie", the code ignores their uploaded S3 photo and forces the display of a hardcoded local image instead. Users will think their uploads are broken.

### C. Security Vulnerability in `saveProfile`
The `market.saveProfile` API endpoint is exposed as a public procedure. It accepts a `userId` from the client and falls back to it if the user is not logged in. This means any anonymous visitor can overwrite the profile, bio, and **security questions** of any user (including administrators) simply by guessing their User ID. This is an account takeover vulnerability.

### D. Port Drifting on Server Restart
When the server restarts, `index.ts` checks if port 3000 is available. If the old server process hasn't fully died yet (a common occurrence during rapid restarts), it silently binds to port 3001, 3002, etc. However, the frontend and proxy continue sending traffic to port 3000. This is the exact cause of the "things not connecting after we restarted the server" issue. The server must be configured to fail fast or kill stale listeners, not drift ports silently.

---

## 2. High Priority Code Quality & Performance Issues

### A. The `db.ts` Monolith
`server/db.ts` is a 3,318-line monolith. It mixes database connection management, S3 file uploads, and the business logic for over ten different features. This makes the code incredibly difficult to follow, prone to merge conflicts, and dangerous to edit. The original documentation acknowledged this needed to be split into feature modules (e.g., `users.ts`, `listings.ts`, `trades.ts`), but this was never executed.

### B. Synchronous Password Hashing
The `hashPassword` and `verifyPassword` functions use the synchronous versions of `bcrypt` (`bcrypt.hashSync`, `bcrypt.compareSync`). These functions intentionally block the Node.js event loop for ~100ms per call. During a burst of logins, the entire server freezes, causing all other users' page loads and queries to stall. This must be converted to asynchronous execution.

### C. Fake Client-Side Messaging
The Member-to-Member messaging system (`Messages.tsx` and `memberMessaging.ts`) relies entirely on the browser's `localStorage` and `BroadcastChannel`. Messages never touch the server database. This means if a user logs in on their phone, they will not see the messages they sent from their laptop. Furthermore, two users on different devices cannot actually message each other. (Note: Trade proposal inquiries *are* server-backed; only the direct messaging is fake).

### D. Unsafe JSON Parsing
There are multiple instances in `db.ts` where `JSON.parse()` is called on database columns (e.g., `itemDetails`, `categoryFields`) without a `try/catch` block. If a single row contains malformed JSON, the entire listing detail page or feed will crash with an HTTP 500 error for that item forever.

### E. TypeScript Safety is Broken
The project currently has 31 TypeScript compilation errors, primarily in `db.ts`. The schema was regenerated at some point, losing the `User` and `InsertUser` type exports, and there is widespread confusion between `Date` objects and strings for timestamp columns. Because the compiler is failing, it cannot protect you from introducing new bugs.

---

## 3. Medium Priority Cleanups

1. **Massive UI Code Duplication:** The HTML/Tailwind markup for the Top Bar, Hero Section, and Category Navigation is copy-pasted across more than 10 different page files. A single design change requires editing 10 files, guaranteeing eventual visual inconsistencies.
2. **Redundant Polling:** As noted in the previous system audit, the frontend aggressively polls the database for unread messages every 5 seconds per user, creating constant, unnecessary database load.
3. **Dead Code and Test Failures:** There are dead files (e.g., `CategoryPage.tsx.backup`) and 11 out of 26 test files currently fail because they attempt to connect to a live database without credentials. The test suite is currently untrustworthy.

---

## 4. Recommended Cleanup Plan

To achieve the highly organized, efficient, and bulletproof codebase you requested, I recommend executing the following phased cleanup plan. I will not begin until you approve.

### Phase 1: Security, Stability & Broken Links (Immediate Fixes)
1. **Fix Image Storage:** Remove the keyword-override logic so user uploads are respected. Write a script to migrate all GitHub raw images to S3 (`manus-storage`), then update the database rows to point to the correct, permanent S3 URLs.
2. **Secure the API:** Lock down `saveProfile` and enforce `adminProcedure` middleware on all 17 admin routes to prevent unauthorized access.
3. **Fix Server Restarts:** Remove the port-drifting logic in `index.ts` so the server binds strictly to port 3000 and cleanly kills stale processes.
4. **Fix the Event Loop:** Convert all `bcrypt` password hashing to asynchronous functions to eliminate server stalling.

### Phase 2: Code Organization & TypeScript (The "Clean Room" Phase)
1. **Dismantle the Monolith:** Split the 3,300-line `db.ts` into organized feature files (`server/features/listings.ts`, `server/features/auth.ts`, etc.).
2. **Fix TypeScript:** Resolve the 31 compiler errors, restore the missing Drizzle schema types, and enforce strict type checking so the compiler catches bugs before they happen.
3. **Add Transactions:** Wrap all multi-step database writes (trades, deletions) in `db.transaction()` blocks to prevent data corruption.

### Phase 3: UI Deduplication & True Messaging
1. **Componentize the UI:** Extract the duplicated Top Bar, Hero, and Category Nav markup into single, reusable React components.
2. **Fix Messaging:** Replace the fake `localStorage` messaging system with real, database-backed tRPC endpoints so messages sync across devices.
3. **Safe JSON:** Add safe parsing wrappers around all database JSON fields.

**Please review this plan. If you agree, let me know and I will begin executing Phase 1.**
