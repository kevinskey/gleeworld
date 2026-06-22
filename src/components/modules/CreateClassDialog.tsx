// Three-tab "Create Class" dialog used by GleeAcademyModule.
//
//   • Course Library — platform-wide templates Kevin authored on main +
//     this tenant's local templates. Adoption clones the structure with
//     dates shifted to the chosen start date.
//   • Reuse Mine    — the calling teacher's own past classes. Same clone
//     mechanism, different source.
//   • From scratch   — the legacy bare-form path, kept as a fallback for
//     teachers who genuinely want a blank canvas.
//
// One RPC (gw_clone_course) handles both "Library" and "Reuse" paths.
// Roster, attendance, and submissions are NEVER cloned — every class
// starts with a fresh cohort.
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Library, FilePlus, Repeat, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (newCourseId: string) => void;
}

interface Template {
  id: string;
  source_tenant_slug: string;
  course_code: string;
  title: string;
  description: string | null;
  unit_count: number;
  lesson_count: number;
  assignment_count: number;
  is_platform: boolean;
}

interface PastCourse {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  semester: string | null;
  term: string | null;
  created_at: string;
}

function defaultSemester(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const term = m <= 5 ? 'spring' : m <= 7 ? 'summer' : 'fall';
  return `${term}_${y}`;
}

export function CreateClassDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<'library' | 'reuse' | 'scratch'>('library');

  // Shared state across tabs — when a teacher picks a source, they need to
  // confirm title / code / start date before we clone.
  const [pickedSourceId, setPickedSourceId] = useState<string | null>(null);
  const [pickedSourceLabel, setPickedSourceLabel] = useState<string>('');
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [semester, setSemester] = useState(defaultSemester());
  const [submitting, setSubmitting] = useState(false);

  // For the "from scratch" tab.
  const [scratchTitle, setScratchTitle] = useState('');
  const [scratchCode, setScratchCode] = useState('');
  const [scratchDescription, setScratchDescription] = useState('');

  useEffect(() => {
    if (!open) {
      setTab('library');
      setPickedSourceId(null);
      setPickedSourceLabel('');
      setTitle('');
      setCode('');
      setStartDate(new Date().toISOString().slice(0, 10));
      setSemester(defaultSemester());
      setScratchTitle('');
      setScratchCode('');
      setScratchDescription('');
    }
  }, [open]);

  const templates = useQuery<Template[]>({
    queryKey: ['course-templates'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_course_templates_for_tenant');
      if (error) throw error;
      return (data as Template[]) || [];
    },
  });

  const past = useQuery<PastCourse[]>({
    queryKey: ['my-past-courses', user?.id],
    enabled: open && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_past_courses');
      if (error) throw error;
      return (data as PastCourse[]) || [];
    },
  });

  function pickTemplate(t: Template) {
    setPickedSourceId(t.id);
    setPickedSourceLabel(`${t.course_code} — ${t.title}${t.is_platform ? ' (platform template)' : ''}`);
    setTitle(t.title);
    setCode(t.course_code);
  }
  function pickPast(p: PastCourse) {
    setPickedSourceId(p.id);
    setPickedSourceLabel(`${p.course_code} — ${p.title}`);
    setTitle(p.title);
    setCode(p.course_code);
  }

  async function clone() {
    if (!pickedSourceId) return;
    if (!title.trim() || !code.trim()) {
      toast({ title: 'Title and code required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc('gw_clone_course', {
      p_source_id: pickedSourceId,
      p_new_title: title.trim(),
      p_new_code: code.trim().toUpperCase(),
      p_start_date: startDate,
      p_term: semester.split('_')[0] || null,
      p_semester: semester,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Clone failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Class created', description: `${code} ready — roster + attendance start fresh.` });
    onCreated(data as string);
    onOpenChange(false);
  }

  async function createBlank() {
    if (!scratchTitle.trim() || !scratchCode.trim()) {
      toast({ title: 'Title and code required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from('gw_courses')
      .insert({
        code: scratchCode.trim().toUpperCase(),
        course_code: scratchCode.trim().toUpperCase(),
        title: scratchTitle.trim(),
        description: scratchDescription.trim() || null,
        semester,
        instructor_id: user?.id,
        is_active: true,
      })
      .select('id')
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast({ title: 'Create failed', description: error?.message ?? 'unknown error', variant: 'destructive' });
      return;
    }
    toast({ title: 'Class created', description: scratchCode.toUpperCase() });
    onCreated(data.id as string);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create a class</DialogTitle>
          <DialogDescription>
            Adopt a template from the Course Library, reuse one of your past classes, or build from scratch.
            Cloning copies units, lessons, and assignments — never roster or attendance.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setPickedSourceId(null); }}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="library"><Library className="w-4 h-4 mr-1.5" /> Course Library</TabsTrigger>
            <TabsTrigger value="reuse"><Repeat className="w-4 h-4 mr-1.5" /> Reuse Mine</TabsTrigger>
            <TabsTrigger value="scratch"><FilePlus className="w-4 h-4 mr-1.5" /> From scratch</TabsTrigger>
          </TabsList>

          {/* ── Course Library ────────────────────────────────────────── */}
          <TabsContent value="library" className="space-y-3 pt-3">
            {templates.isLoading ? (
              <div className="text-center text-muted-foreground py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : (templates.data ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No templates yet. Ask the platform team to publish one, or mark one of your courses as a template to seed your tenant&apos;s library.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
                {(templates.data ?? []).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => pickTemplate(t)}
                    className={`text-left rounded-lg border p-3 transition-all ${
                      pickedSourceId === t.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm">{t.title}</span>
                      {t.is_platform && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Sparkles className="w-3 h-3" /> Platform
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground mb-1">{t.course_code}</div>
                    {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                    <div className="text-sm text-muted-foreground mt-2">
                      {t.unit_count} units · {t.lesson_count} lessons · {t.assignment_count} assignments
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Reuse Mine ────────────────────────────────────────────── */}
          <TabsContent value="reuse" className="space-y-3 pt-3">
            {past.isLoading ? (
              <div className="text-center text-muted-foreground py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : (past.data ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No past classes yet. Once you&apos;ve taught a class, it&apos;ll show up here to clone for the next term.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                {(past.data ?? []).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pickPast(p)}
                    className={`block w-full text-left rounded-lg border p-3 transition-all ${
                      pickedSourceId === p.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-sm">{p.title}</span>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{p.semester || p.term}</span>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">{p.course_code}</div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── From scratch ──────────────────────────────────────────── */}
          <TabsContent value="scratch" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label>Course code</Label>
              <Input value={scratchCode} onChange={(e) => setScratchCode(e.target.value)} placeholder="e.g. MUS 240" />
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={scratchTitle} onChange={(e) => setScratchTitle(e.target.value)} placeholder="e.g. Advanced Choir" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input value={scratchDescription} onChange={(e) => setScratchDescription(e.target.value)} placeholder="What this class covers" />
            </div>
          </TabsContent>
        </Tabs>

        {/* Clone confirmation panel — shown once a source is picked on either of the first two tabs */}
        {tab !== 'scratch' && pickedSourceId && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Cloning from: <span className="font-normal">{pickedSourceLabel}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">New course code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">New title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Semester</Label>
                <Input value={semester} onChange={(e) => setSemester(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Assignment due-dates will shift to land relative to your new start date. Roster + attendance start fresh.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {tab === 'scratch' ? (
            <Button onClick={createBlank} disabled={submitting || !scratchTitle.trim() || !scratchCode.trim()}>
              {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Create blank class
            </Button>
          ) : (
            <Button onClick={clone} disabled={submitting || !pickedSourceId}>
              {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Clone &amp; create
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
