# 🛡️ Tradebilia Environment Checklist

This document lists every environment variable required for Tradebilia to function correctly. **Keep a backup of these values in a secure location (like a password manager).**

## 🚨 Critical Infrastructure
These keys are essential for the site to boot and for basic functionality.

| Variable | Purpose | Status |
|---|---|---|
| `DATABASE_URL` | TiDB Cloud connection string | ✅ Stored in `.env` |
| `JWT_SECRET` | Used for user authentication sessions | ✅ Stored in `.env` |
| `ENCRYPTION_KEY` | **CRITICAL**: Used to encrypt OAuth tokens in DB | ✅ **NEW KEY GENERATED** |
| `BUILT_IN_FORGE_API_KEY` | Required for image storage | ❌ **DUMMY** (Restore via Support) |
| `BUILT_IN_FORGE_API_URL` | Endpoint for image storage | ✅ Stored in `.env` |

## 📦 Data Acquisition & AI
These keys power the "Trade Room" and automated market data fetching.

| Variable | Purpose | Status |
|---|---|---|
| `TRADEBILIA_OPENAI_API_KEY` | Powers Trade Room AI analysis | ✅ Stored in `.env` |
| `EBAY_PROD_CLIENT_ID` | Production eBay API access | ✅ Stored in `.env` |
| `EBAY_PROD_CLIENT_SECRET` | Production eBay API access | ✅ Stored in `.env` |
| `PSA_API_TOKEN` | Future PSA data integration | ✅ Stored in `.env` |

## 🌐 Social & Third-Party
Required for social logins and external integrations.

| Variable | Purpose |
|---|---|
| `FACEBOOK_APP_ID` | Facebook Login |
| `FACEBOOK_APP_SECRET` | Facebook Login |
| `LINKEDIN_CLIENT_ID` | LinkedIn Login |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn Login |

---

## 🛠️ Recovery Instructions

1. **If the `.env` file is lost**:
   - Refer to this checklist.
   - Restore values from your secure backup.
   - For `BUILT_IN_FORGE_API_KEY`, contact Manus support.

2. **If `ENCRYPTION_KEY` is changed**:
   - All existing eBay/Social tokens in the database will become unreadable.
   - Users will need to re-link their accounts.

3. **To add a new key**:
   - Add it to the `.env` file.
   - Update this checklist.
   - Restart the server.
