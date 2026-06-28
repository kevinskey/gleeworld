// Canvas-backed academy calendar — upcoming events + assignment due
// dates across all of the user's enrolled courses, grouped by date.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, AlertCircle, Calendar, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCanvasCalendar, type CanvasCalendarAssignment, type CanvasCalendarEvent } from '@/hooks/useCanvasAcademy';

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function formatTime(s: string | null) {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
function formatDayHeader(key: string) {
  const d = new Date(key + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

type Item =
  | ({ kind: 'event' } & CanvasCalendarEvent)
  | ({ kind: 'assignment' } & CanvasCalendarAssignment);

export default function CanvasCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { start, end } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 28);
    return { start, end };
  }, [weekOffset]);

  const { data, isLoading, error } = useCanvasCalendar(isoDate(start), isoDate(end));

  const grouped = useMemo(() => {
    if (!data || 'error' in data) return new Map<string, Item[]>();
    const out = new Map<string, Item[]>();
    const push = (key: string, item: Item) => {
      if (!out.has(key)) out.set(key, []);
      out.get(key)!.push(item);
    };
    for (const e of data.events) {
      const when = e.start_at;
      if (!when) continue;
      push(when.slice(0, 10), { kind: 'event', ...e });
    }
    for (const a of data.assignments) {
      const when = a.due_at;
      if (!when) continue;
      push(when.slice(0, 10), { kind: 'assignment', ...a });
    }
    return new Map([...out.entries()].sort());
  }, [data]);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-5">
      <div>
        <Link to="/academy/canvas" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Academy
        </Link>
        <div className="flex items-end justify-between gap-3 flex-wrap mt-1">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setWeekOffset(weekOffset - 4)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>Today</Button>
            <Button size="sm" variant="outline" onClick={() => setWeekOffset(weekOffset + 4)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading calendar…
        </div>
      ) : error || !data || 'error' in data ? (
        <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>Could not load calendar.</div>
        </div>
      ) : grouped.size === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-2">
            <Calendar className="w-6 h-6 mx-auto opacity-40" />
            <p>Nothing scheduled in this range.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {[...grouped.entries()].map(([day, items]) => (
            <li key={day}>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {formatDayHeader(day)}
              </div>
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={i}>
                    <Card>
                      <CardContent className="p-3 flex items-center gap-3">
                        {item.kind === 'assignment' ? (
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <Calendar className="w-4 h-4 text-primary shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {item.kind === 'assignment' && item.course_id && item.assignment_id ? (
                              <Link to={`/academy/canvas/courses/${item.course_id}/assignments/${item.assignment_id}`} className="hover:underline">
                                {item.title}
                              </Link>
                            ) : item.title}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            {item.course_name && <span>{item.course_name}</span>}
                            {item.kind === 'event' && item.start_at && !item.all_day && (
                              <span>· {formatTime(item.start_at)}{item.end_at && ` – ${formatTime(item.end_at)}`}</span>
                            )}
                            {item.kind === 'assignment' && item.due_at && (
                              <span>· Due {formatTime(item.due_at)}</span>
                            )}
                            {item.kind === 'assignment' && item.points_possible !== null && (
                              <span>· {item.points_possible} pts</span>
                            )}
                          </div>
                        </div>
                        {item.kind === 'assignment' && (
                          <Badge variant="outline" className="text-[10px]">Due</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
