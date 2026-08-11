# Next Session Quick Start (5 Minutes)

**TL;DR:** Do these 5 things in order, then you're ready to work.

---

## Step 1: Clone & Install (1 min)

```bash
git clone https://github.com/tradebilia/collectors-barter.git
cd collectors-barter
pnpm install
```

---

## Step 2: Restore Environment Variables (2 min)

Use this command to restore all API keys and database credentials:

```bash
webdev_request_secrets \
  --brief "Restore Tradebilia API credentials and database config" \
  --secrets '[
    {"key": "CUSTOM_DATABASE_URL", "description": "Production database connection string"},
    {"key": "EBAY_PROD_CLIENT_ID", "description": "eBay API client ID"},
    {"key": "EBAY_PROD_CLIENT_SECRET", "description": "eBay API client secret"},
    {"key": "TWILIO_ACCOUNT_SID", "description": "Twilio account SID for SMS verification"},
    {"key": "TWILIO_AUTH_TOKEN", "description": "Twilio auth token"},
    {"key": "TWILIO_VERIFY_SERVICE_SID", "description": "Twilio Verify service SID"},
    {"key": "TRADEBILIA_OPENAI_API_KEY", "description": "OpenAI API key for trade analysis"},
    {"key": "PARSE_BOT_API_KEY", "description": "Parse.bot API key for PSA/Beckett data"},
    {"key": "SOLD_COMPS_API_KEY", "description": "Sold-Comps API key for sold data"},
    {"key": "FACEBOOK_APP_ID", "description": "Facebook OAuth app ID"},
    {"key": "FACEBOOK_APP_SECRET", "description": "Facebook OAuth app secret"},
    {"key": "FACEBOOK_REDIRECT_URI", "description": "Facebook OAuth redirect URI"},
    {"key": "LINKEDIN_CLIENT_ID", "description": "LinkedIn OAuth client ID"},
    {"key": "LINKEDIN_CLIENT_SECRET", "description": "LinkedIn OAuth client secret"},
    {"key": "LINKEDIN_REDIRECT_URI", "description": "LinkedIn OAuth redirect URI"},
    {"key": "ENCRYPTION_KEY", "description": "Encryption key for OAuth tokens at rest"}
  ]'
```

**Where to get these values:**
- **Database URL:** From your MySQL/TiDB provider (user's own database)
- **eBay credentials:** eBay Developer Portal
- **Twilio credentials:** Twilio Console
- **OpenAI key:** OpenAI API dashboard
- **Parse.bot key:** Parse.bot account
- **Sold-Comps key:** Sold-Comps dashboard
- **OAuth credentials:** Respective provider dashboards

---

## Step 3: Verify Database Connection (1 min)

```bash
pnpm test
```

**Expected:** All 67 tests pass ✅

If tests fail, check:
- `CUSTOM_DATABASE_URL` is correct
- Database is accessible from your network
- All credentials are valid

---

## Step 4: Start Dev Server (30 sec)

```bash
pnpm dev
```

**Expected:** Server starts on http://localhost:3001 (or similar)

---

## Step 5: Test Critical Flows (30 sec)

Visit these pages to confirm everything works:

- [ ] Home page: http://localhost:3001 (carousel, hero, stats load)
- [ ] Category page: http://localhost:3001/category/sports_cards (listings visible)
- [ ] Messages page: http://localhost:3001/messages (requires login, hero displays)
- [ ] Admin dashboard: http://localhost:3001/admin/users (requires admin role)

---

## 🚨 Image Assets Issue

**IMPORTANT:** All images are currently in S3 and will not persist across sessions.

**Solution:** Migrate images to GitHub (see `IMAGE_ASSET_INVENTORY.md` for full list)

Quick migration:
1. Download all images from S3 (they're listed in `IMAGE_ASSET_INVENTORY.md`)
2. Create `/public/assets/` directory in GitHub
3. Commit images to GitHub
4. Update all `/manus-storage/...` URLs to `/assets/...` in the codebase
5. Test that images load

---

## 📋 After Setup: What to Work On

See `todo.md` for the full list. Current priorities:

1. **Fix sender notification bug** (identified, fix ready)
2. **Migrate images to GitHub** (critical for persistence)
3. **CGC integration for comics**
4. **Port Test AI logic to production**

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Tests fail | Check `CUSTOM_DATABASE_URL` and database connectivity |
| Images show 404 | Migrate images to GitHub (see step above) |
| Twilio SMS not working | Verify `TWILIO_VERIFY_SERVICE_SID` is correct |
| eBay API errors | Check `EBAY_PROD_CLIENT_ID` and `EBAY_PROD_CLIENT_SECRET` |
| "Cannot find module" | Run `pnpm install` again |
| Port 3000 in use | Dev server will use 3001 automatically |

---

## 📚 Full Documentation

- **SESSION_HANDOFF_GUIDE.md** — Complete reference with all details
- **IMAGE_ASSET_INVENTORY.md** — All images and migration plan
- **todo.md** — Task tracking and remaining work
- **MASTER_HANDOFF_GUIDE.md** — Original session notes (if needed)

---

**That's it! You're ready to work. 🚀**
