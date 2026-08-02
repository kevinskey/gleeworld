// A calendar note: any of daily / weekly / monthly / quarterly / yearly,
// lazily created on open. Shows period navigation, the period's GleeWorld
// events (read-only), the period's scheduled tasks, and the note editor.
// "Today" is simply the daily note for the current date.
import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, FileStack, MapPin, Plus, ZoomOut } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  childPeriods, keyRange, keyTitle, keyToDate, parentPeriod, periodKey, shiftKey,
  type PeriodType, PERIOD_TYPES,
} from '@/lib/planner/dateKeys';
import { isDocEmpty } from '@/lib/planner/markdown';
import { saveNote } from '@/lib/planner/notesApi';
import { defaultTemplateContext, substituteDoc } from '@/lib/planner/templates';
import * as tasksApi from '@/lib/planner/tasksApi';
import type { PlannerNote, PlannerTemplate, TaskPriority, TaskStatus } from '@/lib/planner/types';
import {
  usePeriodEvents, usePeriodNote, useRescheduleTask, useSetTaskStatus, useTasksForDate,
  useTasksForRange, useTemplates,
} from '../hooks';
import AddEventDialog from './AddEventDialog';
import { slotToIso } from './DayTimeline';
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
  /** Primary "New note" action — surfaced on the date title row (moved off
   *  the sidebar so the sidebar stays a nav rail). */
  onNewNote?: () => void;
  creatingNote?: boolean;
}

export default function PeriodView({
  type, dateKey, onNavigate, onOpenNote, onNewNote, creatingNote,
}: PeriodViewProps) {
  const { data: note, isLoading, isError } = usePeriodNote(type, dateKey);
  const { data: events } = usePeriodEvents(type, dateKey);
  const isDaily = type === 'daily';
  const { data: dayTasks } = useTasksForDate(isDaily ? dateKey : null);
  const range = useMemo(() => keyRange(dateKey, type), [dateKey, type]);
  const rangeStart = !isDaily && range ? format(range.start, 'yyyy-MM-dd') : null;
  const rangeEnd = !isDaily && range ? format(range.end, 'yyyy-MM-dd') : null;
  const { data: periodTasks } = useTasksForRange(rangeStart, rangeEnd);
  const children = useMemo(() => childPeriods(dateKey, type), [dateKey, type]);
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
  const setBlock = useMutation({
    mutationFn: ({ id, startIso, minutes }: { id: string; startIso: string | null; minutes: number | null }) =>
      tasksApi.setTimeBlock(id, startIso, minutes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planner'] }),
    onError: () => toast.error('Could not update the time block'),
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
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Previous period" onClick={() => onNavigate(type, shiftKey(dateKey, type, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onNavigate(type, todayKey)} disabled={dateKey === todayKey}>
            Today
          </Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Next period" onClick={() => onNavigate(type, shiftKey(dateKey, type, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Jump to date">
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-foreground">{keyTitle(dateKey, type)}</h1>
        <div className="flex items-center gap-3">
          {parent && (
            <button
              onClick={() => onNavigate(parent.type, parent.key)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              <ZoomOut className="h-3.5 w-3.5" aria-hidden /> {keyTitle(parent.key, parent.type)}
            </button>
          )}
          {onNewNote && (
            <Button size="sm" className="gap-1.5" onClick={onNewNote} disabled={creatingNote}>
              <Plus className="h-4 w-4" /> New note
            </Button>
          )}
        </div>
      </div>

      {/* drill-down: this period's children (week→days, month→weeks, …) */}
      {!!children.length && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jump into this period">
          {children.map((c) => (
            <Button
              key={c.key}
              size="sm"
              variant={c.isCurrent ? 'default' : 'outline'}
              className="h-7 rounded-full text-xs"
              onClick={() => onNavigate(c.type, c.key)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      )}

      {/* Day view: the note is the work surface — one big centered paper
          with room to think. Events + tasks live in a slim rail beside it
          on desktop (below it on phones), with no dashed placeholder
          boxes eating the page. */}
      {isDaily && (
        <div className="flex flex-col lg:flex-row lg:items-start gap-5">
          <section aria-label="Note" className="w-full flex-1 min-w-0">
            {isLoading ? (
              <Skeleton className="h-[60vh] w-full" />
            ) : isError || !note ? (
              <p className="rounded-md border border-border bg-card px-3 py-4 text-sm text-muted-foreground">
                Couldn't load this note. Check your connection and try again.
              </p>
            ) : (
              <div
                className="bg-card px-4 py-5 sm:px-10 sm:py-8 min-h-[60vh] flex flex-col gap-4"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                {isDocEmpty(note.content) && (
                  <TemplateChips
                    note={note}
                    periodType={type}
                    onApplied={(saved) => qc.setQueryData(['planner', 'period-note', type, dateKey], saved)}
                  />
                )}
                <NoteEditor
                  note={note}
                  hideTitle
                  onSaved={(saved) => qc.setQueryData(['planner', 'period-note', type, dateKey], saved)}
                />
              </div>
            )}
          </section>

          <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-5">
            <section aria-label="Events" className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Events</h2>
                <AddEventDialog date={dateKey} />
              </div>
              {!events?.length && (
                <p className="text-xs text-muted-foreground">Nothing scheduled today.</p>
              )}
              {(events ?? []).map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
                  <div className="w-16 shrink-0 text-xs text-muted-foreground">
                    {format(parseISO(e.start_date), 'h:mm a')}
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
                  onBlockHour={(id, hour) => setBlock.mutate({ id, startIso: slotToIso(dateKey, hour, 0), minutes: 60 })}
                />
              ))}
            </section>
          </aside>
        </div>
      )}

      {!isDaily && !!events?.length && (
        <section aria-label="Events" className="flex flex-col gap-1.5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Events</h2>
          {(events ?? []).map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
              <div className="w-16 shrink-0 text-xs text-muted-foreground">
                {format(parseISO(e.start_date), 'MMM d')}
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

      {/* non-daily periods: every task scheduled inside the period, by day */}
      {!isDaily && (
        <section aria-label="Tasks in this period" className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tasks this {PERIOD_LABELS[type].toLowerCase()}</h2>
          <QuickAddTask
            defaultDate={rangeStart && rangeEnd && format(new Date(), 'yyyy-MM-dd') >= rangeStart && format(new Date(), 'yyyy-MM-dd') <= rangeEnd
              ? format(new Date(), 'yyyy-MM-dd')
              : rangeStart ?? undefined}
            onCreated={() => qc.invalidateQueries({ queryKey: ['planner'] })}
          />
          {!(periodTasks ?? []).length ? (
            <p className="rounded-md border border-dashed border-border bg-card px-3 py-4 text-sm text-muted-foreground">
              Nothing scheduled in this {PERIOD_LABELS[type].toLowerCase()} yet.
            </p>
          ) : (
            groupByDate(periodTasks ?? []).map((g) => (
              <div key={g.date} className="flex flex-col gap-1.5">
                <button
                  onClick={() => onNavigate('daily', g.date)}
                  className="self-start text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
                >
                  {format(parseISO(g.date), 'EEEE, MMM d')}
                </button>
                {g.tasks.map((t) => (
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
              </div>
            ))
          )}
        </section>
      )}

      {!isDaily && (
        <section aria-label="Note" className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Note</h2>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : isError || !note ? (
            <p className="rounded-md border border-border bg-card px-3 py-4 text-sm text-muted-foreground">
              Couldn't load this note. Check your connection and try again.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {isDocEmpty(note.content) && (
                <TemplateChips
                  note={note}
                  periodType={type}
                  onApplied={(saved) => qc.setQueryData(['planner', 'period-note', type, dateKey], saved)}
                />
              )}
              <div
                className="bg-card px-4 py-5 sm:px-8 sm:py-6"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <NoteEditor
                  note={note}
                  hideTitle
                  onSaved={(saved) => qc.setQueryData(['planner', 'period-note', type, dateKey], saved)}
                />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function groupByDate(tasks: import('@/lib/planner/types').PlannerTask[]): { date: string; tasks: typeof tasks }[] {
  const byDate = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const d = t.scheduled_date ?? '';
    if (!d) continue;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(t);
  }
  return [...byDate.entries()].map(([date, list]) => ({ date, tasks: list }));
}

/** One-tap template start for an empty period note. */
function TemplateChips({ note, periodType, onApplied }: {
  note: PlannerNote;
  periodType: PeriodType;
  onApplied: (saved: PlannerNote) => void;
}) {
  const { data: templates } = useTemplates();
  const [applying, setApplying] = useState<string | null>(null);
  const matching = (templates ?? [])
    .filter((t) => t.note_type === periodType || t.note_type === 'note')
    .sort((a, b) => Number(b.note_type === periodType) - Number(a.note_type === periodType))
    .slice(0, 4);
  if (!matching.length) return null;

  const apply = async (tpl: PlannerTemplate) => {
    setApplying(tpl.id);
    try {
      const saved = await saveNote(note.id, {
        title: note.title,
        content: substituteDoc(tpl.content, defaultTemplateContext()),
        expectedVersion: note.version,
      });
      onApplied(saved);
    } catch (err) {
      console.error(err);
      toast.error('Could not apply the template');
    } finally {
      setApplying(null);
    }
  };

  // One quiet dropdown instead of a row of pills — the writing surface
  // is the star; templates are a starting hand, not chrome.
  return (
    <div className="self-start">
      <Select
        disabled={applying !== null}
        value=""
        onValueChange={(id) => {
          const tpl = matching.find((t) => t.id === id);
          if (tpl) void apply(tpl);
        }}
      >
        <SelectTrigger className="h-8 w-auto gap-1.5 text-xs text-muted-foreground border-border/70">
          <FileStack className="h-3.5 w-3.5" aria-hidden />
          <SelectValue placeholder={applying ? 'Applying…' : 'Start from a template'} />
        </SelectTrigger>
        <SelectContent>
          {matching.map((tpl) => (
            <SelectItem key={tpl.id} value={tpl.id} className="text-sm">{tpl.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
