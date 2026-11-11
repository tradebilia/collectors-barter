import React, { useEffect, useRef, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import type { NormalizedEvidenceSummary } from '../../../../shared/testAiEvidenceNormalization';
import { testAiItemAuditLifecycleKey } from '../../../../shared/testAiAnalysisLifecycle';
import { stampCandidateDisplayIntake, type CandidateFinalDisplayOutcome } from '../../../../shared/testAiCandidateLedger';
import { buildMercariAnalysisSales } from '../../../../shared/testAiMercariTransport';
import { buildApprovalTargetImageInput } from '../../../../shared/testAiSoldCompsTransport';
import { isCollectionLotItemType } from '../../../../shared/testAiItemType';
import { isCurrentMarketContextSource } from '../../../../shared/testAiMarketContext';
import { TestAiCandidateDisplayProvider } from '../TestAiCandidateStatus';
import { TestAiEvidenceReview, evidenceReviewCandidates, type EvidenceReviewSource } from './TestAiEvidenceReview';

export type ItemAuditSource = EvidenceReviewSource & { kind?: string; role?: string };
export type ItemAuditTarget = { id?: number; title: string; category: string; itemType?: string; grade?: string;
  condition?: string; certificationCompany?: string | null; itemDetails?: string; estimatedValue?: number; primaryPhotoUrl?: string | null };

/** Sandbox-only audit intake, not the trade engine's operational submission list.
 * Retain exclusions for explanations; only the server can authorize pricing.
 * Round-robin sources before the explicit 120-row ceiling. No title/price dedupe.
 */
export function buildItemAuditSubmission(sources: ItemAuditSource[], runId: string) {
  const groups = sources.map(source => {
    const marketplace = source.kind !== 'reference' && source.kind !== 'certification' && source.role !== 'valuation_guide';
    const contextOnly = isCurrentMarketContextSource({ sourceId: source.id, role: source.role, kind: source.kind });
    const displayRows = marketplace ? evidenceReviewCandidates(source) : [];
    const valuationRows = contextOnly ? [] : displayRows;
    const transported = source.id === 'mercari_sold_comps'
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
  const stamped = stampCandidateDisplayIntake(ordered, 'item_a', runId);
  const byInput = new Map(ordered.map((row, index) => [row, { ...stamped[index], auditOmittedByCap: index >= 120 }]));
  return { sources: groups.map(group => ({ ...group, packet: undefined, auditRows: undefined, rows: group.rows.map(row => byInput.get(row) ?? row) })),
    submitted: stamped.slice(0, 120), omitted: Math.max(0, ordered.length - 120) };
}
function procedure(key: readonly unknown[] | undefined): string | null {
  const path = key?.[0];
  return Array.isArray(path) && path[0] === 'testAI' && typeof path[1] === 'string' ? path[1] : null;
}

export function TestAiItemAudit({ item, displayItem = item, summary, sources }: {
  item: ItemAuditTarget; displayItem?: ItemAuditTarget; summary: NormalizedEvidenceSummary; sources: ItemAuditSource[];
}) {
  const fetching = useIsFetching({ predicate: query => {
    const name = procedure(query.queryKey);
    return name !== null && !['getMyInventory', 'getAllSandboxItems'].includes(name);
  } });
  const reviewing = useIsMutating({ predicate: mutation => {
    const name = procedure(mutation.options.mutationKey);
    return name !== null && ['reviewEbayVisualData', 'readCertificationFromImage'].includes(name) && !mutation.state.isPaused;
  } });
  const target = { title: item.title, category: item.category, itemType: item.itemType, grade: item.grade,
    condition: item.condition, certificationCompany: item.certificationCompany, itemDetails: item.itemDetails,
    estimatedValue: item.estimatedValue, ...buildApprovalTargetImageInput({ primaryPhotoUrl: item.primaryPhotoUrl ?? undefined }, false) };
  // No image dispatch: preserve only the binding required to verify prior source reviews.
  delete (target as Record<string, unknown>).imageUrl;
  const key = testAiItemAuditLifecycleKey({ target, sources, summary });
  const latestKey = useRef(key); latestKey.current = key;
  const mounted = useRef(true);
  const counter = useRef(0);
  const activeRun = useRef('');
  const attemptedKey = useRef('');
  const [receipt, setReceipt] = useState<{ key: string; outcome: CandidateFinalDisplayOutcome; sources: ItemAuditSource[]; snapshot: any; omitted: number } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const audit = trpc.testAI.auditItemValuation.useMutation();
  const runRef = useRef<() => void>(() => {});
  const run = () => {
    const runId = `item-a-audit-${++counter.current}`;
    const intake = buildItemAuditSubmission(sources, runId);
    activeRun.current = runId; attemptedKey.current = key;
    setReceipt(null); setFailure(null);
    audit.mutate({ item: target, sales: intake.submitted, evidenceSummary: summary }, {
      onSuccess: data => {
        if (!mounted.current || latestKey.current !== key || activeRun.current !== runId) return;
        setReceipt({ key, sources: intake.sources, omitted: intake.omitted, snapshot: data.snapshot,
          outcome: { side: 'item_a', requestRunId: runId, submitted: intake.submitted,
            finalRows: data.snapshot.profile.comparables, analysisRunId: data.analysisRunId } });
      },
      onError: () => {
        if (!mounted.current || latestKey.current !== key || activeRun.current !== runId) return;
        setFailure({ key, message: 'Item A final audit request failed. No final decision is available for this run. Retry the audit; this does not mean the candidates were rejected.' });
      },
    });
  };
  runRef.current = run;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (attemptedKey.current !== key) { attemptedKey.current = ''; activeRun.current = ''; }
  }, [key]);
  useEffect(() => {
    if (fetching + reviewing > 0 || attemptedKey.current === key || isCollectionLotItemType(item.itemType)) return;
    const timer = window.setTimeout(() => runRef.current(), 300);
    return () => window.clearTimeout(timer);
  }, [key, fetching, reviewing, item.itemType]);
  const busy = fetching + reviewing > 0;
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
    <TestAiCandidateDisplayProvider side="item_a" outcome={current?.outcome}>
      <TestAiEvidenceReview item={displayItem} side="left" summary={summary} sources={current?.sources ?? sources} />
    </TestAiCandidateDisplayProvider>
  </div>;
}
