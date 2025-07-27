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
  is_private: boolean | null;
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
      setLoading(true);
      
      // Filter to only show public events (is_public = true AND is_private = false/null)
      const { data, error } = await supabase
        .from('gw_events')
        .select('*')
        .eq('is_public', true)
        .or('is_private.is.null,is_private.eq.false')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching public events:', error);
      toast({
        title: "Error",
        description: "Failed to load public events",
        variant: "destructive"
      });
    } finally {
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