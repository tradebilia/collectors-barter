/** UI cancellation/correlation only; never identity, selection or pricing authority. */
function semanticValue(value: any): any {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Set) return [...value].sort().map(semanticValue);
  if (Array.isArray(value)) return value.map(semanticValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, semanticValue(value[key])]));
}
export type TestAiAnalysisLifecycleInputs = {
  leftTarget: unknown;
  rightTarget: unknown;
  leftSources: ReadonlySet<string>;
  rightSources: ReadonlySet<string>;
  leftSourceInputs: Record<string, unknown>;
  rightSourceInputs: Record<string, unknown>;
  leftEvidenceSummary: unknown;
  rightEvidenceSummary: unknown;
  useImageAnalyzer: boolean;
  useVisualFieldCompletion: boolean;
  cashAmount: string;
  cashPaidBy: 'item_a' | 'item_b';
  marketNews: unknown;
};
/** Value-equivalent PCGS targets, source projections and selector Sets stay stable.
 * Real selected-source content, HIPStamp metrics, evidence/material gates, image
 * controls, cash and transported news changes invalidate the prior request.
 * Array order stays significant: source rows can determine unchanged intake order.
 */
export function testAiAnalysisLifecycleKey(inputs: TestAiAnalysisLifecycleInputs): string {
  const selected = (sources: ReadonlySet<string>, data: Record<string, unknown>) =>
    Object.fromEntries(Object.keys(data).filter((key) => sources.has(key) || key === 'goldin').sort().map((key) => [key, data[key]]));
  return JSON.stringify(semanticValue({ ...inputs,
    leftSourceInputs: selected(inputs.leftSources, inputs.leftSourceInputs),
    rightSourceInputs: selected(inputs.rightSources, inputs.rightSourceInputs),
  }));
}
export function isCurrentTestAiFinalRequest(receipt: { runId: string; lifecycleKey: string } | null,
  issuedRunId: string | undefined, currentLifecycleKey: string): boolean {
  return Boolean(receipt && receipt.runId === issuedRunId && receipt.lifecycleKey === currentLifecycleKey);
}

/** Standalone sandbox audit: changing Item B can never start or cancel this work. */
export function testAiItemAuditLifecycleKey(input: { target: unknown; sources: unknown; summary: unknown }): string {
  return JSON.stringify(semanticValue(input));
}
