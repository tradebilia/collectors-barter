

## Global source-coverage reset removed — November 4, 2026

Removed the global `SOURCE_COVERAGE_RESET_TO_PENDING` behavior and its temporary Movie exception set. The three confirmed Movie marketplace paths are now recorded directly in the normal `SOURCE_TEST_RESULTS` map: `movies:ebay_active`, `movies:sold_comps`, and `movies:mercari_sold_comps`. The tracker now uses that map directly: confirmed matches appear under Current matching sources, and all other applicable sources remain Pending. This corrects the prior display bug where the exception set existed but the three Movie keys were absent from the actual result map.

Validation passed: source applicability UI tests **38/38**, TypeScript, production build, and final diff/forbidden-path audit. No database, migration, seed, destructive, credential, provider, deployment, publishing, or domain changes were made. The required user-named documentation files (`PROJECT_CONTEXT.md`, `AI_RULES.md`, `ROADMAP.md`, `NEXT_SESSION_PROMPT.md`, `DATABASE_SCHEMA.md`, `API_ARCHITECTURE.md`, `KNOWN_ISSUES.md`) are not present in this repository; existing project handoff documentation was reviewed instead.
