import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { trpc } from '@/lib/trpc';
import type { NormalizedEvidenceSummary } from '../../../../shared/testAiEvidenceNormalization';
import { testAiItemAuditLifecycleKey } from '../../../../shared/testAiAnalysisLifecycle';
import { stampCandidateDisplayIntake, type CandidateFinalDisplayOutcome } from '../../../../shared/testAiCandidateLedger';
import { buildMercariAnalysisSales } from '../../../../shared/testAiMercariTransport';
import { buildApprovalTargetImageInput, buildApprovalTargetInput } from '../../../../shared/testAiSoldCompsTransport';
import { isCollectionLotItemType } from '../../../../shared/testAiItemType';
import { isCurrentMarketContextSource } from '../../../../shared/testAiMarketContext';
import { TestAiCandidateDisplayProvider } from '../TestAiCandidateStatus';
import { TestAiEvidenceReview, evidenceReviewCandidates, type EvidenceReviewSource } from './TestAiEvidenceReview';

export type ItemAuditSource = EvidenceReviewSource & { kind?: string; role?: string };
export type ItemAuditTarget = { id?: number; title: string; category: string; itemType?: string | null; grade?: string | null;
  condition?: string | null; certificationCompany?: string | null; itemDetails?: string | null; estimatedValue?: number | null; primaryPhotoUrl?: string | null };

/** Sandbox-only audit intake, not the trade engine's operational submission list.
 * Retain exclusions for explanations; only the server can authorize pricing.
 * Round-robin sources before the explicit 120-row ceiling. No title/price dedupe.
 * Without a run ID, return the same intake before request-local display stamping.
 */
export function buildItemAuditSubmission(sources: ItemAuditSource[], runId?: string) {
  const groups = sources.map(source => {
    const marketplace = source.kind !== 'reference' && source.kind !== 'certification' && source.role !== 'valuation_guide';
    const contextOnly = isCurrentMarketContextSource({ sourceId: source.id, role: source.role, kind: source.kind });
    const displayRows = marketplace ? evidenceReviewCandidates(source) : [];
    const valuationRows = contextOnly ? [] : displayRows;
    // A server-final Mercari ledger is already signed and approval-bound. Do
    // not pass it through buildMercariAnalysisSales: that helper is the safe
    // projection for raw/browser rows and deliberately clears approval,
    // provenance, and valuation fields. Re-projecting the final ledger here
    // downgrades an otherwise admissible row immediately before Item A.
    const hasAuthoritativeMercariLedger = source.id === 'mercari_sold_comps'
      && Array.isArray(source.packet?.audit?.ledger)
      && source.packet.audit.ledger.length > 0;
    const transported = source.id === 'mercari_sold_comps' && !hasAuthoritativeMercariLedger
      ? buildMercariAnalysisSales({ listings: valuationRows, requestedMode: source.packet?.requestedMode }, true) : valuationRows;
    const stamp = (row: any) => ({ ...row, sourceId: row.sourceId ?? source.id });
    const transportedRows = transported.map(stamp);
    const displayRowsStamped = displayRows.map(stamp);
    return { ...source, role: contextOnly ? 'asking_price_context' : source.role,
      rows: contextOnly ? displayRowsStamped : transportedRows, auditRows: transportedRows };
  });
  const ordered: any[] = [];
  for (let index = 0; groups.some(group => index < group.auditRows.length); index += 1) {
    for (const group of groups) if (group.auditRows[index]) ordered.push(group.auditRows[index]);
  }
  const stamped = runId === undefined ? ordered : stampCandidateDisplayIntake(ordered, 'item_a', runId);
  const byInput = new Map(ordered.map((row, index) => [row, { ...stamped[index], auditOmittedByCap: index >= 120 }]));
  return { sources: groups.map(group => ({ ...group, packet: undefined, auditRows: undefined, rows: group.rows.map(row => byInput.get(row) ?? row) })),
    submitted: stamped.slice(0, 120), omitted: Math.max(0, ordered.length - 120) };
}
const PENDING_SOURCE_STATUSES = new Set(['loading', 'pending', 'running', 'fetching']);

/** Only source work represented by this audit may delay its dispatch. */
export function isItemAuditSourcePending(sources: ReadonlyArray<ItemAuditSource>): boolean {
  return sources.some(source => PENDING_SOURCE_STATUSES.has(String(source.status ?? '').toLowerCase()));
}

// Display schema field names only, never issue messages, values or arbitrary object keys.
const SAFE_ERROR_PATH_FIELDS = new Set(('item sales evidenceSummary title category itemType grade condition certificationCompany itemDetails estimatedValue approvalTargetImageReference '
  + 'identity identityReadiness evidenceSufficiency alignedSources reviewFlags marketEvidence marketEvidencePriceSummaries selectedSourceSummaries sourceDecisions guideAnchors sources '
  + 'id kind role status field message label value sourceId sourceLabel selectedGrade matchType recordedSales lastSaleDate totalRecordedSales currency retrievedAt expiresAt sourceQuery sourceRecordId form provenanceToken '
  + 'metadataFieldComparisons targetField candidateField targetValue candidateValue visualRequirement visualExecution visualReviewStatus visualDifferences evidenceDisposition evidenceReasons '
  + 'price date url displayCorrelation side runId occurrenceKey requestOccurrenceRef version observationId canonicalTransactionId').split(' '));
function safeAuditErrorPath(path: unknown): string | null {
  if (!Array.isArray(path) || !path.length || !['item', 'sales', 'evidenceSummary'].includes(path[0])) return null;
  return path.slice(0, 12).map(segment => typeof segment === 'number' && Number.isSafeInteger(segment) && segment >= 0 && segment <= 100000
    ? String(segment) : typeof segment === 'string' && SAFE_ERROR_PATH_FIELDS.has(segment) ? segment : '[field]').join('.');
}
function itemAuditRequestError(error: unknown): string {
  const failure = error as { data?: { code?: string; zodError?: any }; shape?: { data?: { code?: string; zodError?: any } }; code?: string; message?: string } | null;
  const data = failure?.data ?? failure?.shape?.data;
  const code = data?.code ?? failure?.code;
  let detail: string;
  if (code === 'BAD_REQUEST') {
    let issues: unknown = data?.zodError?.issues ?? data?.zodError?.errors;
    // Default tRPC Zod errors arrive as a JSON issue array in message; never render it.
    if (!Array.isArray(issues) && typeof failure?.message === 'string' && failure.message.length <= 65536) {
      try { issues = JSON.parse(failure.message); } catch { /* Non-Zod validation failure. */ }
    }
    const paths = Array.isArray(issues) ? issues.map(issue => safeAuditErrorPath(issue?.path))
      : Object.keys(data?.zodError?.fieldErrors ?? {}).map(field => safeAuditErrorPath(field.split('.')));
    const safePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))].slice(0, 8);
    detail = `Input validation failed${safePaths.length ? ` at ${safePaths.join(', ')}` : ''}. Review the audit input and retry.`;
  } else if (code === 'FORBIDDEN' || code === 'UNAUTHORIZED') {
    detail = 'Permission denied. Sign in with an authorized admin account before retrying.';
  } else if (code === 'INTERNAL_SERVER_ERROR') {
    detail = 'The server could not finish the final audit checks. Retry the audit; this is not a candidate rejection.';
  } else if (code === 'TIMEOUT') {
    detail = 'The final audit did not respond before the request timed out. Retry the audit; this is not a candidate rejection.';
  } else {
    detail = 'Request/network error. Check the connection and retry the audit.';
  }
  return `Item A final audit request failed. ${detail} No final decision is available for this run.`;
}

export function TestAiItemAudit({ item, displayItem = item, summary, sources, children }: {
  item: ItemAuditTarget; displayItem?: ItemAuditTarget; summary: NormalizedEvidenceSummary; sources: ItemAuditSource[]; children?: ReactNode;
}) {
  const sourcePending = isItemAuditSourcePending(sources);
  const collectionLot = isCollectionLotItemType(item.itemType);
  const target = { ...buildApprovalTargetInput(item), estimatedValue: item.estimatedValue ?? undefined,
    ...buildApprovalTargetImageInput({ primaryPhotoUrl: item.primaryPhotoUrl ?? undefined }, false) };
  // No image dispatch: preserve only the binding required to verify prior source reviews.
  delete (target as Record<string, unknown>).imageUrl;
  // Source labels/status/messages/debug/metrics are not audit input. Preserve all
  // candidate evidence, provenance/source-run bindings and summary material/guide/coverage gates.
  const unstampedSales = buildItemAuditSubmission(sources).submitted.map(row => {
    // The display merge allocates object-local fallback IDs. Equivalent provider
    // copies must not invalidate an audit; explicit ranking/receipt IDs stay intact.
    if (/^local-occurrence:\d+$/.test(row.candidateDisplayOccurrenceKey ?? '')) {
      const { candidateDisplayOccurrenceKey: _local, ...evidence } = row;
      return evidence;
    }
    return row;
  });
  const key = testAiItemAuditLifecycleKey({ target, sources: unstampedSales, summary });
  const latestKey = useRef(key); latestKey.current = key;
  const autoBlocked = useRef(false); autoBlocked.current = sourcePending || collectionLot;
  const mounted = useRef(true);
  const counter = useRef(0);
  const activeRun = useRef('');
  const attemptedKey = useRef('');
  const autoTimer = useRef<number | null>(null);
  const cancelAutoRun = () => {
    if (autoTimer.current !== null) window.clearTimeout(autoTimer.current);
    autoTimer.current = null;
  };
  const [receipt, setReceipt] = useState<{ key: string; outcome: CandidateFinalDisplayOutcome; sources: ItemAuditSource[]; snapshot: any; omitted: number } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const audit = trpc.testAI.auditItemValuation.useMutation();
  const runRef = useRef<() => void>(() => {});
  const run = () => {
    cancelAutoRun();
    const runId = `item-a-audit-${++counter.current}`;
    const intake = buildItemAuditSubmission(sources, runId);
    activeRun.current = runId; attemptedKey.current = key;
    setReceipt(null); setFailure(null);
    audit.mutate({ item: target, sales: intake.submitted, evidenceSummary: summary }, {
      onSuccess: data => {
        if (!mounted.current || latestKey.current !== key || activeRun.current !== runId || data.side !== 'item_a') return;
        setReceipt({ key, sources: intake.sources, omitted: intake.omitted, snapshot: data.snapshot,
          outcome: { side: 'item_a', requestRunId: runId, submitted: intake.submitted,
            finalRows: data.snapshot.profile.comparables, analysisRunId: data.analysisRunId } });
      },
      onError: error => {
        if (!mounted.current || latestKey.current !== key || activeRun.current !== runId) return;
        setFailure({ key, message: itemAuditRequestError(error) });
      },
    });
  };
  runRef.current = run;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; cancelAutoRun(); }; }, []);
  useEffect(() => {
    if (attemptedKey.current !== key) { attemptedKey.current = ''; activeRun.current = ''; }
  }, [key]);
  useEffect(() => {
    if (sourcePending || attemptedKey.current === key || collectionLot) return;
    const timer = window.setTimeout(() => {
      if (autoTimer.current === timer) autoTimer.current = null;
      // Recheck at dispatch, including a manual run that happened during debounce.
      if (!mounted.current || latestKey.current !== key || autoBlocked.current || attemptedKey.current === key) return;
      runRef.current();
    }, 300);
    autoTimer.current = timer;
    return () => { window.clearTimeout(timer); if (autoTimer.current === timer) autoTimer.current = null; };
  }, [key, sourcePending, collectionLot]);
  const busy = sourcePending;
  const current = receipt?.key === key && !busy ? receipt : null;
  const error = failure?.key === key ? failure.message : null;
  return <div className="space-y-3" aria-label="Item A standalone valuation audit">
    <section className="rounded-lg border border-cyan-800/40 bg-slate-900/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-sm font-semibold text-cyan-200">Item A — final valuation audit</h3>
          <p className="mt-1 text-xs text-slate-400">Runs automatically after source requests settle. No Item B, trade comparison, extra image review, or AI model call is required.</p></div>
        <button type="button" onClick={run} disabled={audit.isPending || busy} className="rounded-lg bg-cyan-800 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
          {audit.isPending ? 'Auditing Item A…' : busy ? 'Waiting for sources…' : 'Re-run Item A audit'}
        </button>
      </div>
      <p role="status" className="mt-2 text-xs text-slate-300">{error ?? (current ? 'Final Item A audit completed. The cards below show the recorded valuation decisions.' : busy ? 'Waiting for source retrieval / visual review. Final audit starts automatically when those requests settle.' : audit.isPending ? 'Final admission and pricing checks are running for Item A.' : 'Item A final audit is queued; no final decision has been recorded yet.')}</p>
      {current && <div className="mt-2 space-y-1 text-xs text-slate-300">
        <p><strong>Item A value status:</strong> {current.snapshot.profile.valuationBasisReason}</p>
        {typeof current.snapshot.profile.primaryValue === 'number' && current.snapshot.profile.primaryValue > 0
          ? <p><strong>Supported estimate:</strong> USD {current.snapshot.profile.primaryValue.toLocaleString()} · {current.snapshot.profile.valuationBasis.replace(/_/g, ' ')}</p>
          : <p className="text-amber-200">A defensible value cannot currently be established. This is not a zero-value item.</p>}
        {current.omitted > 0 && <p className="text-amber-200">{current.omitted} candidates were not submitted because this audit is capped at 120 records. Their cards identify the audit cap; no decision is invented.</p>}
      </div>}
    </section>
    <TestAiCandidateDisplayProvider side="item_a" outcome={current?.outcome} auditFailure={error}>
      <TestAiEvidenceReview item={displayItem} side="left" summary={summary} sources={current?.sources ?? sources} />
      {children}
    </TestAiCandidateDisplayProvider>
  </div>;
}
