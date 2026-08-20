# IPQS New-User Verification Assessment for Tradebilia

**Research date:** August 20, 2026
**Scope:** Assess IPQualityScore (IPQS) for new-account abuse prevention, with emphasis on email age. This is an operational product recommendation, not legal advice.

## Executive Recommendation

**Use IPQS, but do not require an email address to be older than one year as a hard sign-up rule.** IPQS's `first_seen` value is an estimate of when IPQS first observed an address, not a mailbox provider's authoritative creation date. IPQS explicitly notes that providers generally do not expose exact creation dates, and that new inboxes can be legitimate while older inboxes can be compromised.[1] [2]

An absolute one-year barrier would reject legitimate collectors who create an address recently, change providers, return to collecting, or use a newer business address. It would also be easy for a determined scammer to bypass with a purchased or compromised older account. The stronger approach is **risk-based progressive trust**: block only clear abuse, require additional verification for mixed or elevated risk, and gradually unlock trading privileges after verified positive behavior.

## What IPQS Can Contribute

| Signal family | Useful fields for Tradebilia | Best use | Do not use it as |
|---|---|---|---|
| **Email reputation** | `valid`, `deliverability`, `disposable`, `fraud_score`, `recent_abuse`, `honeypot`, `leaked`, `domain_trust`, `user_activity`, `first_seen` | Initial account screening and email quality | Proof of identity or a definitive account-creation date |
| **Email age** | `first_seen.timestamp` and its human/ISO representations | One input to a risk tier | A one-year automatic rejection rule |
| **IP / proxy reputation** | `fraud_score`, `bot_status`, `recent_abuse`, `abuse_velocity`, connection type, proxy/VPN/Tor flags | Registration velocity, bot/abuse prevention, step-up verification | A blanket VPN ban; IPQS notes VPN/proxy use can be privacy-motivated |
| **Phone reputation** | `valid`, optional `active`, `fraud_score`, `recent_abuse`, `risky`, `VOIP`, `prepaid`, line type | Supplement an actual SMS verification code | Proof that the number belongs to the claimed person |
| **Device fingerprinting** | Device ID, duplicate history, `fraud_chance`, bot/high-risk-device/recent-abuse signals | Detect account farms and repeated abuse after a privacy review | A sole basis for denial; households, libraries, workplaces, and shared devices exist |

IPQS documents email verification as a real-time tool for invalid, disposable, fraudulent, spam-trap, and abusive emails. Its response fields include an email fraud score, recent-abuse flag, user-activity signal, domain trust, breach exposure, and `first_seen` estimate.[3] [4] IPQS also documents device fingerprinting for duplicate-account, bot, emulator, and spoofing signals, but this is materially more privacy-sensitive than an email lookup.[5] [6]

## The One-Year Email Idea: Good Signal, Bad Rule

The instinct is reasonable: a brand-new inbox has less history and is more common in fake-registration campaigns. IPQS itself describes `first_seen` as useful context and identifies newly created accounts as carrying additional risk.[2] The problem is treating it as a binary legitimacy test.

> **Recommended policy:** Treat an email first seen less than one year ago as a *moderate risk contribution*, not an automatic denial. A new address should only trigger a verification step when it is paired with weak or adverse signals.

The correct interpretation is below.

| Email condition | Suggested outcome | Why |
|---|---|---|
| Email appears valid, non-disposable, no recent abuse, low fraud score, and is older than one year | Allow normal account creation after Tradebilia email confirmation | Strong enough for a low-friction path, but still not proof of identity |
| Email appears valid but first seen under one year, with no other adverse signals | Allow account creation; mark as **new-account** and require phone verification before listing or proposing a trade | Avoids rejecting legitimate new users while protecting the marketplace action that matters |
| New email plus low/no user activity, suspicious domain trust, elevated email score, or riskier IP signal | Require email and phone verification; temporarily restrict listings, trade proposals, and direct-message initiation | Multiple weak signals together are more meaningful than age alone |
| Invalid, disposable, honeypot/spam-trap, or clearly recent abusive email | Reject registration or require manual support review | These are objective abuse/data-quality signals |
| Breach/leak exposure with otherwise low risk | Allow only after email confirmation and phone verification; encourage a unique password | A leak suggests possible compromise, not that the person is fraudulent |

IPQS's own documentation advises examining multiple values rather than a single age metric, and describes its `first_seen` value as the first time **IPQS analyzed the address**. Exact provider creation dates generally are not public.[1] [2]

## Recommended First Release: Minimal, Useful, Low-Friction

Start with **server-side email verification at registration**. Do not put the API key in the browser. Submit only the email address to IPQS after basic syntax validation and before the activation email is sent. Store a compact decision record—not the entire raw response—and surface no internal score to the applicant.

### Suggested initial decision policy

| Risk tier | Initial conditions | Tradebilia action |
|---|---|---|
| **Deny** | Invalid email, disposable email, honeypot/spam trap, or confirmed recent abuse | Do not create an active account; show a neutral correction/support message |
| **Step-up** | Email fraud score at or above **75**, email first seen under one year **plus** one other risk signal, suspicious/malicious domain, elevated IP score, or a bot/abuse indicator | Create a limited account only after email verification plus a one-time phone verification; hold listing and trade initiation until completed |
| **Manual review** | Email score at or above **90**, confirmed bot signal, repeat abuse linked to internal evidence, or multiple high-risk signals | Do not automatically label the person a fraudster; place the account in a review queue with an appeal path |
| **Standard** | Valid, non-disposable email with no material adverse signals | Standard email confirmation and ordinary onboarding |

The numeric bands above are deliberately conservative. IPQS describes scores of 75+ as suspicious rather than conclusively fraudulent and suggests 90+ as a stronger high-risk threshold for IP and device scoring.[4] [6] They should be calibrated from Tradebilia's own outcomes, not treated as universal truth.

## Signals Worth Adding After Email Checks

### 1. Email ownership confirmation

IPQS validates risk and deliverability; it does not prove that the applicant controls the inbox. Tradebilia should continue to use its own single-use email verification link as the primary ownership proof. This is the most important first control.

### 2. Phone verification with a reputation check

For users who want to list items, initiate a trade, or exceed a defined value threshold, require an SMS one-time code. IPQS phone intelligence can add useful context—validity, recent abuse, fraud score, and line type—but **do not ban all VoIP or prepaid numbers**. Those categories include legitimate users. Use them as a step-up/review signal only.[7]

### 3. Registration velocity and internal duplicate controls

Before collecting more external data, add internal controls: rate-limit registrations by IP/email-domain/device session, prevent rapid repeated verification-code sends, normalize emails for duplicate checks, and monitor multiple accounts that immediately message, list, or propose trades in the same pattern. These controls are inexpensive and often catch basic abuse better than a single reputation API.

### 4. IP reputation at registration and sensitive actions

Use IPQS IP checks on registration, login anomalies, password resets, first listing, and first trade proposal—not merely at sign-up. Confirmed bots, recent abuse, and extreme score combinations are useful. Do **not** automatically block VPNs, proxies, mobile networks, shared connections, or a location mismatch; IPQS states that a proxy/VPN can reflect privacy choices, and shared networks naturally aggregate many people.[4]

### 5. Device fingerprinting only after a privacy review

This is likely the most powerful next fraud tool for Tradebilia because it can help detect duplicate-account farms and returning abusive devices.[5] But it is also the most intrusive option, involving a third-party script and rich device signals. Introduce it only after updating the privacy notice, deciding retention, and implementing a human-review path. Use it to **link risk events**, not to automatically reject every repeated device; families, collectors sharing a home, and public networks can produce legitimate overlap.[6]

## Marketplace-Specific Trust Design

Tradebilia does not need to decide whether every sign-up is a perfect identity. It needs to reduce the chance that a new account can quickly harm another collector. Progressive permissions are the practical answer.

| Account state | Allowed | Restricted until verified/trusted |
|---|---|---|
| **New / low-risk** | Browse, complete profile, save watchlist | None beyond normal confirmation |
| **New / step-up** | Browse, complete profile, contact support | Listing, initiating trades, high-volume messaging, and high-value actions |
| **Email + phone verified** | List and propose ordinary trades | Optional limits on first transactions or high-value exchanges |
| **Established** | Normal marketplace use | Monitoring continues only for materially unusual behavior |
| **Review required** | Support and appeal route | Trading/listing until resolved |

This is better than a blunt sign-up denial because it gives legitimate new collectors a path forward while keeping the highest-risk marketplace actions behind stronger verification.

## Data Protection and Governance

IPQS states that, for customer-submitted fraud checks, it acts as processor/service provider and the customer remains responsible for notice, legal basis, and downstream automated decisions.[8] Its privacy policy says personal data submitted to fraud services is generally retained for approximately one year, and its DPA describes the same approximate maximum retention.[8] [9]

Tradebilia should therefore do all of the following before implementation:

1. Update the Tradebilia privacy notice to disclose fraud-prevention screening, the categories sent to IPQS (email, IP; phone or device only if enabled), purpose, retention, and review/appeal contact.
2. Keep the IPQS key server-side only. Never expose it in React, logs, URLs, screenshots, or GitHub.
3. Store a minimal internal decision record: timestamp, product checked, normalized risk tier, selected reason codes, and expiration. Avoid retaining raw device attributes, exact IP geolocation, identity enrichment, or full third-party payloads unless there is a documented need.
4. Set a shorter Tradebilia retention period for routine low-risk screening records than IPQS's stated approximate one year—e.g., 90 days for routine checks and a documented case-based period for confirmed abuse/reviews.
5. Avoid IPQS identity-enrichment fields, associated names, addresses, and linked phones in the first release. They add sensitive matching, false-match, and privacy risk without being necessary for basic anti-abuse screening.
6. Provide a review/appeal process for any restriction that meaningfully affects a user. IPQS itself states that customers are responsible for decisions, human review, appeal, and any applicable notices.[8] [9]

## What to Ask IPQS Before Building

| Question | Why it matters |
|---|---|
| Which fields are included in the current plan and are `first_seen`, `user_activity`, `domain_trust`, and `recent_abuse` available? | Several useful fields are tier-restricted |
| What are the registration-time rate limits, latency, and credit costs? | Signup must stay responsive and predictable |
| Can IPQS provide a sandbox/test key and known test fixtures? | Needed for reliable automated tests without live-person lookups |
| What is the exact retention/feedback treatment for requests and false-positive reports on the chosen plan? | Needed for the privacy notice, governance, and vendor review |
| Can the DPA and security material be accepted for Tradebilia's use case? | Required vendor due diligence before production data is sent |
| Which signals are recommended for marketplace sign-up versus payment fraud? | Avoid importing e-commerce thresholds blindly |

## Recommended Adoption Sequence

| Phase | Scope | Decision |
|---|---|---|
| **Phase 0: Measure** | Run email checks in shadow mode for 30 days; do not restrict users; measure scores and subsequent abuse outcomes | Calibrate thresholds from Tradebilia data |
| **Phase 1: Email quality** | Reject only invalid/disposable/honeypot/confirmed recent-abuse cases; require email-link verification for all | Low privacy cost, high basic value |
| **Phase 2: Progressive trust** | Add phone OTP for risk-tiered accounts and before listing/trading; use email age only as a step-up contributor | Protect marketplace actions without a one-year ban |
| **Phase 3: IP risk and velocity** | Add server-side IP checks at registration and sensitive actions; bot/extreme-abuse challenges only | Better resistance to automated sign-up abuse |
| **Phase 4: Device risk** | Add after a privacy-impact review, notice update, and manual-review workflow | Stronger duplicate/farm detection with greater privacy impact |

## Bottom Line

**IPQS is a strong fit for Tradebilia as a layered fraud-signal provider.** Begin with email validation and your own email confirmation. Use email age as a context signal, never as a one-year hard eligibility rule. Pair it with phone verification, rate limits, internal behavior monitoring, and progressive trading permissions. Add IP and device intelligence later, with explicit privacy governance and an appeal path.

## References

[1]: https://www.ipqualityscore.com/documentation/email-validation-api/response-parameters "IPQS Email Verification API response parameters"
[2]: https://www.ipqualityscore.com/email-age-checker "IPQS Email Age Checker"
[3]: https://www.ipqualityscore.com/documentation/email-validation-api/overview "IPQS Email Verification API overview"
[4]: https://www.ipqualityscore.com/documentation/proxy-detection-api/response-parameters "IPQS Proxy and VPN Detection API response parameters"
[5]: https://www.ipqualityscore.com/documentation/device-fingerprint-api/overview "IPQS Device Fingerprint API overview"
[6]: https://www.ipqualityscore.com/documentation/device-fingerprint-api/response-parameters "IPQS Device Fingerprint API response parameters"
[7]: https://www.ipqualityscore.com/documentation/phone-number-validation-api/response-parameters "IPQS Phone Validation API response parameters"
[8]: https://www.ipqualityscore.com/privacy-policy "IPQS Privacy Policy"
[9]: https://www.ipqualityscore.com/data-processing-agreement "IPQS Data Processing Agreement"
