# Session 2 Handoff: Exact Next Steps

## Current Status (End of Session 1)

**Date:** May 29, 2026  
**Checkpoint:** a0180ce9  
**Status:** Stable - Core platform complete, eBay OAuth incomplete  
**Dev Server:** Running and healthy  
**Build:** Succeeds (54 TypeScript warnings, no errors)

---

## What's Working ✅

### Core Features
- User authentication (signup, login, logout)
- User profiles with avatars
- Collectible item listings with photos
- Marketplace browsing and search
- Trade proposal workflow (propose, respond, message, review)
- Watchlist functionality
- Member search and discovery
- User reporting system with file upload
- Admin dashboard with user/report management

### Infrastructure
- tRPC API with type-safe procedures
- Drizzle ORM with MySQL database
- S3 file storage via Manus Forge
- Custom JWT session authentication
- Tailwind CSS + shadcn/ui styling
- React 19 + Vite dev server

### Branding
- Tradebilia logo and visual identity
- Responsive homepage
- 10 category-specific pages
- Consistent design language across all pages

---

## What's NOT Working ❌

### eBay OAuth Integration (BLOCKER)
**Status:** 90% complete, 10% missing  
**Impact:** Users cannot connect eBay accounts for trust verification

**What's Done:**
- ✅ Database schema with eBay fields
- ✅ API helper module (server/_core/ebay.ts)
- ✅ tRPC procedures (ebay.getAuthUrl, ebay.connect, etc.)
- ✅ UI component (EbayConnection.tsx)
- ✅ Feedback display component (EbayProfileBadge.tsx)

**What's Missing:**
- ❌ OAuth callback endpoint (`/api/oauth/callback`) not registered
- ❌ Token exchange not wired to callback
- ❌ Feedback fetching not triggered after OAuth
- ❌ Feedback not displayed on user profiles

**Files to Review:**
- `server/_core/index.ts` - Line 6 comment: "OAuth routes removed"
- `server/_core/ebay.ts` - Helper functions exist but not called
- `server/routers.ts` - Procedures exist but callback missing
- `client/src/components/EbayConnection.tsx` - UI ready
- `client/src/components/EbayProfileBadge.tsx` - Display component ready

**Fix Complexity:** Medium (2-3 hours)

---

## TypeScript Errors (54 remaining)

**Status:** Build succeeds but IDE shows errors  
**Impact:** Confusing for developers, prevents strict mode

**Main Issues:**
1. `server/db.ts(928)` - Missing `certificationNumber` property
2. `server/db.ts(929)` - Missing `estimatedValue` property
3. `server/db.ts(1665)` - Missing `.where()` clause on Drizzle query
4. Frontend component prop type mismatches

**Fix Complexity:** Low (2-3 hours)

---

## Files to Read FIRST (in this order)

1. **docs/PROJECT_CONTEXT.md** (this folder)
   - Complete project overview
   - Tech stack and architecture
   - Completed systems vs incomplete systems

2. **docs/ROADMAP.md**
   - Development priorities
   - Recommended task order for Session 2
   - Estimated time for each task

3. **docs/KNOWN_ISSUES.md**
   - All 26 known issues documented
   - Severity and priority levels
   - Recommended fix order

4. **docs/API_ARCHITECTURE.md**
   - All tRPC procedures documented
   - Input/output types
   - Error handling patterns

5. **docs/DATABASE_SCHEMA.md**
   - All 20 database tables documented
   - Relationships and indexes
   - Scaling considerations

6. **docs/AI_RULES.md**
   - Coding standards
   - Architecture rules
   - Testing and security guidelines

---

## Session 2 Recommended Tasks (Priority Order)

### Task 1: Fix eBay OAuth Redirect (BLOCKER) - 1-2 hours
**Priority:** CRITICAL  
**Impact:** Unblocks trust verification feature

**Exact Steps:**
1. Open `server/_core/index.ts`
2. Find line 6 comment: "OAuth routes removed - using custom authentication only"
3. Add OAuth callback route registration:
   ```typescript
   app.get('/api/oauth/callback', async (req, res) => {
     const { code, state } = req.query;
     // Implement callback handler
   });
   ```
4. Implement token exchange logic using `exchangeCodeForToken()` from `server/_core/ebay.ts`
5. Fetch 3 years of feedback using `getUserFeedback()`
6. Store feedback in database
7. Redirect to `/account-settings` with success message
8. Test end-to-end: Connect eBay → Redirect → Feedback displayed

**Files to Modify:**
- `server/_core/index.ts` - Register callback route
- `server/routers.ts` - Add callback procedure (if needed)
- `client/src/components/EbayConnection.tsx` - Handle redirect

**Test:**
- Connect eBay account
- Verify redirect works
- Verify feedback appears on profile

---

### Task 2: Resolve TypeScript Errors - 2-3 hours
**Priority:** HIGH  
**Impact:** Improves IDE experience, enables strict mode

**Exact Steps:**
1. Run `pnpm check` to see all 54 errors
2. Fix `server/db.ts` errors:
   - Line 928: Add missing `certificationNumber` to type
   - Line 929: Add missing `estimatedValue` to type
   - Line 1665: Add missing `.where()` clause
3. Fix frontend component prop types
4. Run `pnpm check` again to verify
5. Commit changes

**Test:**
- `pnpm check` should pass with 0 errors
- `pnpm build` should succeed

---

### Task 3: Create Wanted Items Page - 2-3 hours
**Priority:** HIGH  
**Impact:** New feature requested by user

**Exact Steps:**
1. Add `wantedItems` table to `drizzle/schema.ts`
2. Generate migration: `pnpm drizzle-kit generate`
3. Apply migration via `webdev_execute_sql`
4. Add database helpers in `server/db.ts`
5. Add tRPC procedures in `server/routers.ts`
6. Create `client/src/pages/WantedItems.tsx`
7. Add navigation link in TopBar
8. Test: Create, view, delete wanted items

**Database Schema:**
```sql
CREATE TABLE wantedItems (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL REFERENCES users(id),
  title VARCHAR(160) NOT NULL,
  category ENUM(...) NOT NULL,
  condition ENUM(...),
  keywords VARCHAR(500),
  minEstimatedValue DECIMAL(12,2),
  maxEstimatedValue DECIMAL(12,2),
  description TEXT,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);
```

---

### Task 4: Refactor db.ts into Feature Modules - 3-4 hours
**Priority:** MEDIUM  
**Impact:** Improves code organization and maintainability

**Exact Steps:**
1. Create `server/features/` directory
2. Extract functions from `server/db.ts` into feature files:
   - `listings.ts` - Listing CRUD, search, filters
   - `trades.ts` - Trade proposals, messaging, reviews
   - `users.ts` - User profiles, authentication
   - `reports.ts` - User reports, moderation
   - `ebay.ts` - eBay feedback, integration
   - `watchlist.ts` - Watchlist operations
   - `admin.ts` - Admin operations, user management
3. Update `server/routers.ts` to import from features
4. Update `server/db.ts` to only contain connection + shared helpers
5. Run tests to verify no regressions
6. Commit changes

**Result:** Each feature file ~200-300 lines instead of one 2000-line file

---

### Task 5: Add Comprehensive Tests - 2-3 hours
**Priority:** MEDIUM  
**Impact:** Prevents regressions, improves code quality

**Exact Steps:**
1. Create test files for each feature:
   - `server/features/listings.test.ts`
   - `server/features/trades.test.ts`
   - `server/features/users.test.ts`
   - `server/features/reports.test.ts`
   - `server/features/ebay.test.ts`
2. Write tests for critical flows:
   - Create listing
   - Propose trade
   - Accept trade
   - Leave review
   - Submit report
   - Connect eBay account
3. Run `pnpm test` to verify
4. Aim for 70%+ code coverage
5. Commit changes

**Example Test:**
```typescript
describe('listings', () => {
  it('should create a listing', async () => {
    const listing = await createListing({
      ownerId: 1,
      title: 'Test Card',
      category: 'sports_cards',
      description: 'A test card',
    });
    expect(listing.id).toBeDefined();
  });
});
```

---

## Optional Session 2 Tasks (if time permits)

### Task 6: Create .env.example
- Document all required environment variables
- Add placeholder values
- Commit to git

### Task 7: Fix ProtectedRoute Anti-pattern
- Move redirect logic from render to useEffect
- Prevent race conditions

### Task 8: Reduce Session Timeout
- Change from 1 year to 7 days
- Improve security

---

## Session 2 Success Criteria

- [ ] eBay OAuth redirect working end-to-end
- [ ] Feedback displayed on user profiles
- [ ] Wanted Items feature fully functional
- [ ] TypeScript errors reduced to < 10
- [ ] All critical tests passing
- [ ] db.ts refactored into feature modules
- [ ] Code coverage > 60%
- [ ] All changes committed to git
- [ ] Checkpoint created via `webdev_save_checkpoint`

---

## Important Context

### Authentication
- **Current Method:** Custom JWT session auth (NOT Manus OAuth)
- **Session Cookie:** `TRADEBILIA_SESSION` (HttpOnly, Secure, SameSite=None)
- **Expiration:** 1 year (should be reduced to 7 days)
- **File:** `server/_core/customAuth.ts`

### Database
- **Type:** MySQL 8.0+ or TiDB
- **ORM:** Drizzle ORM
- **Schema File:** `drizzle/schema.ts`
- **Migrations:** `drizzle/migrations/`
- **Connection:** Managed by Manus platform

### Storage
- **Type:** S3 via Manus Forge
- **Helper:** `server/storage.ts` (storagePut, storageGet)
- **URLs:** `/manus-storage/{key}` format
- **No local file storage** (causes deployment timeouts)

### API
- **Type:** tRPC (type-safe RPC)
- **Transport:** HTTP POST to `/api/trpc`
- **Serialization:** SuperJSON (handles Date, Map, Set)
- **Error Handling:** tRPC error codes (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, etc.)

### Frontend
- **Framework:** React 19 with Vite
- **Routing:** wouter (SPA)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **State:** tRPC hooks + React Context
- **Auth:** useAuth() hook

---

## Common Pitfalls to Avoid

### Don't:
- ❌ Store files locally (use S3 via storagePut)
- ❌ Use raw SQL queries (use Drizzle ORM)
- ❌ Hardcode environment variables (use ENV object)
- ❌ Redirect during render (use useEffect)
- ❌ Use `any` type in TypeScript
- ❌ Forget to validate inputs with Zod
- ❌ Log sensitive data (passwords, tokens)
- ❌ Skip error handling
- ❌ Create large files (>500 lines)
- ❌ Skip tests for critical features

### Do:
- ✅ Use Drizzle ORM for all database queries
- ✅ Validate inputs with Zod schemas
- ✅ Check user ownership before modifying
- ✅ Use tRPC error codes for errors
- ✅ Write tests for critical logic
- ✅ Keep components under 300 lines
- ✅ Use React.memo for expensive components
- ✅ Batch fetch related data (avoid N+1)
- ✅ Add comments for complex logic
- ✅ Commit frequently with descriptive messages

---

## Git Workflow

### Before Starting Session 2:
```bash
cd /home/ubuntu/collectors-barter
git status                    # Verify clean state
git log --oneline -5          # See recent commits
```

### During Session 2:
```bash
git checkout -b feature/name  # Create feature branch
git add .                      # Stage changes
git commit -m "message"        # Commit frequently
git push                       # Push to GitHub
```

### At End of Session 2:
```bash
pnpm check                     # Verify TypeScript
pnpm test                      # Run tests
pnpm format                    # Format code
git add .
git commit -m "Session 2 complete"
git push
# Then create checkpoint via webdev_save_checkpoint
```

---

## Debugging Tips

### TypeScript Errors:
```bash
pnpm check                     # See all errors
pnpm check --noEmit           # Without emitting files
```

### Tests:
```bash
pnpm test                      # Run all tests
pnpm test --watch             # Watch mode
pnpm test --coverage          # Coverage report
```

### Dev Server:
```bash
pnpm dev                       # Start dev server
# Check logs in .manus-logs/devserver.log
```

### Database:
```bash
# Use webdev_execute_sql tool to run queries
# Or use the Database panel in Manus UI
```

---

## Questions to Ask User (Rich)

Before starting Session 2, clarify:

1. **eBay Integration Priority:** Should we complete the OAuth flow in Session 2, or defer to Session 3?
2. **Wanted Items Scope:** Should notifications be included, or just the listing feature?
3. **Admin Moderation:** What moderation actions are most important (suspend, warn, ban)?
4. **Timeline:** Is there a deadline for any of these features?
5. **Scope:** Should we do all 5 recommended tasks, or focus on specific ones?

---

## Checkpoint Information

**Last Checkpoint:** a0180ce9  
**Created:** May 29, 2026  
**Contains:**
- All Session 1 work
- Core platform complete
- eBay OAuth foundation (incomplete)
- Admin dashboard
- User reporting system

**To Restore:**
```bash
# If needed, use: webdev_rollback_checkpoint with version a0180ce9
```

**To Create New Checkpoint:**
```bash
# After Session 2 work:
webdev_save_checkpoint "Session 2: eBay OAuth + Wanted Items + Refactoring"
```

---

## Resources

### Documentation (in this folder)
- `PROJECT_CONTEXT.md` - Complete project overview
- `ROADMAP.md` - Development priorities
- `DATABASE_SCHEMA.md` - All tables and relationships
- `API_ARCHITECTURE.md` - All procedures and endpoints
- `KNOWN_ISSUES.md` - All 26 known issues
- `AI_RULES.md` - Coding standards and guidelines

### Key Files
- `server/routers.ts` - All tRPC procedures
- `server/db.ts` - Database layer (to be refactored)
- `drizzle/schema.ts` - Database schema
- `client/src/App.tsx` - Route definitions
- `server/_core/ebay.ts` - eBay API helpers

### External Resources
- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [React Documentation](https://react.dev)

---

## Final Checklist Before Starting Session 2

- [ ] Read PROJECT_CONTEXT.md
- [ ] Read ROADMAP.md
- [ ] Read KNOWN_ISSUES.md
- [ ] Understand eBay OAuth blocker
- [ ] Review TypeScript errors
- [ ] Check dev server is running
- [ ] Verify database connection
- [ ] Run `pnpm check` to see current state
- [ ] Run `pnpm test` to see test results
- [ ] Ask user for clarification on priorities
- [ ] Create feature branch
- [ ] Start with eBay OAuth fix (highest priority blocker)

---

**Prepared By:** Manus AI (Session 1)  
**Date:** May 29, 2026  
**Next Session:** Session 2  
**Estimated Duration:** 10-15 hours for all recommended tasks  
**Priority:** eBay OAuth > TypeScript Errors > Wanted Items > Refactoring > Tests
