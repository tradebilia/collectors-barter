# Tradebilia Category / Item-Type Analyzer Audit

**Audit date:** October 30, 2026  
**Scope:** Marketplace/eBay analyzer pipeline only  
**Rule:** Collection/Lot is intentionally non-comparable and must not receive lookup, filter comparison, ranking, visual review, or trade analysis.

## Executive result

| Measure | Result |
|---|---:|
| Categories reviewed | 11 |
| Item types reviewed | 44 |
| Comparable item types | 34 |
| Collection/Lot exceptions | 10 |
| Comparable types with specific identity filters | 34 / 34 |
| Comparable types with ranking scores | 34 / 34 |
| Comparable types with visual caps | 32 / 34 |
| Market-range types without visual caps | 2 |
| Confirmed analyzer gaps | 0 |

## Detailed grid

| Category | Item type | Specific filter | Ranking score | Visual cap | Status / notes |
|---|---|---|---|---|---|
| Comics | Single Comic | Yes | Yes | Yes — 10/8/6/4 by score band | Complete |
| Comics | Original Art | Yes — market-context identity fields | Yes — market relevance | N/A | Complete; similar-market research only, never visual matching |
| Comics | Collection/Lot | No | No | No | Intentional exception; universally blocked |
| Sports Cards | Single Card | Yes | Yes | Yes — 10/8/6/4 | Complete |
| Sports Cards | Set | Yes | Yes | Yes — 10/6/3/2 | Complete; individual cards are excluded as mismatches |
| Sports Cards | Unopened Product | Yes | Yes | Yes — 10/6/3/2 | Complete; sealed, authentication, FASC, and product form are covered |
| Sports Cards | Collection/Lot | No | No | No | Intentional exception; universally blocked |
| Vintage Toys | Action Figure/Doll | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Vintage Toys | Board Game/Puzzle | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Vintage Toys | Electronic Toy | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Vintage Toys | LEGO | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Vintage Toys | Model/Kit | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Vintage Toys | Playset | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Vintage Toys | Plush/Stuffed Toy | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Vintage Toys | Vehicle | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Vintage Toys | Collection/Lot | No | No | No | Intentional exception; universally blocked |
| Video Games | Game | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Video Games | Console | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Video Games | Accessory | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Video Games | Collection/Lot | No | No | No | Intentional exception; universally blocked |
| Stamps | Single Stamp | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Stamps | Stamp Set/Sheet | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Stamps | Collection/Lot | No | No | No | Intentional exception; universally blocked |
| Coins | Single Coin | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Coins | Coin Set | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Coins | Paper Money/Banknotes | Yes | Yes | Yes — 8/6/4/2 | Complete; supported through the paper-money analyzer branch |
| Coins | Collection/Lot | No | No | No | Intentional exception; universally blocked |
| Pokémon | Single Card | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Pokémon | Set | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Pokémon | Unopened Product | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Pokémon | Collection/Lot | No | No | No | Intentional exception; universally blocked |
| Movies | Individual Movie | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Movies | Box Set | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Movies | Collection/Lot | No | No | No | Intentional exception; universally blocked |
| Music | Vinyl Record | Yes | Yes | Yes — 8/6/4/2 | Complete; format-specific condition safeguards apply |
| Music | Cassette Tape | Yes | Yes | Yes — 8/6/4/2 | Complete; format-specific condition safeguards apply |
| Music | Compact Disc | Yes | Yes | Yes — 8/6/4/2 | Complete; format-specific condition safeguards apply |
| Music | 8-Track Tape | Yes | Yes | Yes — 8/6/4/2 | Complete; format-specific condition safeguards apply |
| Music | Other Music Format | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Autographs | Signed Item | Yes — market-range identity fields | Yes — market relevance | N/A | Complete; similar signed-item market evidence only, never visual matching |
| Autographs | Collection/Lot | No | No | No | Intentional exception; universally blocked |
| Disney Pins | Individual Pin | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Disney Pins | Pin Set | Yes | Yes | Yes — 8/6/4/2 | Complete |
| Disney Pins | Collection/Lot | No | No | No | Intentional exception; universally blocked |

## Standard cap meaning

For the ordinary visual-comparison item types, the shared cap bands mean:

- **90–100:** send up to 8 candidates to visual review.
- **80–89:** send up to 6 candidates.
- **70–79:** send up to 4 candidates.
- **60–69:** send up to 2 candidates.
- **Below 60:** send none; retain candidates as ranked context-only evidence.

Sports Cards / Set and Sports Cards / Unopened Product use their approved, more conservative item-specific cap bands. Sports Cards / Single Card and Comics / Single Comic use their approved higher caps. Original Art and Signed Item use market-range research and therefore have no visual cap.

## Universal safeguards confirmed

- Collection/Lot is blocked before provider lookup, ranking, visual analysis, and trade analysis.
- Missing provider metadata remains unknown; it does not automatically exclude a candidate.
- Explicit identity contradictions remain context-only before visual review.
- Ranking and visual selection apply only to marketplace/eBay visual sources, not grading or reference sources.
- Candidates outside the visual cap remain visible as ranked context evidence rather than disappearing.
- Original Art and Signed Item are deliberately routed to market-range evidence rather than exact visual matching.

## Registry notes, not analyzer gaps

1. **Coins / Paper Money / Banknotes** has field definitions and a complete filter, score, and cap branch, but it is represented through the remaining-field registry rather than a dedicated file in the primary `itemTypeLayouts.ts` list.
2. **Music formats** and **Disney Pins / Individual Pin** are also maintained through the remaining-field registry for inventory fields, while their analyzer branches and layout mappings are present.
3. The primary layout file’s old comment says it covers 37 item types; the current combined category registry contains 44 item types. The grid above uses the combined field-definition and layout registries, not that stale comment.

## Conclusion

The marketplace/eBay analyzer has a specific filter, ranking score, and applicable cap for every comparable item type currently defined. The only types without a visual cap are the two intentional market-range workflows: Comics / Original Art and Autographs / Signed Item. Collection/Lot is the only category-wide exception and remains correctly non-comparable.
