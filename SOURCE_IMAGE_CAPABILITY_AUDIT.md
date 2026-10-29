# Test AI source-image capability audit

**Audit date:** 2026-10-29  
**Scope:** Configured Test AI marketplace, specialist, catalog, and reference sources. This is a source-code contract audit; it does not claim that every individual returned record contains an image.

## Goldin finding and repair

Goldin’s public sold-search response does not return `image_url`; it returns a 36-character `primary_image_name` identifier. Goldin’s own public frontend constructs the image URL as:

`https://d2tt46f3mh26nl.cloudfront.net/public/Lots/{lot_id}/{primary_image_name}`

The adapter now recognizes `primary_image_name` for both search and detail records and constructs that exact HTTPS URL. Existing direct image aliases remain supported. Regression coverage verifies the constructed URL. Goldin records are routed through the universal filter, Sports Cards-specific ranking/cap when applicable, and shared visual review.

**Provider references used for verification:**

- Public search endpoint: `https://d1wu47wucybvr3.cloudfront.net/api/lots_v2`
- Public lot-detail endpoint: `https://lot-retrieval-bidder.api.prod.goldin.com/api/meta_slug/`
- Goldin public frontend bundle: `https://goldin.co/_expo/static/js/web/index-6ee0314d6f8b3f83371ec91ce1a1860d.js`

## Sources with image fields and an active visual-review path

These adapters expose a candidate image field and are wired into `filterVisualSourceCandidates` or an equivalent shared visual-review path:

- eBay Active and eBay Sold-Comps: Browse/Sold image aliases normalized into the shared candidate image field.
- Mercari Sold-Comps and TCGplayer Sold-Comps: provider image/thumbnail fields promoted into the shared candidate image field.
- HIPStamp active and sold listings: image arrays/primary image extraction.
- Cardsight.ai and COMC: structured image fields preserved in candidate records.
- Lelands, Pristine Auction, and Collect Auctions: auction-parser image fields.
- Sirius Sports Auctions: HTML/detail image extraction.
- ComicConnect: public lot image extraction.
- Hake’s: catalog/detail image extraction.
- LCG Auctions: gallery/detail image extraction.
- Goldin: `primary_image_name` repair plus direct image aliases.
- Weiss Auctions: `focal_media_file_url_thumb_image` extraction.
- Nate D. Sanders: public lot/catalog image extraction.
- TCGplayer via ReefAPI: product image extraction.
- 130point and PWCC: provider image fields passed through the shared visual filter.

An image-bearing record can still be retained as context-only by universal/category gates, ranking caps, missing metadata, or visual mismatch. Image presence is not an identity assertion.

## Sources that expose image/reference media but are not currently equivalent visual-comparable feeds

These sources may provide an image or media field for display or reference, but their current purpose is not the same as a completed-sale visual-comparable source:

- PCGS: certification response exposes image collections; certification/reference behavior is separate from marketplace comparable admission.
- PriceCharting: product/card/game records can expose image URLs; the source remains guide/catalog context.
- TCGdex, IGDB, RAWG, Discogs, Wikidata, and Smithsonian: catalog/reference metadata may include cover or media links, but these are not sold-comparable candidates and should not be sent to the visual valuation queue solely because a cover image exists.
- Numista: structured coin catalog/reference estimates; no completed-sale visual comparable contract.
- Comic Book Realm: CGC Analyzer guide rows currently have no candidate image field and are guide context only.

## Sources with no verified automatic image contract in the current adapter

These are either locator-required, permission-pending, blocked, or otherwise not verified for automatic image-bearing candidate transport:

- NGC Auction Central, Rumsey, Cherrystone, Raritan, Morphy, Theriault’s, Poster Auctions International, Bonhams, Bertoia, RR Auction, and other permission-pending/locator-only specialist sources.
- Sources shown as `public_contract_unverified` or `price_table_locator_required` remain deliberately blocked; no image URL is guessed and no visual call is made.

## Rules to preserve while adding future filters

1. Normalize provider records first; do not apply category rules to raw provider-specific shapes.
2. Apply universal contradictions to every category and item type before category-specific rules.
3. Missing image or missing metadata is unknown, not a mismatch. It may prevent visual review but must not silently delete the record.
4. Preserve excluded records as context-only with an explicit reason.
5. Apply category/item-type gates, then rank, then cap, then send only the selected image-bearing candidates to visual review.
6. Preserve score, rank, matched fields, image URL, and exclusion reason through every server response mapper and every UI row.
7. Do not assume a field named `image`, `image_url`, or `thumbnail` has the same shape across providers; verify each provider contract and support nested/identifier-based formats where documented.
8. Keep source capability separate from valuation eligibility. A source can have images and still be context-only; a source without images can still contribute non-visual metadata context.

## Validation status

- Focused Goldin adapter, shared visual-filter, and Test AI UI tests: **180 passed**.
- TypeScript: **passed**.
- Production build: **passed**.
- Full suite: **338 files passed, 1 existing Hake’s test timed out at 5 seconds; 1,774 tests passed, 7 skipped.** The timeout is unrelated to the Goldin files and requires a rerun before final checkpointing.
