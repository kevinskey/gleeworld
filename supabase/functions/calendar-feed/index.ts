import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
};

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  venue_name: string | null;
  address: string | null;
  event_type: string | null;
  is_public: boolean | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const feedType = url.searchParams.get('type') || 'public'; // public, private, performance, rehearsal, meeting
    const token = url.searchParams.get('token'); // For private feeds
    const eventType = url.searchParams.get('event_type'); // Filter by event type
    const range = url.searchParams.get('range') || 'future'; // future, past, all

    let query = supabase
      .from('gw_events')
      .select('*')
      .order('start_date', { ascending: true });

    // Apply date range filter
    const now = new Date();
    switch (range) {
      case 'future':
        query = query.gte('start_date', now.toISOString());
        break;
      case 'past':
        query = query.lt('start_date', now.toISOString())
                   .gte('start_date', new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Last 90 days
        break;
      case 'all':
        query = query.gte('start_date', new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString());
        break;
    }

    // Handle feed type and authentication
    if (feedType === 'private' && token) {
      // Verify token for private feeds
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('calendar_feed_token', token)
        .single();
      
      if (!profile) {
        return new Response('Invalid feed token', {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
      }
      // Private feeds show all events
    } else {
      // Public feeds only show public events
      query = query.eq('is_public', true);
    }

    // Filter by event type if specified
    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response('Error loading calendar feed', {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Generate iCalendar content
    const icalContent = generateICalendarFeed(events || [], feedType, eventType);

    return new Response(icalContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${getFeedFilename(feedType, eventType)}"`,
      }
    });

  } catch (error) {
    console.error('Error in calendar-feed function:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    });
  }
};

function generateICalendarFeed(events: CalendarEvent[], feedType: string, eventType?: string | null): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const calendarName = getCalendarName(feedType, eventType);
  const calendarDescription = getCalendarDescription(feedType, eventType);

  let icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spelman College Glee Club//Calendar Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    `X-WR-CALDESC:${calendarDescription}`,
    'X-WR-TIMEZONE:America/New_York',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H', // Refresh every hour
    'X-PUBLISHED-TTL:PT1H' // Cache for 1 hour
  ];

  events.forEach(event => {
    const startDate = new Date(event.start_date);
    const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const dtStart = formatDateForICal(startDate);
    const dtEnd = formatDateForICal(endDate);
    const dtStamp = timestamp;
    const uid = `${event.id}@spelman-glee.app`;

    // Build location string
    let locationStr = '';
    if (event.venue_name) {
      locationStr = event.venue_name;
      if (event.address) {
        locationStr += `, ${event.address}`;
      } else if (event.location) {
        locationStr += `, ${event.location}`;
      }
    } else if (event.location) {
      locationStr = event.location;
    }

    // Build description
    let description = event.description || '';
    if (event.event_type) {
      description = `Event Type: ${event.event_type}\n\n${description}`;
    }

    icalContent.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICalText(event.title)}`,
      ...(description ? [`DESCRIPTION:${escapeICalText(description)}`] : []),
      ...(locationStr ? [`LOCATION:${escapeICalText(locationStr)}`] : []),
      ...(event.event_type ? [`CATEGORIES:${escapeICalText(event.event_type)}`] : []),
      `STATUS:CONFIRMED`,
      `TRANSP:OPAQUE`,
      'END:VEVENT'
    );
  });

  icalContent.push('END:VCALENDAR');
  
  return icalContent.join('\r\n');
}

function formatDateForICal(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function getCalendarName(feedType: string, eventType?: string | null): string {
  const baseNames: Record<string, string> = {
    public: 'Spelman Glee Club - Public Events',
    private: 'Spelman Glee Club - All Events',
    performance: 'Spelman Glee Club - Performances',
    rehearsal: 'Spelman Glee Club - Rehearsals',
    meeting: 'Spelman Glee Club - Meetings'
  };

  if (eventType && baseNames[eventType]) {
    return baseNames[eventType];
  }

  return baseNames[feedType] || 'Spelman Glee Club Events';
}

function getCalendarDescription(feedType: string, eventType?: string | null): string {
  const descriptions: Record<string, string> = {
    public: 'Live calendar feed for public Spelman College Glee Club events',
    private: 'Live calendar feed for all Spelman College Glee Club events (requires authentication)',
    performance: 'Live calendar feed for Spelman College Glee Club performances only',
    rehearsal: 'Live calendar feed for Spelman College Glee Club rehearsals only',
    meeting: 'Live calendar feed for Spelman College Glee Club meetings only'
  };

  if (eventType && descriptions[eventType]) {
    return descriptions[eventType];
  }

  return descriptions[feedType] || 'Live calendar feed for Spelman College Glee Club events';
}

function getFeedFilename(feedType: string, eventType?: string | null): string {
  const name = eventType || feedType;
  return `spelman-glee-${name}-calendar.ics`;
}

serve(handler);
