// Member Sight Reading Studio — practice-tool surface.
//
// Stripped of assignments/grades/instructor scaffolding 2026-06-19 at
// Kevin's request. This is a personal practice surface now: generate a
// fresh exercise, run the practice studio with pitch-detection scoring,
// reach for the pitch pipe to find a starting note, browse reference
// resources. No assignments-due, no semester grade, no "Current Grade A-"
// hardcoded placeholders.

import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Music, Music2, Headphones, Sparkles, BookOpen, Play, ArrowRight } from 'lucide-react';
import { PracticeStudio } from './PracticeStudio';
import { ResourceLibrary } from './ResourceLibrary';
import { PitchPipe } from '../sight-singing/PitchPipe';

interface MemberSightReadingStudioProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

// Activity log — same localStorage key as the member SightReadingPage,
// so entries written from either surface show in the other's "Recent
// activity" panel.
const ACTIVITY_KEY = 'gw_sight_reading_activity';
type Activity = {
  ts: number;
  kind: 'generated' | 'practiced' | 'theory';
  label: string;
};

function readActivity(): Activity[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
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

export const MemberSightReadingStudio: React.FC<MemberSightReadingStudioProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('practice');
  const [activity, setActivity] = useState<Activity[]>([]);
  const navigate = useNavigate();

  useEffect(() => { setActivity(readActivity()); }, []);
  useEffect(() => {
    const onFocus = () => setActivity(readActivity());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return (
    <div className="w-full page-container">
      <div className="section-spacing">
        <div className="flex items-center gap-2 mb-1">
          <Music2 className="h-5 w-5 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            Practice tool
          </span>
        </div>
        <h1 className="page-title-large">Sight Reading Studio</h1>
        <p className="mobile-text-lg text-muted-foreground">
          Generate exercises, sing them with real-time scoring, and warm up with the pitch pipe.
          No assignments, no grades — just practice.
        </p>
      </div>

      {/* Quick action tiles — generator, practice, theory. */}
      <div className="responsive-grid-2 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => navigate('/sight-reading-generator')}
          className="group text-left p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base">Generate exercise</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Pick a level, key, and time — get a fresh line.
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('practice')}
          className="group text-left p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
              <Play className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base">Practice studio</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Sing along with pitch detection.
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/mus-100')}
          className="group text-left p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base">Theory review</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Scales, intervals, key signatures.
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
          </div>
        </button>
      </div>

      {/* Main practice surface: tabs for Practice / Resources / Pitch Pipe. */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="section-spacing">
        <TabsList className="grid grid-cols-3 gap-0.5 md:gap-1 h-auto p-1">
          <TabsTrigger value="practice" className="dropdown-item-compact flex items-center gap-1 md:gap-2">
            <Music className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span>Practice</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="dropdown-item-compact flex items-center gap-1 md:gap-2">
            <Headphones className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span>Resources</span>
          </TabsTrigger>
          <TabsTrigger value="pitch-pipe" className="dropdown-item-compact flex items-center gap-1 md:gap-2">
            <Music className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span>Pitch Pipe</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="practice" className="section-spacing">
          <PracticeStudio user={user} />
        </TabsContent>

        <TabsContent value="resources" className="section-spacing">
          <ResourceLibrary user={user} />
        </TabsContent>

        <TabsContent value="pitch-pipe" className="section-spacing">
          <Card>
            <CardHeader className="card-header-compact">
              <CardTitle className="page-header">Pitch Pipe</CardTitle>
              <CardDescription className="mobile-text-lg">
                Find your starting pitch before you sing.
              </CardDescription>
            </CardHeader>
            <CardContent className="card-compact">
              <PitchPipe />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent activity — local-only, no DB. */}
      <div className="section-spacing">
        <Card>
          <CardHeader className="card-header-compact">
            <CardTitle className="mobile-text-lg font-medium">Recent practice</CardTitle>
            <CardDescription className="text-xs">
              Last few sessions, stored locally on this device.
            </CardDescription>
          </CardHeader>
          <CardContent className="card-compact">
            {activity.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No sessions logged yet. Generate an exercise or open the practice studio above.
              </p>
            ) : (
              <ul className="space-y-2">
                {activity.slice(0, 8).map((a, idx) => {
                  const Icon = a.kind === 'generated' ? Sparkles : a.kind === 'practiced' ? Play : BookOpen;
                  const tint = a.kind === 'generated' ? 'text-primary' : a.kind === 'practiced' ? 'text-emerald-600' : 'text-violet-600';
                  return (
                    <li key={`${a.ts}-${idx}`} className="flex items-start gap-2 text-sm">
                      <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${tint}`} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-foreground">{a.label}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {formatAge(a.ts)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
