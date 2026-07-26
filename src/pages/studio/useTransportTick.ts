// Leaf-component subscriptions to the ~30Hz transport tick store — see
// TransportTickStore in useStudio.ts for why ticks live outside React
// state. Mount these ONLY in small leaf components (playhead lines,
// time counters, meters): each subscriber re-renders per tick while
// the transport rolls.
import { useSyncExternalStore } from 'react';
import type { TransportTick, TransportTickStore } from '@/hooks/useStudio';

/** Live transport position in seconds. */
export function useTransportPosition(store: TransportTickStore): number {
  return useSyncExternalStore(store.subscribe, () => store.get().positionSeconds);
}

/** Full tick (position + master peaks). Snapshot identity changes once
 * per tick, so subscribers re-render per tick, not per render. */
export function useTransportTick(store: TransportTickStore): TransportTick {
  return useSyncExternalStore(store.subscribe, store.get);
}
