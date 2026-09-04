# Coming Soon Animated Lockup Review

## Baseline Captures — September 4, 2026

The current desktop and 375px phone captures confirm that the Coming Soon page renders the enlarged animated lockup in the expected parchment composition. The user reported that the long `SPORTS CARDS` state clips, the divider appears off-center against the full animated lockup, and the arrows look thicker than the supplied reference.

The correction will preserve the existing page composition while changing only the lockup geometry: the full visual width will be expanded for every rotating category, divider placement will be calculated against the complete wheel-and-wordmark bounds, and the Coming Soon override will stop adding wheel stroke width so the original thin arrow shapes remain intact.

## Measured Sports Cards Baseline

At the prior 3600-unit canvas, a live browser measurement reached `SPORTS CARDS` and showed both the category text and enlarged wheel extending outside the SVG client bounds. The divider remained clear of the wheel but the full lockup did not fit the visible canvas. The final correction uses a 4000-unit canvas with the prior visual scale restored, increasing the available horizontal length instead of reducing the perceived lockup size. The Coming Soon wheel override is now `wheelStrokeWidth={0}`, which preserves the original thin arrow geometry.

## Post-Correction Captures

Fresh 1280px and 375px captures show the restored-scale lockup fitting within its expanded visual area, with the complete wheel visible and the divider separated from the wheel and wordmark. The surrounding parchment composition, tagline, launch stamp, highlights, categories, and signup controls remain unchanged. The long-category containment is protected by the 4000-unit centered canvas regression contract rather than by clipping the SVG frame.

## Final Sports Cards Verification

The final canvas was expanded to 4800 units after measuring the full enlarged Sports Cards lockup. In the exact live `SPORTS CARDS` state, both the category label and wheel were within the SVG bounds, while the divider remained to the right of the wheel and left of the category word. Final desktop and 375px captures confirm that the corrected canvas remains contained within the page composition.
