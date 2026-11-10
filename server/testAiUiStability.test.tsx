// @vitest-environment jsdom
import React, { act, useCallback, useEffect, useMemo } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { useTestAiContentState, useTestAiSourceDisplayData, testAiUiContentEqual } from '../client/src/hooks/useTestAiUiStability';
import { normalizeTestAiEvidence, type EvidenceSourceObservation, type NormalizedEvidenceSummary } from '../shared/testAiEvidenceNormalization';
import { sourceEvidenceMessage, sourceEvidenceStatus, sourceReviewedGoldinSales } from '../shared/testAiSourceDisplay';

type Packet = { listings: Array<{ id: string; title: string; price: number; visualReviewStatus?: string; evidenceDisposition?: string }>; metrics?: { count: number; avg: number } };
const target = { title: 'Metroid NES 1986', category: 'video_games', itemType: 'game' };
const packet = (price = 150): Packet => ({ listings: [{ id: 'item-1', title: target.title, price, visualReviewStatus: 'match', evidenceDisposition: 'valuation_eligible' }], metrics: { count: 1, avg: price } });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

function marketObservation(id: string, data: any): EvidenceSourceObservation {
  const rows = data?.listings ?? [];
  const prices = rows.filter((row: any) => row.visualReviewStatus === 'match' || row.evidenceDisposition === 'valuation_eligible').map((row: any) => row.price);
  return { id, label: id, kind: id === 'ebay_active' ? 'market_current' : 'market_completed', status: sourceEvidenceStatus(data),
    market: { returnedRecordCount: rows.length, currentValueSaleCount: prices.length, currentValuePrices: prices,
      analyzerSubmittedSaleCount: prices.length, analyzerSubmittedPrices: prices }, message: sourceEvidenceMessage(data) };
}

describe('TestAI UI source-input and state feedback stability', () => {
  it('memoizes failed source wrappers and eBay merges by actual data/failure/visual inputs', async () => {
    const raw = packet();
    const review = { visualReviewListings: raw.listings };
    const seen: any[] = [];
    function Probe({ failed, visual = review, data = raw }: { failed: boolean; visual?: typeof review | null; data?: Packet }) {
      const display = useTestAiSourceDisplayData(data, failed, visual);
      seen.push(display);
      return null;
    }
    await act(async () => root.render(<Probe failed />));
    await act(async () => root.render(<Probe failed />));
    expect(seen[1]).toBe(seen[0]);
    expect(seen[1].data).toBe(seen[0].data);
    expect(seen[1].evidenceData).toBe(seen[0].evidenceData);
    expect(sourceEvidenceStatus(seen[1].data)).toBe('partial');
    expect(seen[1].data.listings).toBe(raw.listings);
    expect(raw).not.toHaveProperty('error');
    await act(async () => root.render(<Probe failed={false} />));
    expect(seen[2].data).toBe(raw);
    expect(sourceEvidenceStatus(seen[2].data)).toBe('success');
    await act(async () => root.render(<Probe failed={false} visual={null} data={packet(175)} />));
    expect(seen[3].evidenceData).toBe(seen[3].data);
    expect(seen[3].data.listings[0].price).toBe(175);
    await act(async () => root.render(<Probe failed />));
    const failedRaw = seen[4].data;
    await act(async () => root.render(<Probe failed visual={{ visualReviewListings: packet(180).listings }} />));
    expect(seen[5].data).toBe(failedRaw);
    expect(seen[5].evidenceData.visualReviewListings[0].price).toBe(180);
    expect(seen[5].evidenceData.listings[0].price).toBe(150);
  });

  it('stabilizes a failed missing response and clears it when failure is removed', async () => {
    const seen: any[] = [];
    function Missing({ failed }: { failed: boolean }) {
      seen.push(useTestAiSourceDisplayData(undefined, failed));
      return null;
    }
    await act(async () => root.render(<Missing failed />));
    await act(async () => root.render(<Missing failed />));
    expect(seen[1]).toBe(seen[0]);
    expect(sourceEvidenceStatus(seen[1].data)).toBe('error');
    expect(seen[1].data.listings).toEqual([]);
    await act(async () => root.render(<Missing failed={false} />));
    expect(seen[2].data).toBeUndefined();
    expect(seen[2].evidenceData).toBeUndefined();
    expect(sourceEvidenceStatus(seen[2].data)).toBe('idle');
  });

  it('fresh equivalent source objects and inline reporting callbacks settle; real price/status changes commit once', async () => {
    let renders = 0;
    const commits: NormalizedEvidenceSummary[] = [];
    const setters: unknown[] = [];
    function Evidence({ data, onSummary }: { data: any; onSummary: (summary: NormalizedEvidenceSummary) => void }) {
      const summary = useMemo(() => normalizeTestAiEvidence(target, [marketObservation('ebay_active', data)]), [data]);
      useEffect(() => onSummary(summary), [summary, onSummary]);
      return null;
    }
    function Parent({ price, failed }: { price: number; failed: boolean }) {
      if (++renders > 25) throw new Error('Evidence feedback failed to settle');
      // Deliberately fresh input and callback on every parent render: the
      // content guard must still stop the real child-effect -> parent loop.
      const display = useTestAiSourceDisplayData(packet(price), failed, { visualReviewListings: packet(price).listings });
      const [summary, setSummary] = useTestAiContentState<NormalizedEvidenceSummary | null>(null);
      setters.push(setSummary);
      useEffect(() => { if (summary) commits.push(summary); }, [summary]);
      return <Evidence data={display.evidenceData} onSummary={(next) => setSummary(next)} />;
    }
    await act(async () => root.render(<Parent price={150} failed />));
    expect(commits).toHaveLength(1);
    expect(commits[0].sources[0].status).toBe('partial');
    expect(renders).toBeLessThan(6);
    await act(async () => root.render(<Parent price={150} failed />));
    expect(commits).toHaveLength(1);
    expect(setters.every((setter) => setter === setters[0])).toBe(true);
    await act(async () => root.render(<Parent price={175} failed />));
    expect(commits).toHaveLength(2);
    expect(JSON.stringify(commits[1])).toContain('175');
    await act(async () => root.render(<Parent price={175} failed={false} />));
    expect(commits).toHaveLength(3);
    expect(commits[2].sources[0].status).toBe('success');
    await act(async () => root.render(<Parent price={175} failed={false} />));
    expect(commits).toHaveLength(3);
  });

  it('retains the new child\'s first passive summary after a scope change without a retry or a later clear', async () => {
    let renders = 0;
    let value: NormalizedEvidenceSummary | null = null;
    const callbacks: Record<string, (summary: NormalizedEvidenceSummary | null) => void> = {};
    const publications: string[] = [];
    const commits: Array<{ scope: string; summary: NormalizedEvidenceSummary }> = [];
    function Evidence({ scope, summary, report }: { scope: string; summary: NormalizedEvidenceSummary; report: (summary: NormalizedEvidenceSummary) => void }) {
      useEffect(() => {
        publications.push(scope);
        report(summary);
      }, [scope, summary, report]);
      return null;
    }
    function Parent({ scope, price }: { scope: string; price: number }) {
      if (++renders > 25) throw new Error('Scope-change summary feedback failed to settle');
      const [summary, setSummary] = useTestAiContentState<NormalizedEvidenceSummary | null>(null, scope);
      value = summary;
      callbacks[scope] = setSummary;
      const next = useMemo(() => normalizeTestAiEvidence({ ...target, title: scope }, [marketObservation('ebay_active', packet(price))]), [scope, price]);
      useEffect(() => { if (summary) commits.push({ scope, summary }); }, [scope, summary]);
      return <><Evidence key={scope} scope={scope} summary={next} report={setSummary} /><output>{summary ? JSON.stringify(summary) : 'cleared'}</output></>;
    }
    await act(async () => root.render(<Parent scope="old-item" price={150} />));
    const oldValue = value;
    const oldCallback = callbacks['old-item'];
    expect(publications).toEqual(['old-item']);
    expect(commits).toHaveLength(1);

    await act(async () => root.render(<Parent scope="new-item" price={175} />));
    const newValue = value;
    // Stable child dependencies make the first publication the only one: a
    // rejected first report or a parent passive reset cannot heal via a retry.
    expect(publications).toEqual(['old-item', 'new-item']);
    expect(commits).toHaveLength(2);
    expect(commits[1]).toEqual({ scope: 'new-item', summary: newValue });
    expect(newValue).not.toBeNull();
    expect(container.querySelector('output')?.textContent).toContain('new-item');
    expect(container.querySelector('output')?.textContent).toContain('175');

    await act(async () => oldCallback(oldValue));
    expect(value).toBe(newValue);
    await act(async () => root.render(<Parent scope="new-item" price={175} />));
    expect(value).toBe(newValue);
    expect(publications).toEqual(['old-item', 'new-item']);
    expect(commits).toHaveLength(2);
    await act(async () => root.render(<Parent scope="new-item" price={200} />));
    expect(publications).toEqual(['old-item', 'new-item', 'new-item']);
    expect(commits).toHaveLength(3);
    expect(container.querySelector('output')?.textContent).toContain('200');
    expect(renders).toBeLessThan(15);
  });

  it('keeps sides independent, resets disabled/item scopes, ignores old callbacks, and accepts an equal report after clearing', async () => {
    const values: Record<string, NormalizedEvidenceSummary | null> = {};
    const callbacks: Record<string, (summary: NormalizedEvidenceSummary | null) => void> = {};
    const commits: Record<string, Array<NormalizedEvidenceSummary | null>> = { left: [], right: [] };
    function Side({ side, price, scope, enabled }: { side: string; price: number; scope: string; enabled: boolean }) {
      const [summary, setSummary] = useTestAiContentState<NormalizedEvidenceSummary | null>(null, `${side}:${scope}:${enabled}`);
      values[side] = summary;
      callbacks[side] = setSummary;
      const display = useTestAiSourceDisplayData(useMemo(() => packet(price), [price]), false);
      const next = useMemo(() => normalizeTestAiEvidence({ ...target, title: `${side} ${scope}` }, [marketObservation('mercari_sold_comps', display.data)]), [display, side, scope]);
      useEffect(() => { if (enabled) setSummary(next); }, [enabled, next, setSummary]);
      useEffect(() => { commits[side].push(summary); }, [summary, side]);
      return <output data-side={side}>{summary ? JSON.stringify(summary) : 'cleared'}</output>;
    }
    function Pair({ leftPrice = 150, leftScope = 'item-1', enabled = true }: { leftPrice?: number; leftScope?: string; enabled?: boolean }) {
      return <><Side side="left" price={leftPrice} scope={leftScope} enabled={enabled} /><Side side="right" price={300} scope="item-2" enabled /></>;
    }
    await act(async () => root.render(<Pair />));
    const leftInitial = values.left;
    const rightInitial = values.right;
    const oldLeft = callbacks.left;
    const rightCommitCount = commits.right.length;
    await act(async () => root.render(<Pair leftPrice={175} />));
    expect(JSON.stringify(values.left)).toContain('175');
    expect(values.right).toBe(rightInitial);
    expect(commits.right).toHaveLength(rightCommitCount);
    await act(async () => root.render(<Pair enabled={false} />));
    expect(values.left).toBeNull();
    expect(container.querySelector('[data-side="left"]')?.textContent).toBe('cleared');
    await act(async () => oldLeft(leftInitial));
    expect(values.left).toBeNull();
    await act(async () => root.render(<Pair />));
    expect(values.left).toEqual(leftInitial);
    await act(async () => root.render(<Pair leftScope="new-item" />));
    expect(JSON.stringify(values.left)).toContain('left new-item');
    expect(values.right).toBe(rightInitial);
    await act(async () => callbacks.left(null));
    expect(values.left).toBeNull();
    const equivalent = clone(normalizeTestAiEvidence({ ...target, title: 'left new-item' }, [marketObservation('mercari_sold_comps', packet())]));
    await act(async () => callbacks.left(equivalent));
    expect(values.left).toEqual(equivalent);
  });

  it('specialist fresh observation/sales reports do not loop and retain real Goldin changes and clearing', async () => {
    let renders = 0;
    const states: Array<{ observations: Record<string, EvidenceSourceObservation>; sales: any[] }> = [];
    function Specialist({ data, reportObservation, reportSales }: { data: any; reportObservation: (value: EvidenceSourceObservation) => void; reportSales: (sales: any[]) => void }) {
      const sales = sourceReviewedGoldinSales(data);
      const observation = marketObservation('goldin', { listings: sales });
      useEffect(() => reportSales(sales), [reportSales, sales]);
      useEffect(() => reportObservation(observation), [reportObservation, observation]);
      return null;
    }
    function Parent({ price, empty = false }: { price: number; empty?: boolean }) {
      if (++renders > 25) throw new Error('Specialist feedback failed to settle');
      const [observations, setObservations] = useTestAiContentState<Record<string, EvidenceSourceObservation>>({});
      const [sales, setSales] = useTestAiContentState<any[]>([]);
      const reportObservation = useCallback((observation: EvidenceSourceObservation) => setObservations((current) => ({ ...current, [observation.id]: observation })), [setObservations]);
      useEffect(() => { states.push({ observations, sales }); }, [observations, sales]);
      const data = { visualFilter: { listings: empty ? [] : [{ ...packet(price).listings[0], completed: true }], contextListings: [] } };
      return <Specialist data={data} reportObservation={reportObservation} reportSales={(next) => setSales(next)} />;
    }
    await act(async () => root.render(<Parent price={150} />));
    const settledCount = states.length;
    await act(async () => root.render(<Parent price={150} />));
    expect(states).toHaveLength(settledCount);
    await act(async () => root.render(<Parent price={175} />));
    expect(states).toHaveLength(settledCount + 1);
    expect(states.at(-1)?.sales[0].price).toBe(175);
    await act(async () => root.render(<Parent price={175} empty />));
    expect(states).toHaveLength(settledCount + 2);
    expect(states.at(-1)?.sales).toEqual([]);
    expect(states.at(-1)?.observations.goldin.market?.returnedRecordCount).toBe(0);
  });

  it('compares full content without conflating null, missing fields, ordered rows, pricing or provenance', () => {
    const raw = { price: 150, currency: 'USD', rows: [{ id: '1' }, { id: '2' }], provenance: { runId: 'a' }, optional: undefined };
    expect(testAiUiContentEqual(raw, { optional: undefined, provenance: { runId: 'a' }, rows: [{ id: '1' }, { id: '2' }], currency: 'USD', price: 150 })).toBe(true);
    expect(testAiUiContentEqual(raw, { ...raw, price: 175 })).toBe(false);
    expect(testAiUiContentEqual(raw, { ...raw, provenance: { runId: 'b' } })).toBe(false);
    expect(testAiUiContentEqual(raw, { ...raw, rows: [...raw.rows].reverse() })).toBe(false);
    expect(testAiUiContentEqual({ optional: undefined }, {})).toBe(false);
    expect(testAiUiContentEqual(null, undefined)).toBe(false);
    expect(testAiUiContentEqual(NaN, null)).toBe(false);
  });
});

describe('TestAI scoped-state commit-phase source contract', () => {
  it('calls setStored only from the layout effect or deferred reporting callback, never during render', () => {
    const text = readFileSync(resolve(import.meta.dirname, '../client/src/hooks/useTestAiUiStability.ts'), 'utf8');
    const source = ts.createSourceFile('useTestAiUiStability.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const hook = source.statements.find((node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) && node.name?.text === 'useTestAiContentState');
    expect(hook?.body).toBeDefined();
    const setters: ts.CallExpression[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'setStored') setters.push(node);
      ts.forEachChild(node, visit);
    };
    visit(hook!.body!);
    expect(setters).toHaveLength(2);
    const phases = setters.map((setter) => {
      // A direct call in the hook (including a render conditional), useMemo,
      // or an immediately invoked render function is not a deferred boundary.
      let boundary: ts.Node | undefined = setter.parent;
      while (boundary && !ts.isFunctionLike(boundary)) boundary = boundary.parent;
      const owner = boundary?.parent;
      expect(boundary && (ts.isArrowFunction(boundary) || ts.isFunctionExpression(boundary))).toBe(true);
      expect(owner && ts.isCallExpression(owner) && owner.arguments[0] === boundary).toBe(true);
      return owner && ts.isCallExpression(owner) && ts.isIdentifier(owner.expression) ? owner.expression.text : undefined;
    });
    expect(phases.sort()).toEqual(['useCallback', 'useLayoutEffect']);
  });
});

// The page imports authenticated tRPC/model-backed sections. Inspect its AST
// rather than mounting those integrations; the DOM cases above exercise the
// actual production hooks and source display/Goldin/normalization functions.
describe('TestAI actual source/callback wiring', () => {
  const text = readFileSync(resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');
  const page = ts.createSourceFile('TestAI.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function nodes<T extends ts.Node>(predicate: (node: ts.Node) => node is T): T[] {
    const result: T[] = [];
    const visit = (node: ts.Node) => { if (predicate(node)) result.push(node); ts.forEachChild(node, visit); };
    visit(page);
    return result;
  }
  const declarations = nodes(ts.isVariableDeclaration);
  const declaration = (name: string) => declarations.find((node) => node.name.getText(page) === name)!;
  function props(tag: string) {
    return nodes(ts.isJsxSelfClosingElement).filter((node) => node.tagName.getText(page) === tag).map((node) =>
      Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map((attribute) => [attribute.name.getText(page), attribute.initializer && ts.isJsxExpression(attribute.initializer) ? attribute.initializer.expression?.getText(page) : attribute.initializer?.getText(page)])));
  }
  it('both DataColumns and analyzer use the same side-specific memoized source projections and stable callbacks', () => {
    const columns = props('DataColumn');
    expect(columns).toHaveLength(2);
    for (const [index, side] of ['left', 'right'].entries()) {
      expect(columns[index].ebayData).toBe(`${side}EbayDisplay.data`);
      expect(columns[index].ebayEvidenceData).toBe(`${side}EbayDisplay.evidenceData`);
      expect(columns[index].soldCompsData).toBe(`${side}SoldCompsDisplay.data`);
      expect(columns[index].mercariSoldCompsData).toBe(`${side}MercariSoldCompsDisplay.data`);
      expect(columns[index].onSpecialistSales).toBe(`on${side === 'left' ? 'Left' : 'Right'}SpecialistSales`);
      expect(declaration(`${side}EbayDisplay`).initializer?.getText(page)).toBe(`useTestAiSourceDisplayData(${side}EbayQuery.data, Boolean(${side}EbayQuery.error), ${side}EbayVisualReview)`);
      expect(props('AIAnalysisSection')[0][`${side}EbayData`]).toBe(`${side}EbayDisplay.data`);
      const searchMemo = declaration(`${side}SearchItem`).initializer as ts.CallExpression;
      expect(searchMemo.expression.getText(page)).toBe('useMemo');
      const dependencies = (searchMemo.arguments[1] as ts.ArrayLiteralExpression).elements.map((element) => element.getText(page));
      expect(dependencies).toEqual([`${side}Item`, `${side}PSAQuery.data`, `${side}BeckettQuery.data`, `${side}CgcQuery.data`, `${side}PcgsCoinFactsQuery.data`]);
    }
    expect(props('SandboxSpecialistSection')[0].onSales).toBe('onSpecialistSales');
    expect(declaration('onSales').initializer?.getText(page)).toContain('useCallback');
    expect(props('EvidenceNormalizationSummary')[0].onSummaryChange).toBe('onEvidenceSummary');
  });
  it('summary memo observes real Mercari, enriched target and guide/candidate responses; scoped states guard all feedback paths', () => {
    const summary = declarations.find((node) => node.name.getText(page) === 'summary' && node.initializer && ts.isCallExpression(node.initializer) && node.initializer.arguments.length === 2)!;
    const memo = summary.initializer as ts.CallExpression;
    const dependencies = (memo.arguments[1] as ts.ArrayLiteralExpression).elements.map((element) => element.getText(page));
    for (const required of ['marketItem', 'mercariSoldCompsData', 'numistaQuery.data', 'priceChartingVideoGameCandidateQuery.data', 'ebayData', 'specialistObservations']) expect(dependencies).toContain(required);
    for (const state of ['leftEvidenceSummary', 'rightEvidenceSummary', 'leftGoldinSales', 'rightGoldinSales', 'leftEbayVisualReview', 'rightEbayVisualReview', 'specialistObservations']) {
      const declarationNode = declarations.find((node) => ts.isArrayBindingPattern(node.name) && node.name.elements[0].getText(page) === state)!;
      expect((declarationNode.initializer as ts.CallExpression).expression.getText(page)).toBe('useTestAiContentState');
    }
  });
});
