/**
 * PermissionSlipBell — topbar notification bell for signed permission slips.
 *
 * Polls `gw_permission_slips` every 60s filtered by `status='signed'` and
 * `signed_at > last_seen_at` (stored in localStorage per-user). Shows a red
 * dot + count when new signatures have arrived since the teacher last viewed.
 *
 * Only meaningful for tour managers: the query itself returns 0 rows for
 * non-managers because RLS filters via `is_current_user_tour_manager()`.
 */

import { useEffect, useRef, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const POLL_INTERVAL_MS = 60_000;
const LS_KEY_PREFIX = 'permission_slips_bell:';

function lsKey(userId: string) {
  return `${LS_KEY_PREFIX}${userId}`;
}

function getLastSeen(userId: string): string {
  // Default: now — so we never show a stale backlog on first mount.
  const stored = localStorage.getItem(lsKey(userId));
  if (stored) return stored;
  const now = new Date().toISOString();
  localStorage.setItem(lsKey(userId), now);
  return now;
}

function setLastSeen(userId: string, ts: string) {
  localStorage.setItem(lsKey(userId), ts);
}

export function PermissionSlipBell() {
  const { user } = useAuth();
  const userId = user?.id;

  const [count, setCount] = useState(0);
  const [lastSeen, setLastSeenState] = useState<string>('');
  const [hasEverHadRows, setHasEverHadRows] = useState(false);
  const prevCountRef = useRef(0);

  // Initialise lastSeen from localStorage once we have a userId.
  useEffect(() => {
    if (!userId) return;
    setLastSeenState(getLastSeen(userId));
  }, [userId]);

  const fetchCount = async (since: string): Promise<number> => {
    if (!userId || !since) return 0;
    const { count: n, error } = await supabase
      .from('gw_permission_slips')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'signed')
      .gt('signed_at', since);
    if (error) return 0;
    return n ?? 0;
  };

  // Poll on mount and every 60s.
  useEffect(() => {
    if (!userId || !lastSeen) return;

    let cancelled = false;

    const poll = async () => {
      const n = await fetchCount(lastSeen);
      if (cancelled) return;

      // Track whether query has ever returned rows for visibility control.
      if (n > 0) {
        setHasEverHadRows(true);
      }

      // Fire a toast only when the count grows while the user is on-page.
      if (n > prevCountRef.current && prevCountRef.current >= 0) {
        const newArrivals = n - prevCountRef.current;
        // Suppress the initial-load toast (prevCount === 0 and we just
        // mounted, which isn't a "new arrival while on-page" event).
        if (prevCountRef.current > 0 && newArrivals > 0 && document.hasFocus()) {
          toast.success(
            `${newArrivals} permission slip${newArrivals > 1 ? 's' : ''} just signed`,
            { description: 'Check the travel manager for details.' },
          );
        }
      }

      prevCountRef.current = n;
      setCount(n);
    };

    void poll();
    const id = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, lastSeen]);

  const markAllSeen = () => {
    if (!userId) return;
    const now = new Date().toISOString();
    setLastSeen(userId, now);
    setLastSeenState(now);
    prevCountRef.current = 0;
    setCount(0);
  };

  // Don't render for non-managers: RLS means query returns 0 rows, so
  // hasEverHadRows stays false and the bell never renders.
  if (!hasEverHadRows) return null;
  if (!userId) return null;

  const sinceLabel = new Date(lastSeen).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title="Permission slip notifications"
          aria-label="Permission slip notifications"
          className="relative w-11 h-11 rounded-full inline-flex items-center justify-center hover:bg-muted transition"
        >
          <ClipboardCheck className="w-6 h-6 text-foreground" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] leading-none font-semibold rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4" />
          Permission Slips
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {count > 0 ? (
          <div className="px-3 py-2 text-sm text-foreground">
            <span className="font-semibold">{count}</span> slip{count > 1 ? 's' : ''} signed since{' '}
            <span className="text-muted-foreground">{sinceLabel}</span>
          </div>
        ) : (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No new signatures since {sinceLabel}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={markAllSeen}
          className="text-sm cursor-pointer"
        >
          Mark all seen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
