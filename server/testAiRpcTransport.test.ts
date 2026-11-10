import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import { initTRPC, TRPCError } from '@trpc/server';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createTRPCClient, httpBatchLink, type TRPCLink } from '@trpc/client';
import superjson from 'superjson';
import { z } from 'zod';
import { createTestAiRpcLinks } from '../client/src/lib/testAiRpcTransport';

// Real client -> HTTP -> tRPC middleware, but only this fixture router. No app
// router, inventory, database, provider or model is executed by these tests.
const t = initTRPC.context<{ authorized: boolean }>().create({ transformer: superjson });
const protectedQuery = t.procedure.use(({ ctx, next }) => {
  if (!ctx.authorized) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next();
});
const fixtureRouter = t.router({
  testAI: t.router({
    getMercariSoldCompsData: protectedQuery.input(z.object({
      title: z.string(), itemDetails: z.string(),
      approvalTarget: z.object({ title: z.string(), itemDetails: z.string() }),
      approvalTargetImageReference: z.string(),
    })).query(({ input }) => input),
  }),
  publicHealth: t.procedure.query(() => 'ok'),
});
type FixtureRouter = typeof fixtureRouter;
const input = {
  title: 'BATMAN (1989) Laserdisc LD',
  itemDetails: JSON.stringify({ format: 'LaserDisc', notes: 'full metadata '.repeat(700) }),
  approvalTarget: { title: 'BATMAN (1989) Laserdisc LD', itemDetails: 'declared metadata '.repeat(700) },
  approvalTargetImageReference: 'https://example.invalid/target-batman.jpg',
};
let server: Server;
let url: string;
let arrivals: Array<{ method: string; pathLength: number; body: string }> = [];
function client(authorized = true) {
  const fetcher: typeof fetch = async (request, init) => {
    const headers = new Headers(init?.headers);
    if (authorized) headers.set('x-fixture-session', 'authorized-fixture');
    return fetch(request, { ...init, headers });
  };
  return createTRPCClient<FixtureRouter>({
    links: createTestAiRpcLinks(fetcher, url) as unknown as TRPCLink<FixtureRouter>[],
  });
}

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/trpc', (req, _res, next) => {
    arrivals.push({ method: req.method, pathLength: req.originalUrl.length, body: JSON.stringify(req.body) });
    next();
  }, createExpressMiddleware({
    router: fixtureRouter, allowMethodOverride: true,
    createContext: ({ req }) => ({ authorized: req.headers['x-fixture-session'] === 'authorized-fixture' }),
  }));
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fixture HTTP listener unavailable');
  url = `http://127.0.0.1:${address.port}/api/trpc`;
});
beforeEach(() => { arrivals = []; });
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

describe('sandbox query body transport', () => {
  it('reproduces the old URL limit failing before any HTTP request', async () => {
    const oldClient = createTRPCClient<FixtureRouter>({ links: [httpBatchLink({ url, transformer: superjson, maxURLLength: 2000 })] });
    await expect(oldClient.testAI.getMercariSoldCompsData.query(input)).rejects.toThrow('Input is too big for a single dispatch');
    expect(arrivals).toHaveLength(0);
  });
  it('sends large Mercari input as POST, keeping all metadata and image binding intact', async () => {
    await expect(client().testAI.getMercariSoldCompsData.query(input)).resolves.toEqual(input);
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0].method).toBe('POST');
    expect(arrivals[0].pathLength).toBeLessThan(2000);
    expect(arrivals[0].body.length).toBeGreaterThan(2000);
  });
  it('preserves both item A and item B inputs in one large POST batch', async () => {
    const api = client();
    const right = { ...input, title: 'Item B', approvalTarget: { ...input.approvalTarget, title: 'Item B' } };
    await expect(Promise.all([
      api.testAI.getMercariSoldCompsData.query(input),
      api.testAI.getMercariSoldCompsData.query(right),
    ])).resolves.toEqual([input, right]);
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0].method).toBe('POST');
  });
  it('still rejects an unauthorized POST read query', async () => {
    await expect(client(false).testAI.getMercariSoldCompsData.query(input)).rejects.toMatchObject({ data: { code: 'UNAUTHORIZED' } });
    expect(arrivals[0].method).toBe('POST');
  });
  it('keeps queries outside the sandbox on their existing GET transport', async () => {
    await expect(client().publicHealth.query()).resolves.toBe('ok');
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0].method).toBe('GET');
  });
});
