

## Mandatory fallback-search and exclusion visibility — November 8, 2026
Updated the additional Sold-Comps source panels, including Mercari, so the Test AI sandbox always displays the complete executed search ladder. The UI now distinguishes primary versus fallback queries, reports the provider record count and status for every executed tier, and explicitly states when no fallback was needed or no provider execution was recorded. Mercari provider retrieval metrics are preserved separately as `searchMetrics` so valuation-summary metrics cannot hide the search history.

The exclusion panel is now always present and labeled `Excluded or held-out candidates`, showing every retained exclusion and its reason, or an explicit zero-exclusion message. Existing context-only and valuation safeguards are unchanged; excluded candidates remain barred from valuation unless the existing evidence gates promote them.

Validation passed: focused UI/router regressions **74/74**, TypeScript, production build, `git diff --check`, and protected-scope audit. No database writes, migrations, seeds, destructive scripts, credential output or changes, provider configuration changes, valuation-gate changes, deployment, publishing, or production-domain changes. All P0 safeguards remain in force.
