# RAWG Field Coverage Assessment

**Scope:** Recommendation only. No RAWG request shape, adapter, Test AI display, or commercial-use setting was changed.

## Current Display

The current adapter deliberately calls RAWG’s bounded game-search endpoint and displays every factual field it currently returns: release year, platforms, developers, publishers, genres, and ESRB rating. The linked RAWG title and exact-match note are also displayed. The Test AI page does not hide any current adapter fact.

## Additional Documented RAWG Metadata

RAWG’s game-detail endpoint documents additional metadata including an original title, description, exact release date, per-platform release data, parent-game and addition relationships, tags, creators, official website, screenshots, trailers, store links, system requirements, aggregate RAWG ratings, Metacritic data, average playtime, and activity counts.[1] RAWG’s own documentation distinguishes basic metadata from paid-plan features such as store links, similar games, and gameplay-video data.[2]

| Field or field group | Recommendation | Reason |
|---|---|---|
| Exact release date and platform-specific release dates | **Add** | Strongly improves regional-release reconciliation and helps distinguish a global first release from a specific platform or region record. |
| Original title / alternate title | **Add when different** | Helps identify regional title variants without replacing the listing title. |
| Parent game, DLC, or edition relationship | **Add** | Helps prevent a base game, remaster, GOTY edition, DLC, or companion app from being treated as the same collectible. |
| Individual creators with roles | **Optional** | Useful for deeper identification, but lower priority than edition and release data. |
| Official website | **Optional link** | Helpful corroboration when available, but it should not be treated as proof of a specific collectible edition. |
| Description and tags | **Do not add by default** | Broad, provider-authored text adds noise and would require additional untrusted-text handling before it reaches analysis. |
| RAWG user rating, rating counts, popularity, playtime, Metacritic | **Do not add** | These are audience or critic metrics, not collectible identification, grading, condition, or market-value evidence. |
| Screenshots, trailers, cover/background images, videos | **Do not add now** | They would add third-party media and licensing, storage, and attribution complexity without solving a core trade-identification problem. |
| Store links and similar games | **Do not add now** | RAWG documents these as paid-plan functionality and they are not needed for factual collectible identification. |

## Recommended Next Change

The highest-value small enhancement is a **second, bounded RAWG game-detail lookup only after the current strict title and platform match succeeds**. It should add an exact release date, platform-specific release dates when available, alternate/original title when different, and parent/edition relationship. The display should remain factual and source-attributed; it should neither compute value nor treat ratings, reviews, or popularity as evidence of collectible worth.

## References

[1] [RAWG API — game-detail endpoint and response schema](https://api.rawg.io/docs/)

[2] [RAWG API documentation — plans, allowed feature sets, and terms](https://rawg.io/apidocs)
