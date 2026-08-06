import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { StipendPeriod } from './useStipendPeriods';

export interface StandingRow {
  award_id: string;
  period_id: string;
  user_id: string;
  base_amount: number;
  required_services: number;
  per_service_value: number;
  credited_services: number;
  absences: number;
  unmarked_count: number;
  unmapped_count: number;
  countable_events: number;
  earned: number;
  forfeited: number;
  full_name?: string | null;
  email?: string | null;
}

const db = supabase as any;

export function useStipendStanding(periodId: string | null) {
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!periodId) { setRows([]); return; }
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await db
        .from('v_stipend_standing').select('*').eq('period_id', periodId);
      if (err) { setError(err.message); return; }

      const standing = (data ?? []) as StandingRow[];
      const ids = standing.map((r) => r.user_id);

      // Names live in the directory view, not on the standing view.
      const { data: people } = ids.length
        ? await db.from('gw_profiles_directory')
            .select('user_id, full_name, email').in('user_id', ids)
        : { data: [] };

      const byId = new Map((people ?? []).map((p: any) => [p.user_id, p]));
      setRows(standing.map((r) => ({
        ...r,
        full_name: (byId.get(r.user_id) as any)?.full_name ?? null,
        email: (byId.get(r.user_id) as any)?.email ?? null,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load stipend standing.');
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { rows, loading, error, refetch };
}

export function useMyStipend() {
  const [standing, setStanding] = useState<StandingRow | null>(null);
  const [period, setPeriod] = useState<StipendPeriod | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) return;

        const { data: periods } = await db
          .from('gw_stipend_periods')
          .select('*')
          .in('status', ['active', 'closed'])
          .order('starts_on', { ascending: false })
          .limit(1);
        const p = (periods ?? [])[0] as StipendPeriod | undefined;

        if (p) {
          const { data } = await db.from('v_stipend_standing')
            .select('*').eq('period_id', p.id).eq('user_id', uid).maybeSingle();
          if (!cancelled) setStanding((data ?? null) as StandingRow | null);
        }
        if (!cancelled) setPeriod(p ?? null);
      } catch {
        // The card renders nothing without a standing, so a failure here is
        // silent by design — it must never break the page hosting it.
        if (!cancelled) { setStanding(null); setPeriod(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { standing, period, loading };
}
