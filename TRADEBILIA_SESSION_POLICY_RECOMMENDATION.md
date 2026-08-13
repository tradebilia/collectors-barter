# Tradebilia Device Session Policy Recommendation

## Executive recommendation

Tradebilia should **not** block every simultaneous login. Collectors commonly move between a desktop cataloging workstation, a phone at a show, and a tablet or home computer. A strict “last login wins” rule creates avoidable frustration and can allow a malicious login to evict the legitimate collector.

Instead, Tradebilia should adopt a **device-aware session policy**: permit up to **three active devices** per account, show each device in a Security & Devices area, alert the account owner when a new device signs in, and let them revoke one device or all other devices immediately. This gives collectors practical control without punishing normal multi-device use.

## Current state

The current custom authentication path issues a one-year signed bearer JWT that contains identity and role data. The server validates the signature and loads the user, but it has no server-side session registry, token identifier, device record, revocation list, or session-version check. Consequently, every browser that receives a valid token remains usable until expiry, and logging out only clears the cookie in that browser.

## Options considered

| Policy | Collector experience | Security and control | Recommendation |
|---|---|---|---|
| Strict single active login | Poor; normal desktop/phone use causes repeated sign-outs | Stops concurrent use, but an attacker’s newer login can displace the account owner | Do not use as the default |
| Per-user session version | Simple; a new login can invalidate all earlier sessions | Useful emergency kill switch, but no device detail or selective revocation | Add as a fallback control only |
| Device-session registry | Good; collectors can safely use several devices | Supports session lists, selective logout, limits, alerts, and audit history | **Recommended foundation** |
| Risk-based controls on top of registry | Excellent when used selectively | Adds protection for unusual logins and sensitive actions | Add after the foundation |

## Thorough comparison and definitive answer

The earlier recommendation is the best direction, but the wording “three active devices” needs to be more precise. **A server-side session registry with user-controlled device management is the correct security architecture. A three-device limit is a product decision layered on top of it, not the core security control.**

Tradebilia’s current alternative—long-lived, independent browser tokens—is the weakest option because a stolen or copied token remains valid until expiry and cannot be selectively revoked. A pure single-session rule looks simple but is the wrong default for a collector marketplace. It frustrates legitimate desktop-plus-phone use, breaks workflow at card shows, and lets the most recent login evict the legitimate account owner after a credential compromise. OWASP explicitly cautions that unrestricted prevention of simultaneous sessions is not suitable for modern multi-device users.[2]

| Candidate policy | Stops stolen existing sessions | Supports normal collector use | Gives the owner a clear recovery action | Recommended use |
|---|---:|---:|---:|---|
| Current stateless one-year tokens | No | Yes | No | Replace |
| Last-login-wins single session | Partly | No | Weak; an attacker can evict the owner | Do not use |
| Session-version-only invalidation | Yes, globally | Yes | Yes, but only all-or-nothing | Add as an emergency fallback |
| Device-session registry without alerts | Yes | Yes | Yes | Minimum acceptable foundation |
| Device-session registry plus alerts and step-up checks | Yes | Yes | Yes, with early warning | **Best fit for Tradebilia** |

The appropriate initial policy is therefore: allow multiple devices; issue a separately revocable session for each login; notify on each genuinely new device; offer immediate “sign out all other devices”; require recent authentication for sensitive account and marketplace actions; and retain a global session-version invalidation switch for compromise recovery. This mirrors the combination of device visibility, remote logout, global sign-out, and unusual-login alerts used by major consumer platforms.[4] [5] [6]

## Non-negotiable guardrails

The implementation should not ship without these controls. Each session must have an opaque random identifier, and the database must store only a hash or keyed digest—not the raw token. Tokens must include a session identifier and session version, and every protected request must reject a revoked, expired, or version-mismatched session. Logout must revoke the server-side session, not merely clear the local cookie.

Password reset, password change, confirmed account takeover, email/phone change, and administrator-forced logout must increment the user’s session version and revoke all sessions. Changing payout details, PayPal or OAuth connections, password, email, phone, remote sessions, role, or suspension status must require recent reauthentication. New-device notices should include a direct “This was not me” action that revokes other sessions and begins recovery.

Do not store raw IP addresses indefinitely, perform invasive device fingerprinting, silently evict a user’s oldest session, or rely on a device cap as proof that account sharing or compromise is prevented. The device limit should start at three active devices and be configurable after observing actual support and collector behavior; the user should choose which device to remove when the cap is reached.

## Revised first release

The first production release should include the session registry, the global session version, per-device session listing, selective and global revocation, password/reset invalidation, new-device notifications, and reauthentication for sensitive actions. A device cap can launch with three active sessions, but it must be easy to adjust administratively. Sophisticated location-risk scoring, travel heuristics, and automated blocking belong in a later release after Tradebilia has meaningful authentication telemetry; shipping them first would create false positives without improving the basics.

## Recommended user experience

The Profile page should include a **Security & Devices** section. It should show a friendly device label, browser, last active time, approximate location only if you choose to retain it, and a **Sign out** action for each device. It should provide a prominent **Sign out all other devices** control and require the current password before that action or any individual remote revocation.

On a fourth device, Tradebilia should display a simple choice: sign out a listed older device, or cancel the sign-in. It should not silently evict the oldest device because that can become an account-lockout tool for an attacker. Each new device should trigger a concise security email and in-app notice with a “That wasn’t me” action that revokes all other sessions and asks the collector to change their password.

## Sensitive-action policy

Require a fresh password or OTP check before changing password, email, phone number, payout or PayPal details, connected social/eBay credentials, and before remotely signing out devices. Apply the same check to administrator-only actions. Keep normal marketplace browsing, messaging, watchlists, and item inquiries frictionless.

## Technical design

Create a `userSessions` table with a random opaque session identifier, user ID, a hash of the server-side session secret or identifier, sanitized device label, created time, last-seen time, expiry time, and revocation time. Do **not** store raw browser tokens. Include a `sid` and a `sessionVersion` claim in each signed JWT. On each authenticated request, verify both the JWT and the corresponding active session record; cache that database lookup briefly if necessary.

Maintain `users.sessionVersion` as an emergency global invalidation counter. Increment it after a password reset, password change with “sign out other devices,” account recovery, confirmed suspicious-login event, or administrator-forced session revocation. Rotate the session identifier on login and after elevated authentication.

## Phased implementation

| Phase | Scope | User-visible result |
|---|---|---|
| 1 | `userSessions`, `sessionVersion`, JWT `sid`, current-device logout, password-change invalidation, audit events | Existing sessions become revocable and password changes can sign out other devices |
| 2 | Profile → Security & Devices, three-device limit, selective remote logout, new-device email | Collectors can see and control active devices |
| 3 | Reauthentication for sensitive actions, suspicious-login alerts, optional risk signals | Stronger protection without burdening everyday messaging and trading |

## Rollout and testing requirements

At rollout, invalidate existing long-lived stateless sessions once so every active browser receives a registry-backed session. Announce the change in plain language. Test normal desktop-plus-phone use, device-limit behavior, current-device logout, remote logout, logout-all, password change, reset recovery, session expiry, revoked-token rejection, and administrator protections. Avoid intrusive device fingerprinting; keep retained session metadata minimal and publish the policy clearly.

## Supporting guidance

NIST recommends accessible session termination and periodic reauthentication, while OWASP ASVS recommends allowing users to view and revoke active devices or sessions and notes that blocking all simultaneous sessions is not suitable for modern multi-device users. [1] [2] [3]

## References

[1]: https://pages.nist.gov/800-63-4/sp800-63b/session/ "NIST SP 800-63B: Session Management"
[2]: https://github.com/OWASP/ASVS/blob/master/4.0/en/0x12-V3-Session-management.md "OWASP ASVS: Session Management"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html "OWASP Session Management Cheat Sheet"
