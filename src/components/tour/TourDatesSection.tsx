import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Music, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TourEvent {
  id: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
}

type EventType = 'performance' | 'rehearsal' | 'travel' | 'free';

const getEventType = (title: string, description: string | null): EventType => {
  const text = `${title} ${description || ''}`.toLowerCase();
  if (text.includes('travel') || text.includes('departure') || text.includes('arrival') || text.includes('bus') || text.includes('flight')) {
    return 'travel';
  }
  if (text.includes('rehearsal') || text.includes('practice') || text.includes('soundcheck') || text.includes('outreach')) {
    return 'rehearsal';
  }
  if (text.includes('free') || text.includes('off') || text.includes('sightseeing') || text.includes('rest')) {
    return 'free';
  }
  return 'performance';
};

const getTypeColor = (type: EventType) => {
  switch (type) {
    case 'performance': return 'bg-primary text-primary-foreground';
    case 'rehearsal': return 'bg-amber-500 text-white';
    case 'travel': return 'bg-blue-500 text-white';
    case 'free': return 'bg-emerald-500 text-white';
    default: return 'bg-muted';
  }
};

const getTypeLabel = (type: EventType) => {
  switch (type) {
    case 'performance': return 'Performance';
    case 'rehearsal': return 'Rehearsal';
    case 'travel': return 'Travel';
    case 'free': return 'Free Day';
    default: return type;
  }
};

export const TourDatesSection = () => {
  const [tourEvents, setTourEvents] = useState<TourEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTourEvents();
  }, []);

  const fetchTourEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_tour_events')
        .select('id, title, location, start_date, end_date, description')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTourEvents(data || []);
    } catch (error) {
      console.error('Error fetching tour events:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="outline" className="gap-1">
          <div className="w-2 h-2 rounded-full bg-primary" />
          Performance
        </Badge>
        <Badge variant="outline" className="gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          Rehearsal
        </Badge>
        <Badge variant="outline" className="gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          Travel
        </Badge>
        <Badge variant="outline" className="gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Free Day
        </Badge>
      </div>

      <div className="space-y-4">
        {tourEvents.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No tour dates scheduled yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Tour managers can add dates through the Tour Manager module.</p>
          </Card>
        ) : (
          tourEvents.map((event) => {
            const eventType = getEventType(event.title, event.description);
            const startDate = new Date(event.start_date);
            
            return (
              <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex">
                  <div className={`w-2 ${getTypeColor(eventType)}`} />
                  <div className="flex-1 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getTypeColor(eventType)}>
                            {getTypeLabel(eventType)}
                          </Badge>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {startDate.toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {startDate.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        )}
                      </div>
                      {eventType === 'performance' && (
                        <div className="flex items-center gap-2">
                          <Music className="h-5 w-5 text-primary" />
                          <span className="text-sm font-medium text-primary">Concert</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
