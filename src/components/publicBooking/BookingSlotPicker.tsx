// Date + time selection step of the public booking flow. Owns the
// useAvailableTimeSlots call (get_available_time_slots, granted to anon by
// the public-intake migration) — the same hook the authenticated
// StudentBooking flow uses, reused verbatim rather than re-implemented.

import { useState } from 'react';
import { format, isPast, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CalendarDays, Loader2 } from 'lucide-react';
import { useAvailableTimeSlots, type TimeSlot } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';

function slotStartTime(slot: TimeSlot | string): string | null {
  if (typeof slot === 'string') return slot || null;
  return slot?.start_time || null;
}

export function BookingSlotPicker({ serviceId, date, onDateChange, selectedSlot, onSelect }: {
  serviceId: string;
  date: string;
  onDateChange: (date: string) => void;
  selectedSlot: string;
  onSelect: (slot: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedDateObj = date ? parseISO(date) : undefined;
  const { data: timeSlots, isLoading, isError } = useAvailableTimeSlots(serviceId, date);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pick a date
        </Label>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-72 justify-start gap-2 h-11">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              {selectedDateObj ? format(selectedDateObj, 'EEEE, MMMM d, yyyy') : 'Choose a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="p-0 w-auto">
            <Calendar
              mode="single"
              selected={selectedDateObj}
              onSelect={(d) => {
                if (!d) return;
                onDateChange(format(d, 'yyyy-MM-dd'));
                onSelect('');
                setPickerOpen(false);
              }}
              disabled={(d) => isPast(d) && format(d, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {date && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Available times
          </Label>
          {isLoading ? (
            <div className="text-center py-4">
              <Loader2 className="w-4 h-4 animate-spin inline-block text-muted-foreground" />
            </div>
          ) : isError ? (
            <p className="text-sm text-muted-foreground py-2">
              Couldn't load times for that day. Try picking the date again.
            </p>
          ) : !timeSlots || timeSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nothing free on {selectedDateObj ? format(selectedDateObj, 'EEEE, MMM d') : 'that day'}. Try another date.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {timeSlots.map((slot, i) => {
                const time = slotStartTime(slot);
                if (!time) return null;
                const active = selectedSlot === time;
                return (
                  <button
                    key={`${time}-${i}`}
                    type="button"
                    onClick={() => onSelect(time)}
                    className={cn(
                      'rounded-lg px-3 py-2.5 text-sm font-semibold transition border',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border bg-card hover:bg-muted/40',
                    )}
                  >
                    {format(parseISO(`2000-01-01T${time.slice(0, 5)}:00`), 'h:mm a')}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
