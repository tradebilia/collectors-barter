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

Two further cache-busted reloads after the counterpart-first hierarchy checkpoint still served the prior direct card order, placing the subject `direct test` above `To: Rtavani`. The production asset bundle must be distinguished from browser runtime cache before final visual verification.

## Direct-message development verification

After explicit user approval, the development preview successfully sent one message from Admin to Rtavani with no database error. The new conversation card shows the approved hierarchy—**To: Rtavani**, **Direct Message**, **Sent**, subject, preview, and timestamp—and the Direct Messages **Sent** filter retains that outgoing conversation.

The same development view’s **Received** filter correctly excludes the outgoing conversation and renders an empty state because no incoming reply exists. This confirms the All, Sent, and Received filters separate conversations by the latest-message direction without changing the unified Direct Messages folder.

After the final production propagation, the live admin Messages view renders the same counterpart-first outgoing card: **To: Rtavani**, **Direct Message**, **Sent**, the subject, its preview, and the timestamp. This confirms the previously stale production bundle has been replaced by the published hierarchy update.

The user successfully sent a live direct message from the Admin account to Rtavani after the legacy thread-creation repair. The resulting live outgoing thread was visible from the Admin side before the later presentation improvements, confirming that the repaired creation path works in production as well as in the development preview.

The live Direct Messages folder initially retained the published counterpart-first card but did not yet render the newly added All, Received, and Sent controls, indicating that the latest filter bundle was still propagating after the hierarchy deployment.

Subsequent inspection confirmed that the live JavaScript bundle contains the Direct Messages filter implementation. The page was then ready for a fresh Direct Messages folder selection to verify the rendered controls.

The live Direct Messages folder now renders **All**, **Received**, and **Sent** controls. The live **All** and **Sent** views both retain the Admin-to-Rtavani outgoing conversation with the counterpart-first card hierarchy, matching the development verification.

After the recipient confirmed a successful live reply, the Admin-side unified Direct Messages view displayed it as **From: Rtavani**, **Direct Message**, and **Received**, with the reply preview and Seen state. This verifies both the repaired recipient reply path and the incoming direction presentation in production.

Selecting the live **Received** filter retained only Rtavani’s real incoming reply and visually activated the filter. This confirms that incoming conversations are isolated correctly while the default **All** view remains the unified conversation list.

## Member Directory navigation relocation

The homepage Subscriber Tools panel now contains **Member Directory** between My Trades and Report a User. Desktop retains the left-column panel placement. At a 375-pixel mobile viewport, the panel stacks above homepage content, preserves the full Member Directory label and navigation affordance, and eliminates the prior horizontal overflow caused by the fixed two-column grid.

## Member Directory shared navigation and hero

The Member Directory is publicly viewable at `/members`; member messaging and trade actions still request sign-in. Its desktop and 375-pixel mobile layouts render the shared Tradebilia top bar, the same homepage collector-collage hero background, the supplied Member Directory title artwork, the shared category bar, and the existing Verification filter without horizontal overflow. The duplicate homepage Verified Merchants shortcut was removed because verified members are discoverable through this directory filter.
