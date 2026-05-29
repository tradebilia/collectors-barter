# Tradebilia Project Folder Structure

## Complete Directory Tree

```
collectors-barter/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── App.tsx                 # Main route definitions (wouter SPA)
│   │   ├── main.tsx                # React entry point with providers
│   │   ├── index.css               # Global Tailwind + CSS variables
│   │   ├── const.ts                # Client constants (getLoginUrl, etc.)
│   │   ├── _core/
│   │   │   └── hooks/
│   │   │       └── useAuth.ts      # useAuth() hook for auth state
│   │   ├── lib/
│   │   │   └── trpc.ts             # tRPC client binding
│   │   ├── pages/                  # Page-level components (one per route)
│   │   │   ├── Home.tsx            # Landing page with hero, categories, recently added
│   │   │   ├── Inventory.tsx       # My Inventory (user's listings with filters)
│   │   │   ├── ReportUser.tsx      # Report a User form with file upload
│   │   │   ├── AdminDashboard.tsx  # Admin panel with user/report management
│   │   │   ├── AccountSettings.tsx # User profile, eBay connection, security
│   │   │   ├── [Category].tsx      # Dynamic category pages (Sports Cards, etc.)
│   │   │   ├── ListingDetail.tsx   # Item detail + Trade Proposal initiation
│   │   │   ├── TradeProposals.tsx  # Trade inbox and management
│   │   │   ├── Messages.tsx        # Member-to-member messaging
│   │   │   ├── Watchlist.tsx       # Saved listings
│   │   │   ├── MemberProfile.tsx   # Member profile view
│   │   │   ├── MemberSearch.tsx    # Member search and discovery
│   │   │   ├── SignUp.tsx          # User registration
│   │   │   ├── Login.tsx           # User login
│   │   │   └── [others]            # Additional feature pages
│   │   ├── components/             # Reusable UI components
│   │   │   ├── DashboardLayout.tsx # Sidebar layout for admin/internal tools
│   │   │   ├── DashboardLayoutSkeleton.tsx # Loading skeleton
│   │   │   ├── TopBar.tsx          # Header with logo, search, user menu
│   │   │   ├── CategoryBar.tsx     # Category navigation strip
│   │   │   ├── TopRightIcons.tsx   # User menu and icons
│   │   │   ├── EbayConnection.tsx  # eBay OAuth UI component
│   │   │   ├── EbayProfileBadge.tsx # eBay verification badge
│   │   │   ├── ProtectedRoute.tsx  # Auth gate for member-only pages
│   │   │   ├── SignInModal.tsx     # Sign in modal dialog
│   │   │   ├── OtpVerification.tsx # OTP verification component
│   │   │   ├── ErrorBoundary.tsx   # Error boundary wrapper
│   │   │   ├── ManusDialog.tsx     # Custom dialog component
│   │   │   ├── Map.tsx             # Google Maps integration
│   │   │   ├── AIChatBox.tsx       # AI chat interface
│   │   │   ├── AnimatedCategoryText.tsx # Animated text component
│   │   │   ├── CategoryTopBar.tsx  # Category-specific top bar
│   │   │   ├── RecentlyAddedCarousel.tsx # Carousel for recent items
│   │   │   ├── OnlineIndicator.tsx # Online status indicator
│   │   │   ├── PageHeader.tsx      # Page header component
│   │   │   ├── ui/                 # shadcn/ui components (50+ files)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── [50+ more shadcn components]
│   │   │   │   └── ...
│   │   │   └── [other reusable components]
│   │   ├── contexts/               # React contexts
│   │   │   ├── ThemeContext.tsx    # Theme provider (dark/light)
│   │   │   └── [other contexts]
│   │   └── hooks/                  # Custom React hooks
│   │       ├── useAuth.ts          # Auth state hook
│   │       └── [other custom hooks]
│   ├── public/                     # Static files (small config only)
│   │   ├── favicon.ico
│   │   ├── robots.txt
│   │   └── manifest.json
│   ├── index.html                  # HTML entry point
│   ├── tsconfig.json               # TypeScript configuration
│   └── vite.config.ts              # Vite build configuration
│
├── server/                         # Express backend (tRPC)
│   ├── _core/                      # Core infrastructure
│   │   ├── index.ts                # Express server bootstrap
│   │   ├── context.ts              # tRPC context builder (auth injection)
│   │   ├── trpc.ts                 # tRPC router setup + procedure definitions
│   │   ├── customAuth.ts           # JWT session auth service
│   │   ├── cookies.ts              # Session cookie options
│   │   ├── env.ts                  # Environment variable validation
│   │   ├── ebay.ts                 # eBay API helpers (OAuth, feedback)
│   │   ├── llm.ts                  # LLM integration (Manus Forge)
│   │   ├── notification.ts         # Owner notifications
│   │   ├── storage.ts              # S3 presigned URL helpers
│   │   ├── vite.ts                 # Vite dev server setup
│   │   ├── systemRouter.ts         # System-level tRPC procedures
│   │   ├── oauth.ts                # Legacy OAuth (not used, can be removed)
│   │   ├── auth.ts                 # Auth utilities (hashing, validation)
│   │   ├── storageProxy.ts         # S3 storage proxy
│   │   └── [other core utilities]
│   ├── routers.ts                  # Main tRPC router with all procedures
│   ├── db.ts                       # Database layer (~2000 lines)
│   │                               # Contains: DB connection, query helpers, business logic
│   │                               # TO BE REFACTORED: Split into server/features/*
│   ├── db.test.ts                  # Unit tests for db.ts
│   ├── auth.logout.test.ts         # Sample vitest test
│   ├── storage.ts                  # S3 storage helpers
│   └── features/                   # Feature modules (to be created in Session 2)
│       ├── listings.ts             # Listing CRUD, search, filters
│       ├── trades.ts               # Trade proposals, messaging, reviews
│       ├── users.ts                # User profiles, authentication
│       ├── reports.ts              # User reports, moderation
│       ├── ebay.ts                 # eBay feedback, integration
│       ├── watchlist.ts            # Watchlist operations
│       └── admin.ts                # Admin operations, user management
│
├── drizzle/                        # Database ORM (Drizzle)
│   ├── schema.ts                   # Drizzle ORM table definitions (20 tables)
│   ├── migrations/                 # SQL migration files
│   │   ├── 0000_initial.sql
│   │   ├── 0001_add_ebay_fields.sql
│   │   ├── [other migrations]
│   │   └── ...
│   └── meta/                       # Drizzle metadata
│
├── shared/                         # Shared code (frontend + backend)
│   ├── _core/
│   │   └── [shared utilities]
│   └── const.ts                    # Shared constants (COOKIE_NAME, etc.)
│
├── storage/                        # S3 storage helpers
│   └── [storage utilities]
│
├── docs/                           # Documentation (Session 1 handoff)
│   ├── PROJECT_CONTEXT.md          # Complete project overview
│   ├── ROADMAP.md                  # Development priorities
│   ├── DATABASE_SCHEMA.md          # All tables and relationships
│   ├── API_ARCHITECTURE.md         # All procedures and endpoints
│   ├── KNOWN_ISSUES.md             # All 26 known issues
│   ├── AI_RULES.md                 # Coding standards and guidelines
│   ├── NEXT_SESSION_PROMPT.md      # Exact handoff instructions
│   └── PROJECT_FOLDER_TREE.md      # This file
│
├── patches/                        # pnpm patches for dependencies
│   └── wouter@3.7.1.patch
│
├── notes/                          # Development notes (optional)
│   └── [session notes, ideas, etc.]
│
├── .manus/                         # Manus platform metadata
│   └── db/                         # Local database files
│
├── .manus-logs/                    # Development server logs
│   ├── devserver.log
│   ├── browserConsole.log
│   ├── networkRequests.log
│   └── sessionReplay.log
│
├── .git/                           # Git repository
│   └── [git metadata]
│
├── .gitignore                      # Git ignore rules
├── .prettierrc                     # Prettier code formatting
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Project dependencies and scripts
├── pnpm-lock.yaml                  # Locked dependency versions
├── vite.config.ts                  # Vite build configuration
├── vitest.config.ts                # Vitest test configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── postcss.config.cjs              # PostCSS configuration
├── README.md                       # Project README
└── todo.md                         # Development TODO list (1000+ lines)
```

---

## Directory Descriptions

### `/client/src/`
**Purpose:** React frontend source code  
**Key Files:**
- `App.tsx` - Route definitions and main layout
- `main.tsx` - React entry point with providers
- `index.css` - Global styles and CSS variables
- `const.ts` - Client constants

**Subdirectories:**
- `pages/` - One component per route (Home, Inventory, etc.)
- `components/` - Reusable UI components
- `contexts/` - React contexts (theme, auth, etc.)
- `hooks/` - Custom React hooks
- `lib/` - Utility libraries (tRPC client)

### `/client/public/`
**Purpose:** Static files served at root  
**Contents:** favicon.ico, robots.txt, manifest.json  
**⚠️ WARNING:** Do NOT put images/media here (use S3 instead)

### `/server/_core/`
**Purpose:** Core infrastructure and utilities  
**Key Files:**
- `index.ts` - Express server bootstrap
- `customAuth.ts` - JWT session authentication
- `context.ts` - tRPC context builder
- `ebay.ts` - eBay API integration
- `storage.ts` - S3 storage helpers

### `/server/`
**Purpose:** Backend business logic  
**Key Files:**
- `routers.ts` - All tRPC procedures
- `db.ts` - Database layer (to be refactored)
- `storage.ts` - S3 storage helpers

**To Be Created (Session 2):**
- `features/listings.ts` - Listing operations
- `features/trades.ts` - Trade operations
- `features/users.ts` - User operations
- `features/reports.ts` - Report operations
- `features/ebay.ts` - eBay operations
- `features/watchlist.ts` - Watchlist operations
- `features/admin.ts` - Admin operations

### `/drizzle/`
**Purpose:** Database schema and migrations  
**Key Files:**
- `schema.ts` - Drizzle ORM table definitions
- `migrations/` - Generated SQL migration files

### `/docs/`
**Purpose:** Session 1 handoff documentation  
**Contents:**
- PROJECT_CONTEXT.md - Project overview
- ROADMAP.md - Development priorities
- DATABASE_SCHEMA.md - Database documentation
- API_ARCHITECTURE.md - API documentation
- KNOWN_ISSUES.md - Known issues and bugs
- AI_RULES.md - Coding standards
- NEXT_SESSION_PROMPT.md - Session 2 instructions

---

## File Size Reference

| File | Size | Purpose |
|------|------|---------|
| `server/db.ts` | ~2000 lines | Database layer (to be refactored) |
| `server/routers.ts` | ~2500 lines | All tRPC procedures |
| `client/src/App.tsx` | ~300 lines | Route definitions |
| `drizzle/schema.ts` | ~450 lines | Database schema |
| `client/src/pages/Home.tsx` | ~400 lines | Homepage |
| `client/src/components/DashboardLayout.tsx` | ~300 lines | Admin layout |
| `server/_core/customAuth.ts` | ~200 lines | JWT auth |
| `server/_core/ebay.ts` | ~150 lines | eBay API |

---

## Key Statistics

| Metric | Value |
|--------|-------|
| Total TypeScript/TSX Files | 161 |
| Total Lines of Code | ~29,400 |
| Database Tables | 20 |
| tRPC Procedures | 50+ |
| React Components | 80+ |
| CSS Variables | 30+ |
| Test Files | 2 |
| Documentation Files | 7 |

---

## Important Notes

### Frontend
- **React 19** with Vite for fast development
- **wouter** for client-side routing (SPA)
- **Tailwind CSS 4** for styling
- **shadcn/ui** for pre-built components
- **tRPC** for type-safe API calls

### Backend
- **Express 4** for HTTP server
- **tRPC 11** for type-safe RPC
- **Drizzle ORM** for database access
- **MySQL 8+** or **TiDB** for database
- **Custom JWT auth** (not Manus OAuth)

### Storage
- **S3 via Manus Forge** for file storage
- **No local file storage** (causes deployment issues)
- URLs use `/manus-storage/{key}` format

### Development
- **pnpm** for package management
- **Vite** for frontend build
- **tsx** for TypeScript execution
- **Vitest** for unit tests
- **Prettier** for code formatting

---

## Refactoring Opportunities

### Session 2 (Recommended)
1. **Split `server/db.ts`** into `server/features/*` modules
2. **Extract reusable components** from pages into components/
3. **Create custom hooks** for repeated logic

### Session 3+ (Future)
1. **Add feature flags** for safer rollouts
2. **Implement caching layer** (Redis)
3. **Add API versioning** for backward compatibility
4. **Create shared types** package

---

## Adding New Files

### New Page
1. Create `client/src/pages/NewPage.tsx`
2. Add route in `client/src/App.tsx`
3. Add navigation link in TopBar or menu

### New Component
1. Create `client/src/components/NewComponent.tsx`
2. Export from `client/src/components/index.ts` (barrel export)
3. Import and use in pages

### New Database Table
1. Add table to `drizzle/schema.ts`
2. Run `pnpm drizzle-kit generate`
3. Apply migration via `webdev_execute_sql`
4. Add query helpers in `server/db.ts` or `server/features/*`
5. Add tRPC procedures in `server/routers.ts`

### New tRPC Procedure
1. Add to `server/routers.ts`
2. Define input schema with Zod
3. Define output type
4. Implement logic (use database helpers)
5. Call from frontend via `trpc.*.useQuery/useMutation`

---

## Deployment Structure

When deployed, the folder structure becomes:

```
dist/                              # Production build
├── index.js                        # Bundled server
├── client/                         # Built frontend
│   ├── index.html
│   ├── assets/
│   │   ├── main.js
│   │   ├── main.css
│   │   └── [other assets]
│   └── ...
└── ...
```

---

**Last Updated:** May 29, 2026  
**Version:** 1.0  
**Total Files:** 161 TypeScript/TSX files  
**Total Lines:** ~29,400 lines of code
