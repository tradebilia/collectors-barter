# Test AI Source Research and Validation Record

## Scope

The user has deferred a unified valuation engine, persistent source snapshots, and storage-heavy provider monitoring. Current work is limited to read-only provider validation. No Tradebilia shipment, trade, member, or provider data is changed by these checks.

## Current providers

| Source | Test AI coverage | Validation and limitation |
|---|---|---|
| PSA via Parse.bot | Certificate identity, population, certification sales | Published check passed with certificate `69225215`. |
| BGS via Parse.bot | Certification, grade, subgrades, label color, population | Published check passed with documented certificate `0016097088`. |
| SGC via Parse.bot | Certification identity, grade, designation, population | Published check passed with certificate `5445321`; retain ordinary upstream-error handling. |
| PriceCharting via Parse.bot | Pokémon grade-price table | Research-only until an exact-match selection step exists. |
| 130point via Parse.bot | Completed sales across marketplaces | Recent, historical, and undated records are separated. Older records are trend context only and cannot become an unweighted current-value estimate. |
| PWCC / Fanatics Collect via Parse.bot | Sold graded-card listings | Read-only `status=Sold` research with individual sold date, grade, and certification context; no unqualified current average. |
| PCGS CoinFacts | Official coin certification/reference data | Read-only lookup validated with certificate `25651776`. |
| Wikidata | Movie and Autograph factual reference metadata | Read-only and never price, certification, authenticity, valuation, or stored data. |
| Smithsonian | National Postal Museum stamp reference metadata | Read-only relevance-filtered source; no price, certification, or authenticity claim. |

## Certification and carrier constraints

- NGC and CGC public verification must not be scraped. Use official link-outs until explicit commercial/API approval is granted.
- USPS OAuth is configured, but third-party package tracking remains blocked pending MID/service-provider authorization. Do not retry until authorization or approval for an official USPS.com fallback.
- UPS CIE tracking was validated; a real production number is needed for a fresh shipment-data check.
- FedEx live tracking was user-confirmed; DHL is configured and needs a real shipment number for a current read.

## Source-quality rules

Every completed sale must remain individually dated. The AI analyzer may receive selected 130point records only as capped qualitative trend context; its instructions forbid using them in current-value, fairness, or negotiation calculations. Exact variant, grade, certification, and marketplace match remain collector-review requirements.
