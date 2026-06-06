// Inline RSVP display. Shows event info from gw_events + Yes/No/Maybe buttons
// that write to gw_chat_rsvps. Reads my own response + group counts.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Check, X, HelpCircle } from 'lucide-react';

interface RsvpCardProps {
  messageId: string;
  eventId: string;
}

export function RsvpCard({ messageId, eventId }: RsvpCardProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: event } = useQuery({
    queryKey: ['rsvp-event', eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_events')
        .select('id, title, start_date, location, venue_name')
        .eq('id', eventId)
        .maybeSingle();
      return data;
    },
  });

  const { data: rsvps = [] } = useQuery({
    queryKey: ['rsvp-responses', messageId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_chat_rsvps')
        .select('user_id, response')
        .eq('message_id', messageId);
      return data ?? [];
    },
  });

  if (!event) return null;

  const myResponse = rsvps.find((r: any) => r.user_id === user?.id)?.response;
  const counts = {
    yes: rsvps.filter((r: any) => r.response === 'yes').length,
    no: rsvps.filter((r: any) => r.response === 'no').length,
    maybe: rsvps.filter((r: any) => r.response === 'maybe').length,
  };

  async function respond(response: 'yes' | 'no' | 'maybe') {
    if (!user) return;
    if (myResponse === response) {
      await supabase.from('gw_chat_rsvps').delete()
        .eq('message_id', messageId).eq('user_id', user.id);
    } else {
      await supabase.from('gw_chat_rsvps').upsert({
        message_id: messageId, event_id: eventId, user_id: user.id, response,
      }, { onConflict: 'message_id,user_id' });
    }
    qc.invalidateQueries({ queryKey: ['rsvp-responses', messageId] });
  }

  return (
    <Card className="w-80 max-w-full">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-primary font-semibold">
          <Calendar className="w-3 h-3" /> Event RSVP
        </div>
        <div className="font-semibold text-sm">{event.title}</div>
        <div className="text-xs text-muted-foreground">
          {new Date(event.start_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
        {(event.location || event.venue_name) && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {event.venue_name || event.location}
          </div>
        )}
        <div className="grid grid-cols-3 gap-1 pt-1">
          <Button
            variant={myResponse === 'yes' ? 'default' : 'outline'}
            size="sm" onClick={() => respond('yes')}
          ><Check className="w-3 h-3 mr-1" /> Yes ({counts.yes})</Button>
          <Button
            variant={myResponse === 'maybe' ? 'default' : 'outline'}
            size="sm" onClick={() => respond('maybe')}
          ><HelpCircle className="w-3 h-3 mr-1" /> Maybe ({counts.maybe})</Button>
          <Button
            variant={myResponse === 'no' ? 'default' : 'outline'}
            size="sm" onClick={() => respond('no')}
          ><X className="w-3 h-3 mr-1" /> No ({counts.no})</Button>
        </div>
      </CardContent>
    </Card>
  );
}
