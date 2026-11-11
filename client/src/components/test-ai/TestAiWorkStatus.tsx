import React, { useEffect, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

function procedureName(key: readonly unknown[] | undefined): string | null {
  const path = key?.[0];
  if (!Array.isArray(path) || path[0] !== 'testAI') return null;
  return typeof path[1] === 'string' ? path[1] : null;
}
const inventoryQueries = new Set(['getMyInventory', 'getAllSandboxItems']);
const analysisProcedures = new Set(['analyzeTrade', 'analyze', 'auditItemValuation']);
const imageProcedures = new Set(['reviewEbayVisualData', 'readCertificationFromImage']);

/** Watches existing requests only: never starts, refetches, retries or cancels work. */
export function TestAiWorkStatus() {
  const requestCount = useIsFetching({ predicate: query => {
    const name = procedureName(query.queryKey);
    return name !== null && !inventoryQueries.has(name);
  } });
  const imageCount = useIsMutating({ predicate: mutation => {
    const name = procedureName(mutation.options.mutationKey);
    return name !== null && imageProcedures.has(name) && !mutation.state.isPaused;
  } });
  const analysisCount = useIsMutating({ predicate: mutation => {
    const name = procedureName(mutation.options.mutationKey);
    return name !== null && analysisProcedures.has(name) && !mutation.state.isPaused;
  } });
  return <TestAiPendingStatus requestCount={requestCount + imageCount} analysisCount={analysisCount} />;
}

export function TestAiPendingStatus({ requestCount, analysisCount }: { requestCount: number; analysisCount: number }) {
  const active = requestCount > 0 || analysisCount > 0;
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!active) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  if (!active) return null;
  return <div className="sticky top-3 z-30 flex items-start gap-3 rounded-lg border border-cyan-500/50 bg-slate-950/95 p-4 shadow-lg" role="status" aria-live="polite" aria-atomic="true" aria-busy="true" data-testid="sandbox-work-status">
    <span aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-[3px] border-cyan-900 border-t-cyan-300 motion-safe:animate-spin" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-cyan-200">{analysisCount > 0 ? 'Running AI valuation analysis' : 'Compiling source data'}</p>
      <p className="mt-1 text-xs text-slate-300">{requestCount > 0 ? `${requestCount} request${requestCount === 1 ? '' : 's'} pending` : `${analysisCount} ${analysisCount === 1 ? 'analysis' : 'analyses'} pending`}{analysisCount > 0 && requestCount > 0 ? ' · AI analysis also pending' : ''}. Results already returned remain visible below.</p>
      <p className="mt-1 text-xs tabular-nums text-slate-400" aria-hidden="true">Elapsed: {elapsed}s</p>
      {elapsed >= 90 && <p className="mt-2 text-xs text-amber-200">Taking longer than usual. Still waiting for a response; a stalled request cannot be confirmed from elapsed time alone.</p>}
    </div>
  </div>;
}
