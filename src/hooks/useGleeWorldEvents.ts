import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface GleeWorldEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  category?: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  venue_name: string | null;
  address: string | null;
  max_attendees: number | null;
  registration_required: boolean | null;
  is_public: boolean | null;
  status: string | null;
  is_appointment?: boolean;
  image_url?: string | null;
  calendar_id: string;
  course_id?: string | null; // For class events
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  attendance_required?: boolean | null;
  attendance_deadline?: string | null;
  late_arrival_allowed?: boolean | null;
  excuse_required?: boolean | null;
  // Recurring event fields
  is_recurring?: boolean | null;
  parent_event_id?: string | null;
  recurrence_type?: string | null;
  // Add source to differentiate between events, appointments, and academic items
  source?: 'event' | 'appointment' | 'assignment' | 'test';
  // Due date for assignments
  due_date?: string | null;
  // Calendar information from join
  gw_calendars?: {
    name: string;
    color: string;
    is_visible: boolean;
  };
  // Course information from join (for class events)
  gw_courses?: {
    title: string;
    course_code: string;
  };
}

const EVENTS_QUERY_KEY = 'glee-world-events';

// One fetch for the whole app. Any component using the hook reads this
// shared cache; react-query dedupes concurrent requests, so 28 consumers
// cost one network round-trip instead of 28.
async function fetchAllEvents(isAuthed: boolean): Promise<GleeWorldEvent[]> {
  // Fetch events from gw_events table with calendar information
  // Window to the last 18 months to keep payloads bounded
  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - 18);
  let eventsQuery = supabase
    .from('gw_events')
    .select(`
      *,
      gw_calendars (
        name,
        color,
        is_visible
      ),
      gw_courses (
        title,
        course_code
      )
    `)
    .gte('start_date', windowStart.toISOString())
    .order('start_date', { ascending: true });

  // If user is not authenticated, only show public events
  if (!isAuthed) {
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
    appointmentsQuery,
  ]);

  if (eventsResult.error) throw eventsResult.error;
  if (appointmentsResult.error) throw appointmentsResult.error;

  // Transform events to match the interface
  // For course events without calendar info, provide a default purple color
  const transformedEvents: GleeWorldEvent[] = (eventsResult.data || []).map(event => {
    // If this is a course event without calendar info, add synthetic calendar styling
    if (event.course_id && !event.gw_calendars) {
      return {
        ...event,
        source: 'event' as const,
        gw_calendars: {
          name: event.gw_courses?.course_code || 'Class',
          color: '#8b5cf6', // Purple for courses
          is_visible: true
        }
      };
    }
    return {
      ...event,
      source: 'event' as const
    };
  });

  // Transform appointments to match the interface (assign to a default calendar when possible)
  const { data: defaultCalendar, error: defaultCalendarError } = await supabase
    .from('gw_calendars')
    .select('id')
    .eq('is_default', true)
    .maybeSingle();

  if (defaultCalendarError) throw defaultCalendarError;

  // Fallback if no default calendar exists
  const { data: fallbackCalendar, error: fallbackCalendarError } = defaultCalendar?.id
    ? { data: null, error: null }
    : await supabase
        .from('gw_calendars')
        .select('id')
        .eq('is_visible', true)
        .order('name', { ascending: true })
        .limit(1)
        .maybeSingle();

  if (fallbackCalendarError) throw fallbackCalendarError;

  const appointmentCalendarId = defaultCalendar?.id ?? fallbackCalendar?.id ?? '';

  const transformedAppointments: GleeWorldEvent[] = (appointmentsResult.data || []).map((appointment) => ({
    id: appointment.id,
    title: appointment.title,
    description: appointment.description,
    event_type: appointment.appointment_type,
    start_date: appointment.appointment_date,
    is_appointment: true, // Flag to identify appointments
    end_date: new Date(
      new Date(appointment.appointment_date).getTime() + appointment.duration_minutes * 60000
    ).toISOString(),
    location: null,
    venue_name: null,
    address: null,
    max_attendees: null,
    registration_required: null,
    is_public: false,
    status: appointment.status,
    image_url: null,
    calendar_id: appointmentCalendarId,
    created_by: appointment.created_by,
    created_at: appointment.created_at,
    updated_at: appointment.updated_at,
    source: 'appointment' as const,
  }));

  // Combine and sort by start_date
  return [...transformedEvents, ...transformedAppointments]
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
}

// ─── App-wide realtime singleton ────────────────────────────────────────
// The old hook opened one websocket channel (5 table subscriptions) PER
// mounted component, and every DB change made every instance refetch.
// One module-level channel now serves every consumer; changes invalidate
// the shared query once (debounced), and react-query refetches once.
let rtChannel: RealtimeChannel | null = null;
let rtRefCount = 0;
let rtDebounce: ReturnType<typeof setTimeout> | null = null;
let rtInvalidate: (() => void) | null = null;

const REALTIME_TABLES = ['gw_events', 'events', 'gw_appointments', 'gw_calendars', 'gw_course_calendar'];

function acquireRealtime(invalidate: () => void) {
  rtInvalidate = invalidate;
  rtRefCount++;
  if (rtChannel) return;

  const onChange = () => {
    if (rtDebounce) clearTimeout(rtDebounce);
    rtDebounce = setTimeout(() => rtInvalidate?.(), 500);
  };

  const channel = supabase.channel('gw-events-shared');
  for (const table of REALTIME_TABLES) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange);
  }
  rtChannel = channel;
  channel.subscribe();
}

function releaseRealtime() {
  rtRefCount = Math.max(0, rtRefCount - 1);
  if (rtRefCount > 0) return;
  if (rtDebounce) { clearTimeout(rtDebounce); rtDebounce = null; }
  if (rtChannel) {
    try { supabase.removeChannel(rtChannel); } catch { /* already gone */ }
    rtChannel = null;
  }
}

export const useGleeWorldEvents = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Keyed by user id so logout/login never shows another user's cache.
  const queryKey = [EVENTS_QUERY_KEY, user?.id ?? 'anon'];

  const { data, isPending, isError } = useQuery({
    queryKey,
    queryFn: () => fetchAllEvents(!!user),
    staleTime: 2 * 60 * 1000,   // instant paint from cache; background refresh after 2 min
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false, // realtime invalidation covers changes
  });

  const events = data ?? [];

  useEffect(() => {
    if (isError) {
      console.error('Error fetching events');
      toast({
        title: "Error",
        description: "Failed to load events and appointments",
        variant: "destructive"
      });
    }
  }, [isError, toast]);

  // Shared realtime channel (see singleton above).
  useEffect(() => {
    acquireRealtime(() => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    });
    return () => releaseRealtime();
  }, [queryClient]);

  // Update already-loaded events when a calendar color changes
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ calendarId: string; color: string }>).detail;
      if (!detail?.calendarId || !detail?.color) return;

      queryClient.setQueriesData<GleeWorldEvent[]>(
        { queryKey: [EVENTS_QUERY_KEY] },
        (prev) =>
          prev?.map((ev) => {
            if (ev.calendar_id !== detail.calendarId) return ev;
            if (!ev.gw_calendars) return ev;
            return {
              ...ev,
              gw_calendars: {
                ...ev.gw_calendars,
                color: detail.color,
              },
            };
          }),
      );
    };

    window.addEventListener('gw:calendar-color-updated', handler);
    return () => window.removeEventListener('gw:calendar-color-updated', handler);
  }, [queryClient]);

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

  // Make fetchEvents available for manual refresh after updates
  const refreshEvents = () => {
    queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
  };

  return {
    events,
    loading: isPending,
    fetchEvents: refreshEvents,
    getEventsByDateRange,
    getUpcomingEvents,
    getEventsByMonth
  };
};
