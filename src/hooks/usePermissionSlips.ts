import { useCallback, useEffect, useState } from 'react';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';

export type PermissionSlipStatus = 'pending' | 'sent' | 'signed' | 'expired' | 'revoked';

export type PermissionSlip = {
  id: string;
  tour_id: string;
  student_user_id: string;
  status: PermissionSlipStatus;
  sent_at: string | null;
  signed_at: string | null;
  signature_storage_path: string | null;
};

export function usePermissionSlips(tourId: string | null | undefined) {
  const [slips, setSlips] = useState<PermissionSlip[]>([]);

  const reload = useCallback(async () => {
    if (!tourId) {
      setSlips([]);
      return;
    }
    const { data } = await supabase
      .from('gw_permission_slips')
      .select('*')
      .eq('tour_id', tourId);
    setSlips((data ?? []) as PermissionSlip[]);
  }, [tourId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const byStudent = new Map(slips.map(s => [s.student_user_id, s]));

  async function callFn(name: string, body: unknown) {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    return fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }).then(r => r.json());
  }

  async function send(slipId: string) {
    await callFn('send-permission-slip-email', {
      slip_id: slipId,
      link_host: typeof window !== 'undefined' ? window.location.origin : '',
    });
    await reload();
  }

  async function revoke(slipId: string) {
    await supabase
      .from('gw_permission_slips')
      .update({ status: 'revoked', slip_token_jti: null })
      .eq('id', slipId);
    await reload();
  }

  async function viewSignedUrl(slipId: string): Promise<string | null> {
    const s = slips.find(x => x.id === slipId);
    if (!s?.signature_storage_path) return null;
    const { data } = await supabase.storage
      .from('permission-slips')
      .createSignedUrl(s.signature_storage_path, 300);
    return data?.signedUrl ?? null;
  }

  return {
    slips,
    byStudent,
    send,
    resend: send,
    revoke,
    viewSignedUrl,
    refresh: reload,
  };
}
