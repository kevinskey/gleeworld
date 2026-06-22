// Tour Manager add-on (unified). Course-scoped rollup of gw_tour_events
// at the top + the full workspace TourManagerDashboard embedded below.

import { lazy, Suspense, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Loader2, Calendar, MapPin } from 'lucide-react';
import { format, parseISO, isFuture } from 'date-fns';

const TourManagerDashboard = lazy(() =>
  import('@/components/tour-manager/TourManagerDashboard').then(m => ({ default: m.TourManagerDashboard }))
);
import { TourCourseProvider } from '@/components/tour-manager/TourCourseContext';

interface Props { courseId: string; canEdit: boolean; }

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function TourAddon({ courseId, canEdit }: Props) {
  const { user } = useAuth();

  const { data: events = [] } = useQuery({
    queryKey: ['course-tour-events', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tour_events')
        .select('*')
        .eq('course_id', courseId)
        .order('event_date', { ascending: true });
      return data ?? [];
    },
  });

  const counts = useMemo(() => {
    const now = new Date();
    return {
      total: events.length,
      upcoming: events.filter((e: any) => e.event_date && new Date(e.event_date) >= now).length,
      cities: new Set(events.map((e: any) => e.city || e.location).filter(Boolean)).size,
    };
  }, [events]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 inline-flex items-center justify-center">
          <Plane className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold">Tour Manager</h2>
          <p className="text-xs text-muted-foreground">
            Itinerary, crew, logistics. Events tagged with this course show in the rollup.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <StatTile icon={Plane}    tone="bg-sky-50 text-sky-700 border-sky-200"   label="Tour events" primary={counts.total}    secondary={counts.upcoming > 0 ? `${counts.upcoming} upcoming` : 'None upcoming'} />
        <StatTile icon={Calendar} tone="bg-emerald-50 text-emerald-700 border-emerald-200" label="Cities" primary={counts.cities} secondary={`${events.length} stop${events.length === 1 ? '' : 's'}`} />
        <StatTile icon={MapPin}   tone="bg-amber-50 text-amber-700 border-amber-200" label="Next stop" primary={0} secondary={(events.find((e: any) => e.event_date && isFuture(new Date(e.event_date)))?.city) || '—'} />
      </div>

      {events.length > 0 && (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Plane className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Itinerary for this course</h3>
              <Badge variant="outline" className="text-xs">{events.length}</Badge>
            </div>
            <ul className="divide-y">
              {events.slice(0, 8).map((e: any) => {
                const d = e.event_date ? parseISO(e.event_date) : null;
                return (
                  <li key={e.id} className="py-2 flex items-center gap-3 text-sm">
                    <div className="w-12 text-center shrink-0 rounded-md py-0.5 bg-sky-50 text-sky-700">
                      <div className="text-[9px] font-bold uppercase">{d ? format(d, 'MMM') : '—'}</div>
                      <div className="text-base font-bold leading-none">{d ? format(d, 'd') : ''}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{e.title || e.city || e.location || 'Stop'}</div>
                      <div className="text-sm text-muted-foreground truncate">{e.venue || e.location}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <EmbedWrap label="Full Tour Manager">
        <TourCourseProvider courseId={courseId}>
          <TourManagerDashboard user={user as any} />
        </TourCourseProvider>
      </EmbedWrap>
    </div>
  );
}

function StatTile({ icon: Icon, tone, label, primary, secondary }: any) {
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase tracking-wide font-semibold">{label}</span>
      </div>
      <div className="text-2xl font-bold leading-none">{typeof primary === 'number' && primary === 0 && label === 'Next stop' ? '—' : primary}</div>
      <div className="text-xs mt-1 opacity-80">{secondary}</div>
    </div>
  );
}

function EmbedWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline" className="text-xs">Workspace tool</Badge>
        <span>{label}</span>
      </div>
      <div className="rounded-2xl bg-card overflow-hidden" style={SOFT_CARD_STYLE}>
        <Suspense fallback={<div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}
