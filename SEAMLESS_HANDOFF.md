# Seamless Handoff Guide - Tradebilia (Collectors-Barter)

**Last Updated:** July 2, 2026 20:18 UTC  
**Latest Commit:** `1f49e53` - Merge GitHub changes - resolve conflict by using local version  
**Status:** ✅ All code present, images need URL fix in database

---

## Quick Start (Copy & Paste These Commands)

### Step 1: Clone the Project
```bash
cd /home/ubuntu
rm -rf collectors-barter
git clone https://github.com/tradebilia/collectors-barter.git
cd collectors-barter
```

### Step 2: Configure Manus Webdev Repository
```bash
# Remove GitHub remote
git remote remove origin

# Add Manus webdev repo as origin (this is the source of truth)
git remote add origin s3://vida-prod-gitrepo/webdev-git/310519663570115757/TzzwLt5FRwqjKKW5zhfchR

# Verify the remote is set
git remote -v
```

Expected output:
```
origin	s3://vida-prod-gitrepo/webdev-git/310519663570115757/TzzwLt5FRwqjKKW5zhfchR (fetch)
origin	s3://vida-prod-gitrepo/webdev-git/310519663570115757/TzzwLt5FRwqjKKW5zhfchR (push)
```

### Step 3: Install Dependencies
```bash
pnpm install
```

### Step 4: Set Environment Variables
Add these to `.env` file (or they should be auto-injected by Manus):

```bash
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im
VITE_APP_ID=TzzwLt5FRwqjKKW5zhfchR
JWT_SECRET=2fTBz7ETgrcQ28xdigDHm2
DATABASE_URL=mysql://4ZXfWh5QbDJhQ4C.023db4f53938:9gg6EhlcJlBPkKU3111k@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/TzzwLt5FRwqjKKW5zhfchR?ssl={"rejectUnauthorized":true}
```

### Step 5: Start Dev Server
```bash
pnpm dev
```

The server will start on `http://localhost:3000`

### Step 6: Fix Database Image URLs (CRITICAL)
**Item images are broken because the database has incorrect URLs.** Run this SQL:

```bash
# Connect to the database and run:
mysql -h gateway05.us-east-1.prod.aws.tidbcloud.com \
  -u 4ZXfWh5QbDJhQ4C.023db4f53938 \
  -p9gg6EhlcJlBPkKU3111k \
  -D TzzwLt5FRwqjKKW5zhfchR \
  -e "UPDATE listingPhotos SET imageUrl = CONCAT('/manus-storage/', fileKey) WHERE imageUrl NOT LIKE '/manus-storage/%';"
```

Or use the Manus webdev SQL tool:
```
UPDATE listingPhotos 
SET imageUrl = CONCAT('/manus-storage/', fileKey) 
WHERE imageUrl NOT LIKE '/manus-storage/%';
```

### Step 7: Verify Everything Works
1. Open `http://localhost:3000` in browser
2. Check that:
   - ✅ Hero section displays with background image
   - ✅ Category navigation shows all 10 categories
   - ✅ Items display with images (after SQL fix)
   - ✅ "Collector's Forum" link appears in left sidebar
   - ✅ Admin dashboard is accessible (if logged in as admin)

---

## What's Implemented

✅ **TypeScript:** 0 errors  
✅ **ItemDetail Page:** Optimized with full-width Details section  
✅ **Admin Features:** AdminListingsTab with bulk delete/update actions  
✅ **Bulk Operations:** Inventory page supports bulk actions  
✅ **Images:** All UI assets using `/manus-storage/` paths  
✅ **Database:** TiDB connected with all recent data  
✅ **Forum:** Collector's Forum fully implemented  
✅ **Authentication:** Manus OAuth integrated  

---

## Known Issues & Fixes

### Issue 1: Item Images Broken
**Cause:** Database has incorrect image URLs (`/images/` instead of `/manus-storage/`)  
**Fix:** Run the SQL command in Step 6 above

### Issue 2: Collector's Forum Not Visible
**Cause:** Might be on old code  
**Fix:** Make sure you're on commit `1f49e53` or later:
```bash
git log --oneline -1
```

### Issue 3: OAuth Not Working
**Cause:** Missing environment variables  
**Fix:** Ensure all env vars from Step 4 are set, then restart dev server

---

## Git Repository

**Primary (Source of Truth):** Manus webdev repo
```
s3://vida-prod-gitrepo/webdev-git/310519663570115757/TzzwLt5FRwqjKKW5zhfchR
```

**Secondary (Backup):** GitHub
```
https://github.com/tradebilia/collectors-barter.git
```

**Always use Manus repo as primary.** GitHub is only a backup.

---

## Troubleshooting

### Can't access Manus repo (S3 credentials error)
This is a sandbox limitation. The code is still there locally. Proceed with development.

### Dev server shows blank page
1. Check browser console (F12) for errors
2. Verify OAuth environment variables are set
3. Restart: `pnpm dev`

### Database connection fails
1. Verify DATABASE_URL is correct
2. Check that TiDB is accessible from your network
3. Verify credentials are correct

### Images still broken after SQL fix
1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart dev server
3. Verify SQL ran successfully: `SELECT COUNT(*) FROM listingPhotos WHERE imageUrl LIKE '/manus-storage/%';`

---

## Next Steps

1. ✅ Complete setup using commands above
2. ✅ Run SQL fix for item images
3. ✅ Test all features work
4. ✅ Continue development

Good luck! 🚀
