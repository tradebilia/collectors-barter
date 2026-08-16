# TCGdex and RAWG Test AI Integration Notes

## Scope

TCGdex is implemented as a **manual, administrator-only, read-only Pokémon catalog lookup**. Its normalized response deliberately omits pricing, images, grading, authentication, condition, ownership, and valuation fields.

RAWG is present only as an **inactive setup-gated source** for Video Games. It makes no outbound request until the user supplies a server-side `RAWG_API_KEY` and confirms current commercial-use terms in writing.

## Initial browser validation

On August 16, 2026, the Test AI provider selector was checked in the development environment using the existing Pokémon Charizard inventory item. The selector displayed TCGdex as a live green source with its factual-metadata limitation and displayed RAWG as an amber `key required` source.

The paired-item comparison flow returned factual TCGdex card data after the upstream request completed. The first lookup exposed a relevance defect: an item described as `Shadowless` matched the wrong same-number Charizard record because `Shadowless` is a card variant rather than a TCGdex set name. The adapter now ranks detailed TCGdex variants as well as card name, card number, and set.

The corrected live lookup was validated on the existing `Pokemon Charizard` listing on August 16, 2026. It returned **TCGdex card `base1-4`**, `Base Set`, card number `4`, with the match note `Matched by card name, card number, and variant.` The rendered panel showed factual catalog fields only, including rarity, category, HP, types, stage, illustrator, and variants. It displayed **no price, condition, authentication, certification, ownership, or valuation field**.

For RAWG validation, the existing `Super Mario Bros 3 Graded` record was selected on both sides of the Test AI comparison. The active TCGdex source correctly reported that it supports Pokémon items only. The RAWG setup panel is the remaining interface check.

The RAWG setup panel was then enabled for the Video Game item on August 16, 2026. It explicitly reported that it is inactive by design and displayed the two required activation conditions: a server-side RAWG API key and written confirmation of current commercial-use terms. The panel makes no RAWG catalog lookup and returns no game data while either condition remains unmet.
