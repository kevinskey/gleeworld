import { useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AppPlugin } from '@capacitor/core';
import { isNativeCalendarAvailable } from '@/plugins/gwCalendar';
import { useIosCalendarAccess, useIosCalendarSync } from '@/hooks/useIosCalendar';
import { useAuth } from '@/contexts/AuthContext';

const CapApp = registerPlugin<AppPlugin>('App');

/**
 * Fires a silent iOS Calendar pull on:
 *   - initial mount (once, only when signed in + permission granted)
 *   - every subsequent app foreground (`App.addListener('appStateChange')`)
 *
 * Guarded on platform, auth, and permission — no-op elsewhere.
 * No user-visible UI. Failures land in the console; the manual
 * "Pull from iPhone" button surfaces errors to the user.
 */
export function IosCalendarAutoPull() {
  const { user } = useAuth();
  const { status } = useIosCalendarAccess();
  const sync = useIosCalendarSync();
  const lastFireRef = useRef<number>(0);

  useEffect(() => {
    if (!isNativeCalendarAvailable()) return;
    if (!user) return;
    if (!status?.granted) return;

    // 30-second cooldown to avoid firing multiple times when
    // foreground events fire in bursts (iOS occasionally does).
    const maybeFire = () => {
      const now = Date.now();
      if (now - lastFireRef.current < 30_000) return;
      lastFireRef.current = now;
      sync.mutateAsync().catch((e) => console.warn('[ios-cal] auto-pull failed', e));
    };

    // Initial pull on mount.
    maybeFire();

    let handle: { remove?: () => void } | null = null;
    (async () => {
      handle = await CapApp.addListener('appStateChange', (s) => {
        if (s.isActive) maybeFire();
      });
    })();
    return () => { handle?.remove?.(); };
  // sync.mutateAsync is stable per-hook; we intentionally exclude it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, status?.granted, Capacitor.getPlatform()]);

  return null;
}
