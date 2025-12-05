
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const exportType = url.searchParams.get('type') || 'all'; // all, month, public
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');
    const eventId = url.searchParams.get('eventId');

    let query = supabase
      .from('gw_events')
      .select('*');

    // Apply filters based on export type
    if (exportType === 'public') {
      query = query.eq('is_public', true);
    }

    if (exportType === 'month' && month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${(parseInt(month) + 1).toString().padStart(2, '0')}-01`;
      query = query.gte('start_date', startDate).lt('start_date', endDate);
    }

    if (eventId) {
      query = query.eq('id', eventId);
    }

    // Only show future events unless specifically requesting all
    if (exportType !== 'all') {
      query = query.gte('start_date', new Date().toISOString());
    }

    query = query.order('start_date', { ascending: true });

    const { data: events, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate iCalendar content
    const icalContent = generateICalendar(events || []);

    return new Response(icalContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="spelman-glee-calendar-${exportType}.ics"`
      }
    });

  } catch (error) {
    console.error('Error in export-calendar function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

function generateICalendar(events: CalendarEvent[]): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spelman College Glee Club//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Spelman College Glee Club',
    'X-WR-CALDESC:Official events calendar for the Spelman College Glee Club'
  ];

  events.forEach(event => {
    const startDate = new Date(event.start_date);
    const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration
    
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
