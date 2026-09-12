# Test AI Trade-Analysis Enhancement Roadmap

## Executive recommendation

The next gains should **not** come primarily from adding more price websites. The current Test AI already has active eBay listings, eBay completed sales, certification sources, 130point/PWCC research paths, and Discogs metadata for Music. The biggest risk is false confidence: a tool can produce a polished answer from weak matches, mismatched grades, stale sales, asking prices, or duplicate records.

The highest-value roadmap is therefore: first improve **item identity and evidence quality**; second improve **trade economics and transparent uncertainty**; third add high-quality licensed data sources only where they close a clear category gap. Test AI should help members make an informed comparison, not declare a trade universally “fair” or predict an investment outcome.

## Current capability baseline

| Evidence area | Current Test AI coverage | Key limitation to address next |
|---|---|---|
| Current asking-price evidence | eBay active listings across categories | Asking prices can be far from completed-sale results and must remain separate. |
| Completed-sale evidence | Sold-Comps eBay flow; 130point/PWCC research paths for relevant cards | Match quality, duplicate control, recency, and sale-context consistency are more valuable than adding a second unlicensed source. |
| Certification/reference data | PSA, BGS, SGC, PCGS; other category reference sources | Exact certificate, grade, and variation confirmation needs a unified confidence model. |
| Music identity | Discogs release candidates using album/release title, artist, and release year | Needs a member-selected release-detail step before exact pressing differences are treated as comparable. |
| AI narrative | Strengths, risks, liquidity, potential, and grade-cliff discussion | The reasoning needs a stronger auditable evidence ledger and uncertainty presentation. |

## Priority 0 — build before adding another marketplace source

### 1. Evidence ledger and match-confidence score

For every result returned by every source, Test AI should show why it is included:

| Field | Purpose |
|---|---|
| Source, source URL, source ID, and retrieval timestamp | Makes every claim auditable and supports cross-source deduplication. |
| Evidence type | Explicitly labels `completed sale`, `active asking price`, `guide/provider estimate`, `reference metadata`, or `certification`. |
| Identity match | Shows matching and conflicting fields: year, brand/set, player/artist, card number, variation, format, grader, grade, certificate, and condition. |
| Match confidence | Uses **Exact**, **Strong**, **Possible**, or **Exclude**; only Exact/Strong completed sales may influence a summary range. |
| Reason for exclusion | Prevents silent filtering and lets a member correct bad listing details. |

This is the most important addition. Without it, more data sources simply create more opportunities to compare the wrong item.

### 2. Recency, outlier, and duplicate-sale controls

Test AI should calculate the following from eligible completed sales only:

| Control | Decision it supports |
|---|---|
| 30-, 90-, and 365-day sale counts | Liquidity and how current the evidence is. |
| Median, interquartile range, low/high, and dated trend | A value range rather than one misleading point estimate. |
| Outlier review | Flags a sale that is materially outside the central distribution instead of automatically averaging it in. |
| Same-sale deduplication | Prevents eBay sales returned by multiple providers from being counted twice. |
| Grade/condition segmentation | Keeps PSA 10, raw, altered, restored, sealed, and incomplete items from contaminating one another’s results. |

The headline should read something like: **“Recent exact-match completed-sale range: $X–$Y, based on N records, most recent sale date Z.”** It should not read “True Value: $X.”

### 3. Trade-balance and cash-adjustment panel

The Trade Analyzer should compare evidence ranges rather than forcing a single number.

| Output | Meaning |
|---|---|
| Each side’s evidence range | Derived only from eligible completed-sale records. |
| Overlap / imbalance band | Shows whether the ranges overlap and the size of a plausible gap. |
| Suggested cash range | A transparent optional balancing range, tied to the evidence range—not an instruction or guarantee. |
| Evidence-strength indicator | Explains whether the range is strong, moderate, weak, or unavailable. |
| Assumptions | Identifies selected grade, condition, edition/variation, and any manual user confirmation. |

This is more useful to a collector than an AI’s generic “Item A is better” conclusion.

### 4. Condition, completeness, and authenticity checklist

The form and analyzer should recognize when an item’s physical state changes comparability. A compact category-specific checklist would flag missing information rather than invent it.

| Category | High-value comparison details |
|---|---|
| Sports cards / Pokémon | Grader, grade, certificate, card number, parallel/refractor/variation, autograph status, altered/trimmed concerns. |
| Comics | Grade, grader/certificate, key issue/printing, restoration, signatures, page quality, raw versus slabbed. |
| Coins | Grader/certificate, denomination, mint mark, variety, strike designation, details/cleaned status. |
| Video games | Platform, region, sealed/CIB/loose, grader/grade, factory seal or reseal concerns, variant/edition. |
| Vintage toys / LEGO | Completeness, packaging, instructions, accessories, reproduction parts, sealed versus opened. |
| Music | Artist, album/release title, release year, label/catalog number, country, format, edition/pressing, barcode/matrix when available. |

Use a **“More detail needed before price comparison”** state when a critical field is absent. That is safer and more useful than guessing.

## Priority 1 — category-specific identity and verification

### 5. Member-confirmed candidate selection

When an external source returns multiple plausible candidates, members should select the exact card, coin, release, game, or comic before Test AI uses it for an analysis. Discogs should use this process for an exact music pressing; the same pattern applies to cards with similar parallels and coins with close varieties.

The selection should save a provider ID and a concise identity snapshot with the listing. It must remain editable, because a member can choose a bad match. This turns external data from a vague search result into a reviewable item identity.

### 6. Expand official certification verification where permissions exist

Certification evidence is often more valuable than another price guide because it tells Test AI whether it is comparing the same kind of item. Tradebilia already has relevant certification paths, and the next improvement is to normalize them around a common evidence object: issuer, certificate number, grade, identity description, verification timestamp, population figures where authorized, and source URL.

PCGS publicly provides certificate verification and population context for coins, while NGC provides an official certification-verification route for coins.[1] [2] A public lookup page is **not** permission to automate it; any server-side connector must use a documented API or written authorization. The practical recommendation is to add new grading providers only when Tradebilia can obtain an approved technical access method.

### 7. Image-assisted field extraction with member confirmation

Allow a member to upload a label, back cover, barcode, or certification image. The system can propose structured fields—certificate number, grade, catalog number, barcode, set/card number, release title, and edition—but the member must confirm before any lookup occurs.

This should be used to reduce typing and improve match precision, **not** to authenticate an item or make a definitive counterfeit claim. The UI should state that images may be insufficient for authentication and that photo-based suggestions require review.

## Priority 2 — market context, not more opaque “value”

### 8. Liquidity and market-depth panel

Price is not the whole trade. A card with five recent exact sales is easier to exit than one with a single sale years ago. Add:

| Metric | Interpretation |
|---|---|
| Recent exact-match sale count | Market depth. |
| Days since most recent exact sale | Evidence freshness. |
| Platform count | Cross-market breadth, with duplicate controls. |
| Recent-sale price dispersion | Price uncertainty. |
| Active exact-match supply | Asking-price supply context only. |

Do not translate this automatically into “good investment” or “bad investment.” Show the facts and explain their limitations.

### 9. Fees, shipping, and transaction-friction context

For a cash-balanced trade, the Analyzer can surface practical friction without assigning false precision:

| Context | Member benefit |
|---|---|
| Carrier, insurance, signature, and declared-value prompt | Encourages safe fulfillment for higher-value items. |
| Buyer’s premium / all-in-price disclosure where a provider supplies it | Keeps auction results comparable with marketplace results. |
| Currency conversion timestamp and conversion source | Avoids mixing USD and non-USD results without disclosure. |
| Shipping-cost and package-risk reminders | Helps members decide whether a small imbalance is worth resolving in cash. |

### 10. Counterparty risk must remain separate from item value

Show member-related trust signals only in a distinct **Trade Safety** panel, never inside an item-price calculation. Useful privacy-safe factors include verified merchant status, visible review count and distribution, completed-trade count, account age, and unresolved safety restrictions that the platform is permitted to display. Do not turn private activity, location, or unverifiable “reputation” into a hidden risk score.

### 11. Save and share an evidence snapshot

Members should be able to save an analysis snapshot tied to the trade proposal: selected candidate IDs, timestamp, source records, match assumptions, evidence range, exclusions, and notes. Re-running later should create a new snapshot rather than rewrite the earlier evidence. This is valuable for negotiation clarity and dispute context, but it must not replace the agreed trade terms or the Trade Room’s formal records.

### 12. Member feedback loop for bad matches

Add **“Wrong match,” “Wrong grade,” “Wrong variation,” “Duplicate sale,”** and **“Price not comparable”** controls. These should not silently retrain anything. They should create a review signal that improves matching rules and exposes patterns in weak source data.

## Authorized data-source priority

| Candidate | Role if authorized | Priority | Why |
|---|---|---:|---|
| Licensed Card Ladder feed | Cross-market completed-sale evidence for cards/TCG/non-sports | High | Broadest incremental comp coverage, with certificate-aware potential. |
| Existing eBay / Sold-Comps improvements | Better matching, recency, duplication, and evidence ranges | Highest | Improves current evidence immediately without adding a risky provider. |
| Official grader APIs/partnerships | Identity, grade, cert, population, and validation evidence | High | Prevents mismatched comparables. |
| Licensed COMC feed | Shipped-sale evidence and active inventory context | Medium | Useful supplement but should remain separate from eBay and not be the first data partnership. |
| Auction-house feeds | Category-specific completed-sale evidence | Medium | High potential for rare items, but only with documented commercial rights and price semantics. |
| Parse.bot or other independent wrappers | None without direct provider approval | Do not use | Technical availability does not establish rights to commercial retrieve, display, cache, or analyze data. |

## Recommended sequence

| Stage | Deliverable | Why it comes first |
|---|---|---|
| **1** | Evidence ledger, match confidence, exclusion explanations, duplicate control | Makes all existing evidence safer and easier to audit. |
| **2** | Recency/outlier engine, completed-sale range, cash-adjustment band, liquidity panel | Converts evidence into a more honest potential-trade analysis. |
| **3** | Category-specific condition/completeness checks and user-selected identity candidates | Avoids comparing materially different items. |
| **4** | Image-assisted field suggestions with user confirmation and analysis snapshots | Reduces entry friction while preserving reviewability. |
| **5** | Licensed Card Ladder or another provider-approved completed-sale feed | Adds breadth only after the analyzer can safely interpret and deduplicate it. |
| **6** | Licensed COMC or category-specific auction sources | Adds targeted context where the data contract proves useful. |

## Guardrails

> Test AI should state **what evidence supports the comparison, how strong the match is, and what remains unknown**. It should not authenticate an item, guarantee a value, guarantee fairness, or make a trade decision for the member.

The system should never use asking prices as completed sales, blend provider estimates into sale averages, hide conflicting identity details, use member account credentials for research, scrape websites, or imply that a thin sample is a reliable market price.

## References

[1] [PCGS Cert Verification](https://www.pcgs.com/cert)

[2] [NGC Verify Certification](https://www.ngccoin.com/verify/)
