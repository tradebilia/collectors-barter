

## Movie source coverage grouping updated — November 4, 2026

Moved exactly these three Movie source entries into **Current matching sources** while the broader verification reset remains active for all other category/source pairs: **eBay Active Listings** (`ebay_active`), **Sold-Comps (eBay Sold)** (`sold_comps`), and **Sold-Comps (Mercari Sold)** (`mercari_sold_comps`). They are explicitly listed in `SOURCE_COVERAGE_CONFIRMED_MATCHES`, so they no longer appear under Movie Pending sources or duplicate there. Other Movie sources remain pending, including Wikidata, Poster Auctions International, Goldin, Weiss, Nate D. Sanders, Hake’s, and any sources not explicitly approved.

Validation passed: `server/testAiSourceApplicabilityUi.test.ts` **38/38**, TypeScript, production build, and source/diff safety checks. The protected `/test-ai` preview route redirected to the public home page in the available unauthenticated preview session, so the tracker could not be visually inspected in-session. No database, migration, seed, destructive, credential, provider, deployment, publishing, or domain changes were made.
