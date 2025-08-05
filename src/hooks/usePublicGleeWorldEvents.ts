import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface GleeWorldEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  venue_name: string | null;
  address: string | null;
  max_attendees: number | null;
  registration_required: boolean | null;
  is_public: boolean | null;
  status: string | null;
  image_url?: string | null;
  calendar_id: string;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Calendar information from join
  gw_calendars?: {
    name: string;
    color: string;
    is_visible: boolean;
  };
}

export const usePublicGleeWorldEvents = () => {
  const [events, setEvents] = useState<GleeWorldEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEvents = async () => {
    try {
      console.log('usePublicGleeWorldEvents: Starting fetch...');
      setLoading(true);
      
      // Temporarily remove date filter to debug - get all public events
      const { data, error } = await supabase
        .from('gw_events')
        .select(`
          *,
          gw_calendars (
            name,
            color,
            is_visible
          )
        `)
        .eq('is_public', true)
        .order('start_date', { ascending: true });

      console.log('usePublicGleeWorldEvents: Query result', { 
        data: data?.length || 0, 
        error, 
        firstEvent: data?.[0]?.title,
        allEvents: data?.map(e => ({ title: e.title, date: e.start_date }))
      });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Setting events to:', data?.length || 0, 'events');
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching public events:', error);
      toast({
        title: "Error",
        description: "Failed to load public events",
        variant: "destructive"
      });
    } finally {
      console.log('usePublicGleeWorldEvents: Fetch complete, setting loading to false');
      setLoading(false);
    }
  };

  const getEventsByDateRange = (startDate: Date, endDate: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate >= startDate && eventDate <= endDate;
    });
  };

  const getUpcomingEvents = (limit: number = 6) => {
    return events.slice(0, limit);
  };

  const getEventsByMonth = (year: number, month: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    });
  };

  useEffect(() => {
    fetchEvents();
  }, []); // No dependency on user since we always show only public events

  return {
    events,
    loading,
    fetchEvents,
    getEventsByDateRange,
    getUpcomingEvents,
    getEventsByMonth
  };
};