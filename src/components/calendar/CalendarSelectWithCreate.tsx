// Shared calendar <Select> used by CreateEventDialog and EditEventDialog.
// Adds a persistent "＋ New calendar…" item at the bottom of the list. When
// chosen, an inline name input + Create/Cancel row appears instead of
// changing the caller's selected calendar. Creating a calendar inserts into
// gw_calendars following the same shape as
// command-center/CalendarSettingsDialog.tsx's createCalendar() — tenant_id
// is left unset (DB default/trigger fills it in).
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CalendarOption {
  id: string;
  name: string;
  color: string;
  isCourse?: boolean;
}

const DEFAULT_CALENDAR_COLOR = '#6366f1';
const CREATE_SENTINEL = '__create__';

interface CalendarSelectWithCreateProps {
  /** Regular (non-course) calendars. */
  calendars: CalendarOption[];
  /** Optional second group, rendered under a "Classes" heading (CreateEventDialog only). */
  courses?: CalendarOption[];
  /** Currently selected calendar id — never CREATE_SENTINEL. */
  value: string;
  /** Fired only when a real calendar is chosen (never fired for "__create__"). */
  onValueChange: (id: string, calendar: CalendarOption | undefined) => void;
  /** Fired after a new calendar is successfully inserted; caller should refetch + select it. */
  onCalendarCreated: (calendar: CalendarOption) => void;
  placeholder?: string;
  triggerClassName?: string;
}

export function CalendarSelectWithCreate({
  calendars,
  courses = [],
  value,
  onValueChange,
  onCalendarCreated,
  placeholder = "Calendar",
  triggerClassName = "w-48 h-10",
}: CalendarSelectWithCreateProps) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const allCalendars = [...calendars, ...courses];

  function handleSelectChange(id: string) {
    if (id === CREATE_SENTINEL) {
      // Reveal the inline create row; do NOT update the caller's selection —
      // the Select stays controlled by `value`, which we leave untouched.
      setCreating(true);
      return;
    }
    // Picking a real calendar closes the inline create row if it was open.
    if (creating) cancelCreate();
    const selected = allCalendars.find((c) => c.id === id);
    onValueChange(id, selected);
  }

  function cancelCreate() {
    setCreating(false);
    setNewName('');
  }

  async function createCalendar() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('gw_calendars')
        .insert({
          name: trimmed,
          color: DEFAULT_CALENDAR_COLOR,
          is_visible: true,
          is_default: false,
        })
        .select('id, name, color')
        .single();
      if (error) throw error;

      toast({ title: 'Calendar created' });
      onCalendarCreated({ id: data.id, name: data.name, color: data.color });
      setCreating(false);
      setNewName('');
    } catch (e: any) {
      toast({
        title: 'Could not create calendar',
        description: e?.message || String(e),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={handleSelectChange}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg z-50 max-h-[300px]">
          {calendars.length > 0 && (
            <>
              {courses.length > 0 && (
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Calendars</div>
              )}
              {calendars.map((calendar) => (
                <SelectItem key={calendar.id} value={calendar.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: calendar.color }} />
                    <span className="truncate max-w-[160px]">{calendar.name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
          {courses.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1 border-t pt-2">Classes</div>
              {courses.map((calendar) => (
                <SelectItem key={calendar.id} value={calendar.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: calendar.color }} />
                    <span className="truncate max-w-[160px]">{calendar.name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
          <div className="border-t mt-1 pt-1">
            <SelectItem value={CREATE_SENTINEL}>
              <span className="text-primary font-medium">＋ New calendar…</span>
            </SelectItem>
          </div>
        </SelectContent>
      </Select>

      {creating && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Calendar name"
            className="h-9 text-sm flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                createCalendar();
              } else if (e.key === 'Escape') {
                cancelCreate();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-9 px-2 gap-1"
            onClick={createCalendar}
            disabled={busy || !newName.trim()}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 px-2"
            onClick={cancelCreate}
            disabled={busy}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
