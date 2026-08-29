## Logo sizing inspection

The current Account Settings markup gives every provider an `h-8 w-28 object-contain` frame, but the source canvases are materially different. PayPal is 1942×542, Venmo is 2000×365, Cash App is 2048×1152 with visible alpha concentrated around y=356–796, and Zelle is 1920×1920 with visible alpha around x/y=168–1751. Therefore the shared frame equalizes containers, not visible artwork. Cash App and Zelle need normalized crops (or equivalent CSS treatment) before the marks can appear comparable to PayPal.
## Normalized-logo visual check

The normalized Cash App crop now preserves the full icon-and-wordmark rather than only the icon. The normalized Zelle crop preserves the complete official wordmark inside a tight square canvas. Both assets are uploaded to durable WebDev storage and will render with the same `h-8 w-auto` treatment as PayPal and Venmo, equalizing visible mark height while allowing each brand’s natural width.
## Responsive route verification

Desktop and mobile screenshot checks confirmed the homepage remains responsive and the Profile integrations route safely redirects to the public homepage when the preview session is signed out. The payment card itself cannot be visually opened in this session without authentication; the source markup, normalized assets, and focused tests were verified instead.
