import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Guardian = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  relationship: 'mother' | 'father' | 'guardian' | 'other';
  is_primary: boolean;
};

export type GuardianInput = Omit<Guardian, 'id' | 'is_primary'> & { is_primary?: boolean };

export function useGuardians(studentUserId: string) {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('gw_guardians')
      .select('id, name, email, phone, relationship, is_primary')
      .eq('student_user_id', studentUserId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setGuardians((data ?? []) as Guardian[]);
    }
  }, [studentUserId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function add(fields: GuardianInput) {
    const { error: err } = await supabase
      .from('gw_guardians')
      .insert({ student_user_id: studentUserId, ...fields });
    if (err) throw err;
    await reload();
  }

  async function update(id: string, fields: Partial<Omit<Guardian, 'id'>>) {
    const { error: err } = await supabase
      .from('gw_guardians')
      .update(fields)
      .eq('id', id);
    if (err) throw err;
    await reload();
  }

  async function remove(id: string) {
    const { error: err } = await supabase
      .from('gw_guardians')
      .delete()
      .eq('id', id);
    if (err) throw err;
    await reload();
  }

  // Clear all primaries for this student first, then set the target.
  // Required because gw_guardians has a partial unique index on
  // (student_user_id) WHERE is_primary = true.
  async function setPrimary(id: string) {
    const { error: e1 } = await supabase
      .from('gw_guardians')
      .update({ is_primary: false })
      .eq('student_user_id', studentUserId);
    if (e1) throw e1;
    const { error: e2 } = await supabase
      .from('gw_guardians')
      .update({ is_primary: true })
      .eq('id', id);
    if (e2) throw e2;
    await reload();
  }

  return { guardians, loading, error, add, update, remove, setPrimary, reload };
}
