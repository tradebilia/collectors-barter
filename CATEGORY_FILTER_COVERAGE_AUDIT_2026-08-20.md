# Category Page Filter Coverage Audit

## Scope and Result

This review compares the fields captured by the ten category-specific item-entry forms with the actual Category Page controls and server predicates. It does **not** assume that every saved field deserves a dedicated marketplace filter. Photos, quantity, certification numbers, accessory notes, and free-form descriptions remain discoverable through keyword search where appropriate, but are not useful as standalone refinement controls.

The current system has a sound foundation: all Category Pages retain Keyword, Condition, Value Range, submitted Search/Enter behavior, and the shared distance and Verified Merchant controls. The server filters active listings only and maps category-specific values from `itemDetails` with typed query fields. Existing feed and pagination contracts passed **15 focused tests**.

| Category | Coverage verdict | Existing meaningful filters | Material gaps worth considering |
|---|---|---|---|
| Sports Cards | Sufficient | Manufacturer, sport, year/era, team, set/series, grade, grading service, rookie, autograph | None identified |
| Comics | Mostly sufficient | Title, issue number, grade, grading service, signed, facsimile | Publisher; publication year |
| Vintage Toys | Mostly sufficient | Franchise, grading service | Brand; year; grade |
| Video Games | Mostly sufficient | System, region, grading company | Release year; grade |
| Stamps | Mostly sufficient | Year, issuer, country, grading company | Scott number; mint/used state; grade |
| Coins | Mostly sufficient | Year, denomination, mint mark, grading service | Country; grade |
| Pokémon | Mostly sufficient | Set, rarity, grading service | Year/edition era; finish/variant; grade |
| Movies | Mostly sufficient | Format, franchise, certification | Release year; region; grade where the item is graded |
| Autographs | Mostly sufficient | Medium, authentication, franchise | Signer |
| Disney Pins | Sufficient | Park/event, series, edition | None identified; character and year remain well served by keyword search at current inventory size |

## Important Contract Finding

The server already accepts `year`, `region`, `country`, and `grade` filters and maps year across `year`, `releaseYear`, `publicationYear`, and `yearsIncluded`. Several of these capabilities are therefore **not exposed in the Category Page interface** for categories that collect the associated field. This is an interface-coverage gap, not a database or item-entry data gap.

## Recommended Order

1. Add a reusable **Grade** control wherever the listing form supports grading: Vintage Toys, Video Games, Stamps, Coins, Pokémon, and Movies.
2. Expose fields the server already supports: year on Comics, Vintage Toys, Video Games, and Movies; country on Coins; and region on Movies.
3. Add category-specialist discovery controls after the universal work: Scott number and mint/used for Stamps; edition/era and finish/variant for Pokémon; Signer for Autographs; Publisher for Comics; and Brand for Vintage Toys.

The present filters are usable for broad browsing, but they are **not yet fully aligned with all high-value item-entry criteria**. The first two recommendation groups would produce the largest improvement without cluttering every page with low-value fields.

## Evidence

Reviewed source contracts: `client/src/pages/CategoryPage.tsx`, `client/src/lib/fieldDefinitionsGenerated.ts`, category layout definitions, `server/db.ts`, and existing `server/categoryFeed.test.ts` / `server/categoryPaginationUi.test.ts` coverage.
