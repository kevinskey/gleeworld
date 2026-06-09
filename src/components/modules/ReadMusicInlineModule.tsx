import { useNavigate } from "react-router-dom";
import { Music, ChevronRight } from "lucide-react";
import { LEVELS } from "@/features/read-music/lib/curriculum";

export function ReadMusicInlineModule() {
  const navigate = useNavigate();

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
