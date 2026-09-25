# Tradebilia Trade Analyzer: AI, Market Data, Questions, and Evaluation

## Executive summary

The Trade Room **AI Analyzer** evaluates a proposed trade from the perspective of the logged-in user. It combines the items and cash on both sides, listing metadata, owner-entered estimated values, category-specific collecting considerations, and eBay market evidence when available. The system then asks an LLM to produce a structured explanation, while the server retains control of the authoritative value gap and confidence level.

The analyzer is an **advisory tool**, not an appraisal, authentication service, investment recommendation, or guarantee of future value. Results can be limited by missing identifiers, sparse comparable sales, inaccurate listing data, condition differences, and market volatility.

## Where the analysis starts

When the user selects **Analyze Trade** in the Trade Room, the client sends the proposal identifier, the user's items, the other side's items, and cash amounts. For every item, the payload includes:

| Input | Use in analysis |
|---|---|
| Title | Primary identity and eBay search phrase |
| Category | Category-specific evaluation rules and search context |
| Condition | Helps distinguish comparable items |
| Grade | Used for graded-item comparisons and scarcity context |
| Estimated value | Owner-provided, explicitly unverified fallback value |
| Item details | Parsed for identifiers such as grading company and other metadata |
| Cash on each side | Added directly to each side's total |

The live Trade Room UI also shows a quick comparison based on the listing estimates and cash. That display is separate from the evidence-controlled eBay valuation used by the analyzer.

## Market-data workflow

For each item, the server builds a more precise eBay query from the item metadata. It then requests up to 25 eBay Browse API item summaries when an eBay token is available. The server classifies each result into one of three evidence groups:

1. **Completed sales.** A sold result is authoritative market evidence.
2. **Qualifying auctions.** An auction is authoritative only when it has at least one bid and is scheduled to end within one hour of the request.
3. **Active asking-price listings.** These are context only. They are not treated as realized market value.

The approved rule is intentional: an ordinary active listing can reflect an aspirational asking price rather than a price a buyer actually paid. If there are no completed sales and no qualifying near-closing auction, the analyzer does not manufacture a verified valuation from asking prices. It labels the eBay valuation unavailable, uses the owner estimate as an unverified fallback, and lowers confidence.

The server calculates contextual statistics after filtering extreme observations with an interquartile-range fence. These statistics include average, median, minimum, maximum, result count, and percentage spread. It separately calculates the **authoritative valuation median** from completed sales and qualifying auctions only.

The evidence basis is labeled as one of:

| Basis | Meaning |
|---|---|
| `completed_sales` | At least one completed sale was found; this is preferred |
| `near_closing_auction` | No completed sale was found, but a bid-supported auction ends within one hour |
| `asking_price_context` | Only active asking prices were found; not authoritative |

Per-item confidence is low by default, medium when there are at least four authoritative observations, and high when there are at least seven authoritative observations with a price spread below 80 percent. The overall confidence is lowered when any item lacks authoritative evidence.

### Test AI sandbox: The Card API

The **Test AI** sandbox has an additional, manually enabled source named **The Card API Sales** for **Sports Cards** and **Pokémon / TCG**. It is intentionally sandbox-only and does not change the production Trade Room analyzer.

The bounded, read-only adapter preserves the provider response for review, including available sale records, price, currency, date, final-status signals, marketplace/platform, listing URL, catalog identity data, pagination and coverage metadata, quota metadata, and plan-gated-response notices. It separately shows whether provider catalog access is unavailable under the current plan rather than treating that limitation as a failed market lookup.

The Card API can contribute a completed-sale observation **only** when all of the following are true:

1. The response identifies an individually dated, confirmed final sale with a usable normalized price and currency.
2. The record passes the sandbox's category-aware identity and grading checks.
3. It passes recency, duplicate-sale, and visual-mismatch safeguards already applied to completed-sale evidence.

Catalog data, active/unknown-status records, fast-settle or other provider caveats, incomplete identity matches, duplicate observations, and plan-gated fields remain explicitly labeled context. They cannot manufacture a deterministic value, confidence increase, or trade verdict.

## Values used in the decision

The analyzer keeps two value views separate:

- **Owner estimated value:** the values entered with the listings, used as an explicitly unverified comparison and fallback.
- **Verified eBay value:** the authoritative median from completed sales or qualifying near-closing auctions, plus cash.

The server computes each side's total and the verified eBay gap:

> Verified eBay gap = value received by the user − value given by the user

If every item has authoritative evidence, this gap is passed to the LLM as the controlling numerical comparison. If even one item lacks that evidence, the verified gap is marked unavailable rather than presenting a partially verified total as definitive.

The server also computes an overall confidence level from 1 to 10. A complete set of high-confidence item evidence produces the strongest score; mixed high/medium evidence produces a middle-high score; incomplete authoritative evidence produces a low score.

## Questions and instructions given to the AI

The current live prompt asks the model to answer these substantive questions:

1. **How fair is the trade from the user's perspective?**
2. **Who receives more verified market value?**
3. **What is the verdict?** The supported verdicts are Strongly in Your Favor, In Your Favor, Roughly Fair, In Their Favor, and Strongly in Their Favor.
4. **What evidence supports the verdict?** The response must cite specific dollar amounts and distinguish verified data from interpretation.
5. **What category-specific factors matter?** The model is instructed to consider the relevant collecting characteristics for each category.
6. **What risks should the user consider?** Examples include condition uncertainty, liquidity, sparse evidence, inconsistent prices, and reliance on unverified estimates.
7. **What opportunities exist?** Examples include receiving stronger verified value, rarity, demand, scarcity, or negotiation leverage.
8. **What should the user do next?** The model returns practical negotiation advice and a concise recommendation.

The prompt also imposes important guardrails. The model must not invent or override verified numbers, must not treat ordinary asking prices as realized value, must label information as verified data, AI interpretation, or future projection, must not include URLs or citations in the user-facing response, and must state specific dollar amounts rather than vague phrases such as “high value.”

## Category-specific evaluation criteria

The prompt tells the AI to evaluate items using category-appropriate reasoning:

| Category | Factors requested from the AI |
|---|---|
| Sports cards | Player legacy, rookie status, grade scarcity, population context, sport popularity, Hall of Fame status, and liquidity |
| Comics | Key issue status, first appearances, origin stories, creator significance, census context, publisher, story importance, and movie/TV potential |
| Pokémon / TCG | Set rarity, card mechanics, character popularity, grade population, competitive demand, and collector demand |
| Coins | Mint, year, denomination, grade, surviving population, and historical significance. For PCGS coins, the grade is preserved as an alphanumeric Sheldon label such as `MS65` or `MS65+`, rather than reduced to the numeric portion. |
| Vintage toys | Brand, character, era, sealed/opened status, graded population, and nostalgia factor |
| Video games | Platform, title rarity, grading system, sealed/CIB status, and genre demand |
| Autographs | Signer significance, authentication company, signed item, and provenance |
| Music and other categories | The general rules apply: condition premium, cultural or historical relevance, collector demand, liquidity, and the quality of comparable evidence |

These criteria guide interpretation; they do not authorize the model to invent a market price or override the precomputed verified gap.

## Output requested from the AI

The live procedure requests raw JSON with this structure:

```json
{
  "fairnessScore": 1,
  "verdict": "In Your Favor",
  "confidenceScore": 7,
  "summary": "...",
  "valueAnalysis": "...",
  "marketInsights": ["..."],
  "risks": ["..."],
  "opportunities": ["..."],
  "recommendation": "..."
}
```

The score is an integer from 1 to 10 and is defined from the user's perspective: 10 strongly favors the user, 5 is roughly fair, and 1 strongly favors the other side. The model is instructed to use only the precomputed eBay gap for this score and not recalculate it independently.

The server parses the JSON, removes accidental markdown fences if necessary, validates the main fields, and applies the deterministic fairness interpretation based on the verified gap. This prevents a prose model response from silently changing the authoritative value comparison.

## How the trade is evaluated

The evaluation follows this sequence:

1. Identify every item and cash amount on both sides.
2. Build precise item queries using title, category, and available identifiers.
3. Retrieve and classify eBay evidence.
4. Remove statistical outliers from contextual statistics.
5. Calculate authoritative medians from completed sales or qualifying auctions only.
6. Add cash and compare the user's received value with the user's given value.
7. Determine evidence completeness and confidence.
8. Ask the LLM to interpret fairness, category factors, risks, opportunities, and negotiation advice while obeying the evidence rules.
9. Parse and normalize the structured response.
10. Display the verdict, fairness score, confidence, summary, value analysis, market insights, risks, opportunities, and recommendation in the Trade Room.

The model is therefore used primarily for **structured interpretation and explanation**. It is not allowed to replace the server's evidence hierarchy with an unsupported estimate.

## What happens when evidence is weak or unavailable

If the eBay token is absent, a request fails, no results are returned, or an item has no completed-sale or qualifying-auction evidence, the analyzer continues with a lower-confidence result where possible. The owner estimate is clearly marked unverified. The user should treat such an analysis as a preliminary comparison and seek additional comparable sales, better item identifiers, or expert review before making a high-value decision.

There is also a separate legacy helper in `server/_core/tradeRoomAI.ts`. It defines a broader 0–100 analysis contract with requested/offered items, optional market packages, market insights, risks, and opportunities. The live Trade Room route currently uses the newer evidence-tiered procedure in `server/tradeFlowRouter.ts`; the legacy helper should not be confused with the live score and verdict format.

## Model and privacy considerations

The live route calls the project's `invokeLLM` wrapper with the configured Manus Forge endpoint and the `gpt-4o` model name, using a single user message, temperature 0.7, and a 1,000-token limit. The wrapper resolves the configured server-side API endpoint and key; credentials are not placed in the prompt or exposed to the browser.

The prompt contains listing and trade metadata needed for analysis. It should not contain passwords, payment credentials, private messages, or unnecessary personal information. Item titles and descriptions should be reviewed for accidental private data before being sent to any external model or market-data provider.

## Limitations and recommended interpretation

The analyzer cannot authenticate an item, inspect undisclosed defects, guarantee a sale price, predict future appreciation, or account perfectly for every regional or platform-specific market difference. A verified sale is evidence of a transaction, not a promise that the user's item will sell at the same price. Grading-company population data, provenance, edition details, shipping, fees, tax, and liquidity can materially affect the real-world outcome.

The safest interpretation is:

> Use the analyzer as a transparent, evidence-aware negotiation aid. Confirm the actual comparable listings, inspect condition and authenticity, and make the final decision yourself.

## Source files reviewed

- `server/tradeFlowRouter.ts` — live Trade Room procedure, eBay evidence classification, prompt, value-gap calculation, and response handling.
- `client/src/pages/WarRoom.tsx` — client payload construction and displayed analyzer fields.
- `server/_core/llm.ts` — LLM endpoint, model-call wrapper, response handling, and retry behavior.
- `server/_core/tradeRoomAI.ts` — legacy analysis contract and fallback implementation.
- `server/tradeRoomEvidenceTiers.test.ts` — regression coverage for the approved eBay evidence hierarchy.

## Verification note

This report was rebuilt after a temporary documentation-file overwrite was detected. The final version was written from a fresh read of the current source files and describes implemented behavior rather than an intended future design.

*Date: 2026-09-22*
