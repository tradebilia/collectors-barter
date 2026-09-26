# Permission-Pending Market-Source Adapters

**Date:** 2026-09-26  
**Scope:** Trade Analyzer 2.0 — isolated Test AI sandbox only

## Purpose

This framework prepares specialist market-data adapters **without remotely retrieving, storing, or displaying any source records** while written source permission is pending. It tests the deterministic *record-normalization and evidence-admission path* against hand-authored, source-shaped fixtures only.

> A disabled adapter is not a scraper. The framework contains no `fetch`, no background job, no scheduled process, no login flow, no CAPTCHA/access-workaround path, no database write, and no market record cache.

## Sandbox behavior

The Test AI **Data Sources** selector now displays eligible candidates in **orange** as:

> **Permission pending — remote lookup disabled**

They cannot be enabled. The category-specific cards are intentionally informative only until activation requirements are met.

## Prepared source coverage

| Tradebilia category | Permission-pending sources | Intended record fields after authorization |
|---|---|---|
| Coins | NGC Auction Central, CoinArchives, CNG Past Auctions | Lot ID, title, dates, grade/service, price and price basis, auction name, URL, images when licensed |
| Stamps | Rumsey, Cherrystone, Raritan | Lot/catalog number, condition, certificate, date, price and price basis, auction name |
| Music | Omega Auctions, RR Auction | Artist/release, edition/pressing, condition, signed/authentication context, date, price |
| Vintage Toys | Bertoia, Morphy, Theriault’s, Hake’s | Maker/line, scale/model, condition, lot composition, date, price |
| Movies | Propstore, Poster Auctions International, Bonhams | Production/title, prop/costume/poster identity, provenance fields, date, price |
| Comics | ComicConnect | Publisher/title/issue/variant, grader/grade, date, price |
| Autographs | University Archives, Swann, RR Auction, Alexander Historical | Signer, item type, inscription/authentication/provenance, date, price |
| Video Games | Goldin, Hake’s | Platform/edition/sealed status, grader/grade, date, price |
| Disney Pins | Hake’s | Character/event/edition-size, lot composition, date, price |

**Heritage** and **GreatCollections** are now deferred by owner and are excluded from the active source matrix, category applicability, activation path, and all further tests until the owner explicitly reactivates them.

## What has been proven with fixtures

The test harness accepts a source-shaped record and normalizes these fields:

- title, description, catalog/lot ID, auction name, URL, image URL;
- explicit sold/completed status;
- realized/hammer price, currency, sale date, grade, and certification company;
- grouped-lot flag and price-basis semantics.

It requires the expected source shape to have an explicit sale result, numeric price, date, category-relevant identity agreement, and no grouped-lot mismatch before it can become **eligible when authorized**.

Even then, the current output is permanently set to:

```text
valuationEligible: false
```

This is a second safety boundary: no fixture and no pending source can reach a Tradebilia value, confidence, verdict, or completed-sale count.

### Identity regression checks

1. A fixture for a **1945 Walking Liberty Silver Half Dollar PCGS MS65** with a completed sale normalizes correctly but remains valuation-blocked while pending.
2. The known mismatch — **2016-W [GOLD] Walking Liberty Half Dollar PCGS MS65** — is rejected by year and explicitly declared material checks.
3. A Disney pin record marked as a **grouped lot** stays ineligible even if its record says sold.
4. A pending source status response returns empty sales/context arrays and a hard remote-lookup-disabled message.
5. Category-specific sources do not appear as eligible for unrelated categories.

## Authorized two-item live validation — 2026-09-26

After the framework was created, the owner reported authorization to test each source until its public contract was understood and then validate a different completed item. Each check used only a small bounded number of ordinary public page requests, without login, account creation, CAPTCHA/access-control workaround, form submission, record retention, or database write.

- **16 active candidates** returned the technical minimum on two different public completed items: title, stable URL or lot ID, explicit completed/sold/realized state, date, price/currency, and price-basis wording.
- **3 active candidates** returned genuine auction data but have a required field that is gated, absent, or inconsistent across public routes.
- **1 source** did not expose a usable public individual completed lot at all.
- **2 sources** — GreatCollections and Heritage — are deferred by owner, not activation candidates.

The Test AI source cards now expose the final outcome as **item test passed**, **partial item test**, **item test blocked**, or **deferred by owner**. Deferred cards are gray, disabled, and excluded from applicability; all remaining pending cards are orange, disabled, sandbox-only, and valuation-blocked.

The full source-by-source matrix, exact public test item, fields obtained, and the next required request or access contract is in `LIVE_SPECIALIST_SOURCE_VALIDATION_2026-09-26.md`.

## Required activation gate for each source

A source can move out of **permission pending** only after all conditions below are recorded for that source:

1. **Written authorization** or an appropriate commercial data license expressly permits the intended access and retention.
2. The source-specific request contract is documented: allowed endpoints/pages, authentication, rate limits, robots/terms constraints, caching, retention, attribution, and deletion obligations.
3. A bounded, read-only provider health check returns only status metadata; it must not use a logged-in user, CAPTCHA bypass, or access workaround.
4. A source-specific adapter has regression fixtures based on the approved contract and a live read-only contract check after authorization.
5. Only **dated, explicit completed sales** that pass exact/near identity, grade/company, date, currency, duplicate, visual, and category-specific fields can become valuation candidates. Asking prices, catalog records, grouped lots, active auctions, undated results, and uncertain sale states remain context only.
6. An Admin API Health card exposes the connection state and a safe individual test before the source is enabled in Test AI.

## Explicit exclusions

- No GreatCollections archive request, account use, CAPTCHA handling, or robot-restricted path is included.
- No Heritage archive request, account use, CAPTCHA handling, anti-automation workaround, or robot-restricted path is included.
- No scheduled or background collection is enabled.
- No results are user-facing outside the sandbox.
- No database migration, database write, inventory change, production Trade Room change, production publication, notification, or billing change occurred.

## Related project materials

- `FREE_MARKET_DATA_DEEP_DIVE_2026-09-26.md`
- `GREATCOLLECTIONS_API_ARCHIVE_ASSESSMENT_2026-09-26.md`
- `TRADE_ANALYZER_AI_DOCUMENTATION.md`
- `server/permissionPendingMarketData.ts`
- `server/permissionPendingMarketData.test.ts`
