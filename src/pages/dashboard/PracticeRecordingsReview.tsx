// Teacher / instructor inbox for student practice recordings.
//
// Lists every recording in the current tenant (RLS on
// `gw_practice_recordings` lets admins / instructors / conductors read
// across users). Each row shows the student name, when they recorded,
// the metronome settings, an inline audio player, and an editable
// "teacher notes" field that writes back to the same row.

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mic, Save, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';

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

export default function PracticeRecordingsReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [query, setQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['practice-recordings-review'],
    queryFn: async () => {
      // Two-step fetch — there's no FK between gw_practice_recordings
      // and gw_profiles in the schema, so PostgREST can't do the embed.
      // Pull recordings, collect unique user_ids, then resolve the
      // student names/emails in one follow-up query and join in memory.
      const { data: recs, error: recsErr } = await supabase
        .from('gw_practice_recordings')
        .select('id, user_id, audio_url, duration_sec, bpm, time_sig, title, teacher_notes, created_at')
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
      || (r.student_email ?? '').toLowerCase().includes(q)
      || (r.title ?? '').toLowerCase().includes(q)
      || (r.teacher_notes ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="!text-[1.4rem] sm:!text-[2rem] font-bold tracking-tight flex items-center gap-2">
            <Mic className="w-7 h-7 text-primary" />
            Practice recordings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every student practice take with the metronome from the <strong>Student Practice</strong> course.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Share the join link with your students:{' '}
            <code className="px-1.5 py-0.5 rounded bg-muted font-mono">
              {typeof window !== 'undefined' ? `${window.location.origin}/join/STUDENT-PRACTICE` : '/join/STUDENT-PRACTICE'}
            </code>
          </p>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by student, title, notes…"
          className="w-full max-w-sm"
        />
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading recordings…
        </div>
      )}
      {error && (
        <div className="text-sm text-destructive">
          Couldn't load recordings: {(error as Error).message}
        </div>
      )}
      {!isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {data?.length === 0
              ? 'No students have saved a practice recording yet.'
              : 'No recordings match your search.'}
          </CardContent>
        </Card>
      )}

      <ul className="space-y-3">
        {filtered.map((r) => (
          <RecordingCard
            key={r.id}
            recording={r}
            onSavedNotes={() => queryClient.invalidateQueries({ queryKey: ['practice-recordings-review'] })}
            toast={toast}
          />
        ))}
      </ul>
    </div>
  );
}

function RecordingCard({
  recording,
  onSavedNotes,
  toast,
}: {
  recording: RecordingRow;
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
    <li>
      <Card>
        <CardContent className="p-4 space-y-3">
          <header className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{recording.student_name}</div>
                <div className="text-xs text-muted-foreground truncate">{recording.student_email}</div>
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
              // First teacher play clears this take from "Needs Your
              // Attention" — no explicit feedback required. The .is()
              // guard makes it a no-op on later plays.
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
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
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
        </CardContent>
      </Card>
    </li>
  );
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
