# Tradebilia Project Context

## Project Overview

**Tradebilia** (codename: collectors-barter) is a web platform for collectors to barter, trade, and exchange collectible items such as comics, sports cards, Pokémon cards, vintage toys, stamps, coins, video games, movies, autographs, and Disney pins. The platform emphasizes trust verification through eBay feedback integration and community moderation through user reporting.

**Current Status:** Session 1 complete. Core features implemented and stable. eBay OAuth foundation in place but redirect flow not yet functional.

**Project ID:** nAx6ATm2BH4G46yabuMZgM  
**Repository:** GitHub (synced via `user_github` remote)  
**Deployment:** Manus WebDev hosting with custom domain support  
**Live Preview:** https://3000-ibp8lf9jdscqdjbkvnggn-0b298ee4.us2.manus.computer

---

## Tech Stack

### Frontend
- **React 19.2.1** with Vite 7.1.7 (dev server)
- **Tailwind CSS 4.1.14** with Tailwind Merge for class composition
- **shadcn/ui** components (Radix UI primitives + Tailwind styling)
- **wouter 3.3.5** for client-side routing (SPA)
- **React Hook Form 7.64.0** + Zod 4.1.12 for form validation
- **Framer Motion 12.23.22** for animations
- **Recharts 2.15.2** for data visualization (admin dashboard)
- **Embla Carousel 8.6.0** for image galleries
- **Sonner 2.0.7** for toast notifications
- **Streamdown 1.4.0** for markdown rendering

### Backend
- **Express 4.21.2** HTTP server
- **tRPC 11.6.0** for type-safe RPC (replaces traditional REST)
- **Drizzle ORM 0.44.5** with MySQL 8+ / TiDB
- **mysql2 3.15.0** database driver
- **SuperJSON 1.13.3** for serializing Date objects through tRPC

### Authentication & Storage
- **Custom JWT Session Auth** (not Manus OAuth at runtime)
- **AWS SDK S3 3.693.0** for file uploads (via Manus Forge presigned URLs)
- **jose 6.1.0** for JWT signing/verification

### External Integrations
- **eBay API** (OAuth 2.0 + Feedback API) - Foundation in place, redirect flow incomplete
- **Manus Forge API** for LLM, storage, notifications, and data APIs
- **Google Maps API** (via Manus proxy, not yet integrated)

### Build & Testing
- **tsx 4.19.1** for TypeScript execution
- **esbuild 0.25.0** for production bundling
- **TypeScript 5.9.3** for type safety
- **Vitest 2.1.4** for unit tests
- **Prettier 3.6.2** for code formatting
- **Drizzle Kit 0.31.4** for schema migrations

---

## Architecture Overview

### Frontend Structure

```
client/
├── src/
│   ├── App.tsx                 # Main route definitions (wouter SPA)
│   ├── main.tsx                # React entry point with providers
│   ├── index.css               # Global Tailwind + CSS variables
│   ├── const.ts                # Client constants (getLoginUrl, OAuth helpers)
│   ├── lib/
│   │   └── trpc.ts            # tRPC client binding
│   ├── _core/
│   │   └── hooks/useAuth.ts    # useAuth() hook for current user state
│   ├── pages/
│   │   ├── Home.tsx            # Landing page with hero, categories, recently added
│   │   ├── Inventory.tsx       # My Inventory (user's listings with filters)
│   │   ├── ReportUser.tsx      # Report a User form with file upload
│   │   ├── AdminDashboard.tsx  # Admin panel with user/report management
│   │   ├── AccountSettings.tsx # User profile, eBay connection, security
│   │   ├── [Category].tsx      # Dynamic category pages (Sports Cards, etc.)
│   │   ├── ListingDetail.tsx   # Item detail + Trade Proposal initiation
│   │   ├── TradeProposals.tsx  # Trade inbox and management
│   │   ├── Messages.tsx        # Member-to-member messaging
│   │   ├── Watchlist.tsx       # Saved listings
│   │   └── [others]            # Additional feature pages
│   ├── components/
│   │   ├── DashboardLayout.tsx # Sidebar layout for admin/internal tools
│   │   ├── TopBar.tsx          # Header with logo, search, user menu
│   │   ├── CategoryBar.tsx     # Category navigation strip
│   │   ├── EbayConnection.tsx  # eBay OAuth UI component
│   │   ├── EbayProfileBadge.tsx # eBay verification badge
│   │   ├── ProtectedRoute.tsx  # Auth gate for member-only pages
│   │   ├── ui/                 # shadcn/ui components (50+ files)
│   │   └── [others]            # Reusable UI components
│   └── contexts/               # React contexts (theme, auth, etc.)
├── public/
│   ├── favicon.ico
│   └── robots.txt
└── index.html                  # HTML entry point
```

### Backend Structure

```
server/
├── _core/
│   ├── index.ts                # Express server bootstrap (OAuth routes removed)
│   ├── context.ts              # tRPC context builder (auth injection)
│   ├── trpc.ts                 # tRPC router setup + procedure definitions
│   ├── customAuth.ts           # JWT session auth service (ACTUAL auth used)
│   ├── cookies.ts              # Session cookie options
│   ├── env.ts                  # Environment variable validation
│   ├── ebay.ts                 # eBay API helpers (OAuth, feedback fetching)
│   ├── llm.ts                  # LLM integration (Manus Forge)
│   ├── notification.ts         # Owner notifications
│   ├── storage.ts              # S3 presigned URL helpers
│   ├── vite.ts                 # Vite dev server setup
│   ├── systemRouter.ts         # System-level tRPC procedures
│   └── [others]                # Additional core utilities
├── routers.ts                  # Main tRPC router with all procedures
├── db.ts                       # Database layer (LARGE: ~2000 lines)
│                               # Contains: DB connection, query helpers, business logic
├── db.test.ts                  # Unit tests for db.ts
├── auth.logout.test.ts         # Sample vitest test
└── storage.ts                  # S3 storage helpers
```

### Database Structure

```
drizzle/
├── schema.ts                   # Drizzle ORM table definitions
├── migrations/                 # SQL migration files
└── meta/                       # Drizzle metadata
```

### Shared Code

```
shared/
├── _core/
│   └── [utilities]             # Shared utilities
└── const.ts                    # Shared constants (COOKIE_NAME, etc.)
```

---

## Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | User accounts | id, openId, username, email, role (admin/user), eBay fields |
| `userProfiles` | Extended user info | userId, displayName, avatar, bio, contact info, preferences |
| `listings` | Collectible items for trade | id, ownerId, title, category, condition, grade, description, status |
| `listingPhotos` | Item images | id, listingId, fileKey, imageUrl, sortOrder |
| `tradeProposals` | Trade requests | id, requesterId, recipientId, requestedListingId, status |
| `tradeProposalItems` | Items offered in trade | id, proposalId, offeredListingId |
| `tradeMessages` | Trade-specific chat | id, proposalId, senderId, message |
| `tradeReviews` | Post-trade ratings | id, proposalId, reviewerId, revieweeId, rating, review |
| `watchlistEntries` | Saved listings | id, userId, listingId |
| `draftListings` | Unsaved item drafts | id, userId, title, category, photos (JSON) |

### Authentication Tables

| Table | Purpose |
|-------|---------|
| `passwordResetTokens` | Password reset flow tokens |
| `emailVerificationOtps` | Email OTP verification |
| `phoneVerificationOtps` | Phone OTP verification |

### eBay Integration Tables

| Table | Purpose |
|-------|---------|
| `ebayFeedbackHistory` | Historical eBay feedback (3 years) |
| `lowFeedbackFlags` | Admin flags for low eBay scores |

### Moderation Tables

| Table | Purpose |
|-------|---------|
| `userReports` | User-submitted reports (fraud, harassment, etc.) |
| `deletedAccounts` | Audit trail of deleted user accounts |

**Total Tables:** 20  
**Indexes:** 50+ for query optimization  
**Relationships:** Full referential integrity with foreign keys

---

## Authentication Flow

### Current Implementation (Session 1)

1. **Custom JWT Session Auth** (server/_core/customAuth.ts)
   - User signs up or logs in
   - Backend creates JWT token via `createSessionToken()`
   - Token stored in HttpOnly, Secure, SameSite=None cookie
   - Each request parses cookie and hydrates user via `getUserFromSession()`

2. **Frontend Auth State** (useAuth hook)
   - Calls `trpc.auth.me.useQuery()` to fetch current user
   - Returns `{ user, isLoading, isLoggedIn }`
   - Used by `ProtectedRoute` to gate member-only pages

3. **Session Lifecycle**
   - Cookie name: `TRADEBILIA_SESSION` (from COOKIE_NAME)
   - Expiration: 1 year (ONE_YEAR_MS)
   - Secure: HttpOnly, Secure flag, SameSite=None

### eBay OAuth Integration (Incomplete)

**Status:** Foundation in place, redirect flow not functional

- **Database fields added:** ebayUsername, ebayUserId, ebayFeedbackScore, ebayAccessToken, ebayRefreshToken, ebayTokenExpiresAt
- **Helper module created:** server/_core/ebay.ts with `getEbayAuthUrl()`, `exchangeCodeForToken()`, `getUserFeedback()`
- **tRPC procedures created:** `ebay.getAuthUrl`, `ebay.connect`, `ebay.disconnect`, `ebay.getFeedback`
- **UI component created:** `EbayConnection.tsx` in Account Settings
- **Missing:** OAuth callback endpoint (`/api/oauth/callback`) not registered in server bootstrap

**Next Steps for Session 2:**
1. Register OAuth callback route in server/_core/index.ts
2. Implement callback handler to exchange code for token
3. Fetch and store 3 years of eBay feedback
4. Display feedback on user profiles

---

## API Architecture

### tRPC Router Structure

All procedures are defined in `server/routers.ts` and accessed via `trpc.*` hooks on frontend.

#### Public Procedures (no auth required)
- `auth.me` - Get current user
- `auth.signup` - Create new account
- `auth.login` - Authenticate user
- `auth.logout` - Clear session
- `marketplace.getFeed` - Browse listings
- `marketplace.getListingDetail` - View item details
- `marketplace.search` - Search listings by filters
- `members.search` - Find users by name/location
- `members.getProfile` - View member profile

#### Protected Procedures (auth required)
- `inventory.create` - Add new listing
- `inventory.update` - Edit listing
- `inventory.delete` - Remove listing
- `inventory.getMyListings` - Fetch user's items
- `trades.propose` - Create trade request
- `trades.respond` - Accept/decline/counter trade
- `trades.getInbox` - Fetch trade proposals
- `trades.sendMessage` - Chat in trade thread
- `messages.send` - Direct member-to-member message
- `profile.update` - Edit user profile
- `watchlist.toggle` - Add/remove from watchlist
- `reports.submit` - Report user for misconduct
- `ebay.getAuthUrl` - Get eBay OAuth URL
- `ebay.connect` - Link eBay account
- `ebay.getFeedback` - Fetch eBay feedback history
- `ebay.disconnect` - Unlink eBay account

#### Admin Procedures (role === 'admin')
- `admin.getAllUsers` - List all users
- `admin.deleteUser` - Remove user account
- `admin.getDeletedAccounts` - Audit trail
- `admin.getReports` - View user reports
- `admin.updateReportStatus` - Review/dismiss reports
- `admin.getLowFeedbackFlags` - Review low eBay scores
- `admin.flagLowFeedback` - Flag suspicious accounts

### Error Handling

- tRPC automatically serializes errors with codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `INTERNAL_SERVER_ERROR`
- Frontend catches errors via `useMutation().error` or `useQuery().error`
- Toast notifications display user-friendly messages

### Data Serialization

- **SuperJSON** handles Date objects, Maps, Sets across RPC boundary
- No manual JSON.stringify/parse needed
- Drizzle ORM rows return directly with types preserved

---

## Completed Systems

### Phase 1: Core Platform (✅ Complete)
- [x] User authentication (signup, login, logout, session management)
- [x] User profiles with avatars and contact info
- [x] Collectible item listings with photos and metadata
- [x] Marketplace browsing and search by category/condition
- [x] Trade proposal workflow (request → review → accept/decline)
- [x] Trade messaging and audit trail
- [x] Post-trade ratings and reviews
- [x] Watchlist for saving items
- [x] Member search and discovery

### Phase 2: Branding & UI (✅ Complete)
- [x] Tradebilia logo and visual identity
- [x] Responsive homepage with hero, categories, metrics, recently added
- [x] Category-specific pages (Sports Cards, Stamps, Video Games, etc.)
- [x] Item detail pages with image gallery
- [x] Trade inbox and proposal management UI
- [x] Account settings page
- [x] Member profile pages
- [x] Messaging interface
- [x] Watchlist page
- [x] Report a User form

### Phase 3: Trust & Safety (✅ Partial)
- [x] User reporting system with file upload
- [x] Admin dashboard for report review
- [x] eBay OAuth foundation (database, helpers, UI)
- [ ] eBay OAuth callback redirect (incomplete)
- [ ] eBay feedback display on profiles (incomplete)
- [ ] Admin moderation tools (partial)

### Phase 4: Admin Tools (⚠️ Partial)
- [x] Admin dashboard with user/report management
- [x] User deletion with audit trail
- [x] Report status tracking
- [ ] Advanced moderation (suspend, warn, ban)
- [ ] Analytics dashboard (partial)
- [ ] Platform statistics

---

## Partially Completed Systems

### eBay Integration
- **Completed:** Database schema, API helpers, UI component, tRPC procedures
- **Incomplete:** OAuth callback endpoint, token exchange, feedback fetching and display
- **Blocker:** Callback route not registered in server bootstrap

### Admin Dashboard
- **Completed:** User list, report list, deletion capability
- **Incomplete:** Advanced filters, bulk actions, analytics, moderation tools
- **Known Issue:** Some TypeScript errors in admin components

### Email/SMS Verification
- **Completed:** Database tables and OTP generation
- **Incomplete:** SendGrid/Twilio integration (deferred, requires API keys)

---

## Unfinished Systems

### High Priority
1. **eBay OAuth Redirect Flow** - Complete the callback endpoint and token exchange
2. **eBay Feedback Display** - Show 3 years of feedback on user profiles
3. **Wanted Items (Wishlist)** - Create a separate wishlist feature for items users want to find
4. **Admin Moderation Tools** - Suspend, warn, or ban users
5. **Resolve TypeScript Errors** - ~110 remaining type mismatches

### Medium Priority
1. **Email OTP Delivery** - Integrate SendGrid (requires API key)
2. **SMS OTP Delivery** - Integrate Twilio (requires API key)
3. **Analytics Dashboard** - Track user activity, trades, feedback trends
4. **Upcoming Convention Page** - Data-driven events listing (awaiting source website)
5. **Advanced Search** - Filters for grade, year, team, autograph/relic status

### Low Priority
1. **Merchant Program** - Seller badges and merchant-specific features
2. **Bulk Import** - Upload multiple items via CSV
3. **API for Third Parties** - Public API for integrations
4. **Mobile App** - Native iOS/Android clients

---

## Important Architectural Decisions

### 1. Custom JWT Auth Instead of Manus OAuth
- **Decision:** Use custom JWT session auth (customAuth.ts) instead of Manus OAuth
- **Reason:** Simpler session management, no external dependency at runtime
- **Trade-off:** Must manage token refresh, expiration, and security ourselves
- **Note:** Frontend still references OAuth URLs in const.ts; this is legacy code that should be cleaned up

### 2. tRPC Instead of REST
- **Decision:** Use tRPC for all backend communication
- **Reason:** Type-safe RPC, automatic client generation, no manual API contracts
- **Benefit:** Frontend and backend share TypeScript types end-to-end
- **Note:** All procedures defined in server/routers.ts; no separate REST endpoints

### 3. Single Large db.ts File
- **Decision:** Concentrate all database queries and business logic in one file
- **Reason:** Easier to locate logic during development
- **Trade-off:** File is ~2000 lines; should be split into feature modules in Session 2
- **Recommendation:** Refactor into server/features/*.ts (listings, trades, users, etc.)

### 4. S3 Storage via Manus Forge
- **Decision:** Use Manus Forge presigned URLs for S3 uploads
- **Reason:** No need to manage AWS credentials; platform handles it
- **Implementation:** server/storage.ts provides storagePut/storageGet helpers
- **Note:** All file URLs use `/manus-storage/` path; never store files locally

### 5. Drizzle ORM with MySQL
- **Decision:** Use Drizzle ORM for type-safe database access
- **Reason:** Lightweight, excellent TypeScript support, easy migrations
- **Database:** MySQL 8+ or TiDB (compatible)
- **Migrations:** Generated via `pnpm drizzle-kit generate`, applied via `webdev_execute_sql`

### 6. Tailwind CSS 4 with shadcn/ui
- **Decision:** Use Tailwind 4 + shadcn/ui for styling
- **Reason:** Utility-first CSS, pre-built accessible components, consistent design system
- **Customization:** CSS variables in client/src/index.css for theming
- **Note:** Dark theme is default; light theme available via ThemeProvider

---

## Known Issues & Technical Debt

### Critical Issues
1. **eBay OAuth Callback Missing** - Redirect flow not implemented; users cannot connect eBay accounts
2. **TypeScript Errors (~110)** - Mostly frontend type mismatches; build succeeds but IDE shows errors
3. **Legacy OAuth References** - client/src/const.ts and server/_core/oauth.ts reference old OAuth flow; should be removed

### Performance Concerns
1. **Large db.ts File** - 2000+ lines makes it hard to navigate; should be split by feature
2. **N+1 Query Pattern** - Some list operations fetch profiles/ratings separately; could use JOIN optimization
3. **No Caching Layer** - Frequently accessed data (categories, user profiles) re-queried each time
4. **Image Optimization** - Listing photos not resized/optimized before storage

### Code Quality Issues
1. **Duplicate Logic** - Some business logic repeated across procedures
2. **Missing Error Handling** - Some edge cases not handled (e.g., concurrent trade accepts)
3. **Incomplete Tests** - Only 2 test files; most features untested
4. **Missing Documentation** - Code comments sparse; API contracts not documented

### Security Concerns
1. **Session Timeout** - 1-year cookie expiration is very long; should be shorter
2. **CSRF Protection** - No CSRF tokens; relies on SameSite cookie flag
3. **Rate Limiting** - No rate limiting on auth endpoints; vulnerable to brute force
4. **Input Validation** - Some Zod schemas are loose; could be stricter

### UI/UX Issues
1. **ProtectedRoute Redirect** - Redirects during render (anti-pattern); should use useEffect
2. **Loading States** - Some pages don't show loading skeletons
3. **Error Messages** - Generic error messages; could be more user-friendly
4. **Mobile Responsiveness** - Some pages not fully responsive

---

## Repository Hygiene

### ✅ Verified
- `.gitignore` correctly excludes node_modules, .env files, build outputs
- No secrets or API keys committed
- No large binary files
- Clean git history with descriptive commit messages

### ⚠️ Needs Attention
- `.env.example` file missing (should be created with placeholder variables)
- Some unused imports in source files
- Inconsistent code formatting (should run `pnpm format`)

---

## Development Priorities

### Session 2 Recommended Order
1. **Fix eBay OAuth Redirect** (1-2 hours)
   - Register callback route in server/_core/index.ts
   - Implement token exchange and feedback fetching
   - Display feedback on user profiles

2. **Create Wanted Items Page** (2-3 hours)
   - New wishlist feature for items users want to find
   - Search and filter by category/condition
   - Notifications when matching items are listed

3. **Resolve TypeScript Errors** (2-3 hours)
   - Fix frontend type mismatches
   - Enable strict mode in tsconfig
   - Run `pnpm check` to verify

4. **Refactor db.ts** (3-4 hours)
   - Split into feature modules (listings.ts, trades.ts, users.ts, etc.)
   - Improve code organization and maintainability
   - Add missing error handling

5. **Add Comprehensive Tests** (2-3 hours)
   - Write vitest tests for critical procedures
   - Test auth flows, trade workflows, admin operations
   - Aim for 70%+ code coverage

6. **Admin Moderation Tools** (2-3 hours)
   - Implement user suspension/warning system
   - Add moderation dashboard
   - Create audit logs

### Session 3+ Roadmap
- Email/SMS OTP integration (SendGrid, Twilio)
- Advanced search and filtering
- Analytics dashboard
- Merchant program
- Mobile app
- Upcoming Convention page (data-driven)

---

## Environment Setup

### Required Environment Variables
All injected by Manus platform; no manual setup needed:
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Session token signing key
- `VITE_APP_ID` - Manus OAuth app ID
- `OAUTH_SERVER_URL` - Manus OAuth backend URL
- `VITE_OAUTH_PORTAL_URL` - Manus login portal URL
- `BUILT_IN_FORGE_API_URL` - Manus Forge API endpoint
- `BUILT_IN_FORGE_API_KEY` - Forge API bearer token
- `VITE_FRONTEND_FORGE_API_URL` - Frontend Forge API endpoint
- `VITE_FRONTEND_FORGE_API_KEY` - Frontend Forge API token

### Optional (For External Services)
- `EBAY_CLIENT_ID` - eBay API credentials (to be added)
- `EBAY_CLIENT_SECRET` - eBay API credentials (to be added)
- `SENDGRID_API_KEY` - Email OTP delivery (deferred)
- `TWILIO_ACCOUNT_SID` - SMS OTP delivery (deferred)

### Development Commands
```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (Vite + Express)
pnpm build            # Build for production
pnpm start            # Run production build
pnpm check            # TypeScript type check
pnpm format           # Format code with Prettier
pnpm test             # Run vitest tests
pnpm db:push          # Generate and apply migrations
```

---

## Key Files Reference

| File | Purpose | Size |
|------|---------|------|
| `server/routers.ts` | All tRPC procedures | ~2500 lines |
| `server/db.ts` | Database layer + business logic | ~2000 lines |
| `client/src/App.tsx` | Route definitions | ~300 lines |
| `drizzle/schema.ts` | Database schema | ~450 lines |
| `client/src/pages/Home.tsx` | Homepage | ~400 lines |
| `client/src/components/DashboardLayout.tsx` | Admin layout | ~300 lines |
| `server/_core/customAuth.ts` | JWT auth | ~200 lines |
| `server/_core/ebay.ts` | eBay API helpers | ~150 lines |

---

## Next Session Checklist

- [ ] Read this document first
- [ ] Read ROADMAP.md for development priorities
- [ ] Read KNOWN_ISSUES.md for blockers
- [ ] Read API_ARCHITECTURE.md for endpoint details
- [ ] Run `pnpm check` to see current TypeScript errors
- [ ] Run `pnpm test` to verify test suite
- [ ] Review the 3 eBay-related files: server/_core/ebay.ts, server/routers.ts (ebay procedures), components/EbayConnection.tsx
- [ ] Start with eBay OAuth redirect flow fix (highest priority blocker)

---

## Contact & Handoff

**Session 1 Owner:** Manus AI (Session 1)  
**Session 2 Owner:** Manus AI (Session 2+)  
**Project Owner:** Rich  
**Last Updated:** May 29, 2026  
**Checkpoint:** a0180ce9
