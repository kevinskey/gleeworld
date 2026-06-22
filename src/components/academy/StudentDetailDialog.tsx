// Student detail dialog — opens when an instructor clicks a student in
// a course's PeopleTab. Surfaces everything the teacher needs to assess
// one student at a glance: profile, current grade in this course,
// attendance %, recent submissions, recent quiz attempts.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mail, Phone, MessageSquare, Loader2, ClipboardList, ClipboardCheck,
  CalendarCheck, Award, BookOpen, ExternalLink,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type StudentRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  voice_part: string | null;
  avatar_url?: string | null;
  enrollment_status?: string;
  enrolled_at?: string;
  created_at?: string;
  role?: string;
};

interface Props {
  student: StudentRow | null;
  courseId: string;
  courseCode: string;
  onClose: () => void;
}

export function StudentDetailDialog({ student, courseId, courseCode, onClose }: Props) {
  const navigate = useNavigate();

  // Profile details (phone, avatar, etc.)
  const { data: profile } = useQuery({
    queryKey: ['student-detail-profile', student?.user_id],
    enabled: !!student?.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_profiles_directory')
        .select('user_id, full_name, email, phone_number, avatar_url, voice_part')
        .eq('user_id', student!.user_id)
        .maybeSingle();
      return data;
    },
  });

  // Submissions in this course
  const { data: submissions = [] } = useQuery({
    queryKey: ['student-detail-submissions', student?.user_id, courseId],
    enabled: !!student?.user_id && !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_assignment_submissions')
        .select('id, score_value, graded_at, submitted_at, status, gw_assignments!inner(id, title, points, course_id)')
        .eq('user_id', student!.user_id)
        .eq('gw_assignments.course_id', courseId)
        .order('submitted_at', { ascending: false })
        .limit(15);
      return data ?? [];
    },
  });

  // All published assignments in this course (to compute missing)
  const { data: allAssignments = [] } = useQuery({
    queryKey: ['student-detail-all-assignments', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_assignments')
        .select('id, title, points, due_at')
        .eq('course_id', courseId)
        .eq('is_active', true);
      return data ?? [];
    },
  });

  // Quiz attempts in this course
  const { data: quizAttempts = [] } = useQuery({
    queryKey: ['student-detail-quizzes', student?.user_id, courseId],
    enabled: !!student?.user_id && !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_test_attempts')
        .select('id, score, max_score, submitted_at, is_graded, attempt_number, gw_course_tests!inner(id, title, course_id)')
        .eq('user_id', student!.user_id)
        .eq('gw_course_tests.course_id', courseId)
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .limit(15);
      return data ?? [];
    },
  });

  // Attendance summary (rolls up gw_course_attendance for this student × course)
  const { data: attendance } = useQuery({
    queryKey: ['student-detail-attendance', student?.user_id, courseId],
    enabled: !!student?.user_id && !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_attendance')
        .select('status')
        .eq('user_id', student!.user_id)
        .eq('course_id', courseId);
      const rows = data ?? [];
      const present = rows.filter((r: any) => r.status === 'present').length;
      const total = rows.length;
      return { present, total, pct: total > 0 ? Math.round((present / total) * 100) : null };
    },
  });

  // Roll up grade in this course
  const gradeSummary = useMemo(() => {
    const graded = submissions.filter((s: any) => s.graded_at && s.score_value !== null);
    const earned = graded.reduce((sum: number, s: any) => sum + (s.score_value || 0), 0);
    const possible = graded.reduce((sum: number, s: any) => sum + (s.gw_assignments?.points || 0), 0);
    const pct = possible > 0 ? Math.round((earned / possible) * 100) : null;
    return { earned, possible, pct };
  }, [submissions]);

  // Missing assignments = active assignments past due with no submission
  const missingAssignments = useMemo(() => {
    const now = new Date();
    const submittedIds = new Set(submissions.map((s: any) => s.gw_assignments?.id));
    return allAssignments.filter((a: any) => {
      if (submittedIds.has(a.id)) return false;
      if (!a.due_at) return false;
      return new Date(a.due_at) < now;
    });
  }, [allAssignments, submissions]);

  if (!student) return null;

  const p = profile || student;
  const displayName = p.full_name || p.email || '(no name)';
  const initials = displayName.split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <Dialog open={!!student} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="w-14 h-14">
              <AvatarImage src={(profile as any)?.avatar_url || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl truncate">{displayName}</DialogTitle>
              <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                {p.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</span>}
                {(profile as any)?.phone_number && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{(profile as any).phone_number}</span>}
                {p.voice_part && <Badge variant="outline" className="text-xs">{p.voice_part}</Badge>}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <Metric
            icon={Award}
            label="Grade"
            value={gradeSummary.pct === null ? '—' : `${gradeSummary.pct}%`}
            sub={gradeSummary.pct === null ? 'No graded work' : `${gradeSummary.earned} / ${gradeSummary.possible} pts`}
            tone={gradeSummary.pct === null
              ? 'muted'
              : gradeSummary.pct >= 80 ? 'emerald'
              : gradeSummary.pct >= 60 ? 'amber'
              : 'rose'}
          />
          <Metric
            icon={CalendarCheck}
            label="Attendance"
            value={attendance?.pct === null || attendance?.pct === undefined ? '—' : `${attendance.pct}%`}
            sub={attendance?.total ? `${attendance.present}/${attendance.total} sessions` : 'No data'}
            tone={attendance?.pct === null || attendance?.pct === undefined ? 'muted'
              : attendance.pct >= 90 ? 'emerald'
              : attendance.pct >= 75 ? 'amber'
              : 'rose'}
          />
          <Metric
            icon={ClipboardList}
            label="Missing"
            value={String(missingAssignments.length)}
            sub={missingAssignments.length === 0 ? 'All caught up' : 'Past due, not turned in'}
            tone={missingAssignments.length === 0 ? 'emerald'
              : missingAssignments.length < 3 ? 'amber' : 'rose'}
          />
        </div>

        {/* Submissions */}
        <Section title="Submissions" icon={ClipboardCheck} count={submissions.length}>
          {submissions.length === 0 ? (
            <Empty>No submissions yet.</Empty>
          ) : (
            <ul className="divide-y">
              {submissions.map((s: any) => {
                const graded = !!s.graded_at && s.score_value !== null;
                const submitted = s.submitted_at ? parseISO(s.submitted_at) : null;
                const points = s.gw_assignments?.points;
                return (
                  <li key={s.id} className="py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.gw_assignments?.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {graded ? `Graded ${format(parseISO(s.graded_at), 'MMM d')}`
                          : submitted ? `Submitted ${formatDistanceToNow(submitted, { addSuffix: true })}`
                          : 'Not submitted'}
                      </div>
                    </div>
                    {graded ? (
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                        {s.score_value}{points ? ` / ${points}` : ''}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        Pending
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* Quiz attempts */}
        <Section title="Quiz attempts" icon={Award} count={quizAttempts.length}>
          {quizAttempts.length === 0 ? (
            <Empty>No quiz attempts.</Empty>
          ) : (
            <ul className="divide-y">
              {quizAttempts.map((a: any) => {
                const submitted = a.submitted_at ? parseISO(a.submitted_at) : null;
                const pct = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : null;
                return (
                  <li
                    key={a.id}
                    className="py-2.5 flex items-center gap-3 hover:bg-muted/40 px-2 -mx-2 rounded cursor-pointer"
                    onClick={() => navigate(`/academy/c/${courseCode.toLowerCase()}/test/${a.gw_course_tests.id}/attempts/${a.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {a.gw_course_tests?.title}
                        {a.attempt_number > 1 && <span className="text-xs text-muted-foreground ml-1">#{a.attempt_number}</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {submitted ? `Submitted ${formatDistanceToNow(submitted, { addSuffix: true })}` : 'In progress'}
                      </div>
                    </div>
                    {pct !== null && a.is_graded && (
                      <Badge variant="outline" className={cn(
                        'text-xs',
                        pct >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : pct >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200',
                      )}>
                        {pct}% · {a.score}/{a.max_score}
                      </Badge>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* Missing assignments callout */}
        {missingAssignments.length > 0 && (
          <Section title="Missing" icon={ClipboardList} count={missingAssignments.length} tone="rose">
            <ul className="divide-y">
              {missingAssignments.map((a: any) => (
                <li key={a.id} className="py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    <div className="text-sm text-muted-foreground">
                      Due {a.due_at ? format(parseISO(a.due_at), 'MMM d') : '—'}
                      {a.points ? ` · ${a.points} pts` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => navigate(`/dashboard/messenger?to=${student.user_id}`)}>
            <MessageSquare className="w-4 h-4 mr-1.5" />
            Message
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title, icon: Icon, count, tone, children,
}: {
  title: string;
  icon: React.ElementType;
  count?: number;
  tone?: 'rose';
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'mt-2 rounded-2xl border p-4',
      tone === 'rose' ? 'border-rose-200 bg-rose-50/30' : 'border-border bg-card',
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('w-4 h-4', tone === 'rose' ? 'text-rose-700' : 'text-muted-foreground')} />
        <h3 className={cn('font-semibold text-sm', tone === 'rose' && 'text-rose-700')}>{title}</h3>
        {typeof count === 'number' && <Badge variant="outline" className="text-xs">{count}</Badge>}
      </div>
      {children}
    </div>
  );
}

function Metric({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tone: 'emerald' | 'amber' | 'rose' | 'muted';
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber:   'bg-amber-50 text-amber-600 border-amber-200',
    rose:    'bg-rose-50 text-rose-600 border-rose-200',
    muted:   'bg-muted text-muted-foreground border-border',
  };
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center gap-2">
        <div className={cn('w-7 h-7 rounded-lg inline-flex items-center justify-center', tones[tone])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      </div>
      <div className="text-2xl font-bold leading-none mt-2">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground italic py-2">{children}</p>;
}
