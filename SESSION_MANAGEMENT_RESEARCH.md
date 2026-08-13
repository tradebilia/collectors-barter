# Session Management Research Notes

## Sources reviewed

1. [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
2. [NIST SP 800-63B Session Management](https://pages.nist.gov/800-63-4/sp800-63b/session/)
3. [OWASP ASVS V3 Session Management](https://github.com/OWASP/ASVS/blob/master/4.0/en/0x12-V3-Session-management.md)

## Applicable findings

NIST describes a session as a session secret issued after authentication and recommends that subscribers have a readily accessible logout mechanism. It also emphasizes inactivity and overall session timeouts, periodic reauthentication, and privacy-aware handling of signals such as device characteristics and IP-derived information.

OWASP ASVS recommends that people can view and revoke currently active devices or sessions after reauthentication, and that password changes offer an option to terminate all other sessions. It further notes that blanket prevention of simultaneous sessions is no longer appropriate for people using multiple modern devices; a "last login wins" policy can even favor an attacker who signs in most recently.

## Design implication for Tradebilia

Tradebilia should preserve legitimate multi-device access while adding an account-level session registry, user-visible device management, selective remote logout, a limited device count, notifications for new devices, and reauthentication for sensitive actions. It should avoid storing raw session tokens and minimize retained device/location metadata.

## Consumer-platform comparison

Google exposes recent device activity and permits a user to select a device or session and sign it out remotely. Its documentation also notes that a device can have multiple sessions, which is important: Tradebilia should identify individual sessions rather than implying that one device equals one login.

Microsoft offers a global “sign out everywhere” response for suspected account compromise and says unusual new-location or new-device sign-ins can trigger email and SMS alerts. Those two patterns support an account-owner-controlled emergency response rather than automatically evicting legitimate devices whenever a new login occurs.

## Refined conclusion

The original recommendation is directionally correct but needs two refinements. First, the three-device cap should be a configurable product policy rather than a security control: a session registry and remote revocation are the security foundations, while the cap is an anti-sharing and usability decision. Second, new-device alerts should be enabled from the first release, while automatic blocking should be reserved for high-confidence risk signals or sensitive actions to avoid locking out collectors who travel to shows or legitimately change devices.
