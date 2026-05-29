# Tradebilia AI Development Rules

## Overview

These rules ensure consistency, maintainability, and quality across the Tradebilia codebase. All AI sessions should follow these guidelines.

---

## Coding Standards

### TypeScript

#### Type Safety
- **MUST** use strict TypeScript types (no `any`)
- **MUST** define interfaces for all data structures
- **MUST** use discriminated unions for complex types
- **SHOULD** enable `strict: true` in `tsconfig.json`

```typescript
// ✅ Good
interface User {
  id: number;
  username: string;
  role: 'user' | 'admin';
}

type Result<T> = { success: true; data: T } | { success: false; error: string };

// ❌ Bad
const user: any = {};
const result: any = fetchUser();
```

#### Naming Conventions
- **MUST** use camelCase for variables and functions
- **MUST** use PascalCase for types and interfaces
- **MUST** use UPPER_SNAKE_CASE for constants
- **MUST** prefix boolean variables with `is`, `has`, `can`, `should`

```typescript
// ✅ Good
const isActive = true;
const hasPermission = false;
const MAX_RETRIES = 3;
interface UserProfile {}

// ❌ Bad
const active = true;
const permission = false;
const maxRetries = 3;
interface user_profile {}
```

#### Error Handling
- **MUST** handle all errors explicitly
- **MUST** use typed errors (never throw strings)
- **MUST** provide context in error messages
- **SHOULD** use custom error classes for domain errors

```typescript
// ✅ Good
class NotFoundError extends Error {
  constructor(resource: string, id: number) {
    super(`${resource} with id ${id} not found`);
  }
}

try {
  const user = await getUser(id);
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle not found
  }
}

// ❌ Bad
throw 'User not found';
throw new Error('error');
```

---

### React/Frontend

#### Component Structure
- **MUST** use functional components (no class components)
- **MUST** use hooks for state management
- **MUST** use TypeScript for all components
- **SHOULD** keep components under 300 lines

```typescript
// ✅ Good
interface ListingCardProps {
  listing: Listing;
  onSelect: (id: number) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onSelect }) => {
  return (
    <div onClick={() => onSelect(listing.id)}>
      {listing.title}
    </div>
  );
};

// ❌ Bad
export default class ListingCard extends React.Component {
  render() {
    return <div>{this.props.title}</div>;
  }
}
```

#### Hooks Usage
- **MUST** follow rules of hooks (no conditional hooks)
- **MUST** use `useMemo` for expensive computations
- **MUST** use `useCallback` for event handlers passed to children
- **SHOULD** extract custom hooks for reusable logic

```typescript
// ✅ Good
const [count, setCount] = useState(0);
const doubled = useMemo(() => count * 2, [count]);
const handleClick = useCallback(() => setCount(c => c + 1), []);

// ❌ Bad
if (condition) {
  const [count, setCount] = useState(0);  // ❌ Conditional hook
}
```

#### State Management
- **MUST** use tRPC hooks for server state
- **MUST** use React Context for UI state (theme, auth)
- **SHOULD** use `useReducer` for complex state
- **SHOULD** avoid prop drilling (use Context instead)

```typescript
// ✅ Good
const { data, isLoading } = trpc.listings.getMyListings.useQuery();
const { user } = useAuth();
const { theme } = useTheme();

// ❌ Bad
// Don't pass props through 5 levels of components
```

#### Styling
- **MUST** use Tailwind CSS classes (no inline styles)
- **MUST** use shadcn/ui components for common patterns
- **MUST** use CSS variables for theming
- **SHOULD** extract complex styles into components

```typescript
// ✅ Good
<div className="flex items-center gap-4 bg-background text-foreground">
  <Button variant="outline">Click me</Button>
</div>

// ❌ Bad
<div style={{ display: 'flex', gap: '16px' }}>
  <button style={{ padding: '8px 16px' }}>Click me</button>
</div>
```

---

### Backend/tRPC

#### Procedure Definition
- **MUST** use `publicProcedure`, `protectedProcedure`, or `adminProcedure`
- **MUST** validate inputs with Zod schemas
- **MUST** return typed outputs
- **MUST** handle errors explicitly

```typescript
// ✅ Good
export const createListing = protectedProcedure
  .input(z.object({
    title: z.string().min(1).max(160),
    category: z.enum(collectibleCategories),
    description: z.string().min(20).max(5000),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
    
    const listing = await db.insert(listings).values({
      ownerId: ctx.user.id,
      ...input,
    });
    
    return { id: listing[0].insertId };
  });

// ❌ Bad
export const createListing = publicProcedure
  .mutation(async ({ input }) => {
    const listing = await db.insert(listings).values(input);
    return listing;
  });
```

#### Database Queries
- **MUST** use Drizzle ORM (never raw SQL)
- **MUST** use parameterized queries (prevents SQL injection)
- **MUST** add indexes for frequently filtered columns
- **SHOULD** batch fetch related data (avoid N+1)

```typescript
// ✅ Good
const listings = await db
  .select()
  .from(listings)
  .where(eq(listings.ownerId, userId))
  .limit(10);

// ❌ Bad
const listings = await db.query(
  `SELECT * FROM listings WHERE ownerId = ${userId}`
);
```

#### Error Handling
- **MUST** use tRPC error codes (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, etc.)
- **MUST** provide user-friendly error messages
- **MUST** log errors for debugging
- **SHOULD** never expose internal error details to client

```typescript
// ✅ Good
if (!ctx.user) {
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'You must be logged in to perform this action',
  });
}

if (ctx.user.id !== listing.ownerId) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'You can only edit your own listings',
  });
}

// ❌ Bad
throw new Error('Database connection failed: ' + error.message);
```

---

## Architecture Rules

### File Organization
- **MUST** follow folder structure in PROJECT_CONTEXT.md
- **MUST** keep files under 500 lines (split if larger)
- **MUST** group related code together
- **SHOULD** use barrel exports (index.ts) for modules

```
✅ Good structure:
server/
├── features/
│   ├── listings.ts         (200 lines)
│   ├── trades.ts           (250 lines)
│   └── users.ts            (180 lines)
├── db.ts                   (100 lines - connection only)
└── routers.ts              (150 lines - wire features)

❌ Bad structure:
server/
└── db.ts                   (2000 lines - everything)
```

### Separation of Concerns
- **MUST** keep database logic in `server/db.ts` or `server/features/`
- **MUST** keep business logic in procedures
- **MUST** keep UI logic in components
- **MUST** keep validation in Zod schemas

```typescript
// ✅ Good: Clear separation
// database layer
const getUser = async (id: number) => {
  return db.select().from(users).where(eq(users.id, id));
};

// business logic
const procedure = protectedProcedure
  .input(z.object({ userId: z.number() }))
  .query(async ({ input }) => {
    const user = await getUser(input.userId);
    return { ...user, formatted: true };
  });

// ❌ Bad: Mixed concerns
const procedure = protectedProcedure
  .query(async () => {
    const user = await db.query('SELECT * FROM users');
    const formatted = user.name.toUpperCase();
    return formatted;
  });
```

### Reusable Components
- **MUST** extract reusable components to `client/src/components/`
- **MUST** use shadcn/ui components when available
- **MUST** document component props with JSDoc
- **SHOULD** create custom hooks for reusable logic

```typescript
// ✅ Good: Reusable component
/**
 * Displays a collectible item card with image, title, and owner info
 * @param listing - The listing to display
 * @param onSelect - Callback when card is clicked
 */
export const ListingCard: React.FC<ListingCardProps> = ({ listing, onSelect }) => {
  return (...);
};

// ❌ Bad: One-off component
const MySpecialListing = () => {
  return (...);
};
```

---

## Testing Rules

### Unit Tests
- **MUST** write tests for critical business logic
- **MUST** test error cases
- **MUST** use Vitest for all tests
- **SHOULD** aim for 70%+ code coverage

```typescript
// ✅ Good
describe('createListing', () => {
  it('should create a listing with valid input', async () => {
    const result = await createListing({
      title: 'Test Card',
      category: 'sports_cards',
      description: 'A test card',
    });
    expect(result.id).toBeDefined();
  });

  it('should reject invalid title', async () => {
    expect(() => createListing({
      title: '',  // Too short
      category: 'sports_cards',
      description: 'A test card',
    })).toThrow();
  });
});

// ❌ Bad
it('works', async () => {
  const result = await createListing(...);
  expect(result).toBeDefined();
});
```

### Integration Tests
- **MUST** test full workflows (signup → listing → trade)
- **SHOULD** use test database
- **SHOULD** clean up after tests

---

## Performance Rules

### Frontend
- **MUST** use React.memo for expensive components
- **MUST** use lazy loading for large lists
- **MUST** use pagination (not infinite scroll)
- **SHOULD** use virtual scrolling for 1000+ items

```typescript
// ✅ Good
const ListingCard = React.memo(({ listing }: Props) => {
  return (...);
});

const ListingList = () => {
  const [page, setPage] = useState(1);
  const { data } = trpc.listings.getPage.useQuery({ page });
  return (...);
};

// ❌ Bad
const ListingList = () => {
  const { data } = trpc.listings.getAll.useQuery();  // Fetch all
  return data.map(l => <ListingCard listing={l} />);  // Render all
};
```

### Backend
- **MUST** use indexes on frequently filtered columns
- **MUST** batch fetch related data (avoid N+1)
- **MUST** paginate large result sets
- **SHOULD** use caching for frequently accessed data

```typescript
// ✅ Good: Batch fetch
const listings = await db.select().from(listings).limit(50);
const userIds = listings.map(l => l.ownerId);
const profiles = await getProfileMap(userIds);  // Batch fetch

// ❌ Bad: N+1 queries
for (const listing of listings) {
  const profile = await getProfile(listing.ownerId);  // Query per item
}
```

---

## Security Rules

### Authentication
- **MUST** use HttpOnly cookies for session tokens
- **MUST** validate all inputs before use
- **MUST** check user ownership before modifying
- **MUST** verify admin role for admin operations

```typescript
// ✅ Good
if (ctx.user?.id !== listing.ownerId) {
  throw new TRPCError({ code: 'FORBIDDEN' });
}

// ❌ Bad
// No ownership check
await db.update(listings).set(input);
```

### Data Protection
- **MUST** never log sensitive data (passwords, tokens)
- **MUST** encrypt sensitive data at rest
- **MUST** use HTTPS in production
- **MUST** sanitize user input

```typescript
// ✅ Good
logger.info('User logged in', { userId: user.id });  // No password
const encrypted = encrypt(token);  // Encrypt before storage

// ❌ Bad
logger.info('User logged in', { password: user.password });
await db.insert(tokens).values({ token });  // Plaintext
```

### API Security
- **MUST** validate all inputs with Zod
- **MUST** use rate limiting on auth endpoints
- **MUST** implement CSRF protection
- **SHOULD** use CORS headers

```typescript
// ✅ Good
const schema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).regex(/[A-Z]/),  // Complexity
});

// ❌ Bad
const email = input.email;  // No validation
```

---

## Documentation Rules

### Code Comments
- **MUST** comment complex logic
- **MUST** use JSDoc for public functions
- **SHOULD** explain "why", not "what"
- **SHOULD** keep comments up-to-date

```typescript
// ✅ Good
/**
 * Fetches 3 years of eBay feedback for trust verification
 * @param userId - The user ID to fetch feedback for
 * @returns Array of feedback records sorted by date (newest first)
 */
async function getEbayFeedback(userId: number) {
  // Filter by date to get only 3 years of history
  // eBay API returns newest first, so no need to sort
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  
  return await ebayApi.getFeedback({
    userId,
    startDate: threeYearsAgo,
  });
}

// ❌ Bad
// Get feedback
const feedback = await ebayApi.getFeedback({ userId });
```

### Commit Messages
- **MUST** use descriptive commit messages
- **MUST** reference issue numbers if applicable
- **SHOULD** follow conventional commits format

```
✅ Good:
feat: Add eBay OAuth callback endpoint
fix: Resolve TypeScript errors in db.ts
docs: Update API documentation
refactor: Split db.ts into feature modules

❌ Bad:
fixed stuff
update
changes
```

### Pull Requests
- **MUST** include description of changes
- **MUST** reference related issues
- **SHOULD** include before/after screenshots for UI changes
- **SHOULD** include test results

---

## Git Workflow

### Branches
- **MUST** create feature branches from `main`
- **MUST** use descriptive branch names
- **SHOULD** delete merged branches

```
✅ Good:
feature/ebay-oauth-callback
fix/typescript-errors
docs/api-documentation

❌ Bad:
fix1
update
changes
```

### Commits
- **MUST** make atomic commits (one feature per commit)
- **MUST** write descriptive commit messages
- **SHOULD** squash commits before merging

### Pull Requests
- **MUST** create PR before merging to main
- **MUST** pass all tests before merging
- **SHOULD** get code review before merging
- **SHOULD** use squash merge to keep history clean

---

## Deployment Rules

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] TypeScript check passing
- [ ] Code formatted with Prettier
- [ ] No console.log statements (except errors)
- [ ] No hardcoded secrets
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Backward compatibility verified

### Deployment Process
1. Create feature branch
2. Make changes and commit
3. Push to GitHub
4. Create pull request
5. Pass all checks
6. Get code review
7. Merge to main
8. Create checkpoint via `webdev_save_checkpoint`
9. Deploy via Manus UI

---

## Refactoring Rules

### When to Refactor
- **SHOULD** refactor when code becomes hard to understand
- **SHOULD** refactor when extracting reusable logic
- **SHOULD** refactor when fixing bugs (extract root cause)
- **SHOULD NOT** refactor without tests

### How to Refactor
1. Write tests for current behavior
2. Make small, incremental changes
3. Verify tests still pass
4. Commit each step
5. Get code review

---

## Review Checklist

Before submitting code for review, verify:

- [ ] TypeScript compiles without errors
- [ ] All tests passing
- [ ] Code formatted with Prettier
- [ ] No console.log statements
- [ ] No hardcoded secrets
- [ ] Error handling complete
- [ ] Performance optimized
- [ ] Security reviewed
- [ ] Documentation updated
- [ ] Commit messages descriptive

---

## Common Mistakes to Avoid

### Frontend
- ❌ Calling hooks conditionally
- ❌ Using `any` type
- ❌ Prop drilling through 5+ components
- ❌ Inline styles instead of Tailwind
- ❌ Missing loading/error states
- ❌ Redirecting during render

### Backend
- ❌ Raw SQL queries
- ❌ No input validation
- ❌ N+1 query patterns
- ❌ No error handling
- ❌ Logging sensitive data
- ❌ No ownership checks

### General
- ❌ Large files (>500 lines)
- ❌ No tests
- ❌ Hardcoded values
- ❌ Inconsistent naming
- ❌ No comments for complex logic
- ❌ Merging without tests

---

## Tools & Commands

### Development
```bash
pnpm install              # Install dependencies
pnpm dev                  # Start dev server
pnpm check                # TypeScript check
pnpm format               # Format code
pnpm test                 # Run tests
pnpm build                # Build for production
```

### Database
```bash
pnpm drizzle-kit generate # Generate migrations
pnpm drizzle-kit migrate  # Apply migrations
```

### Git
```bash
git checkout -b feature/name  # Create branch
git add .                      # Stage changes
git commit -m "message"        # Commit
git push                       # Push to GitHub
```

---

## Questions & Escalation

If you encounter:
- **Unclear requirements** → Ask the user (Rich) for clarification
- **Architectural decision** → Document in KNOWN_ISSUES.md
- **Performance concern** → Profile first, then optimize
- **Security concern** → Escalate to security review
- **Blocking issue** → Document in KNOWN_ISSUES.md and ask for guidance

---

**Last Updated:** May 29, 2026  
**Version:** 1.0  
**Applies To:** All AI sessions
