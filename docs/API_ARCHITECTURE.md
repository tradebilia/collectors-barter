# Tradebilia API Architecture

## Overview

**API Type:** tRPC (type-safe RPC)  
**Transport:** HTTP POST to `/api/trpc`  
**Serialization:** SuperJSON (handles Date, Map, Set)  
**Authentication:** JWT session cookie (HttpOnly, Secure, SameSite=None)  
**Error Handling:** tRPC error codes with typed responses

---

## Authentication

### Session Management

**Cookie Name:** `TRADEBILIA_SESSION`  
**Expiration:** 1 year (31,536,000,000 ms)  
**Flags:** HttpOnly, Secure, SameSite=None  
**Storage:** JWT token signed with `JWT_SECRET`

### Auth Flow

1. **Signup/Login** → Create JWT token → Set cookie
2. **Each Request** → Parse cookie → Hydrate user via `getUserFromSession()`
3. **Logout** → Clear cookie
4. **Protected Routes** → Check `ctx.user` in procedure

### Current Implementation

- **File:** `server/_core/customAuth.ts`
- **Method:** JWT-based session auth (not Manus OAuth)
- **Token Creation:** `createSessionToken(userId)` → JWT string
- **Token Verification:** `verifySession(token)` → Payload or null
- **User Hydration:** `getUserFromSession(sessionToken)` → User object

### Procedure Types

```typescript
// Public (no auth required)
publicProcedure.query/mutation(...)

// Protected (auth required)
protectedProcedure.query/mutation(...)

// Admin only (role === 'admin')
adminProcedure.query/mutation(...)
```

---

## Public Procedures

### auth

#### `auth.me`
Get current user (or null if not logged in).

**Type:** Query  
**Auth:** Public  
**Input:** None  
**Output:**
```typescript
{
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  ebayUsername?: string;
  ebayFeedbackScore?: number;
  // ... other user fields
} | null
```

#### `auth.signup`
Create new user account.

**Type:** Mutation  
**Auth:** Public  
**Input:**
```typescript
{
  username: string;           // 3-64 chars, alphanumeric + underscore
  password: string;           // 8+ chars, complexity required
  email: string;              // Valid email
  displayName: string;        // 1-120 chars
}
```

**Output:**
```typescript
{
  success: boolean;
  message: string;
  userId?: number;
}
```

**Validation:**
- Username: unique, 3-64 chars, alphanumeric + underscore
- Password: 8+ chars, must include uppercase, lowercase, number
- Email: valid format, max 320 chars
- Display name: 1-120 chars

#### `auth.login`
Authenticate user and create session.

**Type:** Mutation  
**Auth:** Public  
**Input:**
```typescript
{
  username: string;
  password: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  message: string;
  user?: User;
}
```

**Errors:**
- `UNAUTHORIZED` - Invalid credentials
- `NOT_FOUND` - User not found

#### `auth.logout`
Clear session cookie.

**Type:** Mutation  
**Auth:** Public  
**Input:** None  
**Output:**
```typescript
{
  success: boolean;
}
```

---

### marketplace

#### `marketplace.getFeed`
Browse marketplace with filters.

**Type:** Query  
**Auth:** Public  
**Input:**
```typescript
{
  category?: 'comics' | 'sports_cards' | ... ;
  condition?: 'mint' | 'near_mint' | ... ;
  keyword?: string;
  limit?: number;              // Default 50
  offset?: number;             // Default 0
}
```

**Output:**
```typescript
{
  listings: Array<{
    id: number;
    title: string;
    category: string;
    condition: string;
    estimatedValue?: number;
    owner: {
      id: number;
      displayName: string;
      avatarUrl?: string;
      averageRating?: number;
    };
    photos: Array<{
      imageUrl: string;
      altText?: string;
    }>;
    createdAt: Date;
  }>;
  total: number;
}
```

**Performance:** < 500ms target

#### `marketplace.getListingDetail`
Get full details for a single listing.

**Type:** Query  
**Auth:** Public  
**Input:**
```typescript
{
  listingId: number;
}
```

**Output:**
```typescript
{
  id: number;
  title: string;
  category: string;
  condition: string;
  grade: string;
  certificationCompany?: string;
  estimatedValue?: number;
  description: string;
  status: 'active' | 'traded' | 'archived';
  owner: {
    id: number;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    averageRating?: number;
    reviewCount?: number;
    ebayFeedbackScore?: number;
    ebayFeedbackPercentage?: number;
  };
  photos: Array<{
    id: number;
    imageUrl: string;
    altText?: string;
    sortOrder: number;
  }>;
  isWatchlisted?: boolean;  // null if not logged in
  createdAt: Date;
  updatedAt: Date;
}
```

**Errors:**
- `NOT_FOUND` - Listing not found

#### `marketplace.search`
Advanced search with multiple filters.

**Type:** Query  
**Auth:** Public  
**Input:**
```typescript
{
  query: string;              // Search term
  category?: string;
  condition?: string;
  minValue?: number;
  maxValue?: number;
  grade?: string;
  limit?: number;
  offset?: number;
}
```

**Output:** Same as `getFeed`

---

### members

#### `members.search`
Find users by name/location.

**Type:** Query  
**Auth:** Public  
**Input:**
```typescript
{
  query?: string;             // Username or display name
  region?: string;            // City/state
  verification?: 'all' | 'verified' | 'established' | 'rising';
  limit?: number;
  offset?: number;
}
```

**Output:**
```typescript
{
  members: Array<{
    id: number;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    location?: string;
    averageRating?: number;
    reviewCount?: number;
    ebayFeedbackScore?: number;
    totalTrades?: number;
  }>;
  total: number;
}
```

#### `members.getProfile`
Get detailed member profile.

**Type:** Query  
**Auth:** Public  
**Input:**
```typescript
{
  userId: number;
}
```

**Output:**
```typescript
{
  id: number;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  memberSince: Date;
  averageRating?: number;
  reviewCount?: number;
  totalTrades?: number;
  ebayFeedbackScore?: number;
  ebayFeedbackPercentage?: number;
  ebayMemberSince?: Date;
  ebayFeedback?: Array<{
    rating: 'positive' | 'neutral' | 'negative';
    comment?: string;
    from: string;
    itemTitle?: string;
    feedbackDate: Date;
  }>;
  recentReviews?: Array<{
    rating: number;
    review?: string;
    reviewer: string;
    createdAt: Date;
  }>;
  isOnline?: boolean;
}
```

**Notes:**
- Contact info hidden unless trade accepted
- eBay feedback shown for trust verification
- Online status based on `lastActivityAt`

---

## Protected Procedures (Auth Required)

### inventory

#### `inventory.create`
Add new listing to user's inventory.

**Type:** Mutation  
**Auth:** Protected  
**Input:**
```typescript
{
  title: string;              // 1-160 chars
  category: string;           // Must be valid category
  condition: string;          // Must be valid condition
  grade?: string;
  certificationCompany?: string;
  estimatedValue?: number;
  description: string;        // 20-5000 chars
  photos: Array<{
    name: string;
    type: string;             // MIME type
    contentBase64: string;     // Base64-encoded file
  }>;
}
```

**Output:**
```typescript
{
  id: number;
  title: string;
  createdAt: Date;
}
```

**Validation:**
- Title: 1-160 chars
- Description: 20-5000 chars
- Photos: 1-10 per listing, max 10MB each
- Category/condition: Must be valid enum

**Errors:**
- `BAD_REQUEST` - Invalid input
- `UNAUTHORIZED` - Not logged in

#### `inventory.getMyListings`
Fetch user's listings with filters.

**Type:** Query  
**Auth:** Protected  
**Input:**
```typescript
{
  category?: string;
  condition?: string;
  status?: 'active' | 'traded' | 'archived';
  limit?: number;
  offset?: number;
}
```

**Output:**
```typescript
{
  listings: Array<{
    id: number;
    title: string;
    category: string;
    condition: string;
    estimatedValue?: number;
    status: string;
    photos: Array<{ imageUrl: string }>;
    createdAt: Date;
  }>;
  total: number;
}
```

#### `inventory.update`
Edit listing details.

**Type:** Mutation  
**Auth:** Protected  
**Input:**
```typescript
{
  listingId: number;
  title?: string;
  description?: string;
  estimatedValue?: number;
  grade?: string;
  // ... other editable fields
}
```

**Output:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Errors:**
- `NOT_FOUND` - Listing not found
- `FORBIDDEN` - Not listing owner

#### `inventory.delete`
Remove listing.

**Type:** Mutation  
**Auth:** Protected  
**Input:**
```typescript
{
  listingId: number;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**Errors:**
- `NOT_FOUND` - Listing not found
- `FORBIDDEN` - Not listing owner

---

### trades

#### `trades.propose`
Create trade proposal for an item.

**Type:** Mutation  
**Auth:** Protected  
**Input:**
```typescript
{
  requestedListingId: number;
  note?: string;              // Optional message
}
```

**Output:**
```typescript
{
  proposalId: number;
  status: 'pending';
  createdAt: Date;
}
```

**Errors:**
- `NOT_FOUND` - Listing not found
- `FORBIDDEN` - Cannot trade own item
- `BAD_REQUEST` - Listing not active

#### `trades.getInbox`
Fetch trade proposals (incoming and outgoing).

**Type:** Query  
**Auth:** Protected  
**Input:**
```typescript
{
  type?: 'incoming' | 'outgoing';
  status?: 'pending' | 'accepted' | 'declined' | 'completed';
  limit?: number;
  offset?: number;
}
```

**Output:**
```typescript
{
  proposals: Array<{
    id: number;
    requestedListing: {
      id: number;
      title: string;
      photos: Array<{ imageUrl: string }>;
    };
    requester: {
      id: number;
      displayName: string;
      avatarUrl?: string;
    };
    recipient: {
      id: number;
      displayName: string;
    };
    status: string;
    note?: string;
    offeredItems?: Array<{
      id: number;
      title: string;
    }>;
    createdAt: Date;
  }>;
  total: number;
}
```

#### `trades.respond`
Accept, decline, or counter a trade proposal.

**Type:** Mutation  
**Auth:** Protected  
**Input:**
```typescript
{
  proposalId: number;
  action: 'accept' | 'decline' | 'counter';
  offeredListingIds?: number[];  // For counter offers
}
```

**Output:**
```typescript
{
  success: boolean;
  status: string;
}
```

**Errors:**
- `NOT_FOUND` - Proposal not found
- `FORBIDDEN` - Not recipient
- `BAD_REQUEST` - Invalid action for current status

#### `trades.sendMessage`
Send message in trade thread.

**Type:** Mutation  
**Auth:** Protected  
**Input:**
```typescript
{
  proposalId: number;
  message: string;            // 1-5000 chars
}
```

**Output:**
```typescript
{
  messageId: number;
  createdAt: Date;
}
```

**Errors:**
- `NOT_FOUND` - Proposal not found
- `FORBIDDEN` - Not participant in trade

#### `trades.getMessages`
Fetch messages for a trade.

**Type:** Query  
**Auth:** Protected  
**Input:**
```typescript
{
  proposalId: number;
  limit?: number;
  offset?: number;
}
```

**Output:**
```typescript
{
  messages: Array<{
    id: number;
    sender: {
      id: number;
      displayName: string;
      avatarUrl?: string;
    };
    message: string;
    createdAt: Date;
  }>;
  total: number;
}
```

#### `trades.leaveReview`
Rate and review trade partner.

**Type:** Mutation  
**Auth:** Protected  
**Input:**
```typescript
{
  proposalId: number;
  rating: number;             // 1-5
  review?: string;            // Max 1000 chars
}
```

**Output:**
```typescript
{
  success: boolean;
  reviewId: number;
}
```

**Errors:**
- `NOT_FOUND` - Proposal not found
- `BAD_REQUEST` - Trade not completed
- `FORBIDDEN` - Already reviewed

---

### watchlist

#### `watchlist.toggle`
Add or remove item from watchlist.

**Type:** Mutation  
**Auth:** Protected  
**Input:**
```typescript
{
  listingId: number;
}
```

**Output:**
```typescript
{
  isWatchlisted: boolean;
}
```

#### `watchlist.getMyWatchlist`
Fetch user's watchlist.

**Type:** Query  
**Auth:** Protected  
**Input:**
```typescript
{
  limit?: number;
  offset?: number;
}
```

**Output:**
```typescript
{
  listings: Array<{
    id: number;
    title: string;
    category: string;
    owner: { displayName: string };
    photos: Array<{ imageUrl: string }>;
    addedAt: Date;
  }>;
  total: number;
}
```

---

### profile

#### `profile.update`
Update user profile information.

**Type:** Mutation  
**Auth:** Protected  
**Input:**
```typescript
{
  displayName?: string;
  bio?: string;
  firstName?: string;
  lastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  contactTown?: string;
  contactState?: string;
  contactZipCode?: string;
  contactCountry?: string;
  avatarFile?: {
    name: string;
    type: string;
    contentBase64: string;
  };
  preferredCategories?: string[];
}
```

**Output:**
```typescript
{
  success: boolean;
  profile: UserProfile;
}
```

**Validation:**
- Display name: 1-120 chars
- Email: Valid format
- Phone: Valid format
- Avatar: Max 5MB, JPEG/PNG only

#### `profile.getMyProfile`
Fetch current user's full profile.

**Type:** Query  
**Auth:** Protected  
**Input:** None  
**Output:** UserProfile object

---

### messages

#### `messages.send`
Send direct message to another member.

**Type:** Mutation  
**Auth:** Protected  
**Input:**
```typescript
{
  recipientId: number;
  message: string;            // 1-5000 chars
}
```

**Output:**
```typescript
{
  messageId: number;
  createdAt: Date;
}
```

#### `messages.getConversation`
Fetch messages with a specific user.

**Type:** Query  
**Auth:** Protected  
**Input:**
```typescript
{
  userId: number;
  limit?: number;
  offset?: number;
}
```

**Output:**
```typescript
{
  messages: Array<{
    id: number;
    senderId: number;
    message: string;
    createdAt: Date;
  }>;
  total: number;
}
```

---

### reports

#### `reports.submit`
Submit user report for misconduct.

**Type:** Mutation  
**Auth:** Protected  
**Input:**
```typescript
{
  reportedMember: string;     // Username or ID
  listingReference?: string;  // Optional listing ID
  concernType: string;        // Must be valid type
  contactEmail: string;
  details: string;            // 20-3000 chars
  supportingNotes?: string;
  evidence?: Array<{
    name: string;
    type: string;
    contentBase64: string;
  }>;
}
```

**Output:**
```typescript
{
  success: boolean;
  reportId: string;           // e.g., "RPT-001"
  message: string;
}
```

**Concern Types:**
- Counterfeit or inaccurate item description
- Harassment or abusive conduct
- Spam, solicitation, or scam activity
- Unsafe trade behavior
- Unauthorized contact information sharing
- Other community concern

---

### ebay

#### `ebay.getAuthUrl`
Get eBay OAuth authorization URL.

**Type:** Query  
**Auth:** Protected  
**Input:** None  
**Output:**
```typescript
{
  authUrl: string;            // Full OAuth URL to redirect to
}
```

#### `ebay.connect`
Connect eBay account (called after OAuth redirect).

**Type:** Mutation  
**Auth:** Protected  
**Input:**
```typescript
{
  code: string;               // OAuth authorization code
  state: string;              // OAuth state parameter
}
```

**Output:**
```typescript
{
  success: boolean;
  ebayUsername: string;
  feedbackScore: number;
  feedbackPercentage: number;
}
```

**Errors:**
- `BAD_REQUEST` - Invalid code/state
- `UNAUTHORIZED` - OAuth failed

#### `ebay.getFeedback`
Fetch eBay feedback history.

**Type:** Query  
**Auth:** Protected  
**Input:**
```typescript
{
  limit?: number;
  offset?: number;
}
```

**Output:**
```typescript
{
  feedback: Array<{
    rating: 'positive' | 'neutral' | 'negative';
    comment?: string;
    from: string;
    itemTitle?: string;
    feedbackDate: Date;
  }>;
  total: number;
  feedbackScore: number;
  feedbackPercentage: number;
}
```

#### `ebay.disconnect`
Unlink eBay account.

**Type:** Mutation  
**Auth:** Protected  
**Input:** None  
**Output:**
```typescript
{
  success: boolean;
}
```

---

## Admin Procedures (Admin Only)

### admin

#### `admin.getAllUsers`
List all users (admin only).

**Type:** Query  
**Auth:** Admin  
**Input:**
```typescript
{
  search?: string;
  role?: 'user' | 'admin';
  limit?: number;
  offset?: number;
}
```

**Output:**
```typescript
{
  users: Array<{
    id: number;
    username: string;
    displayName: string;
    email?: string;
    role: string;
    createdAt: Date;
    lastSignedIn: Date;
  }>;
  total: number;
}
```

#### `admin.deleteUser`
Delete user account (admin only).

**Type:** Mutation  
**Auth:** Admin  
**Input:**
```typescript
{
  userId: number;
  reason?: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Notes:**
- Creates audit trail in `deletedAccounts` table
- Does not cascade delete related data

#### `admin.getReports`
List all user reports (admin only).

**Type:** Query  
**Auth:** Admin  
**Input:**
```typescript
{
  status?: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  limit?: number;
  offset?: number;
}
```

**Output:**
```typescript
{
  reports: Array<{
    id: number;
    reportId: string;
    reportedUser: { displayName: string };
    reporter: { displayName: string };
    reason: string;
    status: string;
    createdAt: Date;
  }>;
  total: number;
}
```

#### `admin.updateReportStatus`
Update report status (admin only).

**Type:** Mutation  
**Auth:** Admin  
**Input:**
```typescript
{
  reportId: number;
  status: 'reviewed' | 'dismissed' | 'action_taken';
  adminNotes?: string;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

#### `admin.getLowFeedbackFlags`
List users with low eBay feedback (admin only).

**Type:** Query  
**Auth:** Admin  
**Input:**
```typescript
{
  status?: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  limit?: number;
  offset?: number;
}
```

**Output:**
```typescript
{
  flags: Array<{
    id: number;
    user: { displayName: string };
    feedbackScore: number;
    feedbackPercentage: number;
    status: string;
    flaggedAt: Date;
  }>;
  total: number;
}
```

---

## Error Handling

### Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `PARSE_ERROR` | 400 | Request parsing failed |
| `BAD_REQUEST` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

### Error Response Format

```typescript
{
  code: string;               // Error code above
  message: string;            // Human-readable message
  cause?: string;             // Root cause (dev only)
}
```

### Frontend Error Handling

```typescript
const { data, error, isLoading } = trpc.marketplace.getFeed.useQuery({...});

if (error) {
  if (error.data?.code === 'UNAUTHORIZED') {
    // Redirect to login
  } else if (error.data?.code === 'NOT_FOUND') {
    // Show 404 message
  } else {
    // Show generic error
  }
}
```

---

## Rate Limiting

**Current Status:** Not implemented  
**Recommended for Session 2:**
- Auth endpoints: 5 requests per minute per IP
- API endpoints: 100 requests per minute per user
- Search endpoints: 10 requests per second per user

---

## Caching Strategy

**Current Status:** No caching layer  
**Recommended for Session 3:**
- User profiles: Cache 1 hour
- Listings: Cache 5 minutes
- Categories: Cache 24 hours
- Search results: Cache 5 minutes

---

## Real-time Features

**Current Status:** Polling-based (not real-time)  
**Implemented:**
- Online status via `lastActivityAt` (5-minute window)
- Message notifications via polling

**Recommended for Session 3:**
- WebSocket connection for real-time messaging
- Real-time trade proposal updates
- Real-time online status

---

## File Upload

### Supported Formats
- Images: JPEG, PNG, WebP (max 10MB each)
- Documents: PDF, DOC, DOCX (max 10MB each)
- Total per listing: 10 files max

### Upload Flow
1. Frontend converts file to base64
2. Send via tRPC mutation with `contentBase64`
3. Backend uploads to S3 via `storagePut()`
4. Returns `/manus-storage/{key}` URL
5. Store URL in database

### Example
```typescript
const uploadPhoto = trpc.inventory.create.useMutation();

const file = new File(...);
const reader = new FileReader();
reader.onload = (e) => {
  uploadPhoto.mutate({
    title: 'My Card',
    photos: [{
      name: file.name,
      type: file.type,
      contentBase64: e.target.result.split(',')[1],
    }],
    // ... other fields
  });
};
reader.readAsDataURL(file);
```

---

## Pagination

### Cursor-based Pagination (Recommended for Session 3)
```typescript
{
  cursor?: number;            // Last ID from previous page
  limit: number;              // Items per page
}
```

### Offset-based Pagination (Current)
```typescript
{
  offset: number;             // Skip N items
  limit: number;              // Return N items
}
```

---

## Versioning

**Current API Version:** 1.0  
**Backward Compatibility:** Not versioned (monolithic)  
**Breaking Changes:** Require migration guide

**Recommended for Session 3:**
- Implement API versioning via URL path (`/api/v1/trpc`)
- Support multiple versions simultaneously
- Deprecation timeline for old versions

---

## Documentation

### API Documentation Tools
- **Current:** This document
- **Recommended:** OpenAPI/Swagger (auto-generated from tRPC)
- **Recommended:** Interactive API explorer

### Example OpenAPI Generation
```bash
pnpm add @trpc/openapi
# Generate OpenAPI spec from tRPC router
```

---

## Testing

### Unit Tests
- Test each procedure independently
- Mock database calls
- Verify error handling

### Integration Tests
- Test full workflows (signup → listing → trade)
- Test database interactions
- Test error scenarios

### Example Test
```typescript
import { describe, it, expect } from 'vitest';
import { appRouter } from '../routers';

describe('marketplace.getFeed', () => {
  it('should return listings', async () => {
    const caller = appRouter.createCaller({ user: null });
    const result = await caller.marketplace.getFeed({
      limit: 10,
    });
    expect(result.listings).toBeDefined();
    expect(result.total).toBeGreaterThanOrEqual(0);
  });
});
```

---

## Performance Optimization

### Query Optimization
- Use indexes on frequently filtered columns
- Batch fetch related data (avoid N+1)
- Use pagination for large result sets

### Caching
- Cache user profiles (1 hour TTL)
- Cache category lists (24 hour TTL)
- Invalidate on updates

### Compression
- Enable gzip compression on responses
- Minify JSON responses
- Use CDN for static assets

---

## Security Best Practices

### Input Validation
- Validate all inputs with Zod schemas
- Sanitize user-generated content
- Reject oversized payloads (>50MB)

### Authentication
- Require HTTPS in production
- Use HttpOnly cookies for tokens
- Implement CSRF protection (SameSite cookie flag)

### Authorization
- Check user ownership before modifying
- Verify admin role for admin procedures
- Log all admin actions

### Data Protection
- Encrypt sensitive data at rest
- Hash passwords with bcrypt
- Never log tokens or secrets

---

## Monitoring & Logging

### Recommended Metrics
- Request latency (p50, p95, p99)
- Error rate by endpoint
- Database query performance
- Active user count

### Recommended Logging
- All authentication attempts
- All admin actions
- All errors with stack traces
- Request/response samples (dev only)

---

**Last Updated:** May 29, 2026  
**API Version:** 1.0  
**Next Review:** After Session 2 completion
