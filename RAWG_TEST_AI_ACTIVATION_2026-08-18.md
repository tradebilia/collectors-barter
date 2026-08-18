# RAWG Test AI Activation

**Activated:** 2026-08-18

## Approved Scope

The user confirmed that RAWG’s current commercial-use terms are acceptable for Tradebilia’s use. RAWG is enabled only as an administrator-selected, server-side, read-only Video Game catalog source in the Test AI page. It returns factual identification metadata and is not a valuation, condition, grading, certification, authenticity, ownership, or market-pricing source.

## Security and Controls

The API key is stored only in the secure `RAWG_API_KEY` project setting. It is not present in client code, browser requests, logs, source control, or documentation. The Test AI router requires an authenticated administrator before it calls the RAWG adapter. Manual source selection remains required; the internal category-source applicability map remains future Trade Room policy and does not auto-enable RAWG in the Test AI page.

## Matching Behavior

The lookup accepts a title and optional release year and platform. It removes common condition/grading terms from a listing title, performs a bounded RAWG search, and rejects a same-title candidate when the requested platform is absent. RAWG’s release year is treated as a factual global first-release field: if it differs from a supplied listing year, the result is shown with a visible discrepancy notice rather than silently substituting one value for the other.

## Live Validation

The server-only credential test completed successfully. The administrator Test AI page manually selected the existing `Super Mario Bros 3 Graded` item and manually enabled RAWG. RAWG returned `Super Mario Bros. 3`, its 1988 first-release year, NES among listed platforms, genres, ESRB rating, and an explicit notice that the RAWG global release year differs from the item’s supplied 1990 regional release year. No key value was exposed.
