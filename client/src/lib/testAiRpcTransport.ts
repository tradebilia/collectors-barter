import { httpBatchLink, splitLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../../server/routers';

/** tRPC's URL limit only splits GET batches; it does not convert a large
 * individual query to POST. Sandbox queries carry full target/image bindings,
 * so send those read queries in the request body without dropping any fields.
 * This changes HTTP transport only, not procedure type or authorization.
 */
export function createTestAiRpcLinks(
  fetcher: NonNullable<Parameters<typeof httpBatchLink<AppRouter>>[0]['fetch']>,
  url = '/api/trpc',
) {
  const options = { url, transformer: superjson, maxURLLength: 2000, fetch: fetcher };
  return [splitLink<AppRouter>({
    condition: operation => operation.type === 'query' && operation.path.startsWith('testAI.'),
    true: httpBatchLink<AppRouter>({ ...options, methodOverride: 'POST' }),
    false: httpBatchLink<AppRouter>(options),
  })];
}
