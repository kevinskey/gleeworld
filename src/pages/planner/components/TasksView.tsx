// Task lists: Today / Overdue / Upcoming / Unscheduled / Done, plus a
// quick-add box with natural-language scheduling and an explicit parse
// preview (ambiguity is shown, never silently guessed).
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ArrowRight, CalendarClock, CheckCircle2, Inbox, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseSchedule } from '@/lib/planner/nlDates';
import * as tasksApi from '@/lib/planner/tasksApi';
import type { PlannerTask, TaskPriority } from '@/lib/planner/types';
import { useRescheduleTask, useSetTaskStatus, useTasks } from '../hooks';
import TaskRow from './TaskRow';

const VIEWS: { key: tasksApi.TaskView; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'unscheduled', label: 'No date' },
  { key: 'done', label: 'Done' },
];

export default function TasksView({ onOpenNote }: { onOpenNote: (noteId: string) => void }) {
  const [view, setView] = useState<tasksApi.TaskView>('today');
  const { data: tasks, isLoading, isError } = useTasks(view);
  const qc = useQueryClient();
  const setStatus = useSetTaskStatus();
  const reschedule = useRescheduleTask();

  const invalidate = () => qc.invalidateQueries({ queryKey: ['planner'] });

  const setPriority = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: TaskPriority }) =>
      tasksApi.updateTask(id, { priority }),
    onSuccess: invalidate,
    onError: () => toast.error('Could not update priority'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: invalidate,
    onError: () => toast.error('Could not delete the task'),
  });
  const carryForward = useMutation({
    mutationFn: tasksApi.carryForwardOverdue,
    onSuccess: (n) => {
      toast.success(n ? `Moved ${n} task${n === 1 ? '' : 's'} to today` : 'Nothing overdue');
      invalidate();
    },
    onError: () => toast.error('Could not move tasks'),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
        {view === 'overdue' && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => carryForward.mutate()} disabled={carryForward.isPending}>
            <ArrowRight className="h-4 w-4" /> Move all to today
          </Button>
        )}
      </div>

      {/* On the Today tab, an undated quick-add means "today" — otherwise
          it lands in No date and looks like it vanished. */}
      <QuickAddTask onCreated={invalidate} defaultDate={view === 'today' ? format(new Date(), 'yyyy-MM-dd') : undefined} />

      <Tabs value={view} onValueChange={(v) => setView(v as tasksApi.TaskView)}>
        <TabsList className="flex-wrap">
          {VIEWS.map((v) => <TabsTrigger key={v.key} value={v.key} className="text-xs sm:text-sm">{v.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : isError ? (
        <EmptyState icon={CalendarClock} title="Couldn't load tasks" body="Check your connection and try again." />
      ) : !tasks?.length ? (
        <TasksEmpty view={view} />
      ) : (
        <GroupedTasks
          view={view}
          tasks={tasks}
          onSetStatus={(id, status) => setStatus.mutate({ id, status })}
          onReschedule={(id, date) => reschedule.mutate({ id, date })}
          onSetPriority={(id, priority) => setPriority.mutate({ id, priority })}
          onDelete={(id) => remove.mutate(id)}
          onOpenNote={onOpenNote}
        />
      )}
    </div>
  );
}

function GroupedTasks({ view, tasks, ...handlers }: {
  view: tasksApi.TaskView;
  tasks: PlannerTask[];
  onSetStatus: (id: string, status: PlannerTask['status']) => void;
  onReschedule: (id: string, date: string | null) => void;
  onSetPriority: (id: string, priority: TaskPriority) => void;
  onDelete: (id: string) => void;
  onOpenNote: (noteId: string) => void;
}) {
  const groups = useMemo(() => {
    if (view !== 'upcoming' && view !== 'overdue') return [{ label: null as string | null, tasks }];
    const byDate = new Map<string, PlannerTask[]>();
    for (const t of tasks) {
      const key = t.scheduled_date ?? '';
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(t);
    }
    return [...byDate.entries()].map(([date, list]) => ({
      label: date ? format(parseISO(date), 'EEEE, MMM d') : 'No date',
      tasks: list,
    }));
  }, [view, tasks]);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g, i) => (
        <section key={g.label ?? i} className="flex flex-col gap-2">
          {g.label && <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.label}</h2>}
          {g.tasks.map((t) => (
            <TaskRow key={t.id} task={t} showDate={view !== 'today'} {...handlers} />
          ))}
        </section>
      ))}
    </div>
  );
}

function TasksEmpty({ view }: { view: tasksApi.TaskView }) {
  switch (view) {
    case 'today': return <EmptyState icon={CheckCircle2} title="Nothing scheduled for today" body="Add a task above, or pull from Overdue and Upcoming." />;
    case 'overdue': return <EmptyState icon={CheckCircle2} title="Nothing overdue" body="You're caught up." />;
    case 'upcoming': return <EmptyState icon={CalendarClock} title="Nothing scheduled ahead" body='Try adding "Rehearsal setup friday" above.' />;
    case 'unscheduled': return <EmptyState icon={Inbox} title="No undated tasks" body="Tasks without a date land here so they're never lost." />;
    default: return <EmptyState icon={CheckCircle2} title="No completed tasks yet" body="Completed tasks show here." />;
  }
}

export function EmptyState({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

/** "Order risers tomorrow at 9am" → task w/ parsed schedule preview. */
export function QuickAddTask({ onCreated, defaultDate }: { onCreated: () => void; defaultDate?: string }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  // try to parse a trailing schedule phrase from the free text
  const parsed = useMemo(() => {
    const words = text.trim().split(/\s+/);
    for (let n = Math.min(5, words.length - 1); n >= 1; n--) {
      const phrase = words.slice(-n).join(' ');
      const p = parseSchedule(phrase);
      if (p.matched) return { ...p, title: words.slice(0, -n).join(' ') };
    }
    return null;
  }, [text]);

  const submit = async () => {
    const title = (parsed?.title ?? text).trim();
    if (!title) return;
    setBusy(true);
    try {
      const scheduledDate = parsed?.date ?? defaultDate ?? null;
      await tasksApi.createTask({
        title,
        scheduled_date: scheduledDate,
        recurrence: parsed?.recurrence ?? null,
      });
      setText('');
      // say where it landed — a task filed outside the visible tab
      // otherwise looks like it never saved
      const today = format(new Date(), 'yyyy-MM-dd');
      toast.success(
        !scheduledDate ? 'Task added under "No date"'
          : scheduledDate === today ? 'Task added for today'
          : `Task added for ${format(parseISO(scheduledDate), 'EEE, MMM d')}`,
      );
      onCreated();
    } catch (err) {
      console.error(err);
      toast.error('Could not add the task');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
          placeholder='Add a task — try "Order folders friday" or "Warm-ups every weekday"'
          aria-label="New task"
        />
        <Button onClick={() => void submit()} disabled={busy || !text.trim()} className="gap-1 shrink-0">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      {parsed && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Scheduling “{parsed.title || '…'}” → {parsed.description}
        </p>
      )}
    </div>
  );
}
