import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenantCalendars, useShareEvent } from '@/hooks/useEventSharing';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: 'google_calendar' | 'ios_calendar';
  sourceEventId: string;
  onPublished?: (sharedEventId: string) => void;
}

export function PublishToCalendarPicker({ open, onOpenChange, source, sourceEventId, onPublished }: Props) {
  const { data: calendars, isLoading } = useTenantCalendars();
  const { mutateAsync, isPending } = useShareEvent();
  const [pickingId, setPickingId] = useState<string | null>(null);

  const pick = async (calendarId: string) => {
    setPickingId(calendarId);
    try {
      const res = await mutateAsync({ source, source_event_id: sourceEventId, calendar_id: calendarId });
      onPublished?.(res.shared_event_id);
      onOpenChange(false);
    } finally {
      setPickingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Publish to a shared calendar</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading calendars…
            </div>
          )}
          {!isLoading && (calendars ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground p-2">No calendars in this workspace yet.</p>
          )}
          {(calendars ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c.id)}
              disabled={isPending}
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent transition-colors',
                pickingId === c.id && 'opacity-60',
              )}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: c.color ?? '#a855f7' }}
                aria-hidden
              />
              <span className="flex-1 truncate">{c.name}</span>
              {c.is_default && <span className="text-[10px] text-muted-foreground">default</span>}
              {pickingId === c.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
