// Course cohorts panel — shown inside PeopleTab on the course deep page.
// Lets the instructor create sub-groups (e.g. voice sections, freshmen vs
// upperclassmen, tour travelers) and assign students to them. A student
// can belong to multiple cohorts.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Users, Plus, Trash2, Loader2, Check, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteButton } from '@/components/shared/ConfirmDeleteButton';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

const PALETTE = ['#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

export function CourseCohortsPanel({
  courseId, canEdit, students,
}: {
  courseId: string;
  canEdit: boolean;
  students: Array<{ user_id: string; full_name: string | null; email: string | null }>;
}) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingCohort, setEditingCohort] = useState<any | null>(null);

  const { data: cohorts = [], isLoading } = useQuery({
    queryKey: ['course-cohorts', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_cohorts')
        .select('id, name, color, position')
        .eq('course_id', courseId)
        .order('position');
      return data ?? [];
    },
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['course-cohort-members', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_cohort_members')
        .select('cohort_id, user_id, gw_course_cohorts!inner(course_id)')
        .eq('gw_course_cohorts.course_id', courseId);
      return data ?? [];
    },
  });

  const membersByCohort = useMemo(() => {
    const map = new Map<string, string[]>();
    memberships.forEach((m: any) => {
      const arr = map.get(m.cohort_id) || [];
      arr.push(m.user_id);
      map.set(m.cohort_id, arr);
    });
    return map;
  }, [memberships]);

  const create = useMutation({
    mutationFn: async () => {
      if (!newName.trim()) throw new Error('Name required.');
      const color = PALETTE[cohorts.length % PALETTE.length];
      const { error } = await supabase.from('gw_course_cohorts').insert({
        course_id: courseId,
        name: newName.trim(),
        color,
        position: cohorts.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewName('');
      toast.success('Cohort created.');
      qc.invalidateQueries({ queryKey: ['course-cohorts', courseId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Create failed.'),
  });

  const remove = useMutation({
    mutationFn: async (cohortId: string) => {
      const { error } = await supabase.from('gw_course_cohorts').delete().eq('id', cohortId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-cohorts', courseId] });
      qc.invalidateQueries({ queryKey: ['course-cohort-members', courseId] });
    },
  });

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Cohorts & sections</h2>
          </div>
          <Badge variant="outline" className="text-xs">{cohorts.length}</Badge>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Sub-groups within this class — voice sections, freshmen vs upperclassmen, tour travelers. A student can be in more than one.
        </p>

        {canEdit && (
          <div className="flex items-center gap-2 mb-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New cohort name…"
              className="h-9 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) create.mutate(); }}
            />
            <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending || !newName.trim()}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
        ) : cohorts.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">No cohorts yet.</div>
        ) : (
          <div className="space-y-2">
            {cohorts.map((c: any) => {
              const memberIds = membersByCohort.get(c.id) || [];
              return (
                <div key={c.id} className="rounded-xl border p-3 flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: c.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{c.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {memberIds.length} student{memberIds.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  {canEdit && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditingCohort(c)}>
                        Members
                      </Button>
                      <ConfirmDeleteButton
                        confirmKey="delete-cohort"
                        title="Delete this cohort?"
                        description="Students stay enrolled in the course."
                        onConfirm={() => remove.mutate(c.id)}
                        ariaLabel="Delete cohort"
                        className="inline-flex items-center justify-center rounded-md h-9 w-9 text-rose-600 hover:text-rose-700 hover:bg-muted"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </ConfirmDeleteButton>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <CohortMembersDialog
          cohort={editingCohort}
          students={students}
          memberIds={editingCohort ? (membersByCohort.get(editingCohort.id) || []) : []}
          onClose={() => setEditingCohort(null)}
          onChanged={() => qc.invalidateQueries({ queryKey: ['course-cohort-members', courseId] })}
        />
      </CardContent>
    </Card>
  );
}

function CohortMembersDialog({
  cohort, students, memberIds, onClose, onChanged,
}: {
  cohort: any | null;
  students: Array<{ user_id: string; full_name: string | null; email: string | null }>;
  memberIds: string[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!cohort) return null;
  const inCohort = new Set(memberIds);

  async function toggle(userId: string) {
    setBusy(userId);
    try {
      if (inCohort.has(userId)) {
        await supabase
          .from('gw_course_cohort_members')
          .delete()
          .eq('cohort_id', cohort.id)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('gw_course_cohort_members')
          .insert({ cohort_id: cohort.id, user_id: userId });
      }
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || 'Failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={!!cohort} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cohort.name} · members</DialogTitle>
        </DialogHeader>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No students enrolled in this course yet.</p>
        ) : (
          <ul className="divide-y">
            {students.map((s) => {
              const member = inCohort.has(s.user_id);
              return (
                <li key={s.user_id} className="py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.full_name || s.email || '(no name)'}</div>
                    <div className="text-sm text-muted-foreground truncate">{s.email}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={member ? 'default' : 'outline'}
                    onClick={() => toggle(s.user_id)}
                    disabled={busy === s.user_id}
                  >
                    {busy === s.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : member ? <><Check className="w-3.5 h-3.5 mr-1.5" />In</>
                      : 'Add'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
