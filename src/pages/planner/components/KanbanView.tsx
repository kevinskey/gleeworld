// Kanban board over the same task rows (no copies): drag between
// columns to change status or priority, with the TaskRow dropdown as the
// keyboard/screen-reader path for every move a drag can make.
import { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as tasksApi from '@/lib/planner/tasksApi';
import type { PlannerTask, TaskPriority, TaskStatus } from '@/lib/planner/types';
import { useRescheduleTask, useSetTaskStatus, useTasks } from '../hooks';
import TaskRow from './TaskRow';
import { EmptyState } from './TasksView';
import { KanbanSquare } from 'lucide-react';

type GroupBy = 'status' | 'priority';

const STATUS_COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'done', label: 'Done' },
  { key: 'cancelled', label: 'Cancelled' },
];
const PRIORITY_COLUMNS: { key: TaskPriority; label: string }[] = [
  { key: 'none', label: 'No priority' },
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
  { key: 'urgent', label: 'Urgent' },
];

export default function KanbanView({ onOpenNote }: { onOpenNote: (noteId: string) => void }) {
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const { data: tasks, isLoading } = useTasks('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const qc = useQueryClient();
  const setStatus = useSetTaskStatus();
  const reschedule = useRescheduleTask();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  const columns = groupBy === 'status' ? STATUS_COLUMNS : PRIORITY_COLUMNS;
  const byColumn = useMemo(() => {
    const map = new Map<string, PlannerTask[]>();
    for (const c of columns) map.set(c.key, []);
    for (const t of tasks ?? []) {
      const key = groupBy === 'status' ? t.status : t.priority;
      map.get(key)?.push(t);
    }
    return map;
  }, [tasks, columns, groupBy]);

  const activeTask = activeId ? (tasks ?? []).find((t) => t.id === activeId) ?? null : null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const taskId = String(e.active.id);
    const column = e.over?.id ? String(e.over.id) : null;
    if (!column) return;
    if (groupBy === 'status') setStatus.mutate({ id: taskId, status: column as TaskStatus });
    else setPriority.mutate({ id: taskId, priority: column as TaskPriority });
  };

  const rowHandlers = {
    onSetStatus: (id: string, status: TaskStatus) => setStatus.mutate({ id, status }),
    onReschedule: (id: string, date: string | null) => reschedule.mutate({ id, date }),
    onSetPriority: (id: string, priority: TaskPriority) => setPriority.mutate({ id, priority }),
    onDelete: (id: string) => remove.mutate(id),
    onOpenNote,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-foreground">Board</h1>
        <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
          <TabsList>
            <TabsTrigger value="status" className="text-xs sm:text-sm">By status</TabsTrigger>
            <TabsTrigger value="priority" className="text-xs sm:text-sm">By priority</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)}</div>
      ) : !(tasks ?? []).length ? (
        <EmptyState icon={KanbanSquare} title="No tasks on the board" body="Tasks you create in notes or the Tasks view appear here." />
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="overflow-x-auto pb-2">
            <div className={`grid min-w-[640px] gap-3 ${columns.length > 3 ? 'grid-cols-5' : 'grid-cols-3'}`}>
              {columns.map((c) => (
                <KanbanColumn key={c.key} id={c.key} label={c.label} count={byColumn.get(c.key)?.length ?? 0}>
                  {(byColumn.get(c.key) ?? []).map((t) => (
                    <DraggableCard key={t.id} task={t}>
                      <TaskRow task={t} {...rowHandlers} />
                    </DraggableCard>
                  ))}
                </KanbanColumn>
              ))}
            </div>
          </div>
          <DragOverlay>
            {activeTask && (
              <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-lg">
                {activeTask.title || 'Untitled task'}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function KanbanColumn({ id, label, count, children }: {
  id: string; label: string; count: number; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${label} column, ${count} tasks`}
      className={`flex min-h-[10rem] flex-col gap-2 rounded-lg border p-2 transition-colors ${isOver ? 'border-primary/60 bg-primary/5' : 'border-border bg-muted/40'}`}
    >
      <header className="flex items-center justify-between px-1">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h2>
        <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">{count}</Badge>
      </header>
      {children}
    </section>
  );
}

function DraggableCard({ task, children }: { task: PlannerTask; children: React.ReactNode }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={isDragging ? 'opacity-40' : undefined}>
      {children}
    </div>
  );
}
