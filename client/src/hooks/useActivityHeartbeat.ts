import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { isRpcConnectionInterruption } from '@/lib/rpcConnectionErrors';

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;
type HeartbeatState = { inFlight: boolean; nextAttemptAt: number; failures: number };
// Coordinate page-owned TopBars across navigation without persisting identity
// or session data. A request is never released until it actually settles.
const userHeartbeats = new Map<string, HeartbeatState>();

/** Presence only: never retries an inventory save, trade, or valuation request. */
export function useActivityHeartbeat(userId: number | string | null | undefined) {
  const mutation = trpc.onlineStatus.updateActivity.useMutation({
    retry: false,
    meta: { backgroundActivityHeartbeat: true },
  });
  const sendRef = useRef(mutation.mutateAsync);
  sendRef.current = mutation.mutateAsync;

  useEffect(() => {
    if (userId == null) return;
    const key = String(userId);
    const state = userHeartbeats.get(key) ?? { inFlight: false, nextAttemptAt: 0, failures: 0 };
    userHeartbeats.set(key, state);
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (delay: number) => {
      if (disposed) return;
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => { void run(); }, Math.max(0, delay));
    };
    const run = async () => {
      if (disposed || !navigator.onLine || document.visibilityState === 'hidden') return;
      if (state.inFlight) {
        schedule(1000);
        return;
      }
      if (Date.now() < state.nextAttemptAt) {
        schedule(state.nextAttemptAt - Date.now());
        return;
      }
      state.inFlight = true;
      try {
        await sendRef.current();
        state.failures = 0;
        state.nextAttemptAt = Date.now() + HEARTBEAT_INTERVAL_MS;
      } catch (error) {
        // The global mutation logger retains genuine auth/server failures. Only
        // this idempotent presence update recovers from a rejected browser fetch.
        if (isRpcConnectionInterruption(error)) {
          state.failures += 1;
          const backoff = Math.min(HEARTBEAT_INTERVAL_MS, 5000 * 2 ** Math.min(state.failures - 1, 5));
          state.nextAttemptAt = Date.now() + backoff;
        } else {
          state.failures = 0;
          state.nextAttemptAt = Date.now() + HEARTBEAT_INTERVAL_MS;
        }
      } finally {
        state.inFlight = false;
        schedule(state.nextAttemptAt - Date.now());
      }
    };
    const resume = () => schedule(0);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    schedule(0);

    return () => {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
      // Do not abort a shared tRPC batch, which may contain a real user save.
    };
  }, [userId]);
}
