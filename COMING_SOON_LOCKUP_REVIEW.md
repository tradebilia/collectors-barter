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

## Reference Alignment Rebuild

The fixed maximum-label reserve was rejected because it visually pulled short labels too far left. The final implementation instead centers each complete wheel–divider–wordmark group independently inside the expanded canvas. Live measurements show BILIA and Comics within approximately 9 pixels of the SVG visual center. In the exact Sports Cards state, the group is within approximately 6 pixels of center, the long label and wheel remain contained, and the divider remains clear of both the wheel and category word. The original thin-arrow override remains in place.

## Post-fix live visible-group measurement

After refreshing the development page, the complete outer SVG group—including the rotating wheel, divider, fixed TRADE word, and current category—measured from x=397.13 to x=976.92 at a 1280px viewport. Its center was 687.02px against an SVG center of 688.00px, a -0.98px delta. This confirms the complete rendered group, rather than text alone, is centered after the visible-group measurement correction. Text-only bounds can appear shifted because the wheel is excluded; the outer SVG group is the authoritative check.

## SVG-native centering verification

After replacing the viewport-pixel correction with the SVG group bounding box, live sampling measured the complete outer group against the SVG center: COMICS +0.45px, SPORTS CARDS -0.45px, POKEMON -0.51px, COINS -0.44px, STAMPS -0.51px, VIDEO GAMES -0.45px, AUTOGRAPHS -0.49px, TOYS -0.41px, and BILIA -0.49px. The group is therefore centered within approximately 0.51px across the sampled rotating names.
