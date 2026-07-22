// /academy/c/:code/settings — edit course details, transfer instructor,
// archive (soft delete), regenerate join code, or hard-delete. Only the
// course's instructor (or a tenant admin) can manage.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowLeft, Settings as SettingsIcon, BookOpen, Save, Trash2, Archive,
  RefreshCw, Copy, Check, Loader2, AlertTriangle, Users, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

interface CourseRow {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  semester: string | null;
  default_location: string | null;
  instructor_id: string | null;
  instructor_name: string | null;
  instructor_email: string | null;
  max_enrollment: number | null;
  is_active: boolean | null;
  is_free: boolean | null;
  join_code: string | null;
  created_by: string | null;
  show_assignments: boolean | null;
  show_discussions: boolean | null;
  show_tests: boolean | null;
  show_grades: boolean | null;
}

export default function CourseSettingsPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin, isAdmin } = useUserRole();
  const qc = useQueryClient();

  const { data: course, isLoading } = useQuery<CourseRow | null>({
    queryKey: ['course-settings', code],
    enabled: !!code,
    queryFn: async () => {
      const slug = code!.replace(/-/g, ' ').toUpperCase();
      const { data } = await supabase
        .from('gw_courses')
        .select('id, course_code, title, description, semester, default_location, instructor_id, instructor_name, instructor_email, max_enrollment, is_active, is_free, join_code, created_by, show_assignments, show_discussions, show_tests, show_grades')
        .or(`course_code.ilike.%${slug}%,course_code.eq.${slug}`)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      return data as CourseRow | null;
    },
  });

  const [form, setForm] = useState<CourseRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (course) setForm(course);
  }, [course]);

  const canManage = !!user && !!course && (
    isSuperAdmin() || isAdmin() ||
    course.instructor_id === user.id || course.created_by === user.id
  );

  const update = (patch: Partial<CourseRow>) => setForm((f) => f ? { ...f, ...patch } : f);

  const save = useMutation({
    mutationFn: async () => {
      if (!form || !course) return;
      const { error } = await supabase
        .from('gw_courses')
        .update({
          title: form.title,
          description: form.description,
          semester: form.semester,
          default_location: form.default_location,
          max_enrollment: form.max_enrollment,
          is_free: form.is_free,
          show_assignments: form.show_assignments,
          show_discussions: form.show_discussions,
          show_tests: form.show_tests,
          show_grades: form.show_grades,
          updated_at: new Date().toISOString(),
        })
        .eq('id', course.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Course updated.');
      qc.invalidateQueries({ queryKey: ['course-settings', code] });
    },
    onError: (e: any) => toast.error(e?.message || 'Save failed.'),
  });

  const archive = useMutation({
    mutationFn: async () => {
      if (!course) return;
      const { error } = await supabase
        .from('gw_courses')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', course.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Course archived.');
      navigate('/academy');
    },
    onError: (e: any) => toast.error(e?.message || 'Archive failed.'),
  });

  const hardDelete = useMutation({
    mutationFn: async () => {
      if (!course) return;
      const { error } = await supabase.from('gw_courses').delete().eq('id', course.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Course deleted.');
      navigate('/academy');
    },
    onError: (e: any) => toast.error(e?.message || 'Delete failed.'),
  });

  const regenerateJoinCode = useMutation({
    mutationFn: async () => {
      if (!course) return;
      const newCode = randomJoinCode();
      const { error } = await supabase
        .from('gw_courses')
        .update({ join_code: newCode })
        .eq('id', course.id);
      if (error) throw error;
      return newCode;
    },
    onSuccess: () => {
      toast.success('New join code generated.');
      qc.invalidateQueries({ queryKey: ['course-settings', code] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed.'),
  });

  if (isLoading || !form) {
    return <UniversalLayout><div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div></UniversalLayout>;
  }
  if (!course) {
    return <UniversalLayout><div className="py-12 text-center text-sm text-muted-foreground">Course not found.</div></UniversalLayout>;
  }

  return (
    <UniversalLayout>
    <DashboardPageShell maxWidth="4xl" title="Settings">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/academy/c/${code}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-xs font-mono text-muted-foreground">{course.course_code}</div>
      </div>

      {!canManage && (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-4 text-sm text-amber-700 bg-amber-50/50 rounded-2xl">
            You can view course settings but only the instructor or a tenant admin can change them.
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 inline-flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="font-semibold">Course details</h2>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input value={form.title} disabled={!canManage} onChange={(e) => update({ title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={form.description || ''}
              disabled={!canManage}
              onChange={(e) => update({ description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Semester</Label>
              <Input value={form.semester || ''} disabled={!canManage} onChange={(e) => update({ semester: e.target.value })} placeholder="Fall 2026" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default location</Label>
              <Input value={form.default_location || ''} disabled={!canManage} onChange={(e) => update({ default_location: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Max enrollment</Label>
              <Input
                type="number"
                value={form.max_enrollment || ''}
                disabled={!canManage}
                onChange={(e) => update({ max_enrollment: parseInt(e.target.value) || null })}
              />
            </div>
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-xs">Free to enroll</Label>
              <div className="h-10 inline-flex items-center">
                <Switch checked={!!form.is_free} disabled={!canManage} onCheckedChange={(c) => update({ is_free: c })} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructor */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 inline-flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="font-semibold">Instructor</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name (display)</Label>
              <Input value={form.instructor_name || ''} disabled className="opacity-70" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={form.instructor_email || ''} disabled className="opacity-70" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            To transfer this course to another instructor, use the workspace user management page (coming soon).
          </p>
        </CardContent>
      </Card>

      {/* Student-side visibility */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 inline-flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <h2 className="font-semibold">Student-side visibility</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Toggle whole tabs off if this class doesn't use them.
          </p>
          {[
            { key: 'show_assignments', label: 'Assignments tab' },
            { key: 'show_discussions', label: 'Discussions tab' },
            { key: 'show_tests',       label: 'Quizzes / tests tab' },
            { key: 'show_grades',      label: 'Grades tab' },
          ].map(({ key, label }) => {
            const k = key as keyof CourseRow;
            return (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <Switch
                  checked={(form[k] as boolean) ?? true}
                  disabled={!canManage}
                  onCheckedChange={(c) => update({ [k]: c } as any)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Join code */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 inline-flex items-center justify-center">
              <Copy className="w-5 h-5" />
            </div>
            <h2 className="font-semibold">Join code</h2>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-md bg-muted/50 font-mono text-sm">
              {form.join_code || '— not set —'}
            </code>
            {form.join_code && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(form.join_code!);
                  toast.success('Copied.');
                }}
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
              </Button>
            )}
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => regenerateJoinCode.mutate()} disabled={regenerateJoinCode.isPending}>
                {regenerateJoinCode.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Students enroll by entering this code at <span className="font-mono">/join/{form.join_code || 'CODE'}</span>.
          </p>
        </CardContent>
      </Card>

      {/* Save */}
      {canManage && (
        <div className="flex items-center justify-end gap-2 sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4">
          <Button onClick={() => save.mutate()} disabled={save.isPending} size="lg" className="font-semibold shadow-lg">
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save changes
          </Button>
        </div>
      )}

      {/* Danger zone */}
      {canManage && (
        <Card className="border-rose-200 rounded-2xl bg-rose-50/30">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 inline-flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-rose-700">Danger zone</h2>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Archive course</div>
                <div className="text-xs text-muted-foreground">Hide from active lists, keep data. Students lose access.</div>
              </div>
              <Button variant="outline" className="text-rose-700 border-rose-300 hover:bg-rose-50" onClick={() => archive.mutate()} disabled={archive.isPending}>
                {archive.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Archive className="w-4 h-4 mr-1.5" />}
                Archive
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-rose-200">
              <div>
                <div className="text-sm font-medium">Delete permanently</div>
                <div className="text-xs text-muted-foreground">Removes the course and all its content. Not reversible.</div>
              </div>
              <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete…
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this course?</DialogTitle>
            <DialogDescription>
              <span className="font-mono">{course.course_code}</span> · {course.title}
              <br />
              This deletes the course row plus every assignment, test, module, announcement, discussion, and enrollment.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setConfirmDelete(false); hardDelete.mutate(); }} disabled={hardDelete.isPending}>
              {hardDelete.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardPageShell>
    </UniversalLayout>
  );
}

function randomJoinCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}
