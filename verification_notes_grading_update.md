# Grading and typography verification notes

- Desktop capture of `/listings/690002` rendered the Item Detail page successfully. The title `Super Mario Bros 3 Graded` is visible, and the numeral 3 now sits on a consistent lining-numeral baseline with the surrounding title characters.
- Desktop capture of `/inventory/new` did not show the inventory form because the current preview session was unauthenticated; it rendered the public homepage shell instead. The form options still require an authenticated-route check.
- No image asset changes were made; the supplied image was treated as a visual reference only.

The live preview homepage now renders the legacy Super Mario listing as “Grading company not specified 9” rather than the literal “Other 9,” confirming the safety fallback is active in a public listing surface. The `/inventory/new` route redirected to `/` because this browser session is not authenticated, so dropdown inspection remains a code/test-based verification rather than a direct interaction check.
