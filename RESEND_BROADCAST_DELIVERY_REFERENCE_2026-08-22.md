# Resend Broadcast Delivery Reference

The official Resend Broadcast API requires a segment ID and treats `send: true` as an instruction to send or schedule the broadcast. Its create response returns a broadcast ID, while broadcast retrieval exposes lifecycle status and timestamps. Resend’s Broadcasts dashboard is the provider’s place for delivery, bounce, open, click, and subscriber-performance inspection.

The current read-only diagnostic found two recent Tradebilia Pre-Launch broadcasts with provider status `sent`, including a broadcast created on 2026-08-22. This proves Resend accepted and sent the broadcast; it does not prove a specific recipient’s inbox placement. Inbox delivery can still be affected by recipient-provider spam filtering, bounces, or suppression.

Sources: [Resend Create Broadcast](https://resend.com/docs/api-reference/broadcasts/create-broadcast), [Resend Retrieve Broadcast](https://resend.com/docs/api-reference/broadcasts/get-broadcast), and [Resend Broadcasts introduction](https://resend.com/docs/dashboard/broadcasts/introduction).

## Recipient timestamp tracking

The Admin Pre-Launch recipient grid uses the Resend contact property `tradebilia_prelaunch_last_sent_at`. Resend documents that an existing contact can be updated by ID with a `PATCH` request containing a `properties` map, and that a custom property must already exist with a valid type before it can be set.

Sources: [Resend Update Contact](https://resend.com/docs/api-reference/contacts/update-contact) and [Resend Contact Properties](https://resend.com/docs/dashboard/audiences/properties).

## Selected-recipient delivery segment diagnosis

On 2026-08-22, a non-sending live diagnostic verified that the contacts-scoped credential can list segments, while the send-only broadcast credential cannot create or list them. The account reported a three-segment plan limit when the application attempted to create another temporary selected-recipient segment. Selected Pre-Launch sends therefore reuse one existing delivery segment, clear its previous membership through Resend's contact-segment removal endpoint, add the newly selected opted-in contacts, and then submit the broadcast with the send-only credential. No diagnostic broadcast was sent.

