// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestAiPendingStatus, TestAiWorkStatus } from '../client/src/components/test-ai/TestAiWorkStatus';

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (reason?: unknown) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

let root: Root;
let container: HTMLDivElement;
let queryClient: QueryClient;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  queryClient.clear();
  container.remove();
  vi.useRealTimers();
});

function renderPending(requestCount: number, analysisCount: number) {
  return act(async () => root.render(<TestAiPendingStatus requestCount={requestCount} analysisCount={analysisCount} />));
}
function renderWork() {
  return act(async () => root.render(<QueryClientProvider client={queryClient}><TestAiWorkStatus /></QueryClientProvider>));
}
function text() { return container.textContent ?? ''; }


describe('TestAiPendingStatus', () => {
  it('renders nothing while idle and exposes a polite status while work is active', async () => {
    await renderPending(0, 0);
    expect(container.textContent).toBe('');
    await renderPending(1, 0);
    expect(container.querySelector('[role="status"]')).toBeTruthy();
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
    expect(text().toLowerCase()).toContain('compiling source data');
  });

  it('uses singular and plural request counts and identifies mutation analysis', async () => {
    await renderPending(1, 0);
    expect(text()).toMatch(/1\s+request/i);
    expect(text()).not.toMatch(/1\s+requests/i);
    await renderPending(2, 0);
    expect(text()).toMatch(/2\s+requests/i);
    await renderPending(0, 1);
    expect(text().toLowerCase()).toContain('running ai valuation analysis');
    await renderPending(0, 2);
    expect(text()).toMatch(/2\s+(analysis|analyses)/i);
  });

  it('reports elapsed time from the active transition and updates once per second', async () => {
    await renderPending(1, 0);
    expect(text()).toMatch(/Elapsed: 0s/);
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(text()).toMatch(/Elapsed: 3s/);
    await renderPending(2, 0);
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(text()).toMatch(/Elapsed: 5s/);
    await renderPending(0, 0);
    expect(container.textContent).toBe('');
  });

  it('resets the timer only after work becomes inactive and active again', async () => {
    await renderPending(1, 0);
    await act(async () => { vi.advanceTimersByTime(4000); });
    await renderPending(0, 0);
    await renderPending(1, 0);
    expect(text()).toMatch(/Elapsed: 0s/);
  });

  it('cleans up its interval when unmounted and does not claim that elapsed work is stalled', async () => {
    const clearSpy = vi.spyOn(window, 'clearInterval');
    await renderPending(1, 0);
    await act(async () => { vi.advanceTimersByTime(90_000); });
    expect(text().toLowerCase()).toContain('taking longer than usual');
    expect(text().toLowerCase()).toContain('a stalled request cannot be confirmed');
    expect(text().toLowerCase()).not.toContain('stalled request detected');
    await act(async () => root.unmount());
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('keeps the elapsed clock hidden from screen readers and uses a motion-safe spinner', async () => {
    await renderPending(1, 0);
    const hiddenClock = Array.from(container.querySelectorAll('[aria-hidden="true"]')).find((node) => /Elapsed: 0s/.test(node.textContent ?? ''));
    expect(hiddenClock).toBeTruthy();
    expect(container.querySelector('.motion-safe\\:animate-spin')).toBeTruthy();
  });
});

describe('TestAiWorkStatus query and mutation filters', () => {
  it('ignores idle, disabled, paused, and non-testAI queries', async () => {
    const key = [['testAI', 'getEbayListings'], { input: { title: 'Fixture' }, type: 'query' }];
    const pending = deferred<unknown>();
    const active = queryClient.fetchQuery({ queryKey: key, queryFn: () => pending.promise });
    await renderWork();
    expect(text().toLowerCase()).toContain('compiling source data');
    const idle = queryClient.getQueryCache().build(queryClient, { queryKey: [['testAI', 'idleFixture']] });
    idle.setState({ ...idle.state, fetchStatus: 'idle', status: 'pending' });
    const paused = queryClient.getQueryCache().build(queryClient, { queryKey: [['testAI', 'pausedFixture']] });
    paused.setState({ ...paused.state, fetchStatus: 'paused', status: 'pending' });
    const inventory = queryClient.getQueryCache().build(queryClient, { queryKey: [['inventory', 'getMyInventory']] });
    inventory.setState({ ...inventory.state, fetchStatus: 'fetching', status: 'pending' });
    const sandbox = queryClient.getQueryCache().build(queryClient, { queryKey: [['testAI', 'getAllSandboxItems']] });
    sandbox.setState({ ...sandbox.state, fetchStatus: 'fetching', status: 'pending' });
    await act(async () => queryClient.getQueryCache().notify({ type: 'updated', query: inventory, action: { type: 'updated' } } as never));
    expect(text().toLowerCase()).toContain('compiling source data');
    pending.resolve({ listings: [] });
    await act(async () => { await expect(active).resolves.toEqual({ listings: [] }); });
    await renderWork();
    expect(container.textContent).toBe('');
  });

  it('shows and removes a real testAI query for both resolution and rejection', async () => {
    const key = [['testAI', 'getEbayListings'], { input: { title: 'Fixture' }, type: 'query' }];
    const success = deferred<unknown>();
    const request = queryClient.fetchQuery({ queryKey: key, queryFn: () => success.promise });
    await renderWork();
    expect(text().toLowerCase()).toContain('compiling source data');
    success.resolve({ listings: [] });
    await act(async () => { await request; });
    await renderWork();
    expect(text().toLowerCase()).not.toContain('compiling source data');

    const failure = deferred<unknown>();
    const rejected = queryClient.fetchQuery({ queryKey: [['testAI', 'getEbayListings'], { input: { title: 'Fixture 2' }, type: 'query' }], queryFn: () => failure.promise });
    await renderWork();
    expect(text().toLowerCase()).toContain('compiling source data');
    failure.reject(new Error('fixture failure'));
    await expect(rejected).rejects.toThrow('fixture failure');
    await renderWork();
    expect(text().toLowerCase()).not.toContain('compiling source data');
  });

  it('keeps the request indicator active until the last concurrent testAI query settles', async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    const one = queryClient.fetchQuery({ queryKey: [['testAI', 'getEbayListings'], { input: { title: 'One' }, type: 'query' }], queryFn: () => first.promise });
    const two = queryClient.fetchQuery({ queryKey: [['testAI', 'getEbayListings'], { input: { title: 'Two' }, type: 'query' }], queryFn: () => second.promise });
    await renderWork();
    expect(text()).toMatch(/2\s+requests/i);
    first.resolve({});
    await act(async () => { await one; });
    await renderWork();
    expect(text()).toMatch(/1\s+request/i);
    second.resolve({});
    await act(async () => { await two; });
    await renderWork();
    expect(text()).not.toMatch(/request/i);
  });

  it('tracks an executing testAI analyze mutation without dispatching extra work', async () => {
    const mutationDeferred = deferred<unknown>();
    let calls = 0;
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationKey: [['testAI', 'analyzeTrade']],
      mutationFn: async () => { calls += 1; return mutationDeferred.promise; },
    });
    const execution = mutation.execute(undefined);
    await renderWork();
    expect(text().toLowerCase()).toContain('running ai valuation analysis');
    expect(text()).toMatch(/1\s+(analysis|analyses)/i);
    expect(calls).toBe(1);
    mutationDeferred.resolve({ ok: true });
    await act(async () => { await execution; });
    await renderWork();
    expect(text().toLowerCase()).not.toContain('running ai valuation analysis');
    expect(calls).toBe(1);
  });
});

// Production image-review mutations are requests too, not final valuation approval.
it.each(['reviewEbayVisualData', 'readCertificationFromImage'])('tracks the actual %s image mutation until completion', async (procedure) => {
  const pending = deferred<unknown>();
  let calls = 0;
  const mutation = queryClient.getMutationCache().build(queryClient, {
    mutationKey: [['testAI', procedure]],
    mutationFn: () => { calls += 1; return pending.promise; },
  });
  const execution = mutation.execute(undefined);
  await renderWork();
  expect(text()).toContain('Compiling source data');
  expect(text()).toContain('1 request pending');
  expect(calls).toBe(1);
  pending.resolve({ ok: true });
  await act(async () => { await execution; });
  await renderWork();
  expect(container.textContent).toBe('');
  expect(calls).toBe(1);
});
