# Collect Auctions Parse.bot Adapter — 2026-10-02

## Scope

Collect Auctions is available in the isolated Test AI sandbox for **Sports Cards only**. It is not linked to Comics, Autographs, Coins, or other categories.

## Request contract

- Provider: Parse.bot Collect Auctions scraper
- Search endpoint: `search_sold`
- Detail endpoint: `get_lot`
- Search is bounded to page 1 and at most five detail requests.
- The server query is built from the selected item title plus available structured card fields such as player/athlete, set name, card number, year, grader, and grade.
- The API key is read server-side from `PARSE_BOT_API_KEY` and is never sent to the browser.

## Admission rules

A record is retained as an analyzer candidate only when all required gates pass:

1. The provider explicitly reports a sold or completed status.
2. A positive hammer/final/price value is present.
3. The lot has a sale/end/completion date.
4. The title and details meet the deterministic identity-token threshold.
5. The grading company and grade match when the selected item has a grade.
6. Canonical provenance and the existing visual/evidence gates pass.

Active, unsold, undated, identity-mismatched, or grade-mismatched records remain context-only and do not affect valuation.

Prices are labeled as **hammer/realized basis**. Buyer-premium treatment is not assumed; the source record is preserved for review.

## Analyzer integration

The source is registered in the Test AI applicability matrix, canonical observation registry, market-evidence policy, analyzer source allowlist, evidence review, and deterministic comparable-sale assembly. It is displayed and highlighted only for Sports Cards.

## Validation

- TypeScript: passed.
- Focused regression suite: passed, including request construction, Sports Cards-only applicability, explicit sold-only admission, and analyzer source sealing.
- Production/live smoke: the endpoint was reached successfully but returned HTTP 402 because the configured Parse.bot account has exhausted its monthly credits. No bypass or billing action was attempted.
