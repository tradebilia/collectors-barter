# Test AI Source-Category Applicability Policy

## Purpose

This document records the internal policy used by future Trade Room automation to decide which data sources are appropriate for a trade item. It is deliberately **not** an automatic selector in the current Test AI sandbox. Administrators retain manual source selection there for validation and comparison.

> A source may be eligible for a category while still requiring an exact-item, grade, variant, and date review. Eligibility is never an automatic valuation or authenticity conclusion.

## Current policy summary

| Source family | Eligible categories | Required context | Use boundary |
|---|---|---|---|
| eBay Active, Sold-Comps, eBay Sold, 130point, Heritage | All ten categories | Title and exact-match review | Market records only; dated historical sales cannot be treated as automatic current value. |
| PSA, BGS, SGC | Sports Cards and Pokémon | Matching certificate | Use only for a supported graded-card certificate. |
| PCGS and NGC | Coins | Matching certificate | Use only for a supported certified coin; NGC awaits approved access. |
| CGC | Comics, Sports Cards, Pokémon, Video Games, Movies | Matching certificate | Requires approved CGC data access. |
| CBCS and Comic Book Realm | Comics | Certificate or exact issue/variant review | Comic-specific source family. |
| PWCC / Fanatics Collect | Sports Cards and Pokémon | Title and exact-match review | Premium completed-sale context; never an automatic current value. |
| GoCollect | Comics | Exact issue/variant review | Comic market analytics when activated. |
| PriceCharting | Pokémon | Title and exact-match review | Current implementation is Pokémon-only. |
| Wikidata | Movies and Autographs | Title or signer | Factual reference metadata only. |
| Smithsonian Open Access | Stamps | Title and exact-match review | National Postal Museum reference metadata only. |

## Future Trade Room use

When Trade Room integration is approved, the item category, certification company, certification number, and canonical title can be passed to `getSourceApplicability`. The Trade Room should use the result to offer recommended eligible sources and explain any source restriction. It must not silently enable a source, infer authenticity, calculate a value, or turn historical results into current comparables.

## Implementation location

The policy is implemented in `shared/testAiSourceApplicability.ts`. The test suite verifies all ten Tradebilia categories, all-category eBay-derived source eligibility, grading-certificate restrictions, category-specific reference sources, and historical-sale context requirements.
