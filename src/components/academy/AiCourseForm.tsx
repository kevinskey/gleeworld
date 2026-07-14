import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { generateCourse, type CourseFormInput } from '@/lib/academy/generateCourse';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AiCourseForm() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    title: '', subject: '', level: '', term_start: '', term_end: '',
    days: [] as number[], start_time: '10:00', end_time: '10:50', location: '',
    learning_goals: '', grading_approach: '',
  });
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));
  const toggleDay = (d: number) => setF((s) => ({ ...s, days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d] }));

  const canSubmit = f.title.trim() && f.term_start && f.term_end && f.term_end > f.term_start && f.days.length > 0;

  async function onSubmit() {
    setError(null);
    if (!canSubmit) { setError('Add a title, valid term dates (end after start), and at least one meeting day.'); return; }
    const input: CourseFormInput = {
      title: f.title.trim(), subject: f.subject.trim() || undefined, level: f.level.trim() || undefined,
      term_start: f.term_start, term_end: f.term_end,
      meeting_patterns: f.days.map((weekday) => ({ weekday, start_time: f.start_time, end_time: f.end_time, location: f.location.trim() || undefined })),
      learning_goals: f.learning_goals.trim() || undefined,
      grading_approach: f.grading_approach.trim() || undefined,
    };
    setBusy(true);
    try {
      const r = await generateCourse(supabase, input);
      if (r.ok) navigate(`/academy/c/${r.courseCode.toLowerCase()}`);
      else setError(r.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Label>Course title</Label>
        <Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Choral Conducting I" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Subject</Label><Input value={f.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Choral conducting" /></div>
        <div><Label>Level</Label><Input value={f.level} onChange={(e) => set('level', e.target.value)} placeholder="Undergraduate" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Term start</Label><Input type="date" value={f.term_start} onChange={(e) => set('term_start', e.target.value)} /></div>
        <div><Label>Term end</Label><Input type="date" value={f.term_end} onChange={(e) => set('term_end', e.target.value)} /></div>
      </div>
      <div>
        <Label>Meeting days</Label>
        <div className="flex gap-1 flex-wrap">
          {WEEKDAYS.map((w, d) => (
            <Button key={d} type="button" size="sm" variant={f.days.includes(d) ? 'default' : 'outline'}
              className="h-8 text-xs" onClick={() => toggleDay(d)}>{w}</Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>Start</Label><Input type="time" value={f.start_time} onChange={(e) => set('start_time', e.target.value)} /></div>
        <div><Label>End</Label><Input type="time" value={f.end_time} onChange={(e) => set('end_time', e.target.value)} /></div>
        <div><Label>Room</Label><Input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="optional" /></div>
      </div>
      <div>
        <Label>Learning goals</Label>
        <Textarea value={f.learning_goals} onChange={(e) => set('learning_goals', e.target.value)}
          placeholder="What students should be able to do by the end." rows={3} />
      </div>
      <div>
        <Label>Grading approach</Label>
        <Textarea value={f.grading_approach} onChange={(e) => set('grading_approach', e.target.value)}
          placeholder="e.g. Weekly reflections 20%, two performances 60%, final 20%." rows={2} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={busy || !canSubmit} onClick={onSubmit}>
        {busy ? 'Generating your course…' : 'Generate course'}
      </Button>
      <p className="text-xs text-muted-foreground">
        The AI drafts modules, assignments, and a rubric from these basics. You'll review and publish it on the next screen.
      </p>
    </div>
  );
}
