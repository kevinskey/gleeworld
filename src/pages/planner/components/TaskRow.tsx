// One task row, shared by the Tasks views and Today. Every mutation is
// menu-reachable (no drag-only affordances). Completing here mirrors the
// checkbox back into the source note via tasksApi.setTaskStatus.
import { format, parseISO } from 'date-fns';
import {
  CalendarDays, ChevronRight, Flag, MoreHorizontal, Repeat, StickyNote, Trash2, XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { describeRecurrence } from '@/lib/planner/recurrence';
import type { PlannerTask, TaskPriority } from '@/lib/planner/types';
import { addDays, addWeeks, format as fmt } from 'date-fns';
import { useState } from 'react';

const PRIORITY_TONE: Record<TaskPriority, string> = {
  none: '',
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/10 text-info',
  high: 'bg-warning/15 text-warning-foreground',
  urgent: 'bg-destructive/10 text-destructive',
};

export interface TaskRowProps {
  task: PlannerTask;
  onSetStatus: (id: string, status: PlannerTask['status']) => void;
  onReschedule: (id: string, date: string | null) => void;
  onSetPriority: (id: string, priority: TaskPriority) => void;
  onDelete: (id: string) => void;
  onOpenNote?: (noteId: string) => void;
  showDate?: boolean;
}

export default function TaskRow({
  task, onSetStatus, onReschedule, onSetPriority, onDelete, onOpenNote, showDate = true,
}: TaskRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const done = task.status === 'done';
  const cancelled = task.status === 'cancelled';
  const today = fmt(new Date(), 'yyyy-MM-dd');
  const overdue = !done && !cancelled && !!task.scheduled_date && task.scheduled_date < today;

  return (
    <div className="group flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
      <Checkbox
        checked={done}
        disabled={cancelled}
        onCheckedChange={(v) => onSetStatus(task.id, v === true ? 'done' : 'open')}
        aria-label={done ? `Reopen task: ${task.title}` : `Complete task: ${task.title}`}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${done || cancelled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {task.title || 'Untitled task'}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {showDate && task.scheduled_date && (
            <Badge variant="outline" className={`gap-1 text-[11px] font-normal ${overdue ? 'border-destructive/50 text-destructive' : 'text-muted-foreground'}`}>
              <CalendarDays className="h-3 w-3" aria-hidden />
              {format(parseISO(task.scheduled_date), 'MMM d')}
              {overdue && <span className="sr-only"> (overdue)</span>}
            </Badge>
          )}
          {task.priority !== 'none' && (
            <Badge variant="outline" className={`gap-1 text-[11px] font-normal capitalize ${PRIORITY_TONE[task.priority]}`}>
              <Flag className="h-3 w-3" aria-hidden />{task.priority}
            </Badge>
          )}
          {task.recurrence && (
            <Badge variant="outline" className="gap-1 text-[11px] font-normal text-muted-foreground">
              <Repeat className="h-3 w-3" aria-hidden />{describeRecurrence(task.recurrence)}
            </Badge>
          )}
          {cancelled && <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">Cancelled</Badge>}
          {task.note_id && onOpenNote && (
            <button
              onClick={() => onOpenNote(task.note_id!)}
              className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            >
              <StickyNote className="h-3 w-3" aria-hidden /> Open note
            </button>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" aria-label={`Task actions: ${task.title}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs">Schedule</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onReschedule(task.id, today)}>Today</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onReschedule(task.id, fmt(addDays(new Date(), 1), 'yyyy-MM-dd'))}>Tomorrow</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onReschedule(task.id, fmt(addWeeks(new Date(), 1), 'yyyy-MM-dd'))}>Next week</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPickerOpen(true)}>Pick a date…</DropdownMenuItem>
          {task.scheduled_date && (
            <DropdownMenuItem onClick={() => onReschedule(task.id, null)}>Remove date</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2"><Flag className="h-4 w-4" /> Priority <ChevronRight className="ml-auto h-4 w-4" /></DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {(['none', 'low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                <DropdownMenuItem key={p} className="capitalize" onClick={() => onSetPriority(task.id, p)}>
                  {p}{task.priority === p ? ' ✓' : ''}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          {!cancelled ? (
            <DropdownMenuItem onClick={() => onSetStatus(task.id, 'cancelled')} className="gap-2">
              <XCircle className="h-4 w-4" /> Cancel task
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onSetStatus(task.id, 'open')} className="gap-2">
              Reopen task
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onDelete(task.id)} className="gap-2 text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild><span aria-hidden /></PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={task.scheduled_date ? parseISO(task.scheduled_date) : undefined}
            onSelect={(d) => {
              if (d) onReschedule(task.id, fmt(d, 'yyyy-MM-dd'));
              setPickerOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
