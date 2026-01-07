import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, ChevronRight, Route, Building2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';

interface TourEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  venue_name: string | null;
  event_type: string | null;
  description: string | null;
  status: string | null;
}

interface ContractEvent {
  id: string;
  title: string;
  performance_date: string;
  venue_name: string | null;
  venue_city: string | null;
  venue_state: string | null;
  host_name: string | null;
  status: string;
}

interface TimelineEvent {
  id: string;
  title: string;
  date: Date;
  location: string;
  type: 'tour_event' | 'contract';
  status: string;
  venue?: string;
}

interface TourRouteTimelineProps {
  onNavigate: (section: string) => void;
  limit?: number;
}

export const TourRouteTimeline = ({ onNavigate, limit = 10 }: TourRouteTimelineProps) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllEvents = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Fetch tour events
      const { data: tourEvents } = await supabase
        .from('gw_tour_events')
        .select('id, title, start_date, end_date, location, venue_name, event_type, description')
        .gte('start_date', today)
        .order('start_date', { ascending: true });

      // Fetch contracts with performance dates
      const { data: contracts } = await supabase
        .from('contracts_v2')
        .select('id, title, status, contract_metadata')
        .not('contract_metadata->performance_date', 'is', null)
        .gte('contract_metadata->performance_date', today)
        .in('status', ['completed', 'pending', 'sent']);

      // Combine and normalize events
      const timelineEvents: TimelineEvent[] = [];

      // Add tour events
      if (tourEvents) {
        tourEvents.forEach((event: any) => {
          timelineEvents.push({
            id: `tour-${event.id}`,
            title: event.title,
            date: parseISO(event.start_date),
            location: event.location || '',
            venue: event.venue_name || undefined,
            type: 'tour_event',
            status: 'scheduled',
          });
        });
      }

      // Add contract events
      if (contracts) {
        contracts.forEach((contract: any) => {
          const meta = contract.contract_metadata;
          if (meta?.performance_date) {
            const location = [meta.venue_city, meta.venue_state].filter(Boolean).join(', ');
            timelineEvents.push({
              id: `contract-${contract.id}`,
              title: meta.host_name || contract.title,
              date: parseISO(meta.performance_date),
              location: location,
              venue: meta.venue_name || undefined,
              type: 'contract',
              status: contract.status,
            });
          }
        });
      }

      // Sort by date chronologically
      timelineEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Apply limit
      setEvents(timelineEvents.slice(0, limit));
      setLoading(false);
    };

    fetchAllEvents();
  }, [limit]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'confirmed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-amber-500';
      case 'sent':
        return 'bg-blue-500';
      default:
        return 'bg-muted';
    }
  };

  const getStatusBadge = (status: string, type: string) => {
    if (type === 'contract') {
      return status === 'completed' ? 'Signed' : status;
    }
    return status;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            Tour Route
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground text-sm">Loading route...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            Tour Route
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigate('route-planning')}>
            Plan Route
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {events.length === 0 ? (
          <div className="text-center py-6">
            <Route className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No upcoming stops</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => onNavigate('tour-dates')}>
              Add Tour Dates
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border" />
            
            <div className="space-y-3">
              {events.map((event, index) => (
                <div key={event.id} className="relative flex gap-3 pl-1">
                  {/* Timeline dot */}
                  <div className={`relative z-10 w-[10px] h-[10px] rounded-full mt-1.5 flex-shrink-0 ${getStatusColor(event.status)}`} />
                  
                  <div className="flex-1 min-w-0 p-2 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onNavigate(event.type === 'contract' ? 'contracts' : 'tour-dates')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {format(event.date, 'EEE, MMM d, yyyy')}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        {(event.venue || event.location) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {event.venue ? `${event.venue}${event.location ? `, ${event.location}` : ''}` : event.location}
                            </span>
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0 capitalize">
                        {getStatusBadge(event.status, event.type)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {events.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-[10px] flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {events.length} stops in chronological order
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
