# IGDB Commercial-Use Assessment

**Assessment date:** August 16, 2026  
**Proposed use:** Read-only Video Game identification metadata in Tradebilia Test AI.

## Official finding

IGDB’s current official getting-started documentation states that its API is free for **non-commercial** usage under the Twitch Developer Service Agreement. It directs commercial projects to request a commercial partnership at `partner@igdb.com`. Tradebilia is a commercial collector marketplace, so a free IGDB key cannot be activated for this use.

## Technical requirements if commercial authorization is granted

IGDB requires a Twitch account with two-factor authentication and a registered **confidential** Twitch application. The server would need a Twitch Client ID and Client Secret. It would obtain an app access token using the OAuth 2.0 client-credentials grant, then make server-side `POST` requests to `https://api.igdb.com/v4/games` with `Client-ID` and `Authorization: Bearer` headers. Browser-side calls are not suitable because IGDB does not allow them through CORS.

## Decision

The user confirmed that Tradebilia already has commercial approval. The required Twitch Client ID and Client Secret were supplied through secure project settings and passed a read-only credential test that obtained a Twitch app token and queried IGDB game metadata. The resulting Test AI connection remains administrator-only and returns factual game identity metadata only; it does not return market pricing, review scores, grading, condition, certification, authenticity, or ownership claims.

The development Test AI selector was visually checked with the existing `Super Mario Bros 3 Graded` Video Game listing. It presents **IGDB Video Game Catalog** as a green live manual source, while the separate RAWG option remains amber and key/terms-gated. The initial panel lookup normalized the listing to `Super Mario Bros 3` and returned no match, despite the credential test succeeding with IGDB’s punctuated `Super Mario Bros. 3` title. The adapter now retries recognized abbreviated words with their conventional punctuation and then makes one bounded unfiltered search only if the main-release lookups return nothing. The corrected fallback was reissued in development; its final result must be confirmed from the request log before release.

The broadened fallback resolved a same-title 1993 Super Nintendo record for the listing’s 1990 NES input. That is not an acceptable match. The adapter now requires every supplied release year and platform constraint to match before presenting a result. The final development UI recheck has been set up with the same inventory item to confirm the incorrect record is rejected.

The constrained lookup was started in the development UI and remained in progress on the first visual refresh. The next validation step is to inspect its completed tRPC response and verify that the panel does not display the mismatched SNES record.

The final optimized browser check was completed with the same 1990 NES listing. The panel returned: `No IGDB record matched the title with the specified release year 1990 and platform NES.` It did **not** display the mismatched 1993 Super Nintendo record. This confirms the integration fails safely when IGDB does not supply an exact identity match.

## References

1. [IGDB API documentation — Getting Started](https://api-docs.igdb.com/)
2. [Twitch Developers — Getting OAuth Access Tokens](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/)
