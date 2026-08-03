// Course-scoped practice recordings tab. Lives inside CourseShell on the
// Student Practice course (course_code = 'STUDENT-PRACTICE' or 'GLEE 000').
//
// Students see their own recordings; teachers (canEdit) see every
// student's take in this course's roster + can leave feedback. Filtering
// by course_id happens in the query; RLS still clamps reads to the
// caller's tenant and (for students) their own user_id.

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mic, Save, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';

interface CoursePracticeTabProps {
  courseId: string;
  canEdit: boolean;
}

interface RecordingRow {
  id: string;
  user_id: string;
  audio_url: string;
  duration_sec: number | null;
  bpm: number | null;
  time_sig: string | null;
  title: string | null;
  teacher_notes: string | null;
  created_at: string;
  student_name: string;
  student_email: string;
}

export default function CoursePracticeTab({ courseId, canEdit }: CoursePracticeTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [query, setQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['course-practice-recordings', courseId, canEdit, user?.id],
    enabled: !!courseId,
    queryFn: async () => {
      // Pull recordings for this course. Students only see their own
      // (RLS) even though there's no client-side filter; teachers see
      // the whole class. Then resolve student names in a second query.
      const { data: recs, error: recsErr } = await supabase
        .from('gw_practice_recordings')
        .select('id, user_id, audio_url, duration_sec, bpm, time_sig, title, teacher_notes, created_at')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (recsErr) throw recsErr;
      const userIds = Array.from(new Set((recs ?? []).map((r) => r.user_id)));
      const profileMap = new Map<string, { first_name: string | null; last_name: string | null; email: string | null }>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('gw_profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', userIds);
        (profs ?? []).forEach((p: any) => profileMap.set(p.user_id, p));
      }
      return (recs ?? []).map((r: any) => {
        const p = profileMap.get(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          audio_url: r.audio_url,
          duration_sec: r.duration_sec,
          bpm: r.bpm,
          time_sig: r.time_sig,
          title: r.title,
          teacher_notes: r.teacher_notes,
          created_at: r.created_at,
          student_name: p
            ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email || 'Unknown student'
            : 'Unknown student',
          student_email: p?.email ?? '',
        } as RecordingRow;
      });
    },
  });

  const filtered = (data ?? []).filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.student_name.toLowerCase().includes(q)
      || r.student_email.toLowerCase().includes(q)
      || (r.title ?? '').toLowerCase().includes(q)
      || (r.teacher_notes ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <header className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mic className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">Rehearsal recordings</h2>
              <p className="text-xs text-muted-foreground">
                {canEdit
                  ? "Every take your students have saved with the metronome."
                  : "Your own practice takes — your teacher reviews each one."}
              </p>
            </div>
          </div>
          {canEdit && (
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student, title, notes…"
              className="w-full sm:w-72"
            />
          )}
        </div>
        {!canEdit && (
          <p className="mt-3 text-xs text-muted-foreground">
            New recordings: open the metronome (Music Tools → Metronome) and click <strong>Record practice</strong>.
          </p>
        )}
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading recordings…
        </div>
      )}
      {error && (
        <div className="text-sm text-destructive p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          Couldn't load recordings: {(error as Error).message}
        </div>
      )}
      {!isLoading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 px-4 text-center">
          <Mic className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {data?.length === 0
              ? (canEdit
                  ? "No students have saved a rehearsal recording for this course yet."
                  : "You haven't saved any rehearsal recordings yet.")
              : "No recordings match your search."}
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {filtered.map((r) => (
          <RecordingCard
            key={r.id}
            recording={r}
            canEdit={canEdit}
            onSavedNotes={() => queryClient.invalidateQueries({ queryKey: ['course-practice-recordings', courseId] })}
            toast={toast}
          />
        ))}
      </ul>
    </div>
  );
}

function RecordingCard({
  recording,
  canEdit,
  onSavedNotes,
  toast,
}: {
  recording: RecordingRow;
  canEdit: boolean;
  onSavedNotes: () => void;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [notes, setNotes] = useState(recording.teacher_notes ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = notes !== (recording.teacher_notes ?? '');

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('gw_practice_recordings')
      .update({ teacher_notes: notes || null })
      .eq('id', recording.id);
    setSaving(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Save failed', description: error.message });
      return;
    }
    toast({ title: 'Feedback saved' });
    onSavedNotes();
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate text-sm">{recording.student_name}</div>
            {canEdit && (
              <div className="text-xs text-muted-foreground truncate">{recording.student_email}</div>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground text-right shrink-0">
          <div>{format(new Date(recording.created_at), 'PPp')}</div>
          <div className="opacity-70">{formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}</div>
        </div>
      </header>
      <div>
        <div className="text-sm font-semibold">{recording.title || 'Untitled practice'}</div>
        <div className="text-xs text-muted-foreground font-mono">
          ♩ = {recording.bpm ?? '?'} · {recording.time_sig ?? '?'} · {formatElapsed(Math.round(Number(recording.duration_sec) || 0))}
        </div>
      </div>
      <audio
        src={recording.audio_url}
        controls
        preload="none"
        className="w-full"
        onPlay={async () => {
          if (!canEdit) return;
          // First teacher play clears the take from the "Needs Your
          // Attention" list. Idempotent — a second play does nothing.
          if (recording.teacher_notes) return; // already actively reviewed
          try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase
              .from('gw_practice_recordings')
              .update({ reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
              .eq('id', recording.id)
              .is('reviewed_at', null);
          } catch { /* best-effort */ }
        }}
      />
      {canEdit ? (
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Teacher feedback
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write feedback the student will see next to their take…"
            rows={3}
            className="text-sm"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Saving</>
                : <><Save className="w-3.5 h-3.5 mr-1" /> Save feedback</>}
            </Button>
          </div>
        </div>
      ) : recording.teacher_notes ? (
        <div className="text-xs bg-amber-50 border border-amber-200 rounded p-2 leading-relaxed">
          <span className="font-semibold">Teacher: </span>{recording.teacher_notes}
        </div>
      ) : null}
    </li>
  );
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
