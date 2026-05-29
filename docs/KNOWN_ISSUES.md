# Tradebilia Known Issues & Technical Debt

## Critical Issues (Blocking)

### 1. eBay OAuth Callback Not Registered
**Severity:** CRITICAL  
**Status:** OPEN  
**Impact:** Users cannot connect eBay accounts; trust verification blocked  
**Affected Files:**
- `server/_core/index.ts` - OAuth callback route missing
- `server/routers.ts` - No callback procedure

**Description:**
The eBay OAuth integration is partially implemented. Database schema, API helpers, and UI components exist, but the OAuth callback endpoint is not registered in the Express server. When users complete eBay OAuth authorization, they have no way to exchange the code for a token.

**Root Cause:**
During initial development, OAuth routes were removed from `server/_core/index.ts` (line 6 comment: "OAuth routes removed - using custom authentication only"). The callback route was never re-added.

**Solution:**
1. Register callback route in `server/_core/index.ts`:
   ```typescript
   app.get('/api/oauth/callback', async (req, res) => {
     const { code, state } = req.query;
     // Exchange code for token
     // Store token in database
     // Fetch feedback
     // Redirect to frontend
   });
   ```
2. Implement token exchange logic
3. Fetch 3 years of eBay feedback
4. Store feedback in `ebayFeedbackHistory` table
5. Display feedback on user profiles

**Priority:** Session 2 (BLOCKER)

---

### 2. TypeScript Errors (~54 remaining)
**Severity:** HIGH  
**Status:** OPEN  
**Impact:** IDE shows errors; build succeeds but with warnings  
**Error Count:** 54 TypeScript errors

**Examples:**
- `server/db.ts(928)` - Property 'certificationNumber' missing on type
- `server/db.ts(1665)` - Missing 'where' clause on Drizzle query
- Frontend component prop type mismatches

**Root Cause:**
- Incomplete type definitions in Drizzle ORM queries
- Form schema mismatches between input and database
- Missing optional properties in type unions

**Solution:**
1. Run `pnpm check` to see all errors
2. Fix Drizzle query builders (add missing `.where()` clauses)
3. Fix form schema mismatches
4. Fix frontend component prop types
5. Enable `strict: true` in `tsconfig.json` (optional)

**Priority:** Session 2 (HIGH)

---

## High Priority Issues

### 3. Legacy OAuth References in Frontend
**Severity:** HIGH  
**Status:** OPEN  
**Impact:** Confusing code; potential for future bugs  
**Affected Files:**
- `client/src/const.ts` - References `VITE_OAUTH_PORTAL_URL`
- `server/_core/oauth.ts` - Unused OAuth route handler

**Description:**
Frontend code still references Manus OAuth URLs and callback flows, even though the server uses custom JWT auth. This creates confusion about the actual authentication mechanism.

**Root Cause:**
During migration from Manus OAuth to custom auth, frontend code was not fully updated.

**Solution:**
1. Remove `server/_core/oauth.ts` (unused)
2. Update `client/src/const.ts` to remove OAuth references
3. Document that custom JWT auth is used (not Manus OAuth)

**Priority:** Session 2 (CLEANUP)

---

### 4. Large Monolithic db.ts File
**Severity:** MEDIUM  
**Status:** OPEN  
**Impact:** Hard to navigate, maintain, and test  
**File Size:** ~2000 lines

**Description:**
All database queries and business logic concentrated in one file. Makes it difficult to:
- Find specific functions
- Test individual features
- Review code changes
- Onboard new developers

**Solution:**
Refactor into feature modules:
```
server/features/
├── listings.ts      # Listing CRUD, search
├── trades.ts        # Trade proposals, messaging
├── users.ts         # User profiles, auth
├── reports.ts       # User reports
├── ebay.ts          # eBay integration
├── watchlist.ts     # Watchlist operations
└── admin.ts         # Admin operations
```

**Priority:** Session 2 (MEDIUM)

---

### 5. Missing Comprehensive Tests
**Severity:** MEDIUM  
**Status:** OPEN  
**Impact:** No regression protection; hard to refactor safely  
**Current Coverage:** ~5% (only 2 test files)

**Description:**
Only 2 test files exist:
- `server/auth.logout.test.ts`
- `server/db.test.ts`

Most critical features (trades, listings, reports, eBay) are untested.

**Solution:**
Create test files for each feature:
- `server/features/listings.test.ts`
- `server/features/trades.test.ts`
- `server/features/users.test.ts`
- `server/features/reports.test.ts`
- `server/features/ebay.test.ts`

**Priority:** Session 2 (MEDIUM)

---

## Medium Priority Issues

### 6. ProtectedRoute Uses Anti-pattern
**Severity:** MEDIUM  
**Status:** OPEN  
**Impact:** Potential race conditions, confusing code  
**Affected File:** `client/src/components/ProtectedRoute.tsx`

**Description:**
ProtectedRoute redirects during render phase instead of using useEffect:
```typescript
// ❌ Bad: Redirect during render
if (!user) {
  setLocation('/');
  return null;
}
```

This is an anti-pattern that can cause race conditions and unexpected behavior.

**Solution:**
Use useEffect for side effects:
```typescript
// ✅ Good: Redirect in effect
useEffect(() => {
  if (!user && !isLoading) {
    setLocation('/');
  }
}, [user, isLoading]);
```

**Priority:** Session 2 (CLEANUP)

---

### 7. Session Timeout Too Long
**Severity:** MEDIUM  
**Status:** OPEN  
**Impact:** Security risk; users stay logged in indefinitely  
**Current Timeout:** 1 year (31,536,000,000 ms)

**Description:**
Session cookies expire after 1 year, which is unusually long. Standard practice is 1-7 days.

**Solution:**
Reduce session timeout to 7 days:
```typescript
const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
```

**Priority:** Session 2 (SECURITY)

---

### 8. No Rate Limiting on Auth Endpoints
**Severity:** MEDIUM  
**Status:** OPEN  
**Impact:** Vulnerable to brute force attacks  
**Affected Endpoints:**
- `auth.login`
- `auth.signup`
- Password reset

**Description:**
No rate limiting implemented on authentication endpoints. Attackers can attempt unlimited login/signup attempts.

**Solution:**
Implement rate limiting:
- Auth endpoints: 5 requests per minute per IP
- API endpoints: 100 requests per minute per user
- Search endpoints: 10 requests per second per user

**Tools:** express-rate-limit or custom middleware

**Priority:** Session 3 (SECURITY)

---

### 9. No Input Sanitization
**Severity:** MEDIUM  
**Status:** OPEN  
**Impact:** Potential XSS vulnerabilities  
**Affected Areas:**
- User-generated content (descriptions, reviews)
- Search queries
- User profiles

**Description:**
User-generated content is not sanitized before display. Could allow XSS attacks.

**Solution:**
1. Sanitize on input (server-side validation)
2. Escape on output (React automatically does this)
3. Use DOMPurify for rich text content

**Priority:** Session 3 (SECURITY)

---

### 10. Tokens Not Encrypted at Rest
**Severity:** MEDIUM  
**Status:** OPEN  
**Impact:** Security risk if database compromised  
**Affected Fields:**
- `users.ebayAccessToken`
- `users.ebayRefreshToken`

**Description:**
eBay OAuth tokens stored in plaintext in database. If database is compromised, attacker gains access to user eBay accounts.

**Solution:**
1. Encrypt tokens before storage
2. Decrypt on retrieval
3. Use AES-256 encryption with database-level keys

**Priority:** Session 3 (SECURITY)

---

## Low Priority Issues

### 11. Missing .env.example File
**Severity:** LOW  
**Status:** OPEN  
**Impact:** Developers don't know what env vars are needed  
**Solution:**
Create `.env.example` with placeholder values:
```
DATABASE_URL=mysql://user:password@localhost:3306/tradebilia
JWT_SECRET=your-secret-key-here
VITE_APP_ID=your-app-id
# ... etc
```

**Priority:** Session 2 (DOCUMENTATION)

---

### 12. Inconsistent Code Formatting
**Severity:** LOW  
**Status:** OPEN  
**Impact:** Harder to read code  
**Solution:**
Run `pnpm format` to auto-format all files

**Priority:** Session 2 (CLEANUP)

---

### 13. Unused Imports
**Severity:** LOW  
**Status:** OPEN  
**Impact:** Clutters code  
**Solution:**
Run linter to find and remove unused imports

**Priority:** Session 2 (CLEANUP)

---

### 14. Missing Error Handling in Edge Cases
**Severity:** LOW  
**Status:** OPEN  
**Impact:** Potential crashes in rare scenarios  
**Examples:**
- Concurrent trade accepts
- Race condition in listing deletion
- Database connection timeout

**Solution:**
Add error handling for edge cases:
- Optimistic locking for concurrent updates
- Retry logic for transient failures
- Graceful degradation for timeouts

**Priority:** Session 3 (ROBUSTNESS)

---

### 15. No Logging System
**Severity:** LOW  
**Status:** OPEN  
**Impact:** Hard to debug issues in production  
**Solution:**
Implement structured logging:
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

**Priority:** Session 3 (OPERATIONS)

---

## Performance Issues

### 16. N+1 Query Pattern in Marketplace Feed
**Severity:** MEDIUM  
**Status:** OPEN  
**Impact:** Slow marketplace queries with many listings  
**Affected Function:** `getMarketplaceFeed()` in `server/db.ts`

**Description:**
Fetches listings, then separately fetches profiles and ratings for each listing. Should use JOIN queries.

**Current Pattern:**
```typescript
const listings = await db.select().from(listings);
const profiles = await getProfileMap(listings.map(l => l.ownerId));
const ratings = await getRatingStatsMap(listings.map(l => l.ownerId));
```

**Optimized Pattern:**
```typescript
const listings = await db
  .select()
  .from(listings)
  .leftJoin(userProfiles, eq(listings.ownerId, userProfiles.userId))
  .leftJoin(tradeReviews, eq(listings.ownerId, tradeReviews.revieweeId));
```

**Priority:** Session 3 (PERFORMANCE)

---

### 17. No Caching Layer
**Severity:** MEDIUM  
**Status:** OPEN  
**Impact:** Repeated database queries for same data  
**Examples:**
- User profiles fetched multiple times
- Category lists fetched for every request
- Search results not cached

**Solution:**
Implement Redis caching:
- User profiles: 1 hour TTL
- Categories: 24 hour TTL
- Search results: 5 minute TTL

**Priority:** Session 3 (PERFORMANCE)

---

### 18. Image Optimization Missing
**Severity:** LOW  
**Status:** OPEN  
**Impact:** Large file sizes, slow page loads  
**Solution:**
1. Resize images before upload (max 2000px)
2. Compress images (JPEG quality 80%)
3. Generate thumbnails (200px for listings)
4. Use WebP format for modern browsers

**Priority:** Session 3 (PERFORMANCE)

---

## Data Quality Issues

### 19. Duplicate eBay Feedback Possible
**Severity:** LOW  
**Status:** OPEN  
**Impact:** Inflated feedback counts  
**Description:**
No unique constraint on `ebayFeedbackHistory.feedbackId`. Same feedback could be stored multiple times.

**Solution:**
Add unique index:
```sql
ALTER TABLE ebayFeedbackHistory 
ADD UNIQUE INDEX idx_feedbackId (feedbackId);
```

**Priority:** Session 2 (DATA QUALITY)

---

### 20. No Soft Delete for Listings
**Severity:** LOW  
**Status:** OPEN  
**Impact:** Deleted listings referenced in trades become orphaned  
**Description:**
Listings are hard-deleted. If a listing is deleted, trade proposals referencing it become invalid.

**Solution:**
Implement soft delete:
1. Add `deletedAt` timestamp to listings
2. Filter out deleted listings in queries
3. Preserve referential integrity

**Priority:** Session 3 (DATA QUALITY)

---

## Documentation Issues

### 21. Missing API Documentation
**Severity:** LOW  
**Status:** OPEN  
**Impact:** Hard to understand API  
**Solution:**
Generate OpenAPI/Swagger docs from tRPC router

**Priority:** Session 3 (DOCUMENTATION)

---

### 22. Missing Code Comments
**Severity:** LOW  
**Status:** OPEN  
**Impact:** Hard to understand complex logic  
**Solution:**
Add JSDoc comments to complex functions

**Priority:** Session 3 (DOCUMENTATION)

---

## Deployment Issues

### 23. No Environment Validation
**Severity:** MEDIUM  
**Status:** OPEN  
**Impact:** Server crashes if env vars missing  
**Solution:**
Validate all required env vars at startup:
```typescript
const requiredEnvs = ['DATABASE_URL', 'JWT_SECRET', ...];
for (const env of requiredEnvs) {
  if (!process.env[env]) {
    throw new Error(`Missing required env var: ${env}`);
  }
}
```

**Priority:** Session 2 (RELIABILITY)

---

### 24. No Health Check Endpoint
**Severity:** LOW  
**Status:** OPEN  
**Impact:** Load balancers can't verify server health  
**Solution:**
Add `/health` endpoint:
```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
```

**Priority:** Session 3 (OPERATIONS)

---

## Architectural Debt

### 25. No Feature Flags
**Severity:** LOW  
**Status:** OPEN  
**Impact:** Can't safely roll out new features  
**Solution:**
Implement feature flags:
```typescript
const isFeatureEnabled = (feature: string, userId?: number) => {
  // Check database or config
};
```

**Priority:** Session 4 (SCALABILITY)

---

### 26. No A/B Testing Infrastructure
**Severity:** LOW  
**Status:** OPEN  
**Impact:** Can't measure feature impact  
**Solution:**
Implement A/B testing framework

**Priority:** Session 4 (ANALYTICS)

---

## Summary by Priority

| Priority | Count | Issues |
|----------|-------|--------|
| CRITICAL | 1 | eBay OAuth callback |
| HIGH | 3 | TypeScript errors, OAuth refs, db.ts size |
| MEDIUM | 8 | Tests, ProtectedRoute, timeout, rate limiting, sanitization, tokens, N+1, caching |
| LOW | 14 | .env.example, formatting, unused imports, error handling, logging, images, duplicates, soft delete, docs, health check, feature flags, A/B testing |

---

## Recommended Fix Order

### Session 2 (Immediate)
1. ✅ Fix eBay OAuth callback (BLOCKER)
2. ✅ Resolve TypeScript errors
3. ✅ Remove legacy OAuth references
4. ✅ Refactor db.ts into features
5. ✅ Add comprehensive tests
6. ✅ Create .env.example
7. ✅ Fix ProtectedRoute anti-pattern
8. ✅ Reduce session timeout
9. ✅ Add environment validation

### Session 3 (Important)
1. Implement rate limiting
2. Add input sanitization
3. Encrypt tokens at rest
4. Fix N+1 query patterns
5. Add caching layer
6. Optimize images
7. Add logging system
8. Generate API docs

### Session 4+ (Nice to Have)
1. Implement feature flags
2. Add A/B testing
3. Add health check endpoint
4. Implement soft deletes
5. Add more comprehensive error handling

---

**Last Updated:** May 29, 2026  
**Total Issues:** 26  
**Critical:** 1  
**High:** 3  
**Medium:** 8  
**Low:** 14
