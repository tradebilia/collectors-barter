# Test AI Evidence-Normalization Evaluation Plan

**Scope:** Administrator-only Test AI page
**Restore baseline:** Checkpoint `a4d4ec24`
**Out of scope:** Trade Room behavior, database schema changes, provider credential changes, automatic source selection, automatic valuation, or changes to any source’s original factual response.

## Objective

The feature will add a deterministic evidence summary that lets an administrator see whether available provider results identify the same collectible, which evidence is market-oriented versus factual reference metadata, and which material discrepancies require review. It is not an AI valuation engine and it must not replace original source panels or alter their factual fields.

## Quality Criteria

| Criterion | Required result | Failure outcome |
|---|---|---|
| Fact preservation | The summary retains source attribution and does not overwrite original title, year, platform, grade, set, certification, or price data. | Reject implementation. |
| Category relevance | A field is evaluated only where it has category meaning, such as card number for cards or platform for Video Games. | Reject implementation. |
| Conflict detection | Known disagreements, including RAWG’s global first-release year versus a listing’s regional year, are shown as review items rather than resolved silently. | Reject implementation. |
| Market separation | Market evidence remains explicitly separate from factual metadata, certification, and historical context. | Reject implementation. |
| Provider continuity | Existing Test AI source selection and individual provider panels continue working unchanged. | Reject implementation. |
| Clarity | The panel explains the outcome in concise administrator language without fabricating confidence, valuation, authenticity, or ownership conclusions. | Revise or reject implementation. |
| Validation | Focused tests, full regression, TypeScript, production build, and representative live Test AI checks pass. | Do not release. |

## Representative Review Matrix

The post-implementation evaluation must test at least one suitable source combination from each available evidence class.

| Evidence class | Representative categories | Expected normalization focus |
|---|---|---|
| Graded cards | Sports Cards, Pokémon | Player/Pokémon, year/set, card number, grade, grader, certification. |
| Coins | Coins | Country, denomination, year, mint mark, certification, grade. |
| Video Games | Video Games | Canonical title, platform, edition, listing year versus global release year. |
| Printed collectibles | Comics, Stamps | Series/catalog number, issue or denomination, publisher/country, grade where available. |
| General market evidence | Movies, Autographs, Disney Pins, Vintage Toys | Category-specific title/brand/edition identity separated from dated marketplace evidence. |

## Decision Rule

The implementation is accepted only when the review demonstrates that it catches meaningful identity conflicts or improves evidence clarity without reducing or mischaracterizing current source results. If the results are ambiguous, less clear, or less accurate than the baseline, the project will be restored using `webdev_rollback_checkpoint` to checkpoint `a4d4ec24`, and the rejected approach will be documented without release.
