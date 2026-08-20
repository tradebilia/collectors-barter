# Category Listing Distance Bands Audit

## Member-Facing Behavior

Signed-in members with a saved town now see an approximate proximity label on each Category Page listing card when the listing owner has a resolvable saved town. Labels are deliberately broad:

| Server-calculated range | Card label |
|---|---|
| 0–10 miles | Within 10 miles |
| Over 10–25 miles | 10–25 miles away |
| Over 25–50 miles | 25–50 miles away |
| Over 50–100 miles | 50–100 miles away |
| Over 100–250 miles | 100–250 miles away |
| Over 250 miles | 250+ miles away |
| Viewer-owned listing | Your listing |

Distance labels are shown in the existing list-card metadata row and below the existing grid-card metadata panel. No card dimensions, item sizing, filter rail, or mobile layout were redesigned.

## Privacy Boundary

The Category Page continues to geocode only town, state, and country on the server. Exact miles, coordinates, addresses, and owner town names are not returned to the client. Listings with an unavailable owner location retain normal visibility but have no proximity label. Signed-out members and members without a saved town likewise see normal listings without labels.

The existing **Location: Nearest First** sort and submitted Distance filter reuse the same private calculation; the new bands add context to every visible listing rather than requiring a location sort selection.

## Validation

Focused distance, Category Page location, and feed-contract coverage passed **19 tests across 3 files**, including every distance-band boundary, own-listing handling, server-only private-location assertions, and client card rendering contracts. TypeScript passed. Desktop and mobile public Stamps Category Page review confirmed the existing layout is unchanged for a visitor without a private distance band. Authenticated band rendering is covered by deterministic server and source-contract tests; no live account or location record was changed for verification. Full regression, production build, public-domain verification, and canonical-GitHub synchronization remain pending.
