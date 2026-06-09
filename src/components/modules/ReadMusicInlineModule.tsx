import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, ChevronRight } from "lucide-react";
import { LEVELS } from "@/features/read-music/lib/curriculum";

export function ReadMusicInlineModule() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Read Music</h2>
        <p className="text-sm text-muted-foreground">
          Note ID, intervals, key signatures, chord identification, modes, and Roman-numeral analysis — drilled at the
          right pace for each age tier.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Music className="h-5 w-5 text-[hsl(var(--brand-blue-dark))]" />
            Practice studio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LEVELS.map((level) => (
              <button
                key={level.slug}
                onClick={() => navigate(`/read-music/${level.slug}`)}
                className="rounded-md border border-border bg-card p-3 text-left hover:border-[hsl(var(--brand-blue-dark)/0.35)] hover:shadow"
              >
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{level.ageRange}</div>
                <div className="mt-1 text-sm font-semibold">{level.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {level.exercises.filter((e) => e.available).length} exercises
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => navigate("/read-music")} className="gap-2">
              Open Read Music
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ReadMusicInlineModule;
