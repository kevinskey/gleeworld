import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { assignExercise } from '@/lib/notation/assignmentsApi';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  course_code: string | null;
}

interface Student {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
}

interface AssignExerciseDialogProps {
  exerciseId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignExerciseDialog({ exerciseId, title, open, onOpenChange }: AssignExerciseDialogProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [mode, setMode] = useState<'class' | 'student'>('class');
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('gw_courses')
      .select('id, title, course_code')
      .order('title')
      .then(({ data, error }) => {
        if (error) {
          console.error('notation: failed to load courses', error);
          return;
        }
        setCourses((data ?? []) as Course[]);
      });
  }, [open]);

  useEffect(() => {
    if (!open || mode !== 'student' || !courseId) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: enrollments, error: e1 } = await supabase
        .from('gw_course_enrollments')
        .select('user_id')
        .eq('course_id', courseId);
      if (e1) {
        console.error('notation: failed to load roster', e1);
        return;
      }
      const userIds = (enrollments ?? [])
        .map((e) => e.user_id)
        .filter((id): id is string => !!id);
      if (userIds.length === 0) {
        if (!cancelled) setStudents([]);
        return;
      }
      const { data: profiles, error: e2 } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, display_name, email')
        .in('user_id', userIds);
      if (e2) {
        console.error('notation: failed to load roster profiles', e2);
        return;
      }
      if (!cancelled) setStudents((profiles ?? []) as Student[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode, courseId]);

  useEffect(() => {
    if (!open) {
      setCourseId('');
      setMode('class');
      setStudents([]);
      setStudentId('');
      setDueDate('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!courseId) return;
    setSubmitting(true);
    try {
      await assignExercise({
        exerciseId,
        courseId,
        studentId: mode === 'student' ? studentId || undefined : undefined,
        dueAt: dueDate ? new Date(dueDate).toISOString() : undefined,
        title,
      });
      toast.success('Exercise assigned.');
      onOpenChange(false);
    } catch (err) {
      console.error('notation: failed to assign exercise', err);
      toast.error('Could not assign this exercise.');
    } finally {
      setSubmitting(false);
    }
  };

  const studentLabel = (s: Student) => s.full_name || s.display_name || s.email || s.user_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign “{title}”</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="assign-course">
              Class
            </label>
            <select
              id="assign-course"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Select a class…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code ? `${c.course_code} — ${c.title}` : c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'class' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('class')}
            >
              Whole class
            </Button>
            <Button
              type="button"
              variant={mode === 'student' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('student')}
            >
              One student
            </Button>
          </div>

          {mode === 'student' && (
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="assign-student">
                Student
              </label>
              <select
                id="assign-student"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={!courseId}
              >
                <option value="">Select a student…</option>
                {students.map((s) => (
                  <option key={s.user_id} value={s.user_id}>
                    {studentLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="assign-due">
              Due date
            </label>
            <Input
              id="assign-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={handleSubmit}
            disabled={!courseId || submitting}
          >
            {submitting ? 'Assigning…' : 'Assign'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
