import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LEVEL_LABEL } from '@/hooks/useCourseStore';
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Headphones, PenSquare } from 'lucide-react';

type Exercise = { id: string; sort_order: number; type: string; data: any };
type Lesson = {
  id: string;
  sort_order: number;
  title: string;
  objectives: string[] | null;
  content: string | null;
  listening: { title?: string; composer?: string; url?: string }[] | null;
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
          id, title, level, grades, description,
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
        description: string | null; gw_academy_units: Unit[];
      } | null;
    },
  });
}

export default function TemplateCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { data: course, isLoading } = useTemplateCourse(courseId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Course not found.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
      </div>
    );
  }

  const units = course.gw_academy_units ?? [];
  const lessonCount = units.reduce((n, u) => n + u.gw_academy_lessons.length, 0);

  return (
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
          <UnitSection key={unit.id} unit={unit} index={i} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}

function UnitSection({ unit, index, defaultOpen }: { unit: Unit; index: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
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
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Unit {index + 1}</div>
          <div className="font-semibold text-foreground">{unit.title}</div>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{unit.gw_academy_lessons.length} lessons</span>
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {unit.gw_academy_lessons.map((lesson, li) => (
            <LessonRow key={lesson.id} lesson={lesson} index={li} />
          ))}
        </div>
      )}
    </div>
  );
}

function LessonRow({ lesson, index }: { lesson: Lesson; index: number }) {
  const [open, setOpen] = useState(false);
  const objectives = Array.isArray(lesson.objectives) ? lesson.objectives : [];
  const listening = Array.isArray(lesson.listening) ? lesson.listening : [];
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">{index + 1}.</span>
        <span className="text-sm font-medium text-foreground flex-1 min-w-0">{lesson.title}</span>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
          {listening.length > 0 && (
            <span className="flex items-center gap-0.5"><Headphones className="w-3 h-3" />{listening.length}</span>
          )}
          {lesson.gw_academy_exercises.length > 0 && (
            <span className="flex items-center gap-0.5"><PenSquare className="w-3 h-3" />{lesson.gw_academy_exercises.length}</span>
          )}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-13 space-y-3 text-sm" style={{ paddingLeft: '3.25rem' }}>
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
              <ul className="space-y-0.5 text-foreground/85">
                {listening.map((l, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <Headphones className="w-3 h-3 text-muted-foreground shrink-0" />
                    {l.title ?? ''}{l.composer ? ` — ${l.composer}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {lesson.gw_academy_exercises.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Exercises</div>
              <div className="flex flex-wrap gap-1.5">
                {lesson.gw_academy_exercises.map((ex) => (
                  <Badge key={ex.id} variant="outline" className="text-[10px]">
                    {ex.type.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
