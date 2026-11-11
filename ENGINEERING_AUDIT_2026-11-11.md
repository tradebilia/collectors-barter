# Tradebilia Multi-Layer Engineering Audit

Date: 2026-11-11

## Investigation status

- **Status:** Partially repaired / additional defects confirmed. This is an audit, not a claim that the system is fully clear.
- **Scope:** Read-only review of the Test AI retrieval, scoring, transport, provenance, final-analysis, ledger, UI, and runtime boundaries.
- **Branch and commit:** `dev/test-ai-matching-2026-11-10` / `8499f5785643a366af18cd3fa87dd369f65e4aa4`.
- **Working tree at audit start:** Clean.
- **Database/provider writes:** None.
- **Required architecture documents:** `PROJECT_CONTEXT.md`, `AI_RULES.md`, `ROADMAP.md`, `NEXT_SESSION_PROMPT.md`, `DATABASE_SCHEMA.md`, `API_ARCHITECTURE.md`, and `KNOWN_ISSUES.md` are absent from the isolated checkout. Their contents were not inferred.

The audit followed the project debugging protocol: start at the visible result, trace backward through each boundary, separate primary blockers from downstream symptoms, and mark unverified boundaries instead of assuming they pass.

## Executive conclusion

The recent Autographs failure was not one bug. The evidence shows a chain of independently capable failure points:

1. The actual Barry Bonds/Mercari case had more than the visual-policy issue. It also encountered final-analysis identity/provenance/metadata gates before the system could mark it used.
2. The system has UI paths that can still blame visual review before showing an authoritative economic or provenance blocker.
3. The final engine can emit a hard-exclusion code for an **unmeasured** row, while the UI correctly refuses to treat that code as authoritative. That is a server/UI inconsistency.
4. Some named-source routes bypass the shared Autographs policy on early-return paths, and 130point/PWCC do not share the same source-result contract as eBay/Mercari.
5. The test suite is strong in helper and focused-path coverage but does not prove live browser/module parity. The source tree can be audited while the browser runs an older or different module.

Therefore, the correct status is **not “all good” and not “fixed.”** The honest status is: **the main Autographs Mercari path has received several targeted repairs, but the broader system still has confirmed boundary defects and unverified live parity.**

## Confirmed defects

### 1. Unmeasured rows can receive `FINAL_HARD_EXCLUDED`

**Severity: High.**

In `server/testAiComparableEngine.ts` around lines 2582–2602, a row with no private server normalization receipt is assigned `sourceAdmission.verification: 'unmeasured'`. The terminal hard-exclusion condition checks:

```ts
sourceAdmission.verification !== 'unverified'
```

That condition treats `unmeasured` as sufficient for a `FINAL_HARD_EXCLUDED` code. The UI, however, only treats a final hard exclusion as authoritative when verification is exactly `verified` (`shared/testAiCandidateStatus.ts` around lines 69–72).

**Why this matters:** The same candidate can carry a terminal hard-exclusion code in the final ledger while the UI refuses to display it as a verified hard exclusion. This violates the server-authoritative/fail-closed contract.

**Correct classification:** The upstream engine classification is the defect. The UI behavior is a downstream safeguard exposing the mismatch.

**Safest repair direction:** Require `verification === 'verified'` before emitting `FINAL_HARD_EXCLUDED`. Keep unmeasured rows in a review/context classification until a server receipt exists. Add a direct raw-input regression and a UI reconciliation regression.

### 2. The one-sale valuation policy and an existing test disagree

**Severity: High for repository integrity; policy decision required.**

`shared/testAiSalesEvidencePolicy.ts` currently sets a one-sale floor for the relevant sandbox category, and `server/testAiComparableEngine.ts` accepts the resulting current value. But `server/testAiMarketEvidence.test.ts` still expects two eligible sales to leave `primaryValue === null`. The focused audit run reported the failure as an expectation of `null` versus an actual value of `1100`.

This is not evidence of a provenance failure. It is a policy/test-contract inconsistency.

**Decision required:**

- If the temporary one-sale sandbox floor is intentional, update the stale test and document the sparse-evidence warning explicitly.
- If the one-sale floor is not intended for this route/category, restore the correct floor in the shared policy instead of weakening the test.

Do not change the test blindly. This boundary must be decided first because it controls whether a single matching sale may establish primary value.

### 3. Mercari decision wording can blame visual review before authoritative blockers

**Severity: High display defect.**

`client/src/components/test-ai/candidateFinalDecision.ts` around lines 94–101 checks for Mercari with no usable visual response before it evaluates final economic/provenance blocker codes. A row can therefore be described as “visual AI review was not completed” even when final analysis contains a more authoritative blocker such as:

- `PROVENANCE_UNVERIFIED`;
- `INVALID_PRICE`;
- `UNKNOWN_CURRENCY`;
- `NOT_COMPLETED`; or
- a required approval/identity blocker.

An existing regression locks in this precedence for a combination of blockers. That proves the behavior exists; it does not make the explanation correct for the audit requirement.

**Safest repair direction:** Derive the primary displayed reason from the final authoritative blocker set first. Only use the visual-review explanation when final analysis has no higher-priority economic, provenance, date, source, or identity blocker. Preserve the Autographs no-visual exception.

### 4. Evidence Review can summarize non-USD prices with a dollar sign

**Severity: Medium display/data-integrity defect.**

`client/src/components/test-ai/TestAiEvidenceReview.tsx` accepts positive numeric prices without requiring USD for current-market summaries and formats all summary endpoints as `$...`.

As a result, a CAD, EUR, or unknown-currency current-market row can be presented as a USD dollar amount. Other display utilities correctly preserve currency labels, so this is inconsistent.

**Safest repair direction:** Make the summary currency-aware. Either exclude non-USD/unknown prices from USD summaries or return a mixed/unknown-currency state with explicit labels. Never silently render an unknown currency as USD.

### 5. Current-market summary trusts stale legacy visual fields

**Severity: Medium display/reconciliation defect.**

`isConfirmedCurrentMarketMatch` in `TestAiEvidenceReview.tsx` treats legacy fields such as `visualReviewStatus === 'match'` or `visualIdentityResult === 'match'` as confirmation without requiring a versioned usable execution receipt.

The final-decision path uses the stricter `hasActualVisualResponse` definition. Therefore, Evidence Review can count and price a stale legacy “match” while the candidate card says that image review is unresolved or was not performed.

**Safest repair direction:** Reuse the authoritative execution-receipt predicate for current-market confirmation. Keep stale legacy labels visible only as historical/provider observations, never as confirmation for a price summary.

### 6. Autographs policy is bypassed on named-source early-return paths

**Severity: High source-policy consistency defect.**

The shared Autographs policy is correctly implemented in `server/testAiVisualSourceFilter.ts` for the main path. However, `getLelandsAuctionData` and `getPristineAuctionData` in `server/testAIRouter.ts` return `result.context` directly when there are no admitted sales, without applying the shared filter/relevance annotation path.

For Lelands, which supports Autographs, an empty-sales/context-only response can therefore lack:

- the explicit no-visual requirement;
- the no-visual rationale;
- shared Autographs relevance score/rank;
- object-type and signer evidence; and
- consistent context disposition fields.

The same route pattern exists for Pristine, although Pristine is currently Sports Cards-specific.

**Safest repair direction:** Centralize context-only/relevance annotation and run it for both the normal filtered path and the empty-sales path. Do not promote context rows to valuation merely to make their fields uniform.

### 7. 130point and PWCC do not share the same source-result contract

**Severity: High contract/coverage defect.**

The 130point and PWCC router branches merge Autographs listings and context rows but do not bind the same explicit source-role/economics/partition contract used by Sold-Comps, Mercari, Goldin, and named auction paths.

The 130point parser also computes a pre-filter `valuationEligible` flag based on price/date/USD before the shared relevance and admission policy. Downstream consumers must then interpret later `evidenceDisposition` fields correctly. There is no route-level matrix proving that this pre-filter flag cannot be mistaken for final valuation eligibility.

**Safest repair direction:** Define one named-source result DTO with explicit `sales`, `context`, `sourceAdapter`, `sourceRole`, `visualRequirement`, `visualReviewStatus`, `evidenceDisposition`, and provenance fields. Add route tests for Autographs and ordinary categories. Never infer final valuation from a provider’s pre-filter eligibility flag.

### 8. The test and runtime process does not prove browser/module parity

**Severity: High operational gap.**

`package.json` has no live browser/e2e parity script. `server/viteHmr.test.ts` tests port arithmetic, not a real served module or WebSocket handshake. No automated test starts the actual server, fetches the served page/module, checks a build identity, or confirms that the forwarded browser module is from the audited source.

The browser log contains repeated historical HMR failures and failed fetches. Those log entries do not prove the current page is failing now, but they show why source-level and helper-test results are insufficient.

**Safest repair direction:** Add a disposable runtime parity check that:

1. starts the actual development server;
2. fetches `index.html` and the referenced module;
3. checks a stable source/build fingerprint;
4. verifies the externally routable HMR URL/handshake; and
5. reloads the actual Test AI route before the final assertion.

### 9. Production startup can continue without the expected client build

**Severity: Medium operational defect.**

`server/_core/vite.ts` logs a missing build directory but continues to register static/fallback handlers. This can allow a production process to appear alive while serving a missing or stale client artifact.

**Safest repair direction:** In production mode, fail startup nonzero when the expected static directory or `index.html` is missing. Add an executable test for this path.

### 10. ErrorBoundary exposes raw stack traces

**Severity: Medium security/diagnostic defect.**

`client/src/components/ErrorBoundary.tsx` renders `error.stack` directly to users. This exposes implementation paths and details without a stable diagnostic ID or build identity.

**Safest repair direction:** Show a sanitized user-facing error and diagnostic ID. Keep the raw stack in a controlled, sanitized diagnostic channel only.

## Important risks, not yet proven as live defects

1. **WeakMap receipt lifetime:** normalization authority is stored in a `WeakMap`. That is fail-closed for serialization/cloning, but a future queue, cache, process split, or server-side serialization between normalization and final analysis will downgrade authority. No multi-process test exists.
2. **Permissive RPC schema:** the audit transport uses passthrough/loosely typed fields. Current downstream code rebuilds authority from server-signed evidence, so no direct exploit was proven. The schema remains a future regression risk.
3. **Provider-specific field aliases:** source rows may carry object type or identity data under adapter-specific aliases not covered by a common matrix. No provider-wide alias contract was proven.
4. **Multiple independent caps:** provider caps, detail-fetch caps, visual-review caps, and display caps exist at different layers. Individual tests are strong, but no all-source matrix proves they preserve the intended partition and count semantics end-to-end.
5. **130point query behavior:** title fallback is intentionally blocked when structured identity fields are absent. This may be correct, but the behavior is not documented and tested as a complete cross-source policy matrix.

## Boundary ledger

| Boundary | Result | Evidence / status |
|---|---|---|
| UI display | **Fail / mixed** | Technical codes still leak in final ledger/technical details; Mercari visual precedence can mask final blockers; current-market currency and stale-match issues exist. |
| Display reconciliation | **Mostly pass, with gaps** | Candidate ledger uses stable source/run/occurrence/receipt joins, but summary and final-ledger populations can differ and unresolved rows are folded into “Not used.” |
| Final decision model | **Fail for one raw-input path** | Unmeasured rows can receive `FINAL_HARD_EXCLUDED`; UI requires verified authority. |
| Final analysis/admission | **Mixed** | Normal route is fail-closed; direct/raw engine boundary is permissive and the one-sale policy conflicts with an existing test. |
| Canonical normalization | **Mixed** | Mercari/eBay signed paths are strong; 130point/PWCC/named-source contracts are incomplete. |
| Provenance/signing | **Pass in focused tested routes; runtime unverified** | Signed/forged/copied authority tests pass; no live route or multi-process parity proof. |
| RPC/transport | **Strong for eBay/Mercari; incomplete for named sources** | Transport tests exist for eBay/Mercari; no uniform 130point/PWCC/Collect/Sirius/Goldin field-survival contract. |
| Candidate ledger/merge | **Mostly pass** | Receipt/namespace protections are strong; broader display population can still create unresolved counts. |
| Scoring/filtering | **Mixed** | Shared Autographs scoring is well covered; six source-policy tests failed in the focused audit run and need named triage. |
| Category/item-type policy | **Mixed** | Autographs shared policy is strong but source early returns bypass it; provider alias coverage is incomplete. |
| Source adapter/retrieval | **Fail / incomplete** | Empty-sales paths and named-source partition contracts are inconsistent; caps/query policies differ without one matrix. |
| Runtime/browser parity | **Unverified** | No live parity test; historical HMR/failed-fetch logs exist. |

## Validation performed

- Independent read-only boundary audits: **4 completed**.
- Focused source-policy run reported by the audit: **413 passing / 6 failing across 7 files**, with the six failures in `server/testAiVisualSourceFilter.test.ts`. Exact failure names were not retained in the captured output.
- Focused market-evidence run reported one stale policy expectation: actual primary value `1100` versus expected `null`.
- Focused UI/status tests: **86 tests passed across 4 files** in the UI audit.
- `git diff --check`: passed at the clean audited state.
- TypeScript/build/live-browser parity: **not proven in this audit**. The attempted shell rerun was blocked by the WebDev environment wrapper before the commands started; that is not a test failure.
- Database/provider writes: none.

## Recommended repair order

1. **Do not change more Autographs logic yet.** First capture the six exact failing source-policy test names and classify each as stale expectation or real regression.
2. Fix the `unmeasured` versus `verified` terminal hard-exclusion classification and add raw-input plus UI regressions.
3. Decide the one-sale evidence policy and reconcile the shared policy, test expectation, UI wording, and sparse-evidence warning.
4. Fix final-reason precedence so authoritative economic/provenance/identity blockers outrank generic visual wording.
5. Make Evidence Review use the same authoritative visual receipt and currency rules as final decisions.
6. Normalize empty-sales named-source paths, starting with Lelands Autographs.
7. Add 130point/PWCC route-level transport/partition tests and a common named-source DTO contract.
8. Add runtime/module parity verification before making any further “live preview” claims.
9. Only after the above: run focused tests, adjacent suites, negative safeguards, TypeScript, production build, diff review, fresh live target/candidate testing, and final browser reload.

## What is not proven

- No provider request was made during this audit.
- No database contents were inspected or changed.
- No claim is made that every listed issue is currently affecting the live browser.
- No claim is made that the current branch is fully synchronized with the intended upstream baseline; the branch was reported as 18 commits ahead by the audit.
- No claim is made that all six source-policy failures are real regressions until their individual names and assertions are captured.
- No production build artifact or forwarded browser module was independently compared to the audited source in this pass.
