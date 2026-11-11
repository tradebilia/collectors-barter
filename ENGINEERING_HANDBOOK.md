# Tradebilia Engineering Handbook

This handbook defines the minimum engineering process for changes to Tradebilia, especially Test AI, marketplace retrieval, candidate matching, valuation, provenance, and user-facing decision reporting.

## 1. Project-start protocol

Before making code changes at the start of a session or a new investigation:

1. Pull the latest GitHub repository and verify the active branch, commit, remote tracking state, and working tree.
2. Read project documentation in this order when the files exist:
   1. `PROJECT_CONTEXT.md`
   2. `AI_RULES.md`
   3. `ROADMAP.md`
   4. `NEXT_SESSION_PROMPT.md`
   5. `DATABASE_SCHEMA.md`
   6. `API_ARCHITECTURE.md`
   7. `KNOWN_ISSUES.md`
3. Read the current project handoff and any relevant source-specific or feature-specific documentation.
4. Summarize the project understanding before coding:
   - current development phase;
   - systems that are unfinished or under test;
   - architectural boundaries and safety constraints;
   - known failures and stale assumptions;
   - safest next development task.
5. Confirm whether the task is development-only, read-only, or authorized to modify data. Never infer permission for database writes, migrations, seed scripts, destructive scripts, provider configuration, publishing, or domain changes.
6. If a required document is absent, record that fact. Do not invent its contents.

A passing build or a green helper test does not replace this project-understanding step.

## 2. Standard boundary-by-boundary debugging protocol

Use this protocol for any defect that crosses more than one layer, produces a user-visible contradiction, or has already survived one attempted fix. The purpose is to stop partial repairs from being reported as complete fixes.

### 2.1 Freeze the exact failure

Capture the exact user-visible failure before changing code:

- page and route;
- target item and category/item type;
- source and source mode;
- candidate title, price, currency, date, images, and provider identifiers;
- score, rank, displayed status, final decision, and displayed reason;
- run counts and summary values;
- screenshot or exact text when supplied by the user.

Treat the real target/candidate pair as the acceptance fixture. Do not substitute a simpler or identical-title fixture unless it is clearly labeled as supplemental coverage.

### 2.2 Start from the final visible result and work backward

Trace the exact failing occurrence backward through every boundary. Record the first point where an expected field, status, identity, or decision changes.

The minimum trace is:

1. **UI display** — What component produced the label, reason, score, count, and price?
2. **Display reconciliation** — Did the UI use the final ledger, a stale source row, or a separate display projection?
3. **Final decision model** — What final valuation-use code, blocker, identity state, and reason details were present?
4. **Final analysis/admission** — Why was the candidate selected, held, context-only, rejected, or omitted?
5. **Canonical normalization** — Were price, date, currency, source role, visual requirement, object type, and identity facts normalized correctly?
6. **Provenance and signing** — Did server-authoritative evidence, approval bindings, and normalization receipts survive? Are inbound browser fields being trusted incorrectly?
7. **RPC and transport** — Did the request schema accept and preserve every required field? Did projection or serialization strip it?
8. **Candidate ledger and merge** — Did source, visual, audit, and final rows merge by the same stable identity?
9. **Scoring and deterministic filters** — Were the right fields parsed, normalized, awarded points, and compared? Did a display-only match differ from the scorer’s witness?
10. **Category/item-type policy** — Did category-specific object, form, grade, signer, authentication, inscription, lot, packaging, or product-role rules apply correctly?
11. **Source adapter and retrieval** — Did the provider return the expected record, fields, price basis, status, image, and identifier? Were fallback queries or caps involved?
12. **Runtime and preview parity** — Is the browser running the current code? Check server status, logs, HMR/WebSocket connection, served module content, and reload timing.

If a layer does not apply, mark it `not applicable` with a reason. Do not silently skip it.

### 2.3 Build a boundary ledger

For each layer, record the following:

| Boundary | Expected | Observed | Pass/fail | Evidence | Repair needed |
|---|---|---|---|---|---|
| UI display |  |  |  |  |  |
| Display reconciliation |  |  |  |  |  |
| Final decision |  |  |  |  |  |
| Final analysis |  |  |  |  |  |
| Canonical normalization |  |  |  |  |  |
| Provenance/signing |  |  |  |  |  |
| RPC/transport |  |  |  |  |  |
| Candidate ledger |  |  |  |  |  |
| Scoring/filtering |  |  |  |  |  |
| Category policy |  |  |  |  |  |
| Source adapter |  |  |  |  |  |
| Runtime/browser parity |  |  |  |  |  |

The investigation is incomplete until every applicable row has evidence.

### 2.4 Separate blockers from downstream symptoms

List every blocker found, not only the first one. Classify each as:

- **Primary blocker:** the earliest condition that prevents the intended outcome.
- **Independent blocker:** another condition that would still fail after the primary blocker is repaired.
- **Downstream symptom:** a later message or status caused by an earlier blocker.
- **Display defect:** the underlying decision is correct, but the UI explains it incorrectly.
- **Runtime parity defect:** the source is repaired but the running browser or server is stale.

Do not report a downstream symptom as the root cause. Do not stop after repairing only the first blocker.

### 2.5 Repair the narrowest complete boundary

Implement the smallest repair that fixes the complete path while preserving unrelated safeguards.

Every repair must state:

- which boundary changed;
- which field or decision was lost or misclassified;
- why the change belongs at that boundary rather than a downstream workaround;
- which categories, sources, and modes are intentionally unchanged;
- what must remain fail-closed;
- whether the UI wording is being changed independently from admission logic.

Never weaken a server-authoritative gate merely to make a card say `used`. Browser-carried claims, display scores, and client labels are not proof of valuation eligibility.

### 2.6 Add reproduction-quality regressions

The regression must reproduce the actual failure shape. Prefer a route-level or end-to-end test when the defect crosses transport, signing, normalization, final analysis, and UI reconciliation.

Add all of the following when applicable:

- the exact real target metadata;
- the exact candidate title and source mode;
- the exact missing, malformed, or conflicting field;
- the expected final decision and plain-language reason;
- a positive test proving the intended candidate is admitted;
- negative tests proving explicit conflicts remain excluded;
- a transport test proving critical fields survive the RPC boundary;
- a runtime/browser parity check when stale code or HMR may be involved.

A synthetic helper test may supplement the regression, but cannot be the only proof for a live-path defect.

### 2.7 Validate in layers

Run validation in this order:

1. Focused regression for the exact failure.
2. Adjacent transport, normalization, final-analysis, and UI suites.
3. Category and source-policy suites for unaffected behavior.
4. Negative safety cases and economic/provenance/date/currency safeguards.
5. TypeScript or equivalent static checks.
6. Production build.
7. Diff and repository hygiene review:
   - `git diff --check`;
   - no temporary diagnostics;
   - no credentials or secret values;
   - no generated artifacts unless intended;
   - no unrelated file changes.
8. Live development verification using the real target/candidate path.
9. Runtime parity verification:
   - server is healthy;
   - browser is using the current served module;
   - HMR/WebSocket is connected or the page was deliberately reloaded;
   - logs correspond to the current run.
10. Re-run the final visible assertion after all changes and after any reload.

Do not call the issue fixed until the exact user-visible failure is gone and all independent blockers have been checked.

## 3. Reporting standard

Every investigation report must distinguish evidence from assumptions.

Use this structure:

```markdown
## Investigation status
- Status: Proven fixed / Partially repaired / Blocked / Not reproduced
- Exact failure tested: <target, source, candidate, and visible message>
- Current branch and commit: <branch / commit>

## What actually failed
1. <primary blocker and boundary>
2. <independent blocker and boundary>
3. <display or runtime symptom, if applicable>

## Boundary trace
| Boundary | Result | Evidence |
|---|---|---|
| UI display | pass/fail | <test, log, screenshot, or payload> |
| ... | ... | ... |

## Changes made
- <file or module>: <complete boundary repair>
- <file or module>: <regression or explanation repair>

## Safeguards preserved
- <negative cases and unrelated categories/sources>

## Validation performed
- Focused tests: <result>
- Neighboring tests: <result>
- Static checks: <result>
- Production build: <result>
- Live browser verification: <result>
- Runtime/module parity: <result>

## What is not proven
- <unverified sources, categories, provider behavior, or production effects>
```

Use precise confidence language:

- **Proven fixed:** exact reproduction passes in the live path and regression coverage exists.
- **Partially repaired:** one or more boundaries pass, but the full path is not yet proven.
- **Likely cause:** evidence points to a cause, but reproduction or boundary proof is incomplete.
- **Not reproduced:** the reported failure could not be recreated; do not claim a fix.
- **Unverified:** no evidence was collected for that boundary.

Never say “fixed” when the result was only inferred from a helper test, a code read, or a changed checkpoint.

## 4. Test AI and valuation-specific rules

The following rules are mandatory for marketplace and valuation investigations:

- `USED IN VALUATION` is a final decision, not a ranking result, metadata match, visual match, or source-stage eligibility result.
- A candidate shown in Evidence Review is not automatically a comparable.
- Category-specific no-visual policies must retain price/context data without claiming an image match.
- A source-retrieved price does not prove a completed sale, final accepted offer, correct currency, or safe economic evidence unless the source contract and server-side checks establish it.
- Mercari sold-mode exceptions may allow an Unknown sale date only under the approved server-authoritative policy; they must not silently relax price, cancellation, future-date, provenance, or identity safeguards.
- Scores must be traced from potential points to earned points to final ranking and final admission. A displayed `MATCH` with zero earned points is a defect unless the field has no scoring weight.
- Unknown means evidence was not supplied. It must not be silently converted into a mismatch; explicit conflicts must remain conflicts.
- Autographs require object-type discipline. Baseball words in a title do not make a listing a baseball when the physical object is a poster, book, card, bat, jersey, ticket, or other object.
- Technical reason codes must be translated into plain English at the UI boundary. Do not show a downstream visual/provenance message when a category or metadata rule was the actual blocker.
- Preserve candidate caps, source boundaries, Collection/Lot safeguards, provenance checks, and fail-closed approval behavior while debugging.

## 5. Change and handoff checklist

Before handing a repair to the user:

- [ ] Exact user failure captured.
- [ ] Latest repository and branch verified.
- [ ] Required project documents read or absence recorded.
- [ ] All applicable boundaries traced.
- [ ] Primary and independent blockers separated.
- [ ] Exact-path regression added.
- [ ] Negative safeguards tested.
- [ ] Transport and runtime parity checked.
- [ ] Focused and neighboring tests passed.
- [ ] TypeScript/static checks passed.
- [ ] Production build passed.
- [ ] Diff hygiene checked.
- [ ] No credentials, database writes, migrations, seeds, destructive scripts, publishing, or domain changes were performed without explicit authorization.
- [ ] Live result rechecked after reload/restart.
- [ ] Report states what is proven and what remains unverified.
- [ ] Development checkpoint saved before delivery when project tooling requires it.

## 6. Example: Autographs/Mercari failure

The Barry Bonds example is the reference pattern for this protocol. The visible symptom was “Not used — review required,” but the complete investigation found multiple independent layers:

1. Autographs no-visual policy was not consistently preserved through source normalization and transport.
2. Server-signed provenance was missing at a final audit boundary.
3. An explicit target value of “no inscription” was incorrectly treated as unresolved when the candidate was silent.
4. Final Autographs identity admission used generic title/identity assumptions instead of verified signed-item market relevance.
5. Physical object classification allowed sport-theme words to overstate a listing’s relevance.
6. UI wording blamed missing visual review for metadata and identity exclusions.
7. Browser HMR served stale modules because the forwarded WebSocket port was wrong.

The final proof used the actual target, the actual Mercari candidate, the complete audit path, a fresh browser module, negative safeguards, and live summary counts. This is the required standard for future cross-layer defects.
