# Test AI Evidence-Normalization Rules

**Audience:** Tradebilia administrators validating Test AI provider results.
**Operation:** Deterministic transformation only. No LLM inference is used to construct the summary.

## Evidence Summary Contract

The summary contains four separate sections. It preserves each provider’s original panel and source attribution. A summary cannot convert a provider result into a certification, valuation, authenticity determination, or ownership claim.

| Section | Purpose | Prohibited conclusion |
|---|---|---|
| Listing identity | Show category-relevant fields supplied by the listing. | The listing fields are not independently verified merely because they are present. |
| Specialist reference | Show matching reference or certification evidence and its source. | A factual catalog match is not a market-value conclusion. |
| Market evidence | Identify current asking prices, completed sales, and dated historical context separately. | Mixed or historical records cannot become a single current-value average. |
| Review flags | Surface only material field differences or missing comparable evidence. | A flag is not proof that an item is wrong, counterfeit, or misrepresented. |

## Canonical Category Fields

| Category | Canonical identity field order | Material comparison fields |
|---|---|---|
| Sports Cards | Player, year, manufacturer, card number, grader, grade | Player, year, manufacturer, card number, grader, grade. |
| Pokémon | Card name, set, card number, variant, year, grader, grade | Card name, set, card number, variant, grader, grade. |
| Coins | Country, denomination, year, mint mark, variety, grader, grade | Denomination, year, mint mark, variety, grader, grade. |
| Comics | Series, issue number, variant, publisher, grader, grade | Series, issue number, variant, grader, grade. |
| Video Games | Title, platform, edition, listing release year, grader, grade | Title, platform, edition. A global reference release year is reviewed separately. |
| Stamps | Country, catalog number, denomination, issue year, grader, grade | Catalog number, denomination, issue year, grade. |
| Movies | Title, format, release year, edition, grader, grade | Title, format, edition, grade. |
| Autographs | Signer, signed item type, authentication company, certificate | Signer, item type, authentication company, certificate. |
| Disney Pins | Character, pin name, series, event, edition size, pin number | Character, pin name, series, edition size, pin number. |
| Vintage Toys | Brand, line or franchise, toy name, year, version, grade | Brand, toy name, year, version, grade. |

## Conflict Semantics

The normalizer uses exact normalized field comparison only where a field is present on both the listing and a specialist source. It does not infer a match from price similarity, generic title overlap, or a missing field.

| Condition | Summary treatment |
|---|---|
| Material field matches | Display the field as aligned, with source attribution. |
| Material field differs | Display a review flag with listing and source value. |
| Video Game listing year differs from RAWG global first-release year | Display a contextual date discrepancy, not an identity rejection. |
| Listing platform is absent from a selected Video Game source | Display a material platform review flag. |
| Source returned no record or an error | Display source availability, not a negative identity conclusion. |
| Market source returned only historical or undated sales | Label as historical context or research only; never include it in current-evidence counts. |

## Fixture Cases Required Before Acceptance

| Fixture | Expected outcome |
|---|---|
| Pokémon card with matching set and card number | Specialist identity evidence aligns; market-guide information remains separate. |
| Pokémon card with mismatched card number | Material identity review flag. |
| Video Game with NES platform and RAWG global 1988 versus listing 1990 | Platform aligns; global-versus-listing date discrepancy is visible but not an identity failure. |
| Video Game with platform absent from selected source | Material platform review flag. |
| Dated 130point records spanning recent, historical, and undated buckets | Counts remain separated by recency; no current-value average is output. |
| Coin PCGS certification | Coin identity and grade are attributable to PCGS; guide value is labeled reference data. |
| Category without specialist source | Listing identity and selected market-source coverage render without fabricated specialist confirmation. |
