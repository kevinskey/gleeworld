// Day-tab timeline: hour grid from 7:00–22:00 showing the day's
// calendar events (read-only) and time-blocked tasks. Tasks get onto
// the grid by dragging a task row over a slot, or — keyboard/mobile
// path — the clock button on each task row. Blocks move by drag or via
// their popover; removing a block never deletes the task. Overlaps
// split into columns and get an amber edge.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { addMinutes, format, isSameDay, parseISO, setHours, setMinutes, startOfDay } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DAY_START_HOUR, DAY_END_HOUR, layoutTimeline, type TimelineItem,
} from '@/lib/planner/timeBlocks';
import type { PlannerEvent } from '@/lib/planner/eventsApi';
import type { PlannerTask } from '@/lib/planner/types';

const PX_PER_MIN = 48 / 60; // 48px per hour
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);
const DURATIONS = [30, 60, 90, 120, 180, 240];

export interface DayTimelineProps {
  /** YYYY-MM-DD of the day on display */
  date: string;
  events: PlannerEvent[];
  tasks: PlannerTask[];
  onSetBlock: (taskId: string, startIso: string | null, minutes: number | null) => void;
  onSetStatus: (taskId: string, status: PlannerTask['status']) => void;
}

export function slotId(hour: number, half: boolean): string {
  return `timeslot-${hour}-${half ? 30 : 0}`;
}

/** ISO timestamp for a slot on the displayed day. */
export function slotToIso(date: string, hour: number, minute: number): string {
  return setMinutes(setHours(startOfDay(parseISO(date)), hour), minute).toISOString();
}

export default function DayTimeline({ date, events, tasks, onSetBlock, onSetStatus }: DayTimelineProps) {
  const day = parseISO(date);
  const now = new Date();
  const showNow = isSameDay(day, now);
  const nowOffset = (now.getHours() * 60 + now.getMinutes() - DAY_START_HOUR * 60) * PX_PER_MIN;

  const items = useMemo<TimelineItem[]>(() => {
    const eventItems: TimelineItem[] = events
      .filter((e) => isSameDay(parseISO(e.start_date), day))
      .map((e) => ({
        id: `event-${e.id}`,
        kind: 'event',
        label: e.title,
        startIso: e.start_date,
        minutes: e.end_date
          ? Math.max(30, (parseISO(e.end_date).getTime() - parseISO(e.start_date).getTime()) / 60000)
          : 60,
      }));
    const taskItems: TimelineItem[] = tasks
      .filter((t) => t.block_start && isSameDay(parseISO(t.block_start), day))
      .map((t) => ({
        id: t.id,
        kind: 'task',
        label: t.title || 'Untitled task',
        startIso: t.block_start!,
        minutes: t.block_minutes ?? 60,
      }));
    return [...eventItems, ...taskItems];
  }, [events, tasks, day]);

  const laid = useMemo(() => layoutTimeline(items), [items]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  // The full 7:00–22:00 grid is 720px tall — rendered inline it buried the
  // daily note below a screenful of empty hours on phones and iPads. The
  // grid scrolls inside its own container instead, opened centered on "now"
  // (mid-morning for other days). Scrolling the container never moves the
  // page, so the top bar and note stay where the user left them.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollHeight <= el.clientHeight) return;
    const target = showNow && nowOffset >= 0 ? nowOffset : (10 - DAY_START_HOUR) * 48;
    el.scrollTop = Math.max(0, target - el.clientHeight / 2);
    // Position once per displayed day; re-running on data refetch would
    // yank the user's scroll position away mid-interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div className="relative rounded-lg border border-border bg-card">
      <div ref={scrollRef} className="max-h-[24rem] overflow-y-auto overscroll-contain lg:max-h-[32rem]">
      <div className="relative" style={{ height: HOURS.length * 48 }}>
        {/* hour rows + droppable half-hour slots */}
        {HOURS.map((h, i) => (
          <div key={h} className="absolute inset-x-0" style={{ top: i * 48, height: 48 }}>
            <div className="flex h-full">
              <div className="w-14 shrink-0 -translate-y-2 pr-2 text-right text-[11px] text-muted-foreground">
                {format(setHours(day, h), 'h a')}
              </div>
              <div className="relative flex-1 border-t border-border/60">
                <DropSlot id={slotId(h, false)} className="absolute inset-x-0 top-0 h-1/2" />
                <DropSlot id={slotId(h, true)} className="absolute inset-x-0 bottom-0 h-1/2 border-t border-dashed border-border/30" />
              </div>
            </div>
          </div>
        ))}

        {/* now line */}
        {showNow && nowOffset >= 0 && nowOffset <= HOURS.length * 48 && (
          <div className="pointer-events-none absolute left-14 right-0 z-20" style={{ top: nowOffset }} aria-hidden>
            <div className="h-px bg-destructive" />
            <div className="-mt-1 h-2 w-2 rounded-full bg-destructive" />
          </div>
        )}

        {/* items */}
        {laid.map((item) => {
          return (
            <TimelineBlock
              key={item.id}
              item={item}
              task={item.kind === 'task' ? taskById.get(item.id) : undefined}
              style={{
                top: item.offsetMin * PX_PER_MIN,
                height: Math.max(20, item.minutes * PX_PER_MIN - 2),
                left: `calc(3.5rem + (100% - 3.5rem) * ${item.column / item.columns})`,
                width: `calc((100% - 3.5rem) / ${item.columns} - 4px)`,
              }}
              date={date}
              onSetBlock={onSetBlock}
              onSetStatus={onSetStatus}
            />
          );
        })}
      </div>
      </div>
    </div>
  );
}

function DropSlot({ id, className }: { id: string; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={`${className} ${isOver ? 'bg-primary/10' : ''}`} />;
}

function TimelineBlock({ item, task, style, date, onSetBlock, onSetStatus }: {
  item: ReturnType<typeof layoutTimeline>[number];
  task?: PlannerTask;
  style: React.CSSProperties;
  date: string;
  onSetBlock: DayTimelineProps['onSetBlock'];
  onSetStatus: DayTimelineProps['onSetStatus'];
}) {
  const [open, setOpen] = useState(false);
  const start = parseISO(item.startIso);
  const timeLabel = `${format(start, 'h:mm a')} – ${format(addMinutes(start, item.minutes), 'h:mm a')}`;
  const isEvent = item.kind === 'event';
  const done = task?.status === 'done';

  const body = (
    <div
      className={`h-full overflow-hidden rounded-md border px-2 py-0.5 text-left text-xs transition-colors ${
        isEvent
          ? 'border-info/40 bg-info/10 text-foreground'
          : done
            ? 'border-border bg-muted text-muted-foreground line-through'
            : 'border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15'
      } ${item.conflicted ? 'border-warning' : ''}`}
    >
      <span className="flex items-center gap-1 font-medium">
        {item.conflicted && <AlertTriangle className="h-3 w-3 shrink-0 text-warning" aria-label="Overlaps another block" />}
        <span className="truncate">{item.label}</span>
      </span>
      <span className="text-[10px] text-muted-foreground">{timeLabel}</span>
    </div>
  );

  if (isEvent) {
    return <div className="absolute z-10" style={style} title={`${item.label} · ${timeLabel}`}>{body}</div>;
  }

  return (
    <div className="absolute z-10" style={style}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="block h-full w-full" aria-label={`Time block: ${item.label}, ${timeLabel}`}>
            {body}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3" align="start">
          <p className="text-sm font-medium text-foreground">{item.label}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor={`start-${item.id}`}>Starts</label>
              <Select
                value={`${start.getHours()}:${start.getMinutes()}`}
                onValueChange={(v) => {
                  const [h, m] = v.split(':').map(Number);
                  onSetBlock(item.id, slotToIso(date, h, m), item.minutes);
                  setOpen(false);
                }}
              >
                <SelectTrigger id={`start-${item.id}`} className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOURS.flatMap((h) => [0, 30].map((m) => (
                    <SelectItem key={`${h}:${m}`} value={`${h}:${m}`}>
                      {format(setMinutes(setHours(new Date(), h), m), 'h:mm a')}
                    </SelectItem>
                  )))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor={`dur-${item.id}`}>Length</label>
              <Select
                value={String(item.minutes)}
                onValueChange={(v) => {
                  onSetBlock(item.id, item.startIso, Number(v));
                  setOpen(false);
                }}
              >
                <SelectTrigger id={`dur-${item.id}`} className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d < 60 ? `${d} min` : `${d / 60} hr${d > 60 ? 's' : ''}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => { onSetStatus(item.id, done ? 'open' : 'done'); setOpen(false); }}
            >
              {done ? 'Reopen' : 'Complete'}
            </Button>
            <Button
              size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={() => { onSetBlock(item.id, null, null); setOpen(false); }}
            >
              <Clock className="h-3.5 w-3.5" /> Remove block
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
