# Third-Party Credential Validation Plan

## Safety constraints

All checks use authentication-only or read-only requests. Staging remains enabled. No email, SMS, payment, OAuth sign-in, mutation, or user-facing action will be initiated, and no secret value will be recorded in this file.

## Confirmed official validation patterns

| Provider | Safe check | Expected credential handling | Source |
| --- | --- | --- | --- |
| PSA | `GET /publicapi/cert/GetByCertNumber/00000000` | `Authorization: bearer <token>` | [PSA Public API Documentation](https://www.psacard.com/publicapi/documentation) |
| PCGS | `GET /publicapi/coindetail/GetCoinFactsByGrade?PCGSNo=98836&GradeNo=66&PlusGrade=false` | `Authorization: bearer <token>` | [PCGS Public API Documentation](https://www.pcgs.com/publicapi/documentation) |

For these two providers, a valid token may return a successful response even when the requested reference has no matching data. Provider documentation states that malformed requests or invalid credentials return non-success responses.
