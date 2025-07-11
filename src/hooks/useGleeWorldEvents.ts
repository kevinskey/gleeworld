import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const useGleeWorldEvents = () => {
  const [events, setEvents] = useState<GleeWorldEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('gw_events')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      // If user is not authenticated, only show public events
      if (!user) {
        query = query.eq('is_public', true);
      }
      // If user is authenticated, show all events (no additional filter needed)

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
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
  }, [user]); // Re-fetch events when user authentication status changes

  return {
    events,
    loading,
    fetchEvents,
    getEventsByDateRange,
    getUpcomingEvents,
    getEventsByMonth
  };
};