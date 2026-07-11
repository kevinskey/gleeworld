// A calendar note: any of daily / weekly / monthly / quarterly / yearly,
// lazily created on open. Shows period navigation, the period's GleeWorld
// events (read-only), the period's scheduled tasks, and the note editor.
// "Today" is simply the daily note for the current date.
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, ZoomOut } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  keyTitle, keyToDate, parentPeriod, periodKey, shiftKey, type PeriodType, PERIOD_TYPES,
} from '@/lib/planner/dateKeys';
import * as tasksApi from '@/lib/planner/tasksApi';
import type { TaskPriority, TaskStatus } from '@/lib/planner/types';
import {
  usePeriodEvents, usePeriodNote, useRescheduleTask, useSetTaskStatus, useTasksForDate,
} from '../hooks';
import NoteEditor from './NoteEditor';
import TaskRow from './TaskRow';
import { QuickAddTask } from './TasksView';

const PERIOD_LABELS: Record<PeriodType, string> = {
  daily: 'Day', weekly: 'Week', monthly: 'Month', quarterly: 'Quarter', yearly: 'Year',
};

export interface PeriodViewProps {
  type: PeriodType;
  dateKey: string;
  onNavigate: (type: PeriodType, dateKey: string) => void;
  onOpenNote: (noteId: string) => void;
}

export default function PeriodView({ type, dateKey, onNavigate, onOpenNote }: PeriodViewProps) {
  const { data: note, isLoading, isError } = usePeriodNote(type, dateKey);
  const { data: events } = usePeriodEvents(type, dateKey);
  const isDaily = type === 'daily';
  const { data: dayTasks } = useTasksForDate(isDaily ? dateKey : null);
  const qc = useQueryClient();
  const setStatus = useSetTaskStatus();
  const reschedule = useRescheduleTask();
  const setPriority = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: TaskPriority }) =>
      tasksApi.updateTask(id, { priority }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planner'] }),
    onError: () => toast.error('Could not update priority'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planner'] }),
    onError: () => toast.error('Could not delete the task'),
  });

  const todayKey = useMemo(() => periodKey(new Date(), type), [type]);
  const parent = parentPeriod(dateKey, type);
  const selectedDate = keyToDate(dateKey, type) ?? new Date();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={type} onValueChange={(t) => onNavigate(t as PeriodType, periodKey(selectedDate, t as PeriodType))}>
          <TabsList className="flex-wrap">
            {PERIOD_TYPES.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs sm:text-sm">{PERIOD_LABELS[t]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Previous period" onClick={() => onNavigate(type, shiftKey(dateKey, type, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onNavigate(type, todayKey)} disabled={dateKey === todayKey}>
            Today
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Next period" onClick={() => onNavigate(type, shiftKey(dateKey, type, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Jump to date">
                <CalendarDays className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                defaultMonth={selectedDate}
                onSelect={(d) => { if (d) onNavigate(type, periodKey(d, type)); }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold text-foreground">{keyTitle(dateKey, type)}</h1>
        {parent && (
          <button
            onClick={() => onNavigate(parent.type, parent.key)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            <ZoomOut className="h-3.5 w-3.5" aria-hidden /> {keyTitle(parent.key, parent.type)}
          </button>
        )}
      </div>

      {!!events?.length && (
        <section aria-label="Events" className="flex flex-col gap-1.5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Events</h2>
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
              <div className="w-16 shrink-0 text-xs text-muted-foreground">
                {format(parseISO(e.start_date), isDaily ? 'h:mm a' : 'MMM d')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{e.title}</p>
                {e.location && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" aria-hidden />{e.location}
                  </p>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {isDaily && (
        <section aria-label="Tasks for this day" className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tasks</h2>
          <QuickAddTask defaultDate={dateKey} onCreated={() => qc.invalidateQueries({ queryKey: ['planner'] })} />
          {(dayTasks ?? []).map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              showDate={false}
              onSetStatus={(id, status: TaskStatus) => setStatus.mutate({ id, status })}
              onReschedule={(id, date) => reschedule.mutate({ id, date })}
              onSetPriority={(id, priority) => setPriority.mutate({ id, priority })}
              onDelete={(id) => remove.mutate(id)}
              onOpenNote={onOpenNote}
            />
          ))}
        </section>
      )}

      <section aria-label="Note" className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Note</h2>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError || !note ? (
          <p className="rounded-md border border-border bg-card px-3 py-4 text-sm text-muted-foreground">
            Couldn't load this note. Check your connection and try again.
          </p>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4">
            <NoteEditor
              note={note}
              hideTitle
              onSaved={(saved) => qc.setQueryData(['planner', 'period-note', type, dateKey], saved)}
            />
          </div>
        )}
      </section>
    </div>
  );
}
