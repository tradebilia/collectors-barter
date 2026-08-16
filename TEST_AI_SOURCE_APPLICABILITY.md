# Test AI Source Applicability Policy

This internal policy layer is reserved for future Trade Room automation. It does not filter or change the current manual Test AI source selector.

| Source | Valid categories | Required context | Role and limitation |
|---|---|---|---|
| eBay Active Listings / Sold-Comps | All categories | Title | General current-listing or completed-sale research. |
| Parse PSA / BGS / SGC | Sports Cards, Pokémon | Matching certification company and certificate number | Certification and population data only for the respective grader. |
| PCGS CoinFacts | Coins | PCGS certificate number | Official coin certification/reference information. |
| PriceCharting | Pokémon | Title | Price-guide reference; verify exact card/variant. |
| 130point | Sports Cards, Pokémon | Title | Dated completed-sale trend context. Older records never become a current-value average. |
| PWCC / Fanatics Collect | Sports Cards, Pokémon | Title | Sold graded-card research; retain sold date and grade context. |
| Wikidata | Movies, Autographs | Movie title or signer | Factual reference only; not price or authentication evidence. |
| Smithsonian | Stamps | Title/catalog reference | National Postal Museum reference only; not price or authentication evidence. |

When Trade Room receives a listing category, title, grading company, and certificate number, call `getEligibleTestAiSources`. Display only its returned source set by default and retain a transparent rationale for unavailable sources. The policy is deliberately separate from Test AI, where manual selection remains available for controlled administrator testing.

## Provider contract note

PWCC / Fanatics Collect uses Parse.bot scraper ID `6f75fc48-78a3-4fa4-a96a-937d35bf9385` and the read-only `search_listings` endpoint with `status=Sold`, bounded `hits_per_page`, and a title query. It is a managed independent wrapper, not an official Fanatics Collect API. Preserve individual sold dates and do not derive an unqualified current-value average. Source: https://parse.bot/marketplace/fd876e79-7a46-42c6-a13c-35d4c5902c94/pwccmarketplace-com-api
