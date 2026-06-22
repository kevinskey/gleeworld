import { Routes, Route, Link, useParams, Navigate, useNavigate } from "react-router-dom";
import { ChevronRight, GraduationCap, PlayCircle } from "lucide-react";
import { LEVELS, getLevel } from "./lib/curriculum";
import { type Clef } from "./components/Staff";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useTheoryCurriculum, useTheoryProgress, type TheoryLevel } from "./curriculum/hooks";
import { CurriculumHome, CurriculumLevelPage, CurriculumLessonPage, CurriculumUnitQuizPage, CurriculumPlacementPage, CurriculumSightSingPage } from "./curriculum/CurriculumPages";
import "./read-music.css";

import ElementaryDrill from "./drills/ElementaryDrill";
import MiddleDrill from "./drills/MiddleDrill";
import HighDrill from "./drills/HighDrill";
import CollegeDrill from "./drills/CollegeDrill";
import StaffTour from "./exercises/StaffTour";
import RhythmBasics from "./exercises/RhythmBasics";
import KeySignatures from "./exercises/KeySignatures";
import Intervals from "./exercises/Intervals";
import RhythmEar from "./exercises/RhythmEar";
import ChordId from "./exercises/ChordId";
import FiguredBass from "./exercises/FiguredBass";
import Modes from "./exercises/Modes";
import HarmonicAnalysis from "./exercises/HarmonicAnalysis";
import SightSinging from "./exercises/SightSinging";

const CLEFS_BY_LEVEL: Record<string, Clef[]> = {
  elementary: ["treble"],
  middle: ["treble", "bass"],
  high: ["treble", "bass", "alto", "tenor"],
  college: ["treble", "bass", "alto", "tenor"],
};

const BASE = "/read-music";

const LEVEL_AGE_RANGE: Record<number, string> = {
  1: "Grades K–5",
  2: "Grades 6–8",
  3: "Grades 9–12",
  4: "Undergraduate",
};

function curriculumProgress(level: TheoryLevel, progress?: Map<string, { status: string }>) {
  const lessons = level.gw_theory_units.flatMap((u) => u.gw_theory_lessons);
  const done = lessons.filter((l) => {
    const s = progress?.get(l.id)?.status;
    return s === "complete" || s === "mastered";
  }).length;
  return { done, total: lessons.length };
}

function Home() {
  const { enabled: theoryV2 } = useFeatureFlag("THEORY_V2");
  const { data: levels = [], isLoading } = useTheoryCurriculum();
  const { data: progress } = useTheoryProgress();

  return (
    <div className="flex flex-col flex-1">
      <section className="bg-brand-gradient">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center text-white sm:py-24">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Read Music</div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Learn to read music.
            <span className="block font-light italic text-white/90">Beautifully.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/85">
            A guided music theory curriculum from your very first note through college theory.
          </p>
        </div>
      </section>

      {theoryV2 ? (
        <section className="mx-auto w-full max-w-5xl px-6 py-12">
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <Link
              to={`${BASE}/curriculum/placement`}
              className="flex items-center gap-3 rounded-lg border border-dashed border-[hsl(var(--brand-blue-dark))]/40 bg-card p-4 hover:border-brand hover:shadow transition-all"
            >
              <GraduationCap className="h-5 w-5 text-[hsl(var(--brand-blue-dark))] shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">Not sure where to start?</div>
                <div className="text-xs text-muted-foreground">Take the 24-question placement test to find your level.</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to={`${BASE}/curriculum/sight-singing`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-brand hover:shadow transition-all"
            >
              <PlayCircle className="h-5 w-5 text-[hsl(var(--brand-blue-dark))] shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">
                  Sight-Singing Lab <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold uppercase text-primary">Experimental</span>
                </div>
                <div className="text-xs text-muted-foreground">Sing notes from the staff — live pitch feedback from your mic.</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>

          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Choose your level</h2>
            <p className="mt-1 text-muted-foreground text-sm">Four levels of guided units, lessons, drills, and quizzes.</p>
          </div>

          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-lg border border-border bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {levels.map((level) => {
                const { done, total } = curriculumProgress(level, progress);
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <Link
                    key={level.id}
                    to={`${BASE}/curriculum/${level.slug}`}
                    className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {LEVEL_AGE_RANGE[level.id] ?? `Level ${level.id}`}
                    </div>
                    <div className="mt-2 text-2xl font-bold text-foreground">{level.name}</div>
                    <div className="mt-2 text-sm text-muted-foreground">{level.description}</div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-brand-gradient rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-[hsl(var(--brand-blue-dark))] whitespace-nowrap">
                        {done}/{total} lessons
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="mx-auto w-full max-w-5xl px-6 py-12">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Choose your level</h2>
            <p className="mt-1 text-muted-foreground text-sm">Each tier scales the clefs and exercises to age.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {LEVELS.map((level) => {
              const ready = level.exercises.filter((e) => e.available).length;
              return (
                <Link
                  key={level.slug}
                  to={`${BASE}/${level.slug}`}
                  className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{level.ageRange}</div>
                  <div className="mt-2 text-2xl font-bold text-foreground">{level.title}</div>
                  <div className="mt-2 text-muted-foreground">{level.subtitle}</div>
                  <div className="mt-4 text-sm font-medium text-[hsl(var(--brand-blue-dark))]">
                    {ready} ready · {level.exercises.length} total
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function LevelPage() {
  const { level: slug } = useParams<{ level: string }>();
  const level = slug ? getLevel(slug) : undefined;
  const navigate = useNavigate();
  if (!level) return <Navigate to={BASE} replace />;

  return (
    <div className="flex flex-col flex-1">
      <section className="bg-brand-gradient text-white">
        <div className="mx-auto max-w-3xl px-6 pt-6 pb-10">
          <button onClick={() => navigate(BASE)} className="text-sm text-white/80 hover:text-white">← All levels</button>
          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">{level.ageRange}</div>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{level.title}</h1>
          <p className="mt-2 text-white/85">{level.subtitle}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="grid gap-4">
          {level.exercises.map((ex) => {
            const inner = (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold text-foreground">{ex.title}</span>
                  {!ex.available && (
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Coming soon</span>
                  )}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{ex.blurb}</div>
              </>
            );
            return ex.available ? (
              <Link
                key={ex.slug}
                to={`${BASE}/${level.slug}/${ex.slug}`}
                className="group relative overflow-hidden rounded-lg border border-border bg-card p-5 transition-all hover:border-brand hover:shadow-lg"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-brand-gradient" />
                <div className="pl-2">{inner}</div>
              </Link>
            ) : (
              <div key={ex.slug} className="rounded-lg border border-border bg-muted/40 p-5 opacity-60">{inner}</div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ExercisePage() {
  const { level: slug, exercise } = useParams<{ level: string; exercise: string }>();
  const level = slug ? getLevel(slug) : undefined;
  if (!level) return <Navigate to={BASE} replace />;
  const ex = level.exercises.find((e) => e.slug === exercise);
  if (!ex || !ex.available) return <Navigate to={`${BASE}/${level.slug}`} replace />;
  const clefs = slug ? CLEFS_BY_LEVEL[slug] : undefined;
  if (!clefs) return <Navigate to={BASE} replace />;

  const isCollege = slug === "college";
  const tier = slug as "elementary" | "middle" | "high" | "college";

  let node: React.ReactNode = null;
  if (exercise === "note-id") {
    if (tier === "elementary") node = <ElementaryDrill clefs={clefs} />;
    else if (tier === "middle") node = <MiddleDrill clefs={clefs} />;
    else if (tier === "high") node = <HighDrill clefs={clefs} />;
    else if (tier === "college") node = <CollegeDrill clefs={clefs} />;
  } else if (exercise === "staff-tour") node = <StaffTour tier={tier} />;
  else if (exercise === "rhythm-basics") node = <RhythmBasics tier={tier} />;
  else if (exercise === "key-sig") node = <KeySignatures tier={tier} scope={tier === "middle" ? "basic" : "full"} />;
  else if (exercise === "intervals") node = <Intervals tier={tier} scope={tier === "middle" ? "basic" : "full"} />;
  else if (exercise === "rhythm-eighths" || exercise === "rhythm-dictation") node = <RhythmEar tier={tier} />;
  else if (exercise === "chord-id") node = <ChordId tier={tier} />;
  else if (exercise === "figured-bass") node = <FiguredBass tier={tier} />;
  else if (exercise === "modes") node = <Modes tier={tier} />;
  else if (exercise === "harmonic-analysis") node = <HarmonicAnalysis tier={tier} />;
  else if (exercise === "sight-singing") node = <SightSinging tier={tier} />;

  return (
    <div className={`flex flex-col flex-1 ${isCollege ? "bg-brand-gradient-deep" : ""}`}>
      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <Link
          to={`${BASE}/${level.slug}`}
          className={`text-sm hover:underline ${isCollege ? "text-white/70" : "text-muted-foreground"}`}
        >
          ← {level.title}
        </Link>
        <h1 className={`mt-3 text-2xl font-bold ${isCollege ? "text-white" : "text-foreground"}`}>
          {ex.title} — {level.title}
        </h1>
        {node}
      </main>
    </div>
  );
}

export default function ReadMusic() {
  const { enabled: theoryV2, isLoading: flagLoading } = useFeatureFlag("THEORY_V2");
  return (
    <div className="read-music-root flex flex-col min-h-[calc(100vh-4rem)]">
      <Routes>
        <Route index element={<Home />} />
        {theoryV2 && (
          <>
            <Route path="curriculum" element={<CurriculumHome />} />
            <Route path="curriculum/:levelSlug" element={<CurriculumLevelPage />} />
            <Route path="curriculum/lesson/:lessonId" element={<CurriculumLessonPage />} />
            <Route path="curriculum/placement" element={<CurriculumPlacementPage />} />
            <Route path="curriculum/sight-singing" element={<CurriculumSightSingPage />} />
            <Route path="curriculum/:levelSlug/quiz/:unitSort" element={<CurriculumUnitQuizPage />} />
          </>
        )}
        {/* While the flag loads, don't let :level swallow /curriculum URLs */}
        {!theoryV2 && flagLoading && <Route path="curriculum/*" element={null} />}
        <Route path=":level" element={<LevelPage />} />
        <Route path=":level/:exercise" element={<ExercisePage />} />
      </Routes>
    </div>
  );
}
