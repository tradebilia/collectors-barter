# Collector's Forum - Complete Documentation

## Overview

The Collector's Forum is a hybrid community discussion platform integrated into Tradebilia that allows users to create topics and engage in discussions organized by collectible categories. The forum maintains a clean, organized structure with automatic sorting, view tracking, and reply management.

---

## Architecture & Structure

### Database Schema

#### `forumPosts` Table
Stores all forum topics/discussions created by users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT PRIMARY KEY | Unique post identifier |
| `userId` | INT FOREIGN KEY | User who created the post |
| `category` | VARCHAR(50) | Category: "general" or collectible type (comics, sports_cards, etc.) |
| `title` | VARCHAR(255) | Topic title |
| `content` | LONGTEXT | Post content/description |
| `viewCount` | INT DEFAULT 0 | Number of times post has been viewed |
| `replyCount` | INT DEFAULT 0 | Number of replies to this post |
| `isPinned` | BOOLEAN DEFAULT false | Admin flag: pin topic to top of category |
| `isLocked` | BOOLEAN DEFAULT false | Admin flag: prevent new replies |
| `isSolved` | BOOLEAN DEFAULT false | Topic creator flag: mark topic as solved/resolved |
| `createdAt` | TIMESTAMP | Post creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

**Indexes:**
- `userId` - For querying posts by user
- `category` - For filtering posts by category
- `createdAt` - For sorting by newest posts

#### `forumReplies` Table
Stores all replies/comments on forum posts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT PRIMARY KEY | Unique reply identifier |
| `postId` | INT FOREIGN KEY | Parent post ID |
| `userId` | INT FOREIGN KEY | User who replied |
| `content` | LONGTEXT | Reply content |
| `createdAt` | TIMESTAMP | Reply creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

**Indexes:**
- `postId` - For retrieving replies for a specific post
- `userId` - For querying replies by user

---

## Backend Implementation

### Database Helper Functions (`server/db.ts`)

#### `createForumPost(user, input)`
Creates a new forum post.

**Parameters:**
```typescript
user: Pick<User, "id" | "name">
input: {
  category: string;        // "general" or collectible category
  title: string;          // Post title (max 255 chars)
  content: string;        // Post content
}
```

**Returns:**
```typescript
{ postId: number }
```

**Example:**
```typescript
const result = await createForumPost(
  { id: 123, name: "John Collector" },
  {
    category: "comics",
    title: "Best Comic Grading Companies",
    content: "What are your favorite comic grading companies?"
  }
);
// Returns: { postId: 456 }
```

---

#### `getForumPosts(category?, sortBy)`
Retrieves forum posts with optional filtering and sorting.

**Parameters:**
```typescript
category?: string;                          // Optional: filter by category
sortBy: "newest" | "popular" | "replies"   // Sort order
```

**Returns:**
```typescript
Array<{
  id: number;
  userId: number;
  category: string;
  title: string;
  content: string;
  viewCount: number;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
  author: { id: number; name: string };
}>
```

**Sorting Behavior:**
- `"newest"` - Most recently created posts first
- `"popular"` - Most viewed posts first (by viewCount)
- `"replies"` - Posts with most replies first (by replyCount)

**Example:**
```typescript
// Get all comics posts, sorted by newest
const posts = await getForumPosts("comics", "newest");

// Get all posts across all categories, sorted by popularity
const allPosts = await getForumPosts(undefined, "popular");
```

---

#### `getForumPostById(postId)`
Retrieves a single post by ID and increments its view count.

**Parameters:**
```typescript
postId: number
```

**Returns:**
```typescript
{
  id: number;
  userId: number;
  category: string;
  title: string;
  content: string;
  viewCount: number;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
  author: { id: number; name: string };
} | null
```

**Side Effects:**
- Automatically increments `viewCount` by 1 each time called

**Example:**
```typescript
const post = await getForumPostById(456);
if (post) {
  console.log(`${post.title} has ${post.viewCount} views`);
}
```

---

#### `addForumReply(user, input)`
Adds a reply to a forum post and increments reply count.

**Parameters:**
```typescript
user: Pick<User, "id" | "name">
input: {
  postId: number;
  content: string;
}
```

**Returns:**
```typescript
{ replyId: number }
```

**Side Effects:**
- Automatically increments the parent post's `replyCount` by 1

**Example:**
```typescript
const result = await addForumReply(
  { id: 123, name: "Jane Collector" },
  {
    postId: 456,
    content: "I prefer PSA grading for comics"
  }
);
// Returns: { replyId: 789 }
```

---

#### `getForumReplies(postId)`
Retrieves all replies for a specific post.

**Parameters:**
```typescript
postId: number
```

**Returns:**
```typescript
Array<{
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: number; name: string };
}>
```

**Example:**
```typescript
const replies = await getForumReplies(456);
replies.forEach(reply => {
  console.log(`${reply.author.name}: ${reply.content}`);
});
```

---

### tRPC Procedures (`server/routers.ts`)

All forum operations are exposed via tRPC under the `market` router namespace:

```typescript
// Create a post
trpc.market.createForumPost.useMutation()

// Get posts by category
trpc.market.getForumPosts.useQuery({ category, sortBy })

// Get single post
trpc.market.getForumPostById.useQuery({ postId })

// Add reply
trpc.market.addForumReply.useMutation()

// Get replies
trpc.market.getForumReplies.useQuery({ postId })
```

---

## Frontend Implementation

### Forum Main Page (`client/src/pages/Forum.tsx`)

The main forum page displays all available categories and allows users to browse topics.

**Features:**
- Category grid with all available forum categories
- "New Topic" button to create discussions
- Search and filter capabilities
- Topic listing with sorting options

**Route:** `/forum`

**Key Components:**
- Category selector
- Topic list with sorting (newest, popular, most replies)
- Topic preview cards showing:
  - Title
  - Author name
  - Creation date
  - Reply count
  - View count

---

### Forum Topic Detail Page (`client/src/pages/ForumTopic.tsx`)

The topic detail page shows a full discussion thread with all replies.

**Features:**
- Full post content display
- Author information
- View count and reply count
- All replies in chronological order
- Reply form for authenticated users
- Reply count auto-updates

**Route:** `/forum/:postId`

**Key Components:**
- Post header with title, author, date
- Post content
- Replies list
- Reply form (protected route - requires authentication)

---

### Navigation

**Sidebar Link:**
Added to the left sidebar in `Home.tsx`:
```jsx
<button onClick={() => setLocation('/forum')} className="...">
  💭 Collector's Forum
</button>
```

---

## Category Structure

### Hybrid Category System

The forum supports a **hybrid category structure** combining general discussion with specific collectible categories:

#### General Category
- `"general"` - Off-topic discussions, general collecting chat

#### Collectible Categories
- `"comics"` - Comic books and graphic novels
- `"sports_cards"` - Sports trading cards
- `"vintage_toys"` - Vintage and collectible toys
- `"video_games"` - Video games and consoles
- `"stamps"` - Stamps and philatelic items
- `"coins"` - Coins and numismatic items
- `"pokemon"` - Pokémon cards and merchandise
- `"movies"` - Movie memorabilia and collectibles
- `"autographs"` - Autographed items
- `"disney_pins"` - Disney pins and collectibles

**Usage:**
Users can create topics in any category. Each category maintains its own topic list and sorting.

---

## Data Flow

### Creating a Topic

```
User clicks "New Topic" 
  ↓
Forum form opens with category selector
  ↓
User enters title and content
  ↓
User clicks "Create Topic"
  ↓
Frontend calls: trpc.market.createForumPost.useMutation()
  ↓
Backend: createForumPost() inserts into forumPosts table
  ↓
Returns postId
  ↓
Frontend redirects to /forum/:postId
  ↓
Topic is now visible in category listings
```

### Viewing a Topic

```
User clicks on topic from list
  ↓
Frontend navigates to /forum/:postId
  ↓
Frontend calls: trpc.market.getForumPostById.useQuery()
  ↓
Backend: getForumPostById() increments viewCount
  ↓
Returns post with all data
  ↓
Frontend calls: trpc.market.getForumReplies.useQuery()
  ↓
Backend: getForumReplies() returns all replies
  ↓
Page renders post + replies
```

### Adding a Reply

```
User types reply content
  ↓
User clicks "Post Reply"
  ↓
Frontend calls: trpc.market.addForumReply.useMutation()
  ↓
Backend: addForumReply() inserts reply + increments replyCount
  ↓
Frontend refetches replies
  ↓
New reply appears in thread
  ↓
Reply count updates automatically
```

---

## Testing

### Test Coverage (`server/forum.test.ts`)

All forum functionality is covered by 4 comprehensive tests:

1. **Create Forum Post Test**
   - Verifies post creation with all required fields
   - Validates postId is returned and > 0

2. **Retrieve Forum Post Test**
   - Verifies single post retrieval by ID
   - Validates post data integrity

3. **Add Reply Test**
   - Verifies reply creation
   - Validates replyId is returned and > 0

4. **Sort Posts Test**
   - Verifies posts can be sorted by newest, popular, replies
   - Validates sorting order is correct

**Running Tests:**
```bash
cd /home/ubuntu/collectors-barter
pnpm test server/forum.test.ts
```

**Expected Output:**
```
✓ server/forum.test.ts (4 tests)
  ✓ should create a forum post
  ✓ should retrieve forum post by ID
  ✓ should add a reply to a forum post
  ✓ should sort posts correctly

Test Files  1 passed (1)
Tests  4 passed (4)
```

---

## Security & Access Control

### Authentication
- **Creating Topics:** Requires authenticated user (protectedProcedure)
- **Adding Replies:** Requires authenticated user (protectedProcedure)
- **Viewing Topics:** Public access (no authentication required)
- **Browsing Categories:** Public access (no authentication required)

### Data Validation
- Post titles: Max 255 characters, trimmed
- Post content: Trimmed and sanitized
- Reply content: Trimmed and sanitized
- Category: Must be valid category string

### User Association
- All posts tracked with `userId`
- All replies tracked with `userId`
- Author information included in responses

---

## Future Enhancements

### Planned Features
1. **Admin Controls**
   - Pin important topics
   - Lock topics to prevent new replies
   - Mark topics as "Solved"
   - Delete spam/inappropriate content

2. **Search & Filtering**
   - Full-text search across posts and replies
   - Filter by date range
   - Filter by author

3. **User Engagement**
   - Like/upvote posts and replies
   - User reputation system
   - Badge system for active contributors

4. **Notifications**
   - Email notifications for replies to user's topics
   - @mention notifications
   - Subscription to topic threads

5. **Moderation**
   - Report inappropriate content
   - User blocking
   - Content flagging system

---

## Performance Considerations

### Indexing
- Posts indexed by `userId`, `category`, and `createdAt` for fast queries
- Replies indexed by `postId` for efficient thread retrieval

### Query Optimization
- `getForumPosts()` uses efficient sorting with proper indexes
- `getForumReplies()` uses single query with JOIN for author data
- View count increments use SQL `UPDATE` for atomicity

### Scalability
- Forum tables designed to handle thousands of posts
- Proper foreign key constraints ensure data integrity
- Pagination can be added to `getForumPosts()` if needed

---

## File Locations

| File | Purpose |
|------|---------|
| `drizzle/schema.ts` | Forum table definitions |
| `server/db.ts` | Database helper functions |
| `server/routers.ts` | tRPC procedure definitions |
| `client/src/pages/Forum.tsx` | Main forum page |
| `client/src/pages/ForumTopic.tsx` | Topic detail page |
| `client/src/App.tsx` | Forum route definitions |
| `client/src/pages/Home.tsx` | Sidebar link |
| `server/forum.test.ts` | Test suite |

---

## Usage Examples

### Creating a Topic from Frontend

```typescript
import { trpc } from "@/lib/trpc";

function NewTopicForm() {
  const createMutation = trpc.market.createForumPost.useMutation();
  
  const handleSubmit = async (formData) => {
    const result = await createMutation.mutateAsync({
      category: "comics",
      title: "Best CGC vs PSA for Comics",
      content: "Which grading company is better for comics?"
    });
    
    // Redirect to new topic
    navigate(`/forum/${result.postId}`);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Fetching Posts by Category

```typescript
import { trpc } from "@/lib/trpc";

function ComicsForumPage() {
  const { data: posts } = trpc.market.getForumPosts.useQuery({
    category: "comics",
    sortBy: "newest"
  });
  
  return (
    <div>
      {posts?.map(post => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          <p>By {post.author.name}</p>
          <p>{post.replyCount} replies</p>
        </div>
      ))}
    </div>
  );
}
```

### Viewing a Topic with Replies

```typescript
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";

function TopicDetailPage() {
  const { postId } = useParams();
  
  const { data: post } = trpc.market.getForumPostById.useQuery({
    postId: parseInt(postId)
  });
  
  const { data: replies } = trpc.market.getForumReplies.useQuery({
    postId: parseInt(postId)
  });
  
  return (
    <div>
      <h1>{post?.title}</h1>
      <p>{post?.content}</p>
      
      <div>
        {replies?.map(reply => (
          <div key={reply.id}>
            <p><strong>{reply.author.name}</strong></p>
            <p>{reply.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Troubleshooting

### Issue: Posts not showing up
**Solution:** Verify posts were created with valid category string. Check database directly:
```sql
SELECT * FROM forumPosts WHERE category = 'comics';
```

### Issue: Reply count not updating
**Solution:** Ensure `addForumReply()` is being called (not just inserting directly). The function handles the increment.

### Issue: View count stuck at 0
**Solution:** Verify `getForumPostById()` is being called when viewing posts. This function increments the view count.

### Issue: Author information missing
**Solution:** Ensure user exists in `users` table. The query JOINs with users table to get author data.

---

## Summary

The Collector's Forum is a fully functional, tested community discussion platform that allows Tradebilia users to engage in organized conversations about their collectible interests. With hybrid category support, automatic sorting, and clean data management, it provides a solid foundation for community building and user engagement.

---

## Moderation Features (Ready for Implementation)

### Pre-built Database Fields

The following fields are already in the `forumPosts` table and ready for implementation:

| Field | Type | Purpose | Status |
|-------|------|---------|--------|
| `isPinned` | BOOLEAN | Pin important topics to top of category | Ready - add UI controls |
| `isLocked` | BOOLEAN | Prevent new replies on locked topics | Ready - add validation |
| `isSolved` | BOOLEAN | Mark topics as resolved/answered | Ready - add UI controls |

### Implementation Guide for Next Session

These fields are already in the database schema. To activate moderation features:

**1. Pin Topic (Admin Only)**
- Add `updateForumPost()` function to `server/db.ts`
- Create `updateForumPost` tRPC procedure in `server/routers.ts`
- Add "Pin Topic" button to ForumTopic.tsx (admin only)

**2. Lock Topic (Admin Only)**
- Add validation in `addForumReply()` to check `isLocked` status
- Create `lockForumPost` tRPC procedure
- Add "Lock Topic" button to ForumTopic.tsx (admin only)

**3. Mark as Solved (Topic Creator)**
- Create `markSolved` tRPC procedure
- Add "Mark as Solved" button to ForumTopic.tsx (creator only)
- Update `getForumPosts()` to sort solved topics differently

### Why These Fields Exist

The database schema was designed with future moderation in mind. All fields are present but not yet wired to the UI. This allows for seamless implementation of moderation features without database migration.

