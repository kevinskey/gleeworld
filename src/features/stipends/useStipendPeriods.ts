import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StipendPeriod {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  default_amount: number;
  required_services: number;
  event_filter: { event_types?: string[] };
  course_ids: string[];
  policy_id: string | null;
  status: 'draft' | 'active' | 'closed' | 'paid';
  closed_at: string | null;
}

/** Summary returned by close_stipend_period(). */
export interface CloseResult {
  period_id: string;
  awards_closed: number;
  total_final_amount: number;
  uncovered_units: number;
}

export interface NewPeriod {
  name: string;
  starts_on: string;
  ends_on: string;
  default_amount: number;
  required_services: number;
  event_filter?: { event_types?: string[] };
  /** Courses whose class meetings count as services. Empty = events only. */
  course_ids?: string[];
}

// types.ts predates these tables; cast at the client boundary only.
const db = supabase as any;

export function useStipendPeriods() {
  const [periods, setPeriods] = useState<StipendPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await db
      .from('gw_stipend_periods')
      .select('*')
      .order('starts_on', { ascending: false });
    if (err) setError(err.message);
    setPeriods((data ?? []) as StipendPeriod[]);
    setLoading(false);
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  const createPeriod = useCallback(async (input: NewPeriod) => {
    // Always .select() back — a silent RLS rejection returns no error.
    const { data, error: err } = await db
      .from('gw_stipend_periods')
      .insert({
        ...input,
        event_filter: input.event_filter ?? {},
        course_ids: input.course_ids ?? [],
      })
      .select()
      .single();
    if (err) throw new Error(err.message);
    if (!data) throw new Error('Period was not created — check your permissions.');
    await refetch();
    return data as StipendPeriod;
  }, [refetch]);

  const updatePeriod = useCallback(async (
    id: string,
    patch: Partial<NewPeriod> & { status?: StipendPeriod['status'] },
  ) => {
    const { data, error: err } = await db
      .from('gw_stipend_periods').update(patch).eq('id', id).select();
    if (err) throw new Error(err.message);
    if (!data?.length) throw new Error('Nothing was updated — check your permissions.');
    await refetch();
  }, [refetch]);

  /**
   * Closes a period through close_stipend_period().
   *
   * This used to be a client-side loop: read the standing view, then one
   * UPDATE per award, then one for the period, with no transaction around any
   * of it. A failure partway left some awards frozen and closed while others
   * stayed active and the period stayed open, and a retry recomputed from the
   * *current* view — so rows could end up frozen from two different snapshots.
   * It also meant the browser picked the dollar figure written to final_amount.
   *
   * The function does the whole close server-side from one snapshot.
   */
  const closePeriod = useCallback(async (id: string): Promise<CloseResult> => {
    const { data, error: err } = await db.rpc('close_stipend_period', {
      p_period_id: id,
    });
    if (err) throw new Error(err.message);
    await refetch();
    return (data ?? {}) as CloseResult;
  }, [refetch]);

  return { periods, loading, error, createPeriod, updatePeriod, closePeriod, refetch };
}

export function useStipendAwards(periodId: string | null) {
  const enroll = useCallback(async (
    userIds: string[], baseAmount: number, enrolledOn?: string,
  ) => {
    if (!periodId || userIds.length === 0) return 0;
    const rows = userIds.map((user_id) => ({
      period_id: periodId,
      user_id,
      base_amount: baseAmount,
      enrolled_on: enrolledOn ?? null,
    }));
    // Re-enrolling an existing student is a no-op, not an error.
    const { data, error: err } = await db
      .from('gw_stipend_awards')
      .upsert(rows, { onConflict: 'period_id,user_id', ignoreDuplicates: true })
      .select();
    if (err) throw new Error(err.message);
    return (data ?? []).length;
  }, [periodId]);

  const remove = useCallback(async (awardId: string) => {
    const { error: err } = await db
      .from('gw_stipend_awards').delete().eq('id', awardId);
    if (err) throw new Error(err.message);
  }, []);

  return { enroll, remove };
}
