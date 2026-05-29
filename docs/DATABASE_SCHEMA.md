# Tradebilia Database Schema

## Overview

**Database Type:** MySQL 8.0+ / TiDB  
**ORM:** Drizzle ORM 0.44.5  
**Schema File:** `drizzle/schema.ts`  
**Total Tables:** 20  
**Total Indexes:** 50+  
**Relationships:** Full referential integrity with foreign keys

---

## Core Tables

### users
Primary table for user accounts and authentication.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Unique user identifier |
| `openId` | VARCHAR(64) | UNIQUE, NULLABLE | Manus OAuth identifier (legacy) |
| `username` | VARCHAR(64) | UNIQUE | Login username |
| `passwordHash` | VARCHAR(255) | NULLABLE | Bcrypt hash for password auth |
| `name` | TEXT | NULLABLE | User's full name |
| `email` | VARCHAR(320) | NULLABLE | Email address |
| `displayName` | VARCHAR(255) | NULLABLE | Public display name |
| `avatarUrl` | TEXT | NULLABLE | Profile picture URL |
| `loginMethod` | VARCHAR(64) | NULLABLE | Auth method (password, oauth, etc.) |
| `role` | ENUM('user', 'admin') | DEFAULT 'user' | User role for access control |
| `securityQuestion` | VARCHAR(255) | NULLABLE | Account recovery question |
| `securityAnswerHash` | VARCHAR(255) | NULLABLE | Hashed recovery answer |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Account creation time |
| `updatedAt` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Last profile update |
| `lastSignedIn` | TIMESTAMP | DEFAULT NOW() | Last login time |
| `lastActivityAt` | TIMESTAMP | DEFAULT NOW() | Last activity (for online status) |
| `ebayUsername` | VARCHAR(64) | NULLABLE | eBay seller username |
| `ebayUserId` | VARCHAR(64) | NULLABLE | eBay user ID |
| `ebayFeedbackScore` | INT | NULLABLE | Total eBay feedback score |
| `ebayFeedbackPercentage` | DECIMAL(5,2) | NULLABLE | eBay positive feedback % |
| `ebayMemberSince` | TIMESTAMP | NULLABLE | eBay account creation date |
| `ebayConnectedAt` | TIMESTAMP | NULLABLE | When eBay account linked |
| `ebayAccessToken` | TEXT | NULLABLE | OAuth access token (encrypted in production) |
| `ebayRefreshToken` | TEXT | NULLABLE | OAuth refresh token (encrypted in production) |
| `ebayTokenExpiresAt` | TIMESTAMP | NULLABLE | Token expiration time |

**Indexes:**
- `openId` (UNIQUE)
- `username` (UNIQUE)

**Notes:**
- Online status determined by `lastActivityAt` within 5 minutes (ONLINE_STATUS_TIMEOUT_MS = 300000)
- eBay fields added for trust verification integration
- Tokens should be encrypted in production

---

### userProfiles
Extended user profile information (one-to-one with users).

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Profile record ID |
| `userId` | INT | FK → users.id, UNIQUE | Associated user |
| `displayName` | VARCHAR(120) | NOT NULL | Public display name |
| `firstName` | VARCHAR(100) | NULLABLE | First name |
| `lastName` | VARCHAR(100) | NULLABLE | Last name |
| `avatarUrl` | TEXT | NULLABLE | Profile picture URL |
| `avatarKey` | VARCHAR(255) | NULLABLE | S3 storage key for avatar |
| `bio` | TEXT | NULLABLE | User biography |
| `contactFullName` | VARCHAR(160) | NULLABLE | Full name for shipping |
| `contactEmail` | VARCHAR(320) | NULLABLE | Contact email |
| `contactPhone` | VARCHAR(40) | NULLABLE | Contact phone |
| `contactAddress` | TEXT | NULLABLE | Street address |
| `contactTown` | VARCHAR(100) | NULLABLE | City/town |
| `contactState` | VARCHAR(100) | NULLABLE | State/province |
| `contactZipCode` | VARCHAR(20) | NULLABLE | Postal code |
| `contactCountry` | VARCHAR(100) | NULLABLE | Country |
| `acceptedTerms` | BOOLEAN | DEFAULT false | Terms acceptance |
| `isMerchant` | BOOLEAN | DEFAULT false | Merchant account flag |
| `securityQuestion` | VARCHAR(255) | NULLABLE | Account recovery question |
| `securityAnswer` | VARCHAR(255) | NULLABLE | Recovery answer (plain text - should be hashed) |
| `preferredCategories` | TEXT | NULLABLE | JSON array of preferred categories |
| `notificationPreferences` | TEXT | NULLABLE | JSON object of notification settings |
| `connectedAccounts` | TEXT | NULLABLE | JSON array of connected accounts |
| `showProfile` | BOOLEAN | DEFAULT true | Public profile visibility |
| `hideInventoryValue` | BOOLEAN | DEFAULT false | Hide estimated inventory value |
| `receiveContactRequests` | BOOLEAN | DEFAULT true | Allow member contact |
| `emailVerified` | BOOLEAN | DEFAULT false | Email verification status |
| `phoneVerified` | BOOLEAN | DEFAULT false | Phone verification status |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Profile creation |
| `updatedAt` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Last profile update |

**Indexes:**
- `userId` (UNIQUE)

**Notes:**
- One-to-one relationship with users table
- Contact information revealed only after trade accepted
- JSON fields should be validated before storage
- `securityAnswer` should be hashed in production

---

### listings
Collectible items available for trade.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Listing ID |
| `ownerId` | INT | FK → users.id | Item owner |
| `title` | VARCHAR(160) | NOT NULL | Item title |
| `category` | ENUM(...) | NOT NULL | Collectible category |
| `condition` | ENUM(...) | NOT NULL | Item condition |
| `grade` | ENUM(...) | DEFAULT 'ungraded' | Grading (PSA, BGS, etc.) |
| `certificationCompany` | VARCHAR(50) | NULLABLE | Grading company name |
| `estimatedValue` | DECIMAL(12,2) | NULLABLE | Estimated value in USD |
| `description` | TEXT | NOT NULL | Item description |
| `status` | ENUM('active', 'traded', 'archived') | DEFAULT 'active' | Listing status |
| `isActive` | BOOLEAN | DEFAULT true | Active flag |
| `featured` | BOOLEAN | DEFAULT false | Featured listing flag |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Listing creation |
| `updatedAt` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Last update |

**Indexes:**
- `ownerId` - Find user's listings
- `category` - Filter by category
- `condition` - Filter by condition
- `status` - Find active listings

**Enums:**
- `category`: comics, sports_cards, vintage_toys, video_games, stamps, coins, pokemon, movies, autographs, disney_pins
- `condition`: mint, near_mint, very_good, good, fair, poor
- `grade`: ungraded, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10

---

### listingPhotos
Images for collectible items.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Photo ID |
| `listingId` | INT | FK → listings.id | Associated listing |
| `fileKey` | VARCHAR(255) | NOT NULL | S3 storage key |
| `imageUrl` | TEXT | NOT NULL | Full S3 URL |
| `altText` | VARCHAR(180) | NULLABLE | Alt text for accessibility |
| `sortOrder` | INT | DEFAULT 0 | Display order |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Upload time |

**Indexes:**
- `listingId` - Find photos for listing

**Notes:**
- Multiple photos per listing (1:many)
- `sortOrder` determines gallery display order
- `fileKey` used for deletion/management

---

## Trade Tables

### tradeProposals
Trade requests between users.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Proposal ID |
| `requesterId` | INT | FK → users.id | User making request |
| `recipientId` | INT | FK → users.id | Item owner |
| `requestedListingId` | INT | FK → listings.id | Item being requested |
| `note` | TEXT | NULLABLE | Message from requester |
| `status` | ENUM(...) | DEFAULT 'pending' | Proposal status |
| `respondedAt` | TIMESTAMP | NULLABLE | When recipient responded |
| `completedAt` | TIMESTAMP | NULLABLE | When trade completed |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Proposal creation |
| `updatedAt` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Last update |

**Indexes:**
- `requesterId` - Find user's outgoing proposals
- `recipientId` - Find user's incoming proposals
- `requestedListingId` - Find proposals for listing
- `status` - Filter by status

**Enums:**
- `status`: pending, accepted, declined, completed, cancelled

---

### tradeProposalItems
Items offered in response to a trade proposal.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Item ID |
| `proposalId` | INT | FK → tradeProposals.id | Associated proposal |
| `offeredListingId` | INT | FK → listings.id | Item being offered |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | When added |

**Indexes:**
- `proposalId` - Find items for proposal
- `offeredListingId` - Find proposals offering item
- `(proposalId, offeredListingId)` - Unique constraint

**Notes:**
- Many items per proposal (1:many)
- Unique constraint prevents duplicate items in same proposal

---

### tradeMessages
Messages within trade proposals.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Message ID |
| `proposalId` | INT | FK → tradeProposals.id | Associated proposal |
| `senderId` | INT | FK → users.id | Message author |
| `message` | TEXT | NOT NULL | Message content |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Send time |

**Indexes:**
- `proposalId` - Find messages for proposal
- `senderId` - Find user's messages

**Notes:**
- Audit trail for trade negotiations
- Immutable (no edit/delete)

---

### tradeReviews
Ratings and reviews after completed trades.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Review ID |
| `proposalId` | INT | FK → tradeProposals.id | Associated trade |
| `reviewerId` | INT | FK → users.id | Who wrote review |
| `revieweeId` | INT | FK → users.id | Who is reviewed |
| `rating` | INT | NOT NULL | 1-5 star rating |
| `review` | TEXT | NULLABLE | Review text |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Review date |

**Indexes:**
- `proposalId` - Find reviews for trade
- `reviewerId` - Find user's reviews written
- `revieweeId` - Find user's reviews received
- `(proposalId, reviewerId)` - Unique constraint

**Notes:**
- One review per person per trade
- Unique constraint prevents duplicate reviews

---

## Watchlist & Drafts

### watchlistEntries
Saved listings for later reference.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Entry ID |
| `userId` | INT | FK → users.id | User who saved |
| `listingId` | INT | FK → listings.id | Saved listing |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Save time |

**Indexes:**
- `userId` - Find user's watchlist
- `listingId` - Find who saved item
- `(userId, listingId)` - Unique constraint

---

### draftListings
Unsaved item drafts.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Draft ID |
| `userId` | INT | FK → users.id | Draft owner |
| `title` | VARCHAR(160) | NOT NULL | Item title |
| `category` | ENUM(...) | NOT NULL | Category |
| `grade` | ENUM(...) | DEFAULT 'ungraded' | Grade |
| `graderCompany` | VARCHAR(100) | NULLABLE | Grading company |
| `certificationNumber` | VARCHAR(100) | NULLABLE | Cert number |
| `estimatedValue` | DECIMAL(12,2) | NULLABLE | Estimated value |
| `categoryFields` | TEXT | NULLABLE | JSON of category-specific fields |
| `additionalNotes` | TEXT | NULLABLE | Extra notes |
| `photos` | TEXT | NULLABLE | JSON array of photo data |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Draft creation |
| `updatedAt` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Last edit |

**Indexes:**
- `userId` - Find user's drafts
- `createdAt` - Find old drafts for cleanup

---

## Authentication Tables

### passwordResetTokens
Password reset flow tokens.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Token ID |
| `userId` | INT | FK → users.id (CASCADE) | User requesting reset |
| `token` | VARCHAR(255) | UNIQUE, NOT NULL | Reset token |
| `expiresAt` | TIMESTAMP | NOT NULL | Token expiration |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Token creation |

**Indexes:**
- `userId` - Find tokens for user
- `expiresAt` - Find expired tokens for cleanup

---

### emailVerificationOtps
Email verification one-time passwords.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | OTP ID |
| `email` | VARCHAR(320) | NOT NULL | Email to verify |
| `otp` | VARCHAR(6) | NOT NULL | 6-digit code |
| `attempts` | INT | DEFAULT 0 | Failed attempts |
| `expiresAt` | TIMESTAMP | NOT NULL | OTP expiration |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | OTP creation |

**Indexes:**
- `email` - Find OTP for email
- `expiresAt` - Find expired OTPs

**Notes:**
- 6-digit numeric code
- Expires after 10 minutes (typical)
- Track attempts to prevent brute force

---

### phoneVerificationOtps
Phone verification one-time passwords.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | OTP ID |
| `phone` | VARCHAR(20) | NOT NULL | Phone number |
| `otp` | VARCHAR(6) | NOT NULL | 6-digit code |
| `attempts` | INT | DEFAULT 0 | Failed attempts |
| `expiresAt` | TIMESTAMP | NOT NULL | OTP expiration |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | OTP creation |

**Indexes:**
- `phone` - Find OTP for phone
- `expiresAt` - Find expired OTPs

---

## eBay Integration Tables

### ebayFeedbackHistory
Historical eBay feedback for trust verification.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Record ID |
| `userId` | INT | FK → users.id | User |
| `feedbackId` | VARCHAR(64) | NOT NULL | eBay feedback ID |
| `rating` | ENUM('positive', 'neutral', 'negative') | NOT NULL | Feedback type |
| `comment` | TEXT | NULLABLE | Feedback comment |
| `from` | VARCHAR(64) | NOT NULL | Feedback from user |
| `itemId` | VARCHAR(64) | NULLABLE | eBay item ID |
| `itemTitle` | VARCHAR(255) | NULLABLE | Item description |
| `feedbackDate` | TIMESTAMP | NOT NULL | When feedback given |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | When stored |

**Indexes:**
- `userId` - Find feedback for user
- `feedbackId` - Prevent duplicates
- `feedbackDate` - Find recent feedback

**Notes:**
- Stores 3 years of historical feedback
- Immutable (historical record)
- Used to calculate trust score

---

### lowFeedbackFlags
Admin flags for users with low eBay scores.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Flag ID |
| `userId` | INT | FK → users.id | Flagged user |
| `feedbackScore` | INT | NOT NULL | Score at time of flag |
| `feedbackPercentage` | DECIMAL(5,2) | NOT NULL | Positive % at flag time |
| `flaggedReason` | TEXT | NULLABLE | Why flagged |
| `status` | ENUM(...) | DEFAULT 'pending' | Review status |
| `adminNotes` | TEXT | NULLABLE | Admin notes |
| `flaggedAt` | TIMESTAMP | DEFAULT NOW() | When flagged |
| `reviewedAt` | TIMESTAMP | NULLABLE | When reviewed |
| `reviewedBy` | INT | FK → users.id | Admin who reviewed |

**Indexes:**
- `userId` - Find flags for user
- `status` - Find pending reviews
- `flaggedAt` - Find recent flags

**Enums:**
- `status`: pending, reviewed, dismissed, action_taken

---

## Moderation Tables

### userReports
User-submitted reports for misconduct.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Report ID |
| `reportId` | VARCHAR(20) | UNIQUE, NOT NULL | Human-readable ID (RPT-001) |
| `reportedUserId` | INT | FK → users.id | User being reported |
| `reporterUserId` | INT | FK → users.id | User making report |
| `reason` | VARCHAR(100) | NOT NULL | Report category |
| `description` | TEXT | NOT NULL | Detailed description |
| `evidence` | TEXT | NULLABLE | Evidence URL/description |
| `status` | ENUM(...) | DEFAULT 'pending' | Review status |
| `adminNotes` | TEXT | NULLABLE | Admin review notes |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Report date |
| `updatedAt` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Last update |
| `reviewedAt` | TIMESTAMP | NULLABLE | When reviewed |
| `reviewedBy` | INT | FK → users.id | Admin who reviewed |

**Indexes:**
- `reportedUserId` - Find reports against user
- `reporterUserId` - Find user's reports
- `status` - Find pending reviews
- `createdAt` - Find recent reports

**Enums:**
- `status`: pending, reviewed, dismissed, action_taken

**Notes:**
- `reportId` is human-readable (RPT-001, RPT-002, etc.)
- Evidence can include file URLs from S3
- Immutable audit trail

---

### deletedAccounts
Audit trail of deleted user accounts.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INT | PK, AUTO_INCREMENT | Record ID |
| `userId` | INT | NOT NULL | Deleted user ID |
| `username` | VARCHAR(64) | NOT NULL | Username |
| `email` | VARCHAR(320) | NULLABLE | Email |
| `displayName` | VARCHAR(255) | NULLABLE | Display name |
| `firstName` | VARCHAR(100) | NULLABLE | First name |
| `lastName` | VARCHAR(100) | NULLABLE | Last name |
| `deletedBy` | INT | FK → users.id | Admin who deleted |
| `reason` | TEXT | NULLABLE | Deletion reason |
| `deletedAt` | TIMESTAMP | DEFAULT NOW() | Deletion time |

**Indexes:**
- `userId` - Find deletion record
- `username` - Find by username
- `email` - Find by email
- `deletedAt` - Find recent deletions

**Notes:**
- Immutable audit trail
- Preserves user data for legal/compliance
- Does not cascade delete related data

---

## Relationships Diagram

```
users (1) ──→ (many) userProfiles
users (1) ──→ (many) listings
users (1) ──→ (many) tradeProposals (as requester)
users (1) ──→ (many) tradeProposals (as recipient)
users (1) ──→ (many) watchlistEntries
users (1) ──→ (many) draftListings
users (1) ──→ (many) ebayFeedbackHistory
users (1) ──→ (many) userReports (as reporter)
users (1) ──→ (many) userReports (as reported)
users (1) ──→ (many) lowFeedbackFlags

listings (1) ──→ (many) listingPhotos
listings (1) ──→ (many) tradeProposals
listings (1) ──→ (many) tradeProposalItems
listings (1) ──→ (many) watchlistEntries

tradeProposals (1) ──→ (many) tradeProposalItems
tradeProposals (1) ──→ (many) tradeMessages
tradeProposals (1) ──→ (many) tradeReviews
```

---

## Scaling Considerations

### Current Bottlenecks
1. **Large result sets** - Marketplace feed queries may be slow with many listings
2. **N+1 queries** - Profile/rating lookups done separately for each listing
3. **No denormalization** - Frequently accessed aggregates (avg rating, feedback score) recalculated
4. **No caching** - Same queries run repeatedly

### Optimization Strategies (Session 3+)

1. **Add Materialized Views**
   ```sql
   CREATE TABLE userStats (
     userId INT PRIMARY KEY,
     totalListings INT,
     totalTrades INT,
     averageRating DECIMAL(3,2),
     feedbackScore INT,
     FOREIGN KEY (userId) REFERENCES users(id)
   );
   ```

2. **Add Indexes**
   - Composite indexes on frequently filtered columns
   - Partial indexes for active listings only
   - Full-text search indexes on title/description

3. **Add Caching Layer**
   - Redis for user profiles, categories, stats
   - Cache invalidation on updates
   - TTL: 1 hour for user data, 24 hours for categories

4. **Batch Operations**
   - Use JOIN queries instead of N+1 pattern
   - Batch fetch profiles/ratings for multiple listings
   - Aggregate queries for dashboard stats

5. **Pagination**
   - Implement cursor-based pagination for large result sets
   - Limit default page size to 50 items
   - Lazy load additional pages

### Future Sharding Strategy (Session 4+)
- Shard by `userId` for user-specific data
- Keep shared data (categories, global stats) on primary
- Use consistent hashing for shard selection

---

## Migration Strategy

### Current Migrations
- Generated via `pnpm drizzle-kit generate`
- Applied via `webdev_execute_sql` tool
- Stored in `drizzle/migrations/` directory

### Adding New Tables
1. Update `drizzle/schema.ts`
2. Run `pnpm drizzle-kit generate`
3. Review generated SQL in `drizzle/migrations/`
4. Apply via `webdev_execute_sql`
5. Verify in database

### Modifying Existing Tables
1. Update `drizzle/schema.ts`
2. Run `pnpm drizzle-kit generate`
3. Review migration (may require manual SQL for complex changes)
4. Apply via `webdev_execute_sql`
5. Test thoroughly before production

### Rollback Strategy
- Keep all migrations in git history
- Can revert to previous migration if needed
- Manual rollback SQL required for data loss scenarios

---

## Data Validation Rules

### User Profiles
- `displayName`: 1-120 characters, required
- `email`: Valid email format, max 320 characters
- `contactPhone`: Valid phone format, max 40 characters
- `contactZipCode`: Max 20 characters

### Listings
- `title`: 1-160 characters, required
- `description`: 20-5000 characters, required
- `estimatedValue`: 0-999999.99 USD
- `grade`: Must be in gradeValues enum

### Trade Proposals
- `note`: Max 2000 characters
- Must have at least one offered item

### Reports
- `reason`: Max 100 characters, required
- `description`: 20-3000 characters, required
- `evidence`: Max 2000 characters

---

## Performance Metrics

### Query Performance Targets
- Marketplace feed: < 500ms
- Listing detail: < 200ms
- User profile: < 200ms
- Trade inbox: < 300ms
- Search: < 1000ms

### Database Size Estimates
- 10,000 users: ~50MB
- 100,000 listings: ~500MB
- 1,000,000 trades: ~1GB
- Total with indexes: ~2-3GB

### Backup Strategy
- Daily backups (automated by Manus platform)
- Point-in-time recovery available
- Test restore procedures monthly

---

## Security Considerations

### Sensitive Data
- `passwordHash`: Bcrypt, never log
- `ebayAccessToken`: Encrypt at rest, never log
- `securityAnswer`: Hash before storage
- Contact info: Encrypt in transit, reveal only after trade accepted

### SQL Injection Prevention
- Use Drizzle ORM parameterized queries (prevents injection)
- Never concatenate user input into SQL
- Validate all inputs with Zod schemas

### Access Control
- All queries filtered by `userId` for user-specific data
- Admin queries require `role === 'admin'` check
- Foreign key constraints prevent orphaned records

---

**Last Updated:** May 29, 2026  
**Schema Version:** 1.0  
**Next Review:** After Session 2 completion
