// The people a share can name: the MEMBERS of the current workspace.
//
// Backed by gw_share_people() (20261101120000_member_access.sql), which
// returns every gw_tenant_members row for the current tenant joined to the
// person's profile wherever that profile is homed. The old picker read
// gw_profiles directly, which under RLS shows only accounts homed in this
// workspace — so a GleeWorld account invited to Yo-Doc could be shared with
// "Everyone" but never picked by name.
//
// Until the migration is applied the RPC does not exist (PGRST202 / 42883);
// fall back to the old profile read so the dialog keeps working.

import { supabase } from '@/integrations/supabase/client';

export interface SharePerson {
  user_id: string;
  full_name: string | null;
  email: string | null;
  /** gw_tenant_members.role in the current workspace; null on the fallback. */
  member_role: string | null;
  voice_part: string | null;
}

export interface ShareReach {
  /** How many members a share with "Everyone" reaches. */
  members: number;
  /** Members per voice part, for the section lane's counts. */
  byVoicePart: Record<string, number>;
}

export function isMissingRpc(error: { code?: string } | null | undefined): boolean {
  return !!error && (error.code === 'PGRST202' || error.code === '42883');
}

export async function fetchSharePeople(): Promise<SharePerson[]> {
  const { data, error } = await supabase.rpc('gw_share_people');
  if (!error) return ((data ?? []) as SharePerson[]).filter((p) => !!p.user_id);
  if (!isMissingRpc(error)) throw error;

  // Pre-migration fallback: profiles homed here.
  const { data: profiles, error: profilesError } = await supabase
    .from('gw_profiles')
    .select('user_id, full_name, email, voice_part')
    .eq('disabled', false)
    .order('full_name', { ascending: true, nullsFirst: false });
  if (profilesError) throw profilesError;
  return ((profiles ?? []) as Array<Omit<SharePerson, 'member_role'>>).map((p) => ({
    ...p,
    member_role: null,
  }));
}

/** Pure: counts for the Share dialog's "· N members" labels. */
export function summarizeReach(people: SharePerson[]): ShareReach {
  const byVoicePart: Record<string, number> = {};
  for (const p of people) {
    if (p.voice_part) byVoicePart[p.voice_part] = (byVoicePart[p.voice_part] ?? 0) + 1;
  }
  return { members: people.length, byVoicePart };
}
