import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  // Add source to differentiate between events and appointments
  source?: 'event' | 'appointment';
  // Calendar information from join
  gw_calendars?: {
    name: string;
    color: string;
    is_visible: boolean;
  };
}

export const useGleeWorldEvents = () => {
  const [events, setEvents] = useState<GleeWorldEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Fetch events from gw_events table with calendar information
      // Show all events for calendar display
      let eventsQuery = supabase
        .from('gw_events')
        .select(`
          *,
          gw_calendars (
            name,
            color,
            is_visible
          )
        `)
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

      // Transform appointments to match the interface (assign to default calendar)
      const { data: defaultCalendar } = await supabase
        .from('gw_calendars')
        .select('id')
        .eq('is_default', true)
        .single();

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
        calendar_id: defaultCalendar?.id || '',
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

  const setupRealtime = async () => {
    // Prevent multiple subscriptions
    if (isSubscribedRef.current) {
      return;
    }

    // Clean up existing channel completely
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create a new channel with unique identifier
    const channelId = `events-changes-${Date.now()}-${Math.random()}`;
    const channel = supabase.channel(channelId);

    // Add event listeners
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gw_events'
        },
        (payload) => {
          console.log('Real-time event change:', payload);
          fetchEvents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          console.log('Real-time events table change:', payload);
          fetchEvents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gw_appointments'
        },
        (payload) => {
          console.log('Real-time appointment change:', payload);
          fetchEvents();
        }
      );

    // Subscribe and track state
    try {
      await channel.subscribe();
      channelRef.current = channel;
      isSubscribedRef.current = true;
    } catch (error) {
      console.error('Failed to subscribe to realtime channel:', error);
      isSubscribedRef.current = false;
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
    setupRealtime();

    // Cleanup function
    return () => {
      isSubscribedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]); // Only depend on user.id to reduce re-runs

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