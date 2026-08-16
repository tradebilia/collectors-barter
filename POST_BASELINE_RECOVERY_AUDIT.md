# Post-Baseline Recovery Audit

## Baseline

The recovery baseline is canonical GitHub commit `fb773af`, the last verified synchronized commit before later checkpoint/workspace divergence.

## Recovery manifest

| Post-baseline work | Recovered state | Verification |
|---|---|---|
| PCGS CoinFacts | Preserved and included in canonical backup | Adapter and regression tests passed. |
| Wikidata Movie/Autograph reference source | Rebuilt, including parser-safe types and expanded collector-facing facts | Adapter, UI, and TypeScript validation passed. |
| Smithsonian Stamp Reference | Rebuilt with National Postal Museum relevance filter and expanded facts | Adapter, UI, credential, and TypeScript validation passed. |
| 130point recency protection | Rebuilt with recent, historical, and undated sections | Adapter/UI regression passed; no current average is calculated. |
| 130point AI trend context | Rebuilt as capped qualitative context only | Deterministic trend-context regression passed. |
| PWCC / Fanatics Collect | Rebuilt as a read-only Parse.bot sold-listing source | Adapter/UI coverage passed; Sold status and recency treatment are enforced. |
| Internal source-category policy | Rebuilt for future Trade Room automation | Policy and manual Test AI selector boundary tests passed. |
| Category/source research records | Restored in this repository | Documentation records no-cost source limits and provider constraints. |

## Backup verification

The recovered source was rebased on the current canonical branch, passed TypeScript and the full 212-test regression suite, and was pushed to canonical GitHub `main` as commit `0589688` (`Restore Test AI provider integrations`). The project checkpoint `2a39b174` published the recovered source; the standard public homepage and Test AI route returned HTTP 200 after propagation.
