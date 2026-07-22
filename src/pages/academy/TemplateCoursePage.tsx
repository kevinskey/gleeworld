import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserRole } from '@/hooks/useUserRole';
import { LEVEL_LABEL } from '@/hooks/useCourseStore';
import { ExercisePlayer } from '@/components/academy/exercise-player/ExercisePlayer';
import {
  ArrowLeft, ChevronDown, ChevronRight, Loader2, Headphones, PenSquare,
  Pencil, Plus, X, Music,
} from 'lucide-react';
import { toast } from 'sonner';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

type Exercise = { id: string; sort_order: number; type: string; data: any };
type Listening = { title?: string; composer?: string; url?: string };
type Lesson = {
  id: string;
  sort_order: number;
  title: string;
  objectives: string[] | null;
  content: string | null;
  listening: Listening[] | null;
  gw_academy_exercises: Exercise[];
};
type Unit = { id: string; sort_order: number; title: string; gw_academy_lessons: Lesson[] };

function useTemplateCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ['template-course', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_academy_courses')
        .select(`
          id, title, level, grades, description, is_template,
          gw_academy_units(
            id, sort_order, title,
            gw_academy_lessons(
              id, sort_order, title, objectives, content, listening,
              gw_academy_exercises(id, sort_order, type, data)
            )
          )
        `)
        .eq('id', courseId)
        .maybeSingle();
      if (error) throw error;
      if (data?.gw_academy_units) {
        (data.gw_academy_units as Unit[]).sort((a, b) => a.sort_order - b.sort_order);
        (data.gw_academy_units as Unit[]).forEach((u) => {
          u.gw_academy_lessons.sort((a, b) => a.sort_order - b.sort_order);
          u.gw_academy_lessons.forEach((l) => l.gw_academy_exercises.sort((a, b) => a.sort_order - b.sort_order));
        });
      }
      return data as {
        id: string; title: string; level: string | null; grades: string | null;
        description: string | null; is_template: boolean; gw_academy_units: Unit[];
      } | null;
    },
  });
}

export default function TemplateCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { data: course, isLoading } = useTemplateCourse(courseId);
  const { profile } = useUserRole();
  const isSuperAdmin = !!profile?.is_super_admin || profile?.role === 'super-admin';
  const isAdmin = isSuperAdmin || !!(profile as any)?.is_admin || profile?.role === 'admin' || profile?.role === 'director';

  if (isLoading) {
    return (
      <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
      </DashboardShell>
    </UniversalLayout>
    );
  }

  if (!course) {
    return (
      <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-muted-foreground">Course not found.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
      </div>
      </DashboardShell>
    </UniversalLayout>
    );
  }

  const canEdit = course.is_template ? isSuperAdmin : isAdmin;
  const units = course.gw_academy_units ?? [];
  const lessonCount = units.reduce((n, u) => n + u.gw_academy_lessons.length, 0);

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-2">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {course.level && (
            <Badge className="bg-[hsl(var(--brand-blue-dark))] text-white border-0">
              {LEVEL_LABEL[course.level] ?? course.level}
            </Badge>
          )}
          {course.grades && <Badge variant="outline">Grades {course.grades}</Badge>}
          {course.is_template && canEdit && <Badge variant="outline">Editing template</Badge>}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{course.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {units.length} units · {lessonCount} lessons
        </p>
        {course.description && (
          <p className="text-sm text-foreground/80 mt-3 max-w-2xl">{course.description}</p>
        )}
      </div>

      <div className="space-y-4">
        {units.map((unit, i) => (
          <UnitSection key={unit.id} unit={unit} index={i} defaultOpen={i === 0} canEdit={canEdit} courseId={course.id} />
        ))}
      </div>
    </div>
    </DashboardShell>
    </UniversalLayout>
  );
}

function UnitSection({
  unit, index, defaultOpen, canEdit, courseId,
}: {
  unit: Unit; index: number; defaultOpen: boolean; canEdit: boolean; courseId: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(defaultOpen);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);

  async function addLesson() {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('add_academy_lesson', {
        p_unit_id: unit.id,
        p_title: newTitle.trim(),
      });
      if (error) throw error;
      toast.success(`Added "${newTitle.trim()}"`);
      setNewTitle('');
      setAdding(false);
      qc.invalidateQueries({ queryKey: ['template-course', courseId] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not add lesson');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm uppercase tracking-wide text-muted-foreground">Unit {index + 1}</div>
          <div className="font-semibold text-foreground">{unit.title}</div>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{unit.gw_academy_lessons.length} lessons</span>
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {unit.gw_academy_lessons.map((lesson, li) => (
            <LessonRow key={lesson.id} lesson={lesson} index={li} canEdit={canEdit} courseId={courseId} />
          ))}
          {canEdit && (
            <div className="px-4 py-3">
              {adding ? (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addLesson()}
                    placeholder="New lesson title"
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={addLesson} disabled={saving || !newTitle.trim()}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setAdding(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add lesson
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type MediaAudio = { id: string; title: string; file_url: string };

function MediaLibraryPicker({ onPick, onClose }: { onPick: (m: MediaAudio) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['media-audio', search],
    queryFn: async (): Promise<MediaAudio[]> => {
      let q = supabase
        .from('gw_media_library')
        .select('id, title, file_url')
        .or('file_type.ilike.audio%,file_url.ilike.%.mp3')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20);
      if (search.trim()) q = q.ilike('title', `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MediaAudio[];
    },
  });

  return (
    <div className="border border-border rounded-md bg-muted/30 p-2 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search audio in media library..."
          className="h-8 text-sm"
        />
        <Button size="sm" variant="ghost" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1 py-2">No audio files found.</p>
      ) : (
        <div className="max-h-48 overflow-y-auto divide-y divide-border">
          {files.map((f) => (
            <button
              key={f.id}
              onClick={() => onPick(f)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted rounded"
            >
              <Music className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{f.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LessonRow({
  lesson, index, canEdit, courseId,
}: {
  lesson: Lesson; index: number; canEdit: boolean; courseId: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [content, setContent] = useState(lesson.content ?? '');
  const [objectivesText, setObjectivesText] = useState('');
  const [listeningItems, setListeningItems] = useState<Listening[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const objectives = Array.isArray(lesson.objectives) ? lesson.objectives : [];
  const listening = Array.isArray(lesson.listening) ? lesson.listening : [];

  function startEdit() {
    setTitle(lesson.title);
    setContent(lesson.content ?? '');
    setObjectivesText(objectives.map(String).join('\n'));
    setListeningItems(listening.map((l) => ({ ...l })));
    setShowPicker(false);
    setEditing(true);
    setOpen(true);
  }

  function updateItem(i: number, patch: Partial<Listening>) {
    setListeningItems((items) => items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_academy_lesson', {
        p_lesson_id: lesson.id,
        p_title: title.trim() || lesson.title,
        p_content: content.trim() || null,
        p_objectives: objectivesText.split('\n').map((s) => s.trim()).filter(Boolean),
        p_listening: listeningItems.filter((l) => (l.title ?? '').trim() || l.url),
      });
      if (error) throw error;
      toast.success('Lesson saved');
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['template-course', courseId] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save lesson');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center hover:bg-muted/30 transition-colors">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 text-left"
        >
          <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">{index + 1}.</span>
          <span className="text-sm font-medium text-foreground flex-1 min-w-0">{lesson.title}</span>
          <span className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            {listening.length > 0 && (
              <span className="flex items-center gap-0.5"><Headphones className="w-3 h-3" />{listening.length}</span>
            )}
            {lesson.gw_academy_exercises.length > 0 && (
              <span className="flex items-center gap-0.5"><PenSquare className="w-3 h-3" />{lesson.gw_academy_exercises.length}</span>
            )}
          </span>
        </button>
        {canEdit && !editing && (
          <button
            onClick={startEdit}
            className="p-2 mr-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Edit lesson"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="px-4 pb-4 space-y-3 text-sm" style={{ paddingLeft: '3.25rem' }}>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Lesson content..."
              className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objectives (one per line)</label>
            <textarea
              value={objectivesText}
              onChange={(e) => setObjectivesText(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Listening</label>
            <div className="mt-1 space-y-2">
              {listeningItems.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={l.title ?? ''}
                    onChange={(e) => updateItem(i, { title: e.target.value })}
                    placeholder="Title"
                    className="h-8 text-sm flex-1"
                  />
                  <Input
                    value={l.composer ?? ''}
                    onChange={(e) => updateItem(i, { composer: e.target.value })}
                    placeholder="Composer"
                    className="h-8 text-sm flex-1"
                  />
                  {l.url && (
                    <span title={l.url} className="text-emerald-600 shrink-0">
                      <Music className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <button
                    onClick={() => setListeningItems((items) => items.filter((_, idx) => idx !== i))}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setListeningItems((items) => [...items, { title: '' }])}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add item
                </Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setShowPicker((s) => !s)}>
                  <Music className="w-3.5 h-3.5 mr-1.5" /> Add from media library
                </Button>
              </div>
              {showPicker && (
                <MediaLibraryPicker
                  onClose={() => setShowPicker(false)}
                  onPick={(m) => {
                    setListeningItems((items) => [...items, { title: m.title, url: m.file_url }]);
                    setShowPicker(false);
                  }}
                />
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      ) : open && (
        <div className="px-4 pb-4 space-y-3 text-sm" style={{ paddingLeft: '3.25rem' }}>
          {objectives.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Objectives</div>
              <ul className="list-disc pl-4 space-y-0.5 text-foreground/85">
                {objectives.map((o, i) => <li key={i}>{String(o)}</li>)}
              </ul>
            </div>
          )}
          {lesson.content && (
            <div className="text-foreground/85 whitespace-pre-wrap">{lesson.content}</div>
          )}
          {listening.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Listening</div>
              <ul className="space-y-2 text-foreground/85">
                {listening.map((l, i) => (
                  <li key={i}>
                    <div className="flex items-center gap-1.5">
                      <Headphones className="w-3 h-3 text-muted-foreground shrink-0" />
                      {l.title ?? ''}{l.composer ? ` — ${l.composer}` : ''}
                    </div>
                    {l.url && (
                      <audio controls preload="none" src={l.url} className="mt-1 w-full max-w-sm h-9" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {lesson.gw_academy_exercises.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Exercises</div>
              <div className="space-y-3">
                {lesson.gw_academy_exercises.map((ex) => (
                  <ExercisePlayer key={ex.id} exercise={ex} />
                ))}
              </div>
            </div>
          )}
          {!lesson.content && objectives.length === 0 && listening.length === 0 && lesson.gw_academy_exercises.length === 0 && (
            <p className="text-muted-foreground text-xs">No content yet.{canEdit ? ' Click the pencil to add some.' : ''}</p>
          )}
        </div>
      )}
    </div>
  );
}
