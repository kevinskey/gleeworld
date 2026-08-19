// Workspace Settings > Parents. Reviews the parent↔student links
// created by the on_auth_user_created_parent trigger. Pending rows
// (verified=false, no student_id) are cases where the parent typed
// a student email that didn't match any tenant profile — usually a
// typo or a family member whose child hasn't registered yet. Admin
// can match them to a real student, or delete the row if it was
// invalid.
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  Loader2, Users, CheckCircle2, AlertTriangle, Trash2, UserPlus, Search, Link2Off,
} from 'lucide-react';

interface ParentLink {
  id: string;
  parent_id: string;
  student_id: string | null;
  student_email: string;
  verified: boolean;
  created_at: string;
  parent: { full_name: string | null; email: string | null } | null;
  student: { full_name: string | null; email: string | null } | null;
}

interface StudentPick {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export function ParentsTabPanel({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();

  // One query for both buckets — the panel is small enough that
  // splitting into pending vs verified queries buys nothing and each
  // action invalidation would have to hit both keys anyway.
  //
  // gw_parent_children's FKs point at auth.users, not gw_profiles, so
  // PostgREST can't resolve an embedded gw_profiles lookup. Fetch the
  // links and their referenced profiles in two queries and merge
  // client-side.
  const { data: links = [], isLoading } = useQuery<ParentLink[]>({
    queryKey: ['parent-children-admin'],
    queryFn: async () => {
      const { data: rawLinks, error } = await supabase
        .from('gw_parent_children')
        .select('id, parent_id, student_id, student_email, verified, created_at')
        .order('verified', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (rawLinks ?? []) as Array<Omit<ParentLink, 'parent' | 'student'>>;
      const userIds = Array.from(new Set(
        rows.flatMap((r) => [r.parent_id, r.student_id]).filter((x): x is string => !!x),
      ));
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('gw_profiles').select('user_id, full_name, email').in('user_id', userIds)
        : { data: [] as Array<{ user_id: string; full_name: string | null; email: string | null }> };
      const byId = new Map(
        (profiles ?? []).map((p) => [p.user_id, { full_name: p.full_name, email: p.email }]),
      );
      return rows.map((r) => ({
        ...r,
        parent: byId.get(r.parent_id) ?? null,
        student: r.student_id ? (byId.get(r.student_id) ?? null) : null,
      }));
    },
  });

  const pending = useMemo(() => links.filter((l) => !l.verified), [links]);
  const verified = useMemo(() => links.filter((l) => l.verified), [links]);

  async function verifyWithStudent(linkId: string, studentId: string) {
    const { error } = await supabase
      .from('gw_parent_children')
      .update({ student_id: studentId, verified: true, updated_at: new Date().toISOString() })
      .eq('id', linkId);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['parent-children-admin'] });
    toast.success('Link verified.');
  }

  async function unverify(linkId: string) {
    const { error } = await supabase
      .from('gw_parent_children')
      .update({ verified: false, updated_at: new Date().toISOString() })
      .eq('id', linkId);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['parent-children-admin'] });
  }

  async function del(linkId: string) {
    const { error } = await supabase.from('gw_parent_children').delete().eq('id', linkId);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['parent-children-admin'] });
    toast.success('Link removed.');
  }

  if (isLoading) {
    return (
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-4 sm:p-5 space-y-1">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" /> Parent registrations
          </h3>
          <p className="text-xs text-muted-foreground">
            Parents who signed up through <code className="text-[11px]">/register/parent</code>.
            Pending links are ones where the child's email didn't match a student profile —
            resolve them below so teachers can reach them.
          </p>
        </CardContent>
      </Card>

      {/* Pending */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Pending ({pending.length})
            </h3>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No pending links. Every parent signup has been matched to a student.
            </p>
          ) : (
            <div className="space-y-2">
              {pending.map((l) => (
                <PendingRow key={l.id} link={l} canManage={canManage} onVerify={verifyWithStudent} onDelete={del} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verified */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-4 sm:p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Verified ({verified.length})
          </h3>
          {verified.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No verified links yet.
            </p>
          ) : (
            <div className="divide-y border rounded-lg">
              {verified.map((l) => (
                <div key={l.id} className="px-3 py-2.5 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {l.parent?.full_name || l.parent?.email || '(unknown parent)'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      → {l.student?.full_name || l.student?.email || l.student_email}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200">
                    Verified
                  </Badge>
                  {canManage && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => unverify(l.id)} title="Mark pending">
                        <Link2Off className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => del(l.id)} title="Remove link">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PendingRow({
  link, canManage, onVerify, onDelete,
}: {
  link: ParentLink;
  canManage: boolean;
  onVerify: (linkId: string, studentId: string) => void;
  onDelete: (linkId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(link.student_email);

  // Only fetch student list when the popover is open — a tenant with
  // 500 members doesn't need a directory hit for every collapsed row
  // on page load.
  const { data: students = [] } = useQuery<StudentPick[]>({
    queryKey: ['parent-admin-student-search', q],
    enabled: open,
    queryFn: async () => {
      const term = q.trim();
      const rq = supabase
        .from('gw_profiles_directory')
        .select('user_id, full_name, email')
        .not('email', 'is', null)
        .neq('role', 'parent')
        .limit(25);
      const pattern = term ? `%${term.replace(/[%_\\]/g, (c) => '\\' + c)}%` : null;
      const { data, error } = pattern
        ? await rq.or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
        : await rq;
      if (error) throw error;
      return (data ?? []) as StudentPick[];
    },
  });

  return (
    <div className="border rounded-lg p-3 flex items-center gap-3 text-sm">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {link.parent?.full_name || link.parent?.email || '(unknown parent)'}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          Looking for: <span className="font-mono">{link.student_email}</span>
        </div>
      </div>
      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200 shrink-0">
        Pending
      </Badge>
      {canManage && (
        <>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Match student
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="end">
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name or email…"
                  className="h-8 pl-7 text-sm"
                />
              </div>
              <div className="max-h-64 overflow-y-auto divide-y">
                {students.length === 0 && (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No students match.
                  </div>
                )}
                {students.map((s) => (
                  <button
                    key={s.user_id}
                    type="button"
                    onClick={() => { onVerify(link.id, s.user_id); setOpen(false); }}
                    className="w-full text-left px-2 py-1.5 hover:bg-muted/40 rounded-sm"
                  >
                    <div className="text-sm font-medium truncate">{s.full_name || '(no name)'}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="ghost" onClick={() => onDelete(link.id)} title="Remove link">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
