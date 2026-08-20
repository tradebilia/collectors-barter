# Mobile Layout Audit

## Summary

The current mobile experience is uneven. The global Search Results page, Member Directory, Traders Showcase, and Coming Soon page remain usable at 375 pixels, but the Category Page layout is materially broken at that width and the Conventions route appears unusable. The core problem is not the visual design alone; desktop sidebars and fixed-width content regions are retained on a narrow screen without becoming mobile-native controls.

## Verified Findings

| Priority | Journey | Verified mobile behavior | Recommended repair |
|---|---|---|---|
| Critical | Category Pages | The permanent left filter rail consumes roughly half the viewport. Listing cards compress to a narrow sliver, result controls overlap or clip, and a large unused right-side area appears. This makes browsing and filtering impractical. | Replace the permanent mobile rail with a Filter button that opens a drawer/sheet. Keep all filters and the explicit Search/Enter rule inside the drawer; show active-filter chips and result controls above a single-column listing feed. |
| Critical | Conventions | At 375 pixels, the public route renders as a very narrow vertical fragment rather than a readable page. | Diagnose and remove the fixed minimum-width or off-canvas desktop layout; rebuild the mobile breakpoint around stacked cards and a single-column event list. |
| High | Homepage | The mobile page is functional but places a dense subscriber-tool rail and four long ranking modules ahead of much of the marketplace story. It feels like several desktop widgets stacked vertically rather than a guided mobile landing journey. | Prioritize hero, category discovery, and listings; collapse utility links into a compact member-tools disclosure and reduce rankings to one summarized module with links to full rankings. |
| High | Shared category bar | The horizontal category navigation cuts off after a few labels with no clear visual affordance that it scrolls. | Use horizontal scroll snapping, edge fade, and a subtle swipe cue while preserving direct category access. |
| Medium | Member Directory | The layout is readable, but its all-expanded filtering creates a long scroll before members are reached. | Use a compact filter summary and mobile drawer/sheet with active chips; preserve deliberate username Search/Enter behavior. |
| Low | Global Search Results | This is one of the strongest mobile layouts: hero, category filter, cards, and pagination are readable. | Retain the visual structure; align its eventual mobile filter control with the Category Page drawer pattern for consistency. |
| Low | Traders Showcase / Coming Soon | Both are generally readable at phone width. Traders Showcase category chips wrap acceptably; Coming Soon maintains its intended editorial hierarchy. | Preserve current structure, with only minor spacing and tap-target review after the higher-priority work. |

## Important Scope Note

The initial paths `/member-directory` and `/traders-showcase` correctly displayed the product 404 because they are not registered routes. Their active routes are `/members` and `/trade-showcase`; the assessment above uses those active routes. This is not a mobile defect.

## Recommended First Release

Start with a **shared mobile filter-drawer system** for Category Pages and, secondarily, Global Search and Member Directory. It addresses the most visible defect, reduces duplicate responsive logic, preserves the existing Search/Enter requirement, and creates one consistent mobile discovery pattern. Conventions should be investigated as a focused critical responsive repair immediately after that shared system is defined.

## Implemented Mobile Boundary

The Category Page now uses an off-canvas filter drawer below the desktop breakpoint. Its existing desktop sidebar remains in place from the `md` breakpoint upward. Mobile results use one column, while the existing six-column desktop grid is retained from the same desktop breakpoint upward. Phone-width Stamps verification confirms cards are readable again and the fixed filter rail no longer consumes the result area.

## Confirmed Conventions Failure

A direct 375-pixel capture of the active `/conventions` route reproduces the page as a narrow vertical fragment despite its source card grid using responsive columns. This is a confirmed active-route mobile defect that requires a focused repair without altering the desktop Conventions route.

The mobile Conventions hero now uses a text fallback while the existing title artwork remains available from the `sm` breakpoint upward. A repeat 375-pixel capture confirms the route now shows a readable hero, scrollable category bar, stacked filter card, and single-column convention cards without changing desktop artwork or desktop card grids.

The homepage ranking area now uses two columns at phone width and retains the existing four-column layout at the `xl` desktop breakpoint. Phone review confirms the hero, statistic strip, and subscriber tools remain readable; desktop grid definitions are unchanged.
