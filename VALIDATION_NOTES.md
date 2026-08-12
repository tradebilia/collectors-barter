# Validation Notes

## Messages sender labels

The authenticated development Messages endpoint returned the profile display name **Administrator** for the stored inquiry sent by user ID 30002, while the counterpart label for the signed-in sender resolved to the recipient’s profile display name. The deleted-folder list and opened outgoing inquiry detail were visually checked in the development site after the client refresh correction.

After publication, the live Messages page was opened in the persisted recipient session for user ID 60003. The page loaded normally and showed two items in its Deleted folder, ready for the recipient-side label check.

The live recipient Deleted folder displayed **Administrator** for the admin-sent inquiry, confirming the reported sender-label issue is resolved. A second, older sent inquiry still rendered a generic counterpart placeholder; its live response did not yet include the newly added `recipientId` or `recipientName` fields, so deployment propagation must be rechecked before treating that unrelated row as corrected.

The cache-busting follow-up deployment was then reloaded successfully in the same live recipient session before reopening the Deleted folder.

The responsive Integration-card deployment was reloaded on the live Profile route before a final class and mobile screenshot recheck.

The live JavaScript bundle contains the new responsive Integration-card class, while the rendered page initially retained the former card class. The final check therefore clears only the site’s stale runtime cache before reloading; no account or database data is modified.

After the cache-cleared reload, the authenticated live Profile route continued to render normally with all five provider logos present. The remaining DOM-class discrepancy is under investigation before the responsive correction is marked verified.

The final live bundle and rendered eBay connection-card markup both resolved to the responsive small-screen stacking class. A final 375-pixel capture is used to confirm the visual result.

The final authenticated 383-pixel capture had no horizontal overflow and loaded all five supplied provider assets. Connection controls stack below their respective logo and label on small screens, eliminating the earlier logo/control overlap. The active/deleted inquiry implementation and live recipient deleted-inquiry view are verified; direct-message rendering is covered by the shared resolver, message-payload paths, and regression tests because the read-only live data did not retain a direct-message thread to open in the browser.

## Item inquiry direction

In the development sender session, the active item inquiry now renders **To: Rtavani** with one **Sent** badge. This confirms that the former counterpart-only card heading no longer implies that Rtavani authored the outgoing inquiry.

The dedicated **Item Inquiries** view exposes **All**, **Received**, and **Sent** filters. The **Sent** filter correctly retains the outgoing inquiry with the explicit **To: Rtavani** label and single direction badge.

Opening that outgoing inquiry shows **Inquiry to Rtavani**, a **Sent** badge, and the sentence **You sent this item inquiry on …**. The same sender session’s **Received** filter returns no rows, correctly separating it from the outgoing inquiry.

The first live recipient reload after the direction checkpoint still displayed the previous counterpart-only card, so production bundle propagation must complete before live direction verification can be recorded.

A subsequent live recipient reload continued to display the predecessor card, so the served bundle is checked directly before further verification.

After production propagation, the live recipient list card now shows **From: Administrator**, a **Received** direction badge, and its separate **Seen** status. This validates the received-side list semantics.

Opening the live recipient inquiry shows **Inquiry from Administrator**, a **Received** badge, and **Received on …** timestamp copy. Its Item Inquiries folder also exposes the All, Received, and Sent filters with the incoming inquiry present in the combined view.

In the same live account’s Deleted folder, the existing outgoing inquiry is explicitly labeled **To: Administrator** with one **Sent** badge, alongside a separate received example. This confirms that sent and received inquiry direction is distinguishable side by side.

Opening the live outgoing inquiry shows **Inquiry to Administrator**, a single **Sent** badge, and **You sent this item inquiry on …** timestamp copy. The published implementation therefore verifies both recipient-side and sender-side wording in live browser views.

## Barry Sanders listing photo repair

The Barry Sanders Score Rookie listing (reference ID 1110009) had two retained photo rows. One legacy URL returned an access error while the other rendered the verified PSA 1989 Score Barry Sanders card image. The inaccessible row was updated in place to the existing durable image reference; no photo rows or other listing data were deleted. Development and live listing views both render the repaired image successfully.

## Deferred third-party credential validation

After the migration was reviewed and accepted, the user directed that it be treated as complete. The broader provider-by-provider credential validation pass was therefore deferred. No additional external provider requests were made, and no credential values are recorded in this project documentation.

## Authorized integration validation

The user subsequently authorized controlled provider testing, including email, SMS, and OAuth starts. The eBay and Facebook connection buttons both generated provider-hosted sign-in pages from the live Tradebilia Integrations view, confirming that each configured OAuth client can initiate its authorization flow and return to the registered Tradebilia callback path. No eBay or Facebook credentials were entered and no account connection was completed during these start checks.

The direct provider checks validated PCGS, Facebook application access, PayPal, eBay, Daily, ParseBot, Twilio Verify, and Sold Comps. The configured Resend key is send-only: its domains endpoint returned the expected restricted response, while a one-time test email was accepted by Resend. A one-time Twilio Verify SMS was accepted by Twilio. The configured PSA endpoint and both configured OpenAI keys returned authorization failures and require key rotation or provider-side permission review.

With staging disabled at the user’s direction, Facebook and LinkedIn live callback variables were configured and tested in the generated authorization URLs. Their provider authorization endpoints redirect to the official Facebook and LinkedIn sign-in hosts. GoCollect’s available official page confirms that API-token access requires a registered account, but it does not publish a safe generic validation endpoint; the token therefore remains unverified pending a GoCollect account-specific API route.

## Profile Integrations logos

The supplied eBay, Facebook, LinkedIn, Whatnot, and PayPal files were copied to the durable web asset directory and published to project storage. The authenticated Profile Integrations page rendered all five provider images successfully. Browser checks confirmed each image was present, complete, and had a positive intrinsic width and height, with no broken image links.

The live authenticated Profile Integrations route was also reloaded under a 375-pixel mobile viewport override. The page rendered the five connection cards and all supplied logo assets without a broken image state; the final responsive overflow measurement is recorded separately.

## Automated checks

Focused Vitest coverage for sender resolution, deleted-inquiry refresh behavior, communication payloads, and Integration-tab asset references passed. The TypeScript check completed successfully.

## Direct-message direction deployment check

Two cache-busted live admin Messages reloads immediately after the direct-message direction checkpoint still rendered the preceding direct-message card text, `From Rtavani` and `direct`. The deployed application bundle therefore requires propagation verification before the direction update can be marked visually complete.
