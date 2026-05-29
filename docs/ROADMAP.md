# Tradebilia Development Roadmap

## Session 1 Status: ✅ Complete

### Completed Phases

#### Phase 1: Core Platform Foundation
- User authentication (signup, login, logout)
- User profiles with avatars and contact information
- Collectible item listings with photos
- Marketplace browsing and search
- Trade proposal workflow
- Trade messaging and audit trail
- Ratings and reviews system
- Watchlist functionality
- Member search and discovery

#### Phase 2: Branding & Visual Design
- Tradebilia logo integration
- Homepage redesign (hero, categories, metrics, recently added)
- Category-specific pages (10 categories)
- Item detail pages with image galleries
- Trade inbox and proposal management UI
- Account settings page
- Member profile pages
- Messaging interface
- Report a User form

#### Phase 3: Trust & Safety (Partial)
- User reporting system with file upload
- Admin dashboard for report review
- eBay OAuth foundation (database, helpers, UI)
  - ✅ Database schema with eBay fields
  - ✅ API helper module (server/_core/ebay.ts)
  - ✅ tRPC procedures (ebay.getAuthUrl, ebay.connect, etc.)
  - ✅ UI component (EbayConnection.tsx)
  - ❌ OAuth callback redirect (INCOMPLETE)
  - ❌ Token exchange (INCOMPLETE)
  - ❌ Feedback display (INCOMPLETE)

---

## Session 2 Recommended Tasks (High Priority)

### Task 1: Fix eBay OAuth Redirect Flow (BLOCKER)
**Estimated Time:** 1-2 hours  
**Difficulty:** Medium  
**Impact:** Unblocks eBay integration for all future work

**What's Done:**
- Database schema with eBay fields
- API helper module (getEbayAuthUrl, exchangeCodeForToken, getUserFeedback)
- tRPC procedures for OAuth flow
- UI component for connecting eBay account

**What's Missing:**
- OAuth callback endpoint (`/api/oauth/callback`) not registered in server bootstrap
- Token exchange logic not wired to callback
- Feedback fetching not triggered after token exchange
- Feedback display on user profiles

**Implementation Steps:**
1. Open `server/_core/index.ts`
2. Register OAuth callback route (currently commented out)
3. Implement callback handler to:
   - Extract code and state from query params
   - Call `exchangeCodeForToken()` to get access token
   - Store token in database via `updateUserEbayInfo()`
   - Fetch 3 years of feedback via `getUserFeedback()`
   - Store feedback in `ebayFeedbackHistory` table
   - Redirect to `/account-settings` with success message
4. Update `EbayConnection.tsx` to handle redirect after OAuth completes
5. Create `EbayProfileBadge.tsx` to display feedback on user profiles
6. Add feedback display to `client/src/pages/Profile.tsx`

**Files to Modify:**
- `server/_core/index.ts` - Register callback route
- `server/routers.ts` - Add callback procedure (if needed)
- `client/src/components/EbayConnection.tsx` - Handle redirect
- `client/src/pages/Profile.tsx` - Display feedback badge

**Testing:**
- Test OAuth flow: Connect eBay account → Redirect → Feedback displayed
- Verify feedback stored in database
- Test disconnect flow

---

### Task 2: Create Wanted Items (Wishlist) Page
**Estimated Time:** 2-3 hours  
**Difficulty:** Medium  
**Impact:** New feature requested by user; enables users to find items they want

**Feature Description:**
- Separate from existing Watchlist (which saves specific listings)
- Users create "wanted" items: category, condition, keywords, price range
- Platform notifies users when matching items are listed
- Search and browse wanted items from other collectors

**Database Changes:**
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

**Implementation Steps:**
1. Add `wantedItems` table to `drizzle/schema.ts`
2. Generate migration: `pnpm drizzle-kit generate`
3. Apply migration via `webdev_execute_sql`
4. Add database helpers in `server/db.ts`:
   - `createWantedItem()`
   - `getWantedItems()`
   - `deleteWantedItem()`
   - `searchWantedItems()`
5. Add tRPC procedures in `server/routers.ts`:
   - `wanted.create` - Create wanted item
   - `wanted.getMyWanted` - List user's wanted items
   - `wanted.delete` - Remove wanted item
   - `wanted.search` - Search all wanted items
6. Create `client/src/pages/WantedItems.tsx` page
7. Add navigation link in TopBar
8. Implement notification logic (optional for Session 2)

**UI Components:**
- Wanted items list with filters
- Create wanted item form
- Search/browse wanted items from other users
- Delete wanted item action

---

### Task 3: Resolve TypeScript Errors (~110 remaining)
**Estimated Time:** 2-3 hours  
**Difficulty:** Low-Medium  
**Impact:** Improves IDE experience, enables strict type checking

**Current Errors:**
- Frontend type mismatches (missing properties, wrong types)
- Drizzle ORM query builder type issues
- Form validation schema mismatches

**Steps:**
1. Run `pnpm check` to see all errors
2. Fix frontend component types (mostly prop interfaces)
3. Fix Drizzle query builder issues (add missing .where() clauses)
4. Fix form schema mismatches (Zod validation)
5. Enable `strict: true` in `tsconfig.json` (optional)
6. Verify build succeeds: `pnpm build`

**Files to Check:**
- `server/db.ts` - Drizzle query issues
- `client/src/pages/*.tsx` - Component prop types
- `server/routers.ts` - Procedure input/output types

---

### Task 4: Refactor db.ts into Feature Modules
**Estimated Time:** 3-4 hours  
**Difficulty:** Medium  
**Impact:** Improves code organization, maintainability, and team velocity

**Current Problem:**
- `server/db.ts` is ~2000 lines with all business logic
- Hard to navigate, find, and modify specific features
- Makes code reviews difficult

**Proposed Structure:**
```
server/
├── db.ts                    # DB connection + shared helpers only
├── features/
│   ├── listings.ts          # Listing CRUD, search, filters
│   ├── trades.ts            # Trade proposals, messaging, reviews
│   ├── users.ts             # User profiles, authentication
│   ├── reports.ts           # User reports, moderation
│   ├── ebay.ts              # eBay feedback, integration
│   ├── watchlist.ts         # Watchlist operations
│   └── admin.ts             # Admin operations, user management
└── routers.ts               # Import from features, wire procedures
```

**Steps:**
1. Create `server/features/` directory
2. Extract listing functions → `server/features/listings.ts`
3. Extract trade functions → `server/features/trades.ts`
4. Extract user functions → `server/features/users.ts`
5. Extract report functions → `server/features/reports.ts`
6. Extract eBay functions → `server/features/ebay.ts`
7. Update `server/routers.ts` to import from features
8. Update `server/db.ts` to only contain connection + shared helpers
9. Run tests to verify no regressions

**Benefits:**
- Easier to find code
- Clearer separation of concerns
- Simpler code reviews
- Easier to test individual features

---

### Task 5: Add Comprehensive Unit Tests
**Estimated Time:** 2-3 hours  
**Difficulty:** Medium  
**Impact:** Prevents regressions, improves code quality

**Current State:**
- Only 2 test files (auth.logout.test.ts, db.test.ts)
- Most features untested
- No coverage tracking

**Recommended Test Coverage:**
1. Authentication flows (signup, login, logout, session)
2. Listing operations (create, update, delete, search)
3. Trade workflow (propose, respond, message, review)
4. User reports (submit, review, update status)
5. eBay integration (OAuth, feedback fetching)
6. Admin operations (delete user, manage reports)

**Test Files to Create:**
- `server/features/listings.test.ts`
- `server/features/trades.test.ts`
- `server/features/users.test.ts`
- `server/features/reports.test.ts`
- `server/features/ebay.test.ts`

**Example Test Structure:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createListing, getListingDetail } from '../features/listings';

describe('Listings', () => {
  it('should create a listing', async () => {
    const listing = await createListing({
      ownerId: 1,
      title: 'Test Card',
      category: 'sports_cards',
      // ...
    });
    expect(listing.id).toBeDefined();
  });

  it('should fetch listing details', async () => {
    const detail = await getListingDetail(1, 1);
    expect(detail.title).toBe('Test Card');
  });
});
```

**Run Tests:**
```bash
pnpm test                    # Run all tests
pnpm test --coverage        # Generate coverage report
```

---

## Session 2 Optional Tasks (Lower Priority)

### Task 6: Admin Moderation Tools
**Estimated Time:** 2-3 hours  
**Difficulty:** Medium  
**Impact:** Enables admins to enforce community standards

**Features:**
- Suspend user account (temporary)
- Warn user (with message)
- Ban user permanently
- Bulk actions (suspend multiple users)
- Moderation audit log

**Database Changes:**
- Add `suspendedUntil`, `warningCount`, `isBanned` fields to `users` table
- Create `moderationLog` table for audit trail

---

### Task 7: Email/SMS OTP Integration
**Estimated Time:** 1-2 hours  
**Difficulty:** Low  
**Impact:** Enables email/SMS verification flows

**Setup:**
- SendGrid for email OTP (requires API key)
- Twilio for SMS OTP (requires API key)
- Add helpers in `server/_core/email.ts` and `server/_core/sms.ts`
- Wire to signup flow

---

### Task 8: Analytics Dashboard
**Estimated Time:** 2-3 hours  
**Difficulty:** Medium  
**Impact:** Provides insights into platform usage

**Metrics:**
- Total users, active users, new users
- Total listings, trades completed
- Average rating, feedback distribution
- Category popularity
- Geographic distribution

---

## Session 3+ Roadmap

### Phase 4: Advanced Features
- [ ] Merchant program (seller badges, bulk listing)
- [ ] Advanced search filters (grade, year, team, autograph status)
- [ ] Bulk import (CSV upload for multiple items)
- [ ] Scheduled listings (list items for future date)
- [ ] Auction-style bidding (alternative to barter)

### Phase 5: Integrations
- [ ] Public API for third-party integrations
- [ ] Stripe payment processing (optional for premium features)
- [ ] Google Maps integration (show member locations)
- [ ] Social media sharing (list items on social)

### Phase 6: Mobile & Scaling
- [ ] Mobile app (iOS/Android)
- [ ] Real-time notifications (WebSocket)
- [ ] Image CDN optimization
- [ ] Database indexing optimization
- [ ] Caching layer (Redis)

### Phase 7: Content & Community
- [ ] Upcoming Convention page (data-driven)
- [ ] Community blog
- [ ] User guides and tutorials
- [ ] FAQ and help center
- [ ] Community forums

---

## Dependency Graph

```
Session 1 (Complete)
├── Core Platform ✅
├── Branding & UI ✅
└── Trust & Safety (Partial) ✅

Session 2 (Recommended)
├── Fix eBay OAuth ← BLOCKER
├── Wanted Items
├── TypeScript Errors
├── Refactor db.ts
└── Add Tests

Session 2+ (Optional)
├── Admin Moderation
├── Email/SMS OTP
└── Analytics

Session 3+
├── Advanced Features
├── Integrations
├── Mobile & Scaling
└── Content & Community
```

---

## Metrics & Success Criteria

### Session 2 Success Criteria
- [ ] eBay OAuth redirect working end-to-end
- [ ] Feedback displayed on user profiles
- [ ] Wanted Items feature fully functional
- [ ] TypeScript errors reduced to < 10
- [ ] All critical tests passing
- [ ] db.ts refactored into feature modules
- [ ] Code coverage > 60%

### Session 3 Success Criteria
- [ ] Admin moderation tools complete
- [ ] Email/SMS OTP working
- [ ] Analytics dashboard live
- [ ] Code coverage > 80%
- [ ] All TypeScript errors resolved

---

## Risk Assessment

### High Risk
1. **eBay OAuth Callback** - If not fixed, blocks trust verification feature
2. **Database Refactoring** - Risk of breaking existing functionality
3. **TypeScript Strict Mode** - May require significant rewrites

### Medium Risk
1. **Large Feature Additions** - Wanted Items adds complexity
2. **Test Coverage** - May reveal hidden bugs
3. **Performance** - Refactoring may impact query performance

### Low Risk
1. **UI Improvements** - Generally safe, easy to rollback
2. **Documentation** - No production impact
3. **Code Formatting** - Purely cosmetic

---

## Estimated Timeline

| Task | Hours | Difficulty | Session |
|------|-------|-----------|---------|
| eBay OAuth Fix | 1-2 | Medium | 2 |
| Wanted Items | 2-3 | Medium | 2 |
| TypeScript Errors | 2-3 | Low | 2 |
| db.ts Refactor | 3-4 | Medium | 2 |
| Add Tests | 2-3 | Medium | 2 |
| **Session 2 Total** | **10-15** | - | - |
| Admin Moderation | 2-3 | Medium | 2+ |
| Email/SMS OTP | 1-2 | Low | 2+ |
| Analytics | 2-3 | Medium | 3 |
| **Session 3 Total** | **5-8** | - | - |

---

## Notes for Next Session

1. **Start with eBay OAuth** - It's the biggest blocker and will unblock other trust features
2. **Test as you go** - Don't wait until the end to test; write tests incrementally
3. **Refactor carefully** - db.ts refactoring is risky; test thoroughly
4. **Keep documentation updated** - Update this roadmap as you complete tasks
5. **Ask for clarification** - If requirements are unclear, ask the user (Rich) before implementing

---

## Questions for User (Rich)

1. **eBay Integration Priority:** Should we complete the OAuth flow in Session 2, or defer to Session 3?
2. **Wanted Items Scope:** Should notifications be included, or just the listing feature?
3. **Admin Moderation:** What moderation actions are most important (suspend, warn, ban)?
4. **Analytics:** What metrics are most important to track?
5. **Timeline:** Is there a deadline for any of these features?

---

**Last Updated:** May 29, 2026  
**Next Review:** After Session 2 completion
