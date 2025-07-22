
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const feedType = url.searchParams.get('type') || 'public'; // public, all
    const token = url.searchParams.get('token'); // For private feeds

    let query = supabase
      .from('gw_events')
      .select('*')
      .gte('start_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Include events from last 30 days
      .order('start_date', { ascending: true });

    // For public feeds, only show public events
    if (feedType === 'public' || !token) {
      query = query.eq('is_public', true);
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
    const icalContent = generateICalendarFeed(events || [], feedType);

    return new Response(icalContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
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

function generateICalendarFeed(events: CalendarEvent[], feedType: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spelman College Glee Club//Calendar Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Spelman Glee Club ${feedType === 'public' ? 'Public Events' : 'All Events'}`,
    'X-WR-CALDESC:Live calendar feed for Spelman College Glee Club events',
    'X-WR-TIMEZONE:America/New_York',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H' // Refresh every hour
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

serve(handler);
