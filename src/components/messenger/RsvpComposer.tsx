// Modal to attach an RSVP for an upcoming event. Picks from gw_events
// (next 30 days), inserts a message_type='system' message pointing at the event.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { X, Calendar, Loader2 } from 'lucide-react';

export function RsvpComposer({ groupId, userId, onClose }: { groupId: string; userId: string; onClose: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['rsvp-composer-events'],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 60);
      const { data, error } = await supabase
        .from('gw_events')
        .select('id, title, start_date, venue_name, location')
        .gte('start_date', new Date().toISOString())
        .lte('start_date', cutoff.toISOString())
        .order('start_date', { ascending: true })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function attach(eventId: string, title: string) {
    setBusy(true);
    try {
      const { error } = await supabase.from('gw_group_messages').insert({
        group_id: groupId, user_id: userId,
        content: `RSVP: ${title}|${eventId}`,
        message_type: 'system',
      });
      if (error) throw error;
      onClose();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-md my-4 bg-white text-gray-900">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white text-gray-900 z-10 border-b rounded-t-xl">
          <CardTitle className="text-gray-900">Attach event RSVP</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="text-gray-900 hover:bg-gray-100"><X className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground">No upcoming events in the next 60 days. Add one in the calendar first.</p>
          )}
          {events.map((e: any) => (
            <button
              key={e.id}
              onClick={() => attach(e.id, e.title)}
              disabled={busy}
              className="w-full text-left border rounded p-3 hover:bg-muted"
            >
              <div className="flex items-center gap-2 text-xs text-primary"><Calendar className="w-3 h-3" />
                {new Date(e.start_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
              <div className="font-semibold text-sm">{e.title}</div>
              {(e.venue_name || e.location) && (
                <div className="text-xs text-muted-foreground">{e.venue_name || e.location}</div>
              )}
            </button>
          ))}
          {busy && (
            <div className="flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
