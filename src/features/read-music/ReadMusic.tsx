import { Routes, Route, Link, useParams, Navigate, useNavigate } from "react-router-dom";
import { LEVELS, getLevel } from "./lib/curriculum";
import { type Clef } from "./components/Staff";
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

function Home() {
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
            A practice studio for students from their very first note through college theory.
          </p>
        </div>
      </section>

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
  return (
    <div className="read-music-root flex flex-col min-h-[calc(100vh-4rem)]">
      <Routes>
        <Route index element={<Home />} />
        <Route path=":level" element={<LevelPage />} />
        <Route path=":level/:exercise" element={<ExercisePage />} />
      </Routes>
    </div>
  );
}
