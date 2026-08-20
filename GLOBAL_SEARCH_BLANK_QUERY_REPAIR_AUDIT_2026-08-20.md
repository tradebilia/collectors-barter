# Global Search Blank-Query Repair

## Defect

The unified Search Results page correctly constructed an empty keyword request when no text was supplied, and the server correctly treats an empty keyword as no keyword predicate. However, the client first suppressed the request and then continued to render a search-prompt panel whenever `submittedQuery` was blank. As a result, a blank global search showed zero items rather than the active marketplace.

## Repair

The global search request is now made for both blank and keyword queries. The result-state renderer is driven by query loading, error, and listing states rather than whether text was supplied. A blank search now presents **Browsing all active listings** and **All active listings across the exchange**; a keyword continues to show its exact query context.

## Validation

Focused global-search tests passed (**2 files / 5 tests**) and TypeScript passed. Development browser verification at `/search` displayed **Showing 1–16 of 16 listings** across Sports Cards, Pokémon, Coins, Comics, Disney Pins, Vintage Toys, Autographs, Movies, Video Games, and Stamps. The keyword control check at `/search?q=Star%20Wars` continued to return exactly two matching listings—one Comics and one Movies result. Full regression, production build, public-domain verification, and canonical-GitHub synchronization remain pending.
