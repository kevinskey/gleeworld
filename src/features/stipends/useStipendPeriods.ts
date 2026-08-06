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

  const closePeriod = useCallback(async (id: string) => {
    // Snapshot the derived amounts, then freeze the period.
    const { data: standing, error: sErr } = await db
      .from('v_stipend_standing').select('award_id, earned').eq('period_id', id);
    if (sErr) throw new Error(sErr.message);

    for (const row of standing ?? []) {
      const { error: uErr } = await db
        .from('gw_stipend_awards')
        .update({ final_amount: row.earned, status: 'closed' })
        .eq('id', row.award_id);
      if (uErr) throw new Error(uErr.message);
    }

    const { data: pol } = await db
      .from('gw_stipend_periods')
      .select('policy_id, gw_stipend_policies(weights)')
      .eq('id', id).maybeSingle();

    const { error: pErr } = await db
      .from('gw_stipend_periods')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        policy_weights: pol?.gw_stipend_policies?.weights ?? null,
      })
      .eq('id', id);
    if (pErr) throw new Error(pErr.message);
    await refetch();
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
