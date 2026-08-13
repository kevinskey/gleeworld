// Concert audition signups — the admin half of the public-site
// `audition-signup` block ("Audition to Sing with Doc"). Reads
// gw_audition_signups (RLS: admins see the whole tenant), joins names and
// emails from gw_profiles, groups by voice part, and exports CSV so a
// director can hand the roster to whoever runs rehearsals.
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Download, Mic2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SignupRow {
  id: string;
  user_id: string;
  voice_part: string;
  era: string | null;
  phone: string | null;
  note: string | null;
  created_at: string;
}
interface ProfileRow { user_id: string; full_name: string | null; email: string | null }

const PART_ORDER = ['Soprano 1', 'Soprano 2', 'Alto 1', 'Alto 2', 'Tenor', 'Bass'];

function csvEscape(v: string | null): string {
  const s = v ?? '';
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function AuditionSignupsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // The existing audition pipeline (roster → evaluations → appointments)
  // works off audition_applications rows inside a session. Promoting a
  // concert signup files it into the chosen session so the normal process
  // takes over from there.
  const { data: sessions = [] } = useQuery<Array<{ id: string; name: string; is_active: boolean }>>({
    queryKey: ['audition-sessions-for-signups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audition_sessions')
        .select('id, name, is_active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [sessionId, setSessionId] = useState<string>('');
  const targetSession = sessionId || sessions.find((s) => s.is_active)?.id || sessions[0]?.id || '';

  const { data: promoted = [] } = useQuery<Array<{ user_id: string }>>({
    queryKey: ['audition-applications-promoted', targetSession],
    enabled: !!targetSession,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audition_applications')
        .select('user_id')
        .eq('session_id', targetSession);
      if (error) throw error;
      return data ?? [];
    },
  });
  const promotedIds = useMemo(() => new Set(promoted.map((p) => p.user_id)), [promoted]);

  const { data: signups = [], isLoading } = useQuery<SignupRow[]>({
    queryKey: ['audition-signups-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_audition_signups' as never)
        .select('id, user_id, voice_part, era, phone, note, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as unknown as SignupRow[]) ?? [];
    },
  });

  // Staff roster RPC — a direct gw_profiles select is tenant-walled and
  // returned nothing for members homed elsewhere, so promote wrote
  // 'Unknown'/'' into applications. Keyed on the id SET, not its length
  // (same-length roster changes served stale rows). (Review 2026-08-13.)
  const idsKey = useMemo(() => [...new Set(signups.map((s) => s.user_id))].sort().join(','), [signups]);
  const { data: profiles = [], isSuccess: profilesLoaded } = useQuery<ProfileRow[]>({
    queryKey: ['audition-signups-profiles', idsKey],
    enabled: signups.length > 0,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_audition_signup_profiles');
      if (error) throw error;
      return (data as ProfileRow[]) ?? [];
    },
  });

  const byUser = useMemo(() => new Map(profiles.map((p) => [p.user_id, p])), [profiles]);
  const grouped = useMemo(() => {
    const parts = new Map<string, SignupRow[]>();
    for (const s of signups) {
      const list = parts.get(s.voice_part) ?? [];
      list.push(s);
      parts.set(s.voice_part, list);
    }
    const rank = (p: string) => { const i = PART_ORDER.indexOf(p); return i === -1 ? 99 : i; };
    return [...parts.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
  }, [signups]);

  // audition_applications' normalize trigger collapses long names
  // ('Alto 2' → 'A1'); send the strict code it stores verbatim.
  const VOICE_CODE: Record<string, string> = {
    'Soprano 1': 'S1', 'Soprano 2': 'S2', 'Alto 1': 'A1', 'Alto 2': 'A2',
    'Tenor': 'T1', 'Tenor 1': 'T1', 'Tenor 2': 'T2', 'Bass': 'B1', 'Bass 1': 'B1', 'Bass 2': 'B2',
  };
  const promote = useMutation({
    mutationFn: async (s: SignupRow) => {
      if (!targetSession) throw new Error('Create an audition session first (Sessions tab).');
      const p = byUser.get(s.user_id);
      if (!p) throw new Error("This singer's profile has not loaded yet — try again in a moment.");
      const { error } = await supabase.from('audition_applications').insert({
        session_id: targetSession,
        user_id: s.user_id,
        full_name: p?.full_name ?? 'Unknown',
        email: p?.email ?? '',
        phone_number: s.phone,
        voice_part_preference: VOICE_CODE[s.voice_part] ?? s.voice_part,
        previous_choir_experience: s.era,
        why_glee_club: s.note,
        status: 'submitted',
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audition-applications-promoted', targetSession] });
      toast({ title: 'Added to auditions', description: 'The singer is now in the roster for evaluation.' });
    },
    onError: (e: Error) => toast({ title: 'Could not add', description: e.message, variant: 'destructive' }),
  });

  const exportCsv = () => {
    const header = 'Name,Email,Voice part,Sang,Phone,Note,Signed up';
    const rows = signups.map((s) => {
      const p = byUser.get(s.user_id);
      return [
        csvEscape(p?.full_name ?? ''), csvEscape(p?.email ?? ''), csvEscape(s.voice_part),
        csvEscape(s.era), csvEscape(s.phone), csvEscape(s.note),
        new Date(s.created_at).toLocaleDateString(),
      ].join(',');
    });
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'audition-signups.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic2 className="h-4 w-4" /> Concert Signups
          </CardTitle>
          <CardDescription className="text-xs">
            From the public site&apos;s Audition Signup section — {signups.length} singer{signups.length === 1 ? '' : 's'}, grouped by voice part.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {sessions.length > 1 && (
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={targetSession}
              onChange={(e) => setSessionId(e.target.value)}
              title="Audition session signups are promoted into"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={signups.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : signups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No signups yet. They&apos;ll appear here as soon as someone submits the form on the public page.</p>
        ) : (
          <div className="space-y-5">
            {grouped.map(([part, rows]) => (
              <div key={part}>
                <p className="text-sm font-semibold mb-1.5">{part} <span className="text-muted-foreground font-normal">({rows.length})</span></p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border">
                        <th className="py-1.5 pr-3 font-medium">Name</th>
                        <th className="py-1.5 pr-3 font-medium">Sang</th>
                        <th className="py-1.5 pr-3 font-medium">Phone</th>
                        <th className="py-1.5 pr-3 font-medium">Email</th>
                        <th className="py-1.5 pr-3 font-medium">Note</th>
                        <th className="py-1.5 font-medium" />

                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((s) => {
                        const p = byUser.get(s.user_id);
                        return (
                          <tr key={s.id} className="border-b border-border/50 align-top">
                            <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{p?.full_name ?? '—'}</td>
                            <td className="py-1.5 pr-3">{s.era ?? '—'}</td>
                            <td className="py-1.5 pr-3 whitespace-nowrap">{s.phone ?? '—'}</td>
                            <td className="py-1.5 pr-3">{p?.email ?? '—'}</td>
                            <td className="py-1.5 pr-3 text-muted-foreground">{s.note ?? ''}</td>
                            <td className="py-1.5 whitespace-nowrap">
                              {promotedIds.has(s.user_id) ? (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Check className="h-3.5 w-3.5" /> In process
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={promote.isPending || !targetSession || !profilesLoaded}
                                  onClick={() => promote.mutate(s)}
                                >
                                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Add to auditions
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
