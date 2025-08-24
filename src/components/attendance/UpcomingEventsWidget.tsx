import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface UpcomingEvent {
  id: string;
  title: string;
  event_type: string;
  start_date: string;
  start_time?: string;
  location?: string;
  description?: string;
}

interface UpcomingEventsWidgetProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
}

export const UpcomingEventsWidget = ({ 
  limit = 5, 
  showHeader = true, 
  compact = false 
}: UpcomingEventsWidgetProps) => {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUpcomingEvents();
  }, [limit]);

  const loadUpcomingEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date().toISOString();
      
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', now)
        .order('start_date', { ascending: true })
        .limit(limit);

      if (fetchError) {
        throw fetchError;
      }

      setEvents(data || []);
    } catch (err) {
      console.error('Error loading upcoming events:', err);
      setError('Failed to load upcoming events');
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'rehearsal':
        return 'bg-blue-500';
      case 'sectional':
        return 'bg-green-500';
      case 'concert':
      case 'performance':
        return 'bg-purple-500';
      case 'meeting':
        return 'bg-orange-500';
      case 'audition':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'rehearsal':
      case 'sectional':
        return <Music className="w-3 h-3" />;
      case 'concert':
      case 'performance':
        return <Music className="w-3 h-3" />;
      case 'meeting':
        return <Calendar className="w-3 h-3" />;
      default:
        return <Calendar className="w-3 h-3" />;
    }
  };

  const formatEventDate = (dateString: string, timeString?: string) => {
    const date = parseISO(dateString);
    
    if (isToday(date)) {
      return timeString ? `Today ${timeString}` : 'Today';
    } else if (isTomorrow(date)) {
      return timeString ? `Tomorrow ${timeString}` : 'Tomorrow';
    } else if (isThisWeek(date)) {
      return timeString 
        ? `${format(date, 'EEEE')} ${timeString}`
        : format(date, 'EEEE');
    } else {
      return timeString 
        ? `${format(date, 'MMM d')} ${timeString}`
        : format(date, 'MMM d');
    }
  };

  if (loading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Events</CardTitle>
          </CardHeader>
        )}
        <CardContent className="flex items-center justify-center py-6">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Events</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No upcoming events scheduled</p>
          </div>
        ) : (
          <div className={`space-y-${compact ? '2' : '3'}`}>
            {events.map((event) => (
              <div key={event.id} className={`flex items-center gap-3 ${compact ? 'py-1' : 'p-3 border rounded-lg hover:bg-muted/50 transition-colors'}`}>
                <div className={`w-2 h-2 rounded-full ${getEventTypeColor(event.event_type)}`}></div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>
                      {event.title}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {event.event_type}
                    </Badge>
                  </div>
                  
                  <div className={`flex items-center gap-3 text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatEventDate(event.start_date, event.start_time)}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {getEventTypeIcon(event.event_type)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};