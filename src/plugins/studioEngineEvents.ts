// Typed Studio-engine event map + a single remount-safe subscription hook.
//
// This is the ONE place Studio-engine listeners are registered. It fixes the
// duplicate / stale / lost-after-remount listener problems: each mount
// registers exactly one listener per handled event and removes them all on
// unmount, so a React remount cleanly re-subscribes with no leaks or dupes.

import { useEffect, useRef } from 'react';
import { NativeStudio } from './studioEngine';

export interface StudioEngineError {
  code: string;
  message: string;
  operation: string;
  trackId?: string;
  effectId?: string;
  recoverable: boolean;
}

export interface StudioEngineEventMap {
  studioEngineReady: { isReady?: boolean };
  studioEngineError: StudioEngineError;
  playbackStarted: { positionMs: number };
  playbackPaused: { positionMs: number };
  playbackStopped: Record<string, never>;
  playbackPositionChanged: { positionMs: number };
  trackLoaded: { trackId: string };
  trackFailed: { trackId: string; error?: StudioEngineError };
  effectAdded: { trackId: string; effect: unknown };
  effectRemoved: { trackId: string; effectId: string };
  effectBypassed: { trackId: string; effectId: string; bypassed: boolean };
  effectParameterChanged: { trackId: string; effectId: string; parameter: string; value: number };
  routeChanged: { outputs: string[]; isHeadphones: boolean };
  audioInterrupted: { reason: string };
  engineRecovered: { positionMs?: number };
}

export type StudioEngineHandlers = {
  [K in keyof StudioEngineEventMap]?: (data: StudioEngineEventMap[K]) => void;
};

type Handle = { remove: () => void };

/**
 * Subscribe to Studio-engine events. Registers one listener per handled event
 * on mount and removes them all on unmount. Handlers are read through a ref so
 * changing handler identities don't churn subscriptions; pass `deps` to control
 * when the listener SET is rebuilt (default: once).
 */
export function useStudioEngineEvents(handlers: StudioEngineHandlers, deps: React.DependencyList = []) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = NativeStudio as any;
    if (!plugin?.addListener) return;

    const names = Object.keys(handlersRef.current) as (keyof StudioEngineEventMap)[];
    const pending: Array<Promise<Handle> | Handle> = [];
    for (const name of names) {
      // Capacitor's addListener returns either a handle or a Promise<handle>
      // depending on version — normalize both on cleanup.
      pending.push(
        plugin.addListener(name as string, (data: unknown) => {
          const fn = handlersRef.current[name];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (fn) (fn as any)(data);
        }),
      );
    }
    return () => {
      for (const h of pending) {
        Promise.resolve(h).then((x) => { try { x.remove(); } catch { /* already gone */ } });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
