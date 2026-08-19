# Category Location Discovery Audit

**Implemented:** 2026-08-19

## Scope

Category Pages now provide two complementary, privacy-safe local-discovery controls across all ten collection categories. **Location: Nearest First** orders matching listings by the proximity of their owners’ saved towns to the signed-in member’s saved town. The shared sidebar also provides a **Distance** dropdown for 10, 25, 50, 100, 250, or 500 miles.

The distance dropdown follows the established Category Page interaction rule: selecting a value only changes pending filter state. It is sent to the server only after the member presses **Search** or Enter in a filter input.

## Privacy and Fallbacks

| Situation | Behavior |
|---|---|
| Signed-in member with a saved town | The server geocodes only town, state, and country; then calculates a straight-line distance to listing owners’ saved towns. |
| Listing owner lacks a usable town | The listing remains eligible for normal discovery and nearest sorting, but cannot satisfy a selected distance range. |
| Member is signed out | The requested local control falls back to the normal result order with a clear sign-in message. |
| Member has no saved town | The requested local control falls back with a clear Profile message. |
| Town cannot be resolved | The requested local control falls back with a temporary-availability message. |

Exact addresses, coordinates, owner towns, and exact mileage are never returned to the Category Page. The feed provides only whether the requested local sort or filter was applied and, if not, a non-sensitive fallback reason.

## Per-Item Distance Labels

Per-item distance labels were assessed but deliberately not implemented. If separately approved, the recommended policy is to show only broad bands—such as **Within 10 miles**, **10–25 miles**, or **100+ miles**—only for signed-in members while Nearest First is active. Exact mileage would imply false precision from town-level geocoding and could reveal too much in smaller communities.

## Validation

The deterministic helper tests cover nearest-owner ordering, tie stability, range filtering, and exclusion of listings without a resolved owner town. Source-contract tests confirm typed query validation, explicit Search/Enter submission, server-only coordinates, no street-address geocoding for Category discovery, and non-sensitive response metadata. Visual development verification confirmed the shared Sports Cards layout exposes the Distance control beside the existing filters and keeps the established Search action. The complete test suite, TypeScript check, and production build passed before release.

Standard-domain verification completed after deployment propagation at `https://tradebilia.manus.space/category/sports_cards`. The public Sports Cards page displays **Distance**, **Any distance**, and **Uses your saved town after Search or Enter**, confirming the shared Category Page sidebar release is live. The nearest-sort request and fallback contract remain covered by the typed server and client regression checks; manual signed-in location testing is not required for release because it would require an existing member’s personal session and location record. Canonical GitHub `main` is synchronized at commit `a8690e7f`.
