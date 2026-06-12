import { useNavigate } from "react-router-dom";
import { Music, ChevronRight, GraduationCap, Mic } from "lucide-react";
import { LEVELS } from "@/features/read-music/lib/curriculum";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

export function ReadMusicInlineModule() {
  const navigate = useNavigate();
  const { enabled: theoryV2 } = useFeatureFlag("THEORY_V2");

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div
          className="px-6 py-5 text-white"
          style={{ background: "linear-gradient(135deg, hsl(187 70% 38%) 0%, hsl(217 70% 30%) 100%)" }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            <Music className="h-4 w-4" />
            Practice studio
          </div>
          <h2 className="mt-1 text-2xl font-bold">Read Music</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/85">
            Note ID, intervals, key signatures, chord identification, modes, and Roman-numeral analysis — drilled at
            the right pace for each age tier. Pick a level to start practicing.
          </p>
        </div>

        {theoryV2 && (
          <div className="grid grid-cols-1 gap-3 px-5 pt-5 sm:grid-cols-2">
            <button
              onClick={() => navigate("/read-music/curriculum")}
              className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                <GraduationCap className="h-3.5 w-3.5" /> New
              </div>
              <div className="mt-1 text-base font-bold text-slate-900">Full Theory Curriculum</div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                Guided lessons, unit quizzes &amp; placement test
                <ChevronRight className="h-4 w-4 text-sky-600 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
            <button
              onClick={() => navigate("/read-music/curriculum/sight-singing")}
              className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                <Mic className="h-3.5 w-3.5" /> Experimental
              </div>
              <div className="mt-1 text-base font-bold text-slate-900">Sight-Singing Lab</div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                Sing into the mic — pitch detection grades you
                <ChevronRight className="h-4 w-4 text-sky-600 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {LEVELS.map((level) => (
            <button
              key={level.slug}
              onClick={() => navigate(`/read-music/${level.slug}`)}
              className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{level.ageRange}</div>
              <div className="mt-1 text-base font-bold text-slate-900">{level.title}</div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                {level.exercises.filter((e) => e.available).length} exercises
                <ChevronRight className="h-4 w-4 text-sky-600 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReadMusicInlineModule;
