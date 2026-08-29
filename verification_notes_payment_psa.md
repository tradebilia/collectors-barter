# Payment and PSA verification

The focused regressions passed 10/10. TypeScript, production build, production dependency audit, and changed-file whitespace checks passed. The desktop public homepage screenshot rendered the Recently Added feed without layout regressions and showed the existing grading badges on visible cards. The Account Settings screenshot path redirected to the signed-out homepage, so the payment card itself could not be visually inspected in an unauthenticated preview.

The feed parser now accepts both parsed itemDetails objects and serialized JSON, including the canonical customGradingCompany key and legacy key variants. This addresses the case where Item Detail had PSA in itemDetails but the homepage feed treated the value as missing.

External provider research remains a documented limitation: no reliable universal no-payment existence/ownership lookup was found for arbitrary PayPal email, Venmo username, Cash App cashtag, or Zelle destination. The existing format validation and member-confirmed cash workflow remain in place rather than displaying a false provider-verified status.
