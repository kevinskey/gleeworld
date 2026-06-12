import { Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { CheckCircle2, Circle, PlayCircle, BookOpen, ChevronRight, GraduationCap, Lock, Trophy } from 'lucide-react';
import {
  useTheoryCurriculum,
  useTheoryProgress,
  useUpdateLessonProgress,
  useUnitMastery,
  useSaveUnitMastery,
  useSavePlacement,
  useTheoryExercises,
  type TheoryLevel,
  type TheoryLesson,
} from './hooks';
import QuizRunner from './engine/QuizRunner';
import { buildUnitQuizWithExtras } from './engine/quiz';
import { buildPlacementTest, gradePlacement, type PlacementResult } from './engine/placement';
import { placementSummary } from './engine/ai';
import SightSingLab from './engine/SightSingLab';
import { useEffect, useState } from 'react';

const BASE = '/read-music';
const CBASE = `${BASE}/curriculum`;

function levelProgress(level: TheoryLevel, progress?: Map<string, { status: string }>) {
  const lessons = level.gw_theory_units.flatMap((u) => u.gw_theory_lessons);
  const done = lessons.filter((l) => {
    const s = progress?.get(l.id)?.status;
    return s === 'complete' || s === 'mastered';
  }).length;
  return { done, total: lessons.length };
}

export function CurriculumHome() {
  const { data: levels = [], isLoading } = useTheoryCurriculum();
  const { data: progress } = useTheoryProgress();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col flex-1">
      <section className="bg-brand-gradient text-white">
        <div className="mx-auto max-w-3xl px-6 pt-6 pb-10">
          <button onClick={() => navigate(BASE)} className="text-sm text-white/80 hover:text-white">← Read Music</button>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Music Theory Curriculum</h1>
          <p className="mt-2 text-white/85">Four levels from first notes to college theory. Work through units in order.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10">
        {isLoading && <p className="text-sm text-muted-foreground">Loading curriculum…</p>}
        <Link
          to={`${CBASE}/placement`}
          className="mb-4 flex items-center gap-3 rounded-lg border border-dashed border-[hsl(var(--brand-blue-dark))]/40 bg-card p-4 hover:border-brand hover:shadow transition-all"
        >
          <GraduationCap className="h-5 w-5 text-[hsl(var(--brand-blue-dark))] shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Not sure where to start?</div>
            <div className="text-xs text-muted-foreground">Take the 24-question placement test to find your level.</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to={`${CBASE}/sight-singing`}
          className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-brand hover:shadow transition-all"
        >
          <PlayCircle className="h-5 w-5 text-[hsl(var(--brand-blue-dark))] shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Sight-Singing Lab <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">Experimental</span></div>
            <div className="text-xs text-muted-foreground">Sing notes from the staff — live pitch feedback from your mic.</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div className="grid gap-4">
          {levels.map((level) => {
            const { done, total } = levelProgress(level, progress);
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <Link
                key={level.id}
                to={`${CBASE}/${level.slug}`}
                className="group relative overflow-hidden rounded-lg border border-border bg-card p-5 transition-all hover:border-brand hover:shadow-lg"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-brand-gradient" />
                <div className="pl-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Level {level.id}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="mt-1 text-xl font-bold text-foreground">{level.name}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{level.description}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-brand-gradient rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {done}/{total} lessons
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function CurriculumLevelPage() {
  const { levelSlug } = useParams<{ levelSlug: string }>();
  const { data: levels = [], isLoading } = useTheoryCurriculum();
  const { data: progress } = useTheoryProgress();
  const { data: mastery } = useUnitMastery();
  const navigate = useNavigate();

  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  const level = levels.find((l) => l.slug === levelSlug);
  if (!level) return <Navigate to={CBASE} replace />;

  return (
    <div className="flex flex-col flex-1">
      <section className="bg-brand-gradient text-white">
        <div className="mx-auto max-w-3xl px-6 pt-6 pb-10">
          <button onClick={() => navigate(CBASE)} className="text-sm text-white/80 hover:text-white">← All levels</button>
          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Level {level.id}</div>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{level.name}</h1>
          <p className="mt-2 text-white/85">{level.description}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
        {level.gw_theory_units.map((unit, unitIdx) => {
          const done = unit.gw_theory_lessons.filter((l) => {
            const s = progress?.get(l.id)?.status;
            return s === 'complete' || s === 'mastered';
          }).length;
          const m = mastery?.get(unit.id);
          const prevUnit = unitIdx > 0 ? level.gw_theory_units[unitIdx - 1] : null;
          const locked = !!mastery && !!prevUnit && !mastery.get(prevUnit.id)?.passed;
          return (
            <div key={unit.id} className={`rounded-lg border border-border bg-card overflow-hidden ${locked ? 'opacity-70' : ''}`}>
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span><span className="text-muted-foreground mr-2">{level.id}.{unit.sort_order}</span>{unit.title}</span>
                </h2>
                <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-2">
                  {m?.passed && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                  {done}/{unit.gw_theory_lessons.length}
                </span>
              </div>
              {locked ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">
                  Score 80% on the Unit {level.id}.{prevUnit!.sort_order} quiz to unlock this unit.
                </p>
              ) : (
                <>
                  <ul>
                    {unit.gw_theory_lessons.map((lesson) => {
                      const status = progress?.get(lesson.id)?.status ?? 'not_started';
                      const isDone = status === 'complete' || status === 'mastered';
                      return (
                        <li key={lesson.id} className="border-b border-border last:border-b-0">
                          <Link
                            to={`${CBASE}/lesson/${lesson.id}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                          >
                            {isDone ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : status === 'in_progress' ? (
                              <PlayCircle className="h-4 w-4 text-[hsl(var(--brand-blue-dark))] shrink-0" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            )}
                            <span className="text-sm text-foreground flex-1">{lesson.title}</span>
                            {lesson.legacy_exercise_slug && (
                              <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--brand-blue-dark))] whitespace-nowrap">Drill</span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <Link
                    to={`${CBASE}/${level.slug}/quiz/${unit.sort_order}`}
                    className="flex items-center gap-3 border-t border-border px-4 py-3 bg-muted/20 hover:bg-muted/50 transition-colors"
                  >
                    <GraduationCap className="h-4 w-4 text-[hsl(var(--brand-blue-dark))] shrink-0" />
                    <span className="text-sm font-semibold text-foreground flex-1">Unit Quiz</span>
                    {m && (
                      <span className={`text-xs font-medium ${m.passed ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {m.passed ? `Passed · best ${Math.round(m.best_score)}%` : `Best ${Math.round(m.best_score)}%`}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export function CurriculumUnitQuizPage() {
  const { levelSlug, unitSort } = useParams<{ levelSlug: string; unitSort: string }>();
  const { data: levels = [], isLoading } = useTheoryCurriculum();
  const saveMastery = useSaveUnitMastery();
  const navigate = useNavigate();
  const level = levels.find((l) => l.slug === levelSlug);
  const unit = level?.gw_theory_units.find((u) => u.sort_order === Number(unitSort));
  const { data: extras = [] } = useTheoryExercises(unit?.gw_theory_lessons.map((l) => l.id) ?? []);

  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  if (!level || !unit) return <Navigate to={CBASE} replace />;

  return (
    <div className="flex flex-col flex-1">
      <main className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-8">
        <Link to={`${CBASE}/${level.slug}`} className="text-sm text-muted-foreground hover:underline">
          ← {level.name} · Unit {level.id}.{unit.sort_order} {unit.title}
        </Link>
        <div className="mt-4">
          <QuizRunner
            title={`${unit.title} — Unit Quiz`}
            aiLevel={level.id}
            build={() => buildUnitQuizWithExtras(level.id, unit.sort_order, extras)}
            onFinish={(scorePct) => saveMastery.mutate({ unitId: unit.id, score: scorePct })}
            onExit={() => navigate(`${CBASE}/${level.slug}`)}
          />
        </div>
      </main>
    </div>
  );
}

function PlacementNarrative({ result }: { result: PlacementResult }) {
  const [text, setText] = useState<string | null>(null);
  const key = JSON.stringify(result.perLevel);
  useEffect(() => {
    let alive = true;
    placementSummary(result)
      .then((t) => { if (alive) setText(t); })
      .catch(() => { if (alive) setText(null); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!text) return null;
  return <p className="rounded-md bg-muted/50 px-4 py-3 text-sm text-foreground leading-relaxed">{text}</p>;
}

export function CurriculumPlacementPage() {
  const { data: levels = [], isLoading } = useTheoryCurriculum();
  const savePlacement = useSavePlacement();
  const navigate = useNavigate();

  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col flex-1">
      <main className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-8">
        <Link to={CBASE} className="text-sm text-muted-foreground hover:underline">← Curriculum</Link>
        <h1 className="mt-3 text-2xl font-bold text-foreground">Placement Test</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          24 questions sampling all four levels. Your result suggests where to start — you can always work from Level 1.
        </p>
        <div className="mt-4">
          <QuizRunner
            title="Placement Test"
            build={buildPlacementTest}
            onFinish={(_pct, answers) => {
              const result = gradePlacement(answers);
              savePlacement.mutate({ placedLevel: result.placedLevel, detail: result });
            }}
            onExit={() => navigate(CBASE)}
            renderResult={({ answers, retake }) => {
              const result = gradePlacement(answers);
              const level = levels.find((l) => l.id === result.placedLevel);
              return (
                <div className="rounded-xl border bg-card p-6 space-y-5">
                  <div className="text-center">
                    <GraduationCap className="mx-auto h-10 w-10 text-[hsl(var(--brand-blue-dark))]" />
                    <p className="mt-2 text-sm text-muted-foreground">Recommended starting point</p>
                    <p className="text-2xl font-bold text-foreground">
                      Level {result.placedLevel}{level ? ` — ${level.name}` : ''}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {result.perLevel.map((l) => (
                      <div key={l.level} className="flex items-center gap-3 text-sm">
                        <span className="w-16 text-muted-foreground">Level {l.level}</span>
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${l.pct >= 70 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                            style={{ width: `${l.pct}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-muted-foreground">{l.correct}/{l.total} · {l.pct}%</span>
                      </div>
                    ))}
                  </div>
                  <PlacementNarrative result={result} />
                  <div className="flex justify-center gap-2">
                    <button onClick={retake} className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
                      Retake
                    </button>
                    {level && (
                      <Link
                        to={`${CBASE}/${level.slug}`}
                        className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        Start Level {result.placedLevel}
                      </Link>
                    )}
                  </div>
                </div>
              );
            }}
          />
        </div>
      </main>
    </div>
  );
}

export function CurriculumSightSingPage() {
  return (
    <div className="flex flex-col flex-1">
      <main className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-8">
        <Link to={CBASE} className="text-sm text-muted-foreground hover:underline">← Curriculum</Link>
        <h1 className="mt-3 text-2xl font-bold text-foreground">Sight-Singing Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sing the note shown — the mic checks your pitch in real time. Works best in a quiet room.
        </p>
        <div className="mt-4">
          <SightSingLab />
        </div>
      </main>
    </div>
  );
}

function LessonBody({ lesson }: { lesson: TheoryLesson }) {
  const blocks = Array.isArray(lesson.content) ? lesson.content : [];
  if (blocks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <BookOpen className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Full lesson content is coming soon. Use the practice drill below if available, then mark the lesson complete.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {blocks.map((b, i) =>
        b.type === 'text' ? <p key={i} className="text-foreground leading-relaxed">{b.text}</p> : null
      )}
    </div>
  );
}

export function CurriculumLessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: levels = [], isLoading } = useTheoryCurriculum();
  const { data: progress } = useTheoryProgress();
  const updateProgress = useUpdateLessonProgress();

  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;

  let found: { level: TheoryLevel; unitTitle: string; unitNo: string; lesson: TheoryLesson; flat: TheoryLesson[] } | null = null;
  for (const level of levels) {
    const flat = level.gw_theory_units.flatMap((u) => u.gw_theory_lessons);
    for (const unit of level.gw_theory_units) {
      const lesson = unit.gw_theory_lessons.find((l) => l.id === lessonId);
      if (lesson) {
        found = { level, unitTitle: unit.title, unitNo: `${level.id}.${unit.sort_order}`, lesson, flat };
        break;
      }
    }
    if (found) break;
  }
  if (!found) return <Navigate to={CBASE} replace />;

  const { level, unitTitle, unitNo, lesson, flat } = found;
  const idx = flat.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;
  const status = progress?.get(lesson.id)?.status ?? 'not_started';
  const isDone = status === 'complete' || status === 'mastered';

  return (
    <div className="flex flex-col flex-1">
      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <Link to={`${CBASE}/${level.slug}`} className="text-sm text-muted-foreground hover:underline">
          ← {level.name} · Unit {unitNo} {unitTitle}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-foreground">{lesson.title}</h1>

        <div className="mt-6">
          <LessonBody lesson={lesson} />
        </div>

        {lesson.legacy_level_slug && lesson.legacy_exercise_slug && (
          <Link
            to={`${BASE}/${lesson.legacy_level_slug}/${lesson.legacy_exercise_slug}`}
            className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-brand hover:shadow transition-all"
          >
            <GraduationCap className="h-5 w-5 text-[hsl(var(--brand-blue-dark))]" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">Practice drill</div>
              <div className="text-xs text-muted-foreground">Open the interactive exercise for this lesson</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}

        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={() => updateProgress.mutate({ lessonId: lesson.id, status: isDone ? 'in_progress' : 'complete' })}
            disabled={updateProgress.isPending}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              isDone
                ? 'border border-border bg-card text-foreground hover:bg-muted'
                : 'bg-brand-gradient text-white hover:opacity-90'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isDone ? 'Completed — mark incomplete' : 'Mark complete'}
          </button>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-border pt-4 text-sm">
          {prev ? (
            <Link to={`${CBASE}/lesson/${prev.id}`} className="text-muted-foreground hover:text-foreground">← {prev.title}</Link>
          ) : <span />}
          {next ? (
            <Link to={`${CBASE}/lesson/${next.id}`} className="text-right text-muted-foreground hover:text-foreground">{next.title} →</Link>
          ) : <span />}
        </div>
      </main>
    </div>
  );
}
