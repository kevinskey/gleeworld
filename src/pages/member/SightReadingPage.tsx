// Sight Reading Studio — practice-tool surface.
//
// Intentionally NOT a classroom: no assignments, no grades, no instructor
// gating. The earlier version pulled `useSRFAssignments` and showed
// pending/completed counts + a hardcoded "A-" current-grade card, which
// implied a course structure that doesn't exist here. This page is now a
// dashboard of practice CTAs plus a localStorage-backed activity log so
// the user can see what they've practiced lately without any backend
// dependency.

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, BookOpen, Sparkles, ArrowRight, Music2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

// Activity-log entries live in localStorage so we don't need a DB table
// for a feature that's purely "what did I practice this week". Studios
// that consume an exercise call `logSightReadingActivity` to append an
// entry; this page reads the last few back.
const ACTIVITY_KEY = 'gw_sight_reading_activity';
const MAX_ENTRIES = 25;

export type SightReadingActivity = {
  ts: number;             // unix ms
  kind: 'generated' | 'practiced' | 'theory';
  label: string;          // e.g. "G major · Level 2 · 4/4"
  meta?: Record<string, unknown>;
};

export function logSightReadingActivity(entry: Omit<SightReadingActivity, 'ts'>) {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    const list: SightReadingActivity[] = raw ? JSON.parse(raw) : [];
    list.unshift({ ...entry, ts: Date.now() });
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {
    /* localStorage quota / private mode — silently drop */
  }
}

function readActivity(): SightReadingActivity[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function clearActivity() {
  try { localStorage.removeItem(ACTIVITY_KEY); } catch { /* ignore */ }
}

function formatAge(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  const hr  = Math.floor(diff / 3_600_000);
  const day = Math.floor(diff / 86_400_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

const KIND_ICON: Record<SightReadingActivity['kind'], React.ReactNode> = {
  generated: <Sparkles className="h-3.5 w-3.5 text-primary" />,
  practiced: <Play className="h-3.5 w-3.5 text-emerald-600" />,
  theory:    <BookOpen className="h-3.5 w-3.5 text-violet-600" />,
};

const SightReadingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<SightReadingActivity[]>([]);

  useEffect(() => { setActivity(readActivity()); }, []);

  // Refresh when the tab comes back into focus — picks up new entries
  // logged by the generator / practice studio while we were away.
  useEffect(() => {
    const onFocus = () => setActivity(readActivity());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return (
    <UniversalLayout>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Music2 className="h-5 w-5 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            Practice tool
          </span>
        </div>
        <h1 className="!text-[1.4rem] sm:!text-[2rem] font-bold tracking-tight">Sight Reading Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate practice exercises and sing them — no assignments, no grades, no due dates.
          Just practice.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column — three practice CTAs. */}
        <div className="lg:col-span-2 space-y-6">
          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardHeader>
              <CardTitle>Practice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate('/sight-reading-generator')}
                  className="group relative text-left p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base">Generate exercise</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Pick key, time, difficulty — get a fresh sight-reading line.
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/member-sight-reading-studio')}
                  className="group relative text-left p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                      <Play className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base">Practice studio</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Sing along with pitch detection scoring your run.
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/mus-100')}
                  className="group relative text-left p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all sm:col-span-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 shrink-0">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base">Theory review</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Scales, intervals, key signatures — fundamentals lessons.
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — recent practice log, pulled from localStorage. */}
        <div className="space-y-6">
          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent activity</CardTitle>
                {activity.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { clearActivity(); setActivity([]); }}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    title="Clear practice log"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Nothing yet. Generate an exercise or open the practice studio — your
                  recent sessions will show up here.
                </p>
              ) : (
                <ul className="space-y-2">
                  {activity.slice(0, 8).map((a, idx) => (
                    <li
                      key={`${a.ts}-${idx}`}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="mt-0.5 shrink-0">{KIND_ICON[a.kind]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-foreground">{a.label}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {formatAge(a.ts)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardHeader>
              <CardTitle className="text-lg">Quick jump</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/sight-reading-generator">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate a new exercise
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/member-sight-reading-studio">
                  <Play className="h-4 w-4 mr-2" />
                  Open the practice studio
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/mus-100">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Theory fundamentals
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </UniversalLayout>
  );
};

export default SightReadingPage;
