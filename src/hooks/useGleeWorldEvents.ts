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
  image_url?: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Add source to differentiate between events and appointments
  source?: 'event' | 'appointment';
}

export const useGleeWorldEvents = () => {
  const [events, setEvents] = useState<GleeWorldEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Fetch events from gw_events table
      let eventsQuery = supabase
        .from('gw_events')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      // If user is not authenticated, only show public events
      if (!user) {
        eventsQuery = eventsQuery.eq('is_public', true);
      }

      // Fetch appointments from gw_appointments table
      const appointmentsQuery = supabase
        .from('gw_appointments')
        .select('*')
        .gte('appointment_date', new Date().toISOString())
        .neq('status', 'cancelled')
        .order('appointment_date', { ascending: true });

      const [eventsResult, appointmentsResult] = await Promise.all([
        eventsQuery,
        appointmentsQuery
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      // Transform events to match the interface
      const transformedEvents: GleeWorldEvent[] = (eventsResult.data || []).map(event => ({
        ...event,
        source: 'event' as const
      }));

      // Transform appointments to match the interface
      const transformedAppointments: GleeWorldEvent[] = (appointmentsResult.data || []).map(appointment => ({
        id: appointment.id,
        title: appointment.title,
        description: appointment.description,
        event_type: appointment.appointment_type,
        start_date: appointment.appointment_date,
        end_date: new Date(new Date(appointment.appointment_date).getTime() + appointment.duration_minutes * 60000).toISOString(),
        location: null,
        venue_name: null,
        address: null,
        max_attendees: null,
        registration_required: null,
        is_public: false,
        status: appointment.status,
        image_url: null,
        created_by: appointment.created_by,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at,
        source: 'appointment' as const
      }));

      // Combine and sort by start_date
      const allEvents = [...transformedEvents, ...transformedAppointments]
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events and appointments",
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

  // Make fetchEvents available for manual refresh after updates
  const refreshEvents = () => {
    fetchEvents();
  };

  return {
    events,
    loading,
    fetchEvents: refreshEvents,
    getEventsByDateRange,
    getUpcomingEvents,
    getEventsByMonth
  };
};