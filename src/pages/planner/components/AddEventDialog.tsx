// Create a real calendar event from the Notes day page. Writes gw_events
// (the main calendar's table) via plannerEventsApi.createEvent, so the
// event shows up on /dashboard/calendar, in the Events list here, and on
// the Day timeline — one record, three views.
import { useState } from 'react';
import { addMinutes, format, parseISO, setHours, setMinutes, startOfDay } from 'date-fns';
import { CalendarPlus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { createEvent, EVENT_TYPES, type PlannerEventType } from '@/lib/planner/eventsApi';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am–9pm starts
const DURATIONS = [30, 60, 90, 120, 180, 240];

export default function AddEventDialog({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<PlannerEventType>('rehearsal');
  const [start, setStart] = useState('18:00');
  const [minutes, setMinutes_] = useState(60);
  const [location, setLocation] = useState('');
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: () => {
      const [h, m] = start.split(':').map(Number);
      const startDate = setMinutes(setHours(startOfDay(parseISO(date)), h), m);
      return createEvent({
        title,
        eventType,
        startIso: startDate.toISOString(),
        endIso: addMinutes(startDate, minutes).toISOString(),
        location: location || null,
      });
    },
    onSuccess: () => {
      toast.success('Event added — it’s on your main calendar too');
      qc.invalidateQueries({ queryKey: ['planner', 'events'] });
      setOpen(false);
      setTitle('');
      setLocation('');
    },
    onError: (err) => {
      console.error(err);
      toast.error('Could not create the event — you may not have calendar permission');
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
          <CalendarPlus className="h-3.5 w-3.5" /> Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New event — {format(parseISO(date), 'EEEE, MMM d')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title (e.g. Sectional — sopranos)"
            aria-label="Event title"
          />
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="evt-type">Type</label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as PlannerEventType)}>
                <SelectTrigger id="evt-type" className="h-9 capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="evt-start">Starts</label>
              <Select value={start} onValueChange={setStart}>
                <SelectTrigger id="evt-start" className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOURS.flatMap((h) => ['00', '30'].map((m) => (
                    <SelectItem key={`${h}:${m}`} value={`${h}:${m}`}>
                      {format(setMinutes(setHours(new Date(), h), Number(m)), 'h:mm a')}
                    </SelectItem>
                  )))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="evt-dur">Length</label>
              <Select value={String(minutes)} onValueChange={(v) => setMinutes_(Number(v))}>
                <SelectTrigger id="evt-dur" className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d < 60 ? `${d} min` : `${d / 60} hr${d > 60 ? 's' : ''}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            aria-label="Event location"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>
            Add event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
