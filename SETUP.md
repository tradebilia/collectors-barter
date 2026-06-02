# Tradebilia Collectors Barter - Setup & Deployment Guide

## Quick Start (New Session)

### 1. Clone and Install
```bash
gh repo clone tradebilia/collectors-barter
cd collectors-barter
pnpm install
```

### 2. Environment Setup
Create a `.env` file with the following variables (obtained from Manus project settings):
```
# Database
DATABASE_URL=mysql://user:password@host/database

# Authentication
JWT_SECRET=your_jwt_secret_here
VITE_APP_ID=your_manus_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# eBay Integration (Optional)
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret
EBAY_REDIRECT_URI=http://localhost:3000/api/oauth/ebay/callback

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_forge_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your_frontend_forge_api_key

# Owner Info
OWNER_NAME=Admin
OWNER_OPEN_ID=your_owner_id

# Analytics
VITE_ANALYTICS_ENDPOINT=your_analytics_endpoint
VITE_ANALYTICS_WEBSITE_ID=your_website_id

# App Branding
VITE_APP_TITLE=Tradebilia
VITE_APP_LOGO=https://your-logo-url
```

### 3. Database Setup
```bash
# Generate migrations (if schema.ts was modified)
pnpm drizzle-kit generate

# Apply migrations to database
pnpm drizzle-kit migrate

# Seed initial data (if needed)
node final-setup.js
```

### 4. Start Development Server
```bash
pnpm dev
```

Server will run on http://localhost:3000 (or next available port)

---

## Project Structure

```
collectors-barter/
├── client/                    # React 19 frontend
│   ├── src/
│   │   ├── pages/            # Page components (CategoryPage, SearchResults, etc.)
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # Utilities (trpc client, tradebilia helpers)
│   │   └── App.tsx           # Main app with routing
│   └── public/images/        # Static images and logos
├── server/                    # Express + tRPC backend
│   ├── routers.ts            # tRPC procedure definitions
│   ├── db.ts                 # Database query helpers
│   └── _core/                # Core infrastructure
├── drizzle/                  # Database schema and migrations
│   └── schema.ts             # Table definitions
├── storage/                  # S3 file storage helpers
└── shared/                   # Shared types and constants
```

---

## Key Features & Status

### ✅ Implemented
- **Authentication**: JWT-based with bcrypt password hashing
- **User Management**: Registration, login, profile management
- **Category Pages**: Comics, Sports Cards, Vintage Toys with custom logos
- **Search & Filtering**: By category, condition, keyword
- **Inventory Management**: Add/edit/delete collectibles
- **Marketplace**: Browse and search listings
- **Statistics**: Collector stats, trade history
- **Database**: MySQL with Drizzle ORM

### 🔄 In Progress / Partial
- **Photo Upload**: Infrastructure ready, needs S3 integration
- **Admin Dashboard**: Structure in place, needs implementation
- **eBay Integration**: OAuth flow implemented, needs testing
- **Email/SMS OTP**: Deferred (needs API keys)

### ⚠️ Known Issues
- ~40 TypeScript errors remaining (mostly in admin features)
- Video Games logo not yet added (background transparency issue)
- Some admin procedures need implementation

---

## Database Schema

### Core Tables
- **users**: User accounts, roles, preferences
- **listings**: Collectible items for trade/sale
- **photos**: Images associated with listings
- **trades**: Trade proposals and history
- **messages**: User-to-user messaging
- **reports**: User reports and moderation

### Key Fields
- All timestamps stored as UTC milliseconds (Unix timestamp)
- User roles: 'admin' | 'user'
- Listing conditions: 'mint' | 'near_mint' | 'excellent' | 'very_good' | 'good' | 'fair' | 'poor'
- Categories: comics, sports_cards, vintage_toys, video_games, stamps, coins, pokemon, movies, autographs, disney_pins

---

## Authentication Flow

1. User clicks "Sign In"
2. Redirected to Manus OAuth portal
3. After auth, redirected to `/api/oauth/callback` with code
4. Server exchanges code for token, creates/updates user in database
5. Session cookie set with JWT
6. Frontend reads auth state with `trpc.auth.me.useQuery()`

### Protected Routes
- Use `ProtectedRoute` component wrapper
- Backend uses `protectedProcedure` for auth-required endpoints
- Admin routes use `adminProcedure` (checks role === 'admin')

---

## File Storage (S3)

All images and files are stored in S3 via `/manus-storage/` path:
- Upload: `storagePut(key, buffer, mimeType)` → returns `{ key, url }`
- Retrieve: `storageGet(key)` → returns presigned URL
- Delete: Remove from database (key is only reference)

**Example:**
```typescript
const { url } = await storagePut('listings/123/photo.jpg', imageBuffer, 'image/jpeg');
// url = "/manus-storage/listings_123_photo_abc123.jpg"
```

---

## Category Page Logos

Custom logos have been added to category pages:

| Category | Logo | Size | Position |
|----------|------|------|----------|
| Comics | Yellow/Blue comic style | 320px | top: 16px |
| Sports Cards | White/Navy/Orange | 320px | top: -120px |
| Vintage Toys | Colorful playful | 500px | top: -160px |
| Video Games | (Pending - transparency issue) | - | - |

Logos are stored in S3 and referenced in `CategoryPage.tsx`

---

## Development Workflow

### Adding a Feature
1. Update `drizzle/schema.ts` with new tables/fields
2. Run `pnpm drizzle-kit generate` to create migration
3. Review generated SQL and apply via database tool
4. Add query helpers in `server/db.ts`
5. Create tRPC procedures in `server/routers.ts`
6. Build UI components in `client/src/pages/` or `client/src/components/`
7. Wire components to tRPC hooks (`trpc.*.useQuery/useMutation`)
8. Write tests in `server/*.test.ts` using vitest
9. Run `pnpm test` to verify

### TypeScript
- Run `pnpm tsc --noEmit` to check types
- Currently ~40 errors (mostly in admin features)
- Fix by ensuring types flow end-to-end from DB → API → UI

### Testing
- Use vitest for unit tests
- Reference: `server/auth.logout.test.ts`
- Run: `pnpm test`

---

## Deployment

### Manus Hosting (Recommended)
1. Save checkpoint in Manus UI
2. Click "Publish" button
3. Site deployed to `tradebilia-*.manus.space`
4. Custom domain support available

### External Hosting
- Ensure Node.js 22+ runtime
- Set environment variables
- Database must be accessible
- S3 credentials required for file storage

---

## Troubleshooting

### Port Already in Use
The dev server automatically finds the next available port. Check the console output for the actual URL.

### Database Connection Failed
- Verify `DATABASE_URL` is correct
- Ensure database credentials are valid
- Check network connectivity

### S3 Upload Failed
- Verify `BUILT_IN_FORGE_API_KEY` is valid
- Check file size (max 16MB for images)
- Ensure MIME type is correct

### TypeScript Errors
- Run `pnpm tsc --noEmit` to see all errors
- Most are in admin features (not critical for MVP)
- Fix by ensuring types match between DB schema and API responses

---

## Important Notes

1. **Never commit .env file** - Use environment variables only
2. **Large files in S3** - Don't store in client/public/
3. **Database migrations** - Always review generated SQL before applying
4. **Git history** - All code changes are tracked and pushed to GitHub
5. **Checkpoints** - Use Manus checkpoints for recovery, not git reset

---

## Contact & Support

For issues or questions about the Tradebilia project:
- Check GitHub issues: https://github.com/tradebilia/collectors-barter/issues
- Review documentation files in root directory
- Check Manus project settings for API keys and configuration

---

**Last Updated**: June 2, 2026
**Project Version**: 1.0.0
**Status**: MVP with custom category logos
