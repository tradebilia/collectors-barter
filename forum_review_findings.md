# Collectors Forum Initial Review

## Desktop visual findings

The forum index is functional and currently shows a single topic, but the page presents a very sparse content area with no explanatory intro, topic count, pagination, or clear empty/loading treatment beyond plain text. The category tab row is a long horizontal strip that reaches the viewport edge and clips the final category instead of providing a clearly discoverable scroll affordance. The sort controls are visually detached from the category navigation and use generic utility styling rather than the stronger Tradebilia forum hierarchy.

The topic card is readable but underdeveloped: the title, author/date, excerpt, replies, and views are all present, yet the card has substantial unused horizontal space and lacks a clear last-activity or category context. The author is rendered as Anonymous for the visible seeded topic, which may be intentional for the current data but should be handled as an explicit fallback rather than the dominant identity treatment.

The forum hero is visually consistent with the site and uses the supplied forum SVG, but the desktop lockup is very large and occupies most of the hero height. The topic detail route for `/forum/1` correctly renders a not-found state, but that state is visually sparse and does not offer a useful recovery action beyond the back button.

## Initial implementation concerns

The current pages use browser `alert()` calls for validation and errors, do not invalidate or refresh forum queries after creating a topic or reply, and do not expose explicit accessible names or pressed states for category and sort controls. The topic card relies on an onClick handler without a keyboard-equivalent link/button behavior. These are likely higher-priority usability and accessibility refinements than purely decorative changes.

## Mobile visual findings

At 390px, the top navigation and category bar are intentionally horizontally clipped, but the clipping is not clearly communicated and the category row cuts through labels such as Sports Cards and Vintage Toys. The forum hero scales down cleanly enough to remain recognizable, although the logo and title become very small relative to the available hero height. The forum content itself is readable, but the category tabs and topic card still feel like desktop controls compressed into a narrow viewport.

The mobile topic card is usable, with the reply/view metrics remaining visible on the right, but there is no visible route to create a topic while signed out and no contextual explanation of what the forum is for. The not-found detail page leaves most of the phone viewport empty and would benefit from a branded recovery state with a clearer return action.

## Candidate first-pass improvements

The safest first pass is to improve semantic and responsive structure without changing the forum data model: make topic cards keyboard-accessible links, add explicit aria-selected states and scroll affordances to category/sort controls, provide a compact forum intro and topic count, use non-blocking inline validation/error states in the topic and reply forms, invalidate the relevant queries after successful mutations, and replace the sparse not-found state with a useful recovery card. The visual system should remain aligned with the existing navy, parchment, and Tradebilia brand-mark treatment.

## Post-refinement verification

The forum index now has a clearer hierarchy and a useful one-line description. On desktop, all category controls wrap cleanly within the content area rather than clipping the final category. On phone, the category controls wrap into multiple rows and remain readable, which is more usable than the former clipped horizontal strip. The topic count and signed-out guidance sit above the list without crowding the card.

The not-found detail state now uses a centered branded recovery card with an explanatory message and a Browse forum topics action. It remains contained and readable at both desktop and phone widths.

The refinement pass passed its focused Vitest contract, TypeScript validation, production build, and whitespace checks. A signed-in real-topic detail and reply-flow check remains necessary because the unauthenticated preview only exposes the not-found detail state for `/forum/1`.

## Hero and identity correction verification

The forum index and topic route now use the same enlarged forum SVG wrapper and matching desktop/mobile hero proportions, eliminating the route-specific title-size difference. The original post and topic cards now render an avatar component from the returned author avatar URL, with an initials fallback. Replies use the same avatar component.

The unauthenticated preview continues to show Anonymous and a question-mark fallback for the existing visible topic because the preview session is not the authenticated author and the current row does not expose a populated identity in that public response. The server query now joins the profile table and resolves profile display name first, then account display name/name, with profile avatar first and account avatar fallback. A signed-in post/reply test is still required to validate the real authenticated user identity end to end.
