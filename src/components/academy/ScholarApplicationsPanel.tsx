// Scholar Applications — the admin half of the public-site
// `scholar-application` block. Shown in a course's People tab (staff only)
// when applications exist for that course. Accepting an application calls
// gw-invite-student, which creates the applicant's account, enrolls them in
// the course, and emails their magic sign-in link; the row is then marked
// accepted so re-clicks don't double-invite.
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronUp, Download, GraduationCap, Loader2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ScholarApplicationRow {
  id: string;
  course_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  alt_phone: string | null;
  address: string | null;
  city_state_zip: string | null;
  classification: string | null;
  age: string | null;
  school: string | null;
  major_minor: string | null;
  instrument_voice: string | null;
  emergency_name: string | null;
  emergency_relationship: string | null;
  emergency_phone: string | null;
  signature_name: string;
  agreed_at: string;
  academic_year: string | null;
  status: 'submitted' | 'accepted' | 'declined';
  created_at: string;
}

function csvEscape(v: string | null): string {
  const s = v ?? '';
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// courseId scopes the panel to one class (the course People tab). Without
// it (the workspace People page) every application the caller's staff RLS
// exposes is listed, with a per-row course badge.
export function ScholarApplicationsPanel({ courseId, onAccepted }: { courseId?: string; onAccepted?: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: apps = [], isLoading } = useQuery<ScholarApplicationRow[]>({
    queryKey: ['scholar-applications', courseId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('gw_scholar_applications' as never)
        .select('id, course_id, full_name, email, phone, alt_phone, address, city_state_zip, classification, age, school, major_minor, instrument_voice, emergency_name, emergency_relationship, emergency_phone, signature_name, agreed_at, academic_year, status, created_at')
        .order('created_at', { ascending: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (courseId) q = (q as any).eq('course_id', courseId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as ScholarApplicationRow[]) ?? [];
    },
  });

  // Course code badges for the unscoped (workspace) listing.
  const courseIds = useMemo(
    () => (courseId ? [] : [...new Set(apps.map((a) => a.course_id).filter(Boolean))] as string[]),
    [apps, courseId],
  );
  const { data: courseNames = {} } = useQuery<Record<string, string>>({
    queryKey: ['scholar-application-courses', courseIds.join(',')],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_courses')
        .select('id, course_code, title')
        .in('id', courseIds);
      const map: Record<string, string> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data ?? []).forEach((c: any) => { map[c.id] = c.course_code || c.title || ''; });
      return map;
    },
  });

  const pending = useMemo(() => apps.filter((a) => a.status === 'submitted'), [apps]);
  const decided = useMemo(() => apps.filter((a) => a.status !== 'submitted'), [apps]);

  const decide = useMutation({
    mutationFn: async ({ app, accept }: { app: ScholarApplicationRow; accept: boolean }) => {
      if (accept) {
        // Same call the People tab's "Enroll students" uses: creates the
        // account if needed, enrolls in the application's course, emails a
        // sign-in link.
        const { data, error } = await supabase.functions.invoke('gw-invite-student', {
          body: { email: app.email, fullName: app.full_name, courseId: app.course_id ?? courseId, appOrigin: window.location.origin },
        });
        if (error) throw new Error(error.message || 'Invite failed');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((data as any)?.error) throw new Error((data as any).error);
      }
      const { data: session } = await supabase.auth.getSession();
      const { error: updateErr } = await supabase
        .from('gw_scholar_applications' as never)
        .update({
          status: accept ? 'accepted' : 'declined',
          decided_by: session.session?.user?.id ?? null,
          decided_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', app.id);
      if (updateErr) {
        // The invite already went out — surface the bookkeeping failure
        // instead of letting the row look pending (double-invite risk).
        throw new Error(accept
          ? `Invite sent, but marking the application failed: ${updateErr.message}`
          : updateErr.message);
      }
    },
    onSuccess: (_d, { accept, app }) => {
      queryClient.invalidateQueries({ queryKey: ['scholar-applications'] });
      toast({
        title: accept ? 'Scholar accepted' : 'Application declined',
        description: accept
          ? `${app.full_name} was enrolled and emailed a sign-in link at ${app.email}.`
          : `${app.full_name}'s application was marked declined. No email was sent.`,
      });
      if (accept) onAccepted?.();
    },
    onError: (e: Error) => toast({ title: 'Could not update application', description: e.message, variant: 'destructive' }),
  });

  const exportCsv = () => {
    const header = 'Name,Email,Phone,Alt phone,Classification,Age,School,Major/Minor,Instrument/Voice,Address,City State Zip,Emergency contact,Relationship,Emergency phone,Signature,Signed,Academic year,Status,Applied';
    const rows = apps.map((a) => [
      csvEscape(a.full_name), csvEscape(a.email), csvEscape(a.phone), csvEscape(a.alt_phone),
      csvEscape(a.classification), csvEscape(a.age), csvEscape(a.school), csvEscape(a.major_minor),
      csvEscape(a.instrument_voice), csvEscape(a.address), csvEscape(a.city_state_zip),
      csvEscape(a.emergency_name), csvEscape(a.emergency_relationship), csvEscape(a.emergency_phone),
      csvEscape(a.signature_name), new Date(a.agreed_at).toLocaleDateString(),
      csvEscape(a.academic_year), a.status, new Date(a.created_at).toLocaleDateString(),
    ].join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'scholar-applications.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Courses with no applications keep a clean People tab.
  if (!isLoading && apps.length === 0) return null;

  const detail = (label: string, value: string | null) => value ? (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  ) : null;

  const row = (a: ScholarApplicationRow) => (
    <div key={a.id} className="border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-3 py-2">
        <button
          type="button"
          className="flex items-center gap-2 text-left flex-1 min-w-0"
          onClick={() => setOpenId(openId === a.id ? null : a.id)}
        >
          {openId === a.id ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <span className="font-medium text-sm truncate">{a.full_name}</span>
          <span className="text-xs text-muted-foreground truncate">{a.email}</span>
          {a.classification && <span className="text-xs text-muted-foreground hidden sm:inline">· {a.classification}</span>}
          {a.instrument_voice && <span className="text-xs text-muted-foreground hidden sm:inline">· {a.instrument_voice}</span>}
          {!courseId && a.course_id && courseNames[a.course_id] && (
            <span className="text-xs rounded bg-muted px-1.5 py-0.5 shrink-0">{courseNames[a.course_id]}</span>
          )}
        </button>
        {a.status === 'submitted' ? (
          <div className="flex gap-1.5 shrink-0">
            <Button size="sm" className="h-7 text-xs" disabled={decide.isPending} onClick={() => decide.mutate({ app: a, accept: true })}>
              {decide.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
              Accept &amp; enroll
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={decide.isPending} onClick={() => decide.mutate({ app: a, accept: false })}>
              <X className="h-3.5 w-3.5 mr-1" /> Decline
            </Button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            {a.status === 'accepted' ? <><Check className="h-3.5 w-3.5" /> Accepted</> : <><X className="h-3.5 w-3.5" /> Declined</>}
          </span>
        )}
      </div>
      {openId === a.id && (
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pb-3 pl-6">
          {detail('Phone', a.phone)}
          {detail('Alternate phone', a.alt_phone)}
          {detail('Age', a.age)}
          {detail('School', a.school)}
          {detail('Major / Minor', a.major_minor)}
          {detail('Instrument / Voice', a.instrument_voice)}
          {detail('Address', [a.address, a.city_state_zip].filter(Boolean).join(', ') || null)}
          {detail('Emergency contact', [a.emergency_name, a.emergency_relationship].filter(Boolean).join(' — ') || null)}
          {detail('Emergency phone', a.emergency_phone)}
          {detail('Academic year', a.academic_year)}
          {detail('Signed', `${a.signature_name} · ${new Date(a.agreed_at).toLocaleString()}`)}
          {detail('Applied', new Date(a.created_at).toLocaleString())}
        </dl>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4" /> Scholar Applications
          </CardTitle>
          <CardDescription className="text-xs">
            From the public site&apos;s application form — {pending.length} awaiting review. Accepting enrolls the student and emails their sign-in link.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={apps.length === 0}>
          <Download className="h-4 w-4 mr-1.5" /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            {pending.length > 0 && <div>{pending.map(row)}</div>}
            {decided.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Decided</p>
                {decided.map(row)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
