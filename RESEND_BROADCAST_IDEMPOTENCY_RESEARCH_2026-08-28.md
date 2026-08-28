# Resend Broadcast Idempotency Research — 2026-08-28

The official Resend idempotency documentation states that `Idempotency-Key` is currently supported for `POST /emails` and `POST /emails/batch`, retained for 24 hours. It does not state that the header applies to broadcast creation or broadcast-send endpoints. The official Broadcast API documents a distinct create operation, optional immediate `send: true` behavior, and a separate send endpoint for API-created broadcasts.

Therefore, Tradebilia must not assume a provider idempotency header makes a broadcast retry safe. The approved remediation will persist a local, administrator-initiated send record before provider submission, re-use the stored broadcast identity when a retry occurs, and avoid automatic replay after an uncertain provider timeout. The implementation will remain administrator-only and will not send a broadcast during validation.

## Sources

1. [Resend — Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
2. [Resend — Create Broadcast](https://resend.com/docs/api-reference/broadcasts/create-broadcast)
3. [Resend — Send Broadcast](https://resend.com/docs/api-reference/broadcasts/send-broadcast)
