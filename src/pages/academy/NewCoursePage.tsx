// /academy/new — create a course from scratch. Writes a gw_courses row,
// the calendar-ensure trigger auto-provisions a calendar, then we land
// the teacher on the new course's deep page.

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, BookOpen, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AiCourseForm } from '@/components/academy/AiCourseForm';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function NewCoursePage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'manual' ? 'manual' : 'ai';
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    course_code: '',
    title: '',
    description: '',
    semester: '',
    default_location: '',
    max_enrollment: 30,
    is_free: true,
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.course_code.trim() || !form.title.trim()) {
      toast.error('Course code and title are required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        course_code: form.course_code.trim().toUpperCase(),
        code: form.course_code.trim().toUpperCase(),
        title: form.title.trim(),
        description: form.description.trim() || null,
        semester: form.semester.trim() || null,
        default_location: form.default_location.trim() || null,
        instructor_id: user?.id,
        instructor_name: profile?.full_name || null,
        instructor_email: user?.email || null,
        max_enrollment: form.max_enrollment || null,
        is_free: form.is_free,
        is_active: true,
        is_template: false,
        created_by: user?.id,
      };
      const { data, error } = await supabase
        .from('gw_courses')
        .insert(payload)
        .select('id, course_code')
        .single();
      if (error) throw error;
      toast.success('Course created.');
      navigate(`/academy/c/${(data.course_code || '').toLowerCase()}`);
    } catch (e: any) {
      toast.error(e?.message || 'Create failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardPageShell
      maxWidth="4xl"
      title="New Course"
      subtitle="Spin up a fresh course. You can build out modules, assignments, and tests after."
    >
      <Button variant="ghost" size="icon" onClick={() => navigate('/academy')}>
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <div className="mb-4 flex items-center gap-3 text-sm">
        <span className="font-medium">New course</span>
        <button type="button" className={mode === 'ai' ? 'underline font-medium' : 'text-muted-foreground'}
          onClick={() => setSearchParams({ mode: 'ai' })}>Create with AI</button>
        <span className="text-muted-foreground">·</span>
        <button type="button" className={mode === 'manual' ? 'underline font-medium' : 'text-muted-foreground'}
          onClick={() => setSearchParams({ mode: 'manual' })}>Empty course</button>
      </div>

      {mode === 'ai' ? (
        <AiCourseForm />
      ) : (
        <>
          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 inline-flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h2 className="font-semibold">Course details</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Course code *</Label>
                  <Input
                    value={form.course_code}
                    onChange={(e) => update('course_code', e.target.value)}
                    placeholder="MUS-101"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Semester</Label>
                  <Input
                    value={form.semester}
                    onChange={(e) => update('semester', e.target.value)}
                    placeholder="Fall 2026"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="Introduction to Music Theory"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  rows={3}
                  placeholder="Brief overview of what students will learn."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Default location</Label>
                  <Input
                    value={form.default_location}
                    onChange={(e) => update('default_location', e.target.value)}
                    placeholder="Music Hall 201"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max enrollment</Label>
                  <Input
                    type="number"
                    value={form.max_enrollment}
                    onChange={(e) => update('max_enrollment', parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <Label className="text-sm">Free to enroll</Label>
                <Switch checked={form.is_free} onCheckedChange={(c) => update('is_free', c)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/academy')}>Cancel</Button>
            <Button onClick={save} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
              Create course
            </Button>
          </div>
        </>
      )}
    </DashboardPageShell>
  );
}
