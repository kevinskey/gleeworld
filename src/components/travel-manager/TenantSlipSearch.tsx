// TenantSlipSearch — permission slips across the whole tenant.
//
// PermissionSlipsTab answers "who on THIS trip has signed?" — usePermissionSlips
// returns [] outright when tourId is falsy, so there was no way to ask the
// question a school actually asks in August: "did we ever get a signed slip for
// this student?" That question spans trips and years.
//
// The data layer already supported it — RLS scopes gw_permission_slips by
// tenant and perm_slips_tenant_tour / perm_slips_status / perm_slips_signed_at
// are indexed — only the UI was missing.
//
// Name search runs client-side against the fetched page rather than as a
// server ilike: the student's name lives in gw_profiles, not on the slip, so a
// server-side name filter would need a join PostgREST can't express here
// without an embedded-resource filter that breaks under RLS.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

// SlipStatusBadge is an interactive control (send/revoke/view callbacks); this
// table is read-only, so it gets a plain badge instead.
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  signed: 'default', sent: 'secondary', pending: 'outline',
  expired: 'destructive', revoked: 'destructive',
};

type StatusFilter = 'all' | 'pending' | 'sent' | 'signed' | 'expired' | 'revoked';

interface SlipRow {
  id: string;
  status: string;
  student_user_id: string;
  trip_id: string | null;
  tour_id: string | null;
  signed_at: string | null;
  sent_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 500;

export function TenantSlipSearch() {
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-slips', status, from, to],
    queryFn: async () => {
      let q = supabase
        .from('gw_permission_slips')
        .select('id, status, student_user_id, trip_id, tour_id, signed_at, sent_at, created_at')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (status !== 'all') q = q.eq('status', status);
      // Date range applies to creation, not signing, so pending slips — the
      // ones you're usually chasing — don't disappear from a filtered range.
      if (from) q = q.gte('created_at', from);
      if (to) q = q.lte('created_at', `${to}T23:59:59`);
      const { data: slips, error } = await q;
      if (error) throw error;

      const rows = (slips ?? []) as SlipRow[];
      const ids = [...new Set(rows.map(r => r.student_user_id))];
      const trips = [...new Set(rows.map(r => r.trip_id).filter(Boolean) as string[])];

      // Fetched separately rather than in one Promise.all: mixing a query
      // builder with a Promise.resolve fallback widens the tuple to `unknown`.
      type Profile = { id: string; full_name: string | null; email: string | null };
      type TourName = { id: string; name: string };

      let profiles: Profile[] = [];
      if (ids.length) {
        const { data: p } = await supabase
          .from('gw_profiles').select('id, full_name, email').in('id', ids);
        profiles = (p ?? []) as Profile[];
      }

      let tours: TourName[] = [];
      if (trips.length) {
        const { data: t } = await supabase
          .from('gw_tours').select('id, name').in('id', trips);
        tours = (t ?? []) as TourName[];
      }

      const byId = new Map(profiles.map(p => [p.id, p]));
      const tripById = new Map(tours.map(t => [t.id, t.name]));

      return rows.map(r => ({
        ...r,
        name: byId.get(r.student_user_id)?.full_name ?? null,
        email: byId.get(r.student_user_id)?.email ?? null,
        tripName: r.trip_id ? tripById.get(r.trip_id) ?? null : null,
      }));
    },
  });

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r =>
      (r.name ?? '').toLowerCase().includes(t) ||
      (r.email ?? '').toLowerCase().includes(t) ||
      (r.tripName ?? '').toLowerCase().includes(t));
  }, [rows, term]);

  const exportCsv = () => {
    const header = ['Student', 'Email', 'Trip', 'Status', 'Sent', 'Signed'];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = filtered.map(r => [
      r.name ?? '', r.email ?? '', r.tripName ?? '', r.status,
      r.sent_at ?? '', r.signed_at ?? '',
    ].map(v => esc(String(v))).join(','));
    const blob = new Blob([[header.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'permission-slips.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search student, email or trip…"
              className="pl-8"
              aria-label="Search permission slips"
            />
          </div>
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="signed">Signed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-40" aria-label="Created from" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-40" aria-label="Created to" />
        <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0} className="gap-1.5 shrink-0">
          <Download className="h-4 w-4" /> CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading slips…
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? 'No permission slips yet.' : 'No slips match this search.'}
        </CardContent></Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {rows.length} slip{rows.length === 1 ? '' : 's'}
            {rows.length === PAGE_SIZE && ' (first 500 — narrow the date range to see older ones)'}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Trip</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Signed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.name ?? 'Unknown student'}</div>
                      {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.tripName ?? <span className="italic">single date</span>}
                    </td>
                    <td className="px-3 py-2"><Badge variant={STATUS_VARIANT[r.status] ?? 'outline'} className="capitalize">{r.status}</Badge></td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {r.signed_at ? new Date(r.signed_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
