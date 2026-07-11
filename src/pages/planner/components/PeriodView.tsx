// A calendar note: any of daily / weekly / monthly / quarterly / yearly,
// lazily created on open. Shows period navigation, the period's GleeWorld
// events (read-only), the period's scheduled tasks, and the note editor.
// "Today" is simply the daily note for the current date.
import { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, FileStack, MapPin, ZoomOut } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import DayTimeline, { slotToIso } from './DayTimeline';
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

  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const onDragStart = (e: DragStartEvent) => setDragTaskId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setDragTaskId(null);
    const over = e.over?.id ? String(e.over.id) : null;
    if (!over || !over.startsWith('timeslot-')) return;
    const [, hour, minute] = over.split('-');
    const task = (dayTasks ?? []).find((t) => t.id === String(e.active.id));
    setBlock.mutate({
      id: String(e.active.id),
      startIso: slotToIso(dateKey, Number(hour), Number(minute)),
      minutes: task?.block_minutes ?? 60,
    });
  };
  const dragTask = dragTaskId ? (dayTasks ?? []).find((t) => t.id === dragTaskId) : null;

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
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <section aria-label="Tasks for this day" className="flex flex-col gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tasks</h2>
            <QuickAddTask defaultDate={dateKey} onCreated={() => qc.invalidateQueries({ queryKey: ['planner'] })} />
            {(dayTasks ?? []).map((t) => (
              <DraggableRow key={t.id} id={t.id}>
                <TaskRow
                  task={t}
                  showDate={false}
                  onSetStatus={(id, status: TaskStatus) => setStatus.mutate({ id, status })}
                  onReschedule={(id, date) => reschedule.mutate({ id, date })}
                  onSetPriority={(id, priority) => setPriority.mutate({ id, priority })}
                  onDelete={(id) => remove.mutate(id)}
                  onOpenNote={onOpenNote}
                  onBlockHour={(id, hour) => setBlock.mutate({ id, startIso: slotToIso(dateKey, hour, 0), minutes: 60 })}
                />
              </DraggableRow>
            ))}
          </section>

          <section aria-label="Timeline" className="flex flex-col gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Timeline</h2>
            <p className="text-xs text-muted-foreground">
              Drag a task onto an hour (or use its ⋯ menu → Block time). Click a block to adjust.
            </p>
            <DayTimeline
              date={dateKey}
              events={events ?? []}
              tasks={dayTasks ?? []}
              onSetBlock={(id, startIso, minutes) => setBlock.mutate({ id, startIso, minutes })}
              onSetStatus={(id, status) => setStatus.mutate({ id, status })}
            />
          </section>

          <DragOverlay>
            {dragTask && (
              <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-lg">
                {dragTask.title || 'Untitled task'}
              </div>
            )}
          </DragOverlay>
        </DndContext>
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
            <div className="rounded-lg border border-border bg-card p-4">
              <NoteEditor
                note={note}
                hideTitle
                onSaved={(saved) => qc.setQueryData(['planner', 'period-note', type, dateKey], saved)}
              />
            </div>
          </div>
        )}
      </section>
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

function DraggableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={isDragging ? 'opacity-40' : undefined}>
      {children}
    </div>
  );
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

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <FileStack className="h-3.5 w-3.5" aria-hidden /> Start from:
      </span>
      {matching.map((tpl) => (
        <Button
          key={tpl.id}
          size="sm"
          variant="outline"
          className="h-7 rounded-full text-xs"
          disabled={applying !== null}
          onClick={() => void apply(tpl)}
        >
          {tpl.name}
        </Button>
      ))}
    </div>
  );
}
