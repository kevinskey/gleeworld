import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { calendarId } = await req.json();
    console.log('Syncing Google Calendar:', calendarId);

    if (!calendarId) {
      throw new Error('Calendar ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch events from Google Calendar using API key
    const apiKey = Deno.env.get('GOOGLE_CALENDAR_API_KEY');
    if (!apiKey) {
      throw new Error('Google Calendar API key not configured');
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&maxResults=100&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Calendar API error: ${response.status} - ${errorText}`);
      throw new Error(`Google Calendar API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const events: GoogleCalendarEvent[] = data.items || [];
    console.log(`Found ${events.length} events from Google Calendar`);

    // Get user ID from the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Get or create the user's Google Calendar
    let { data: calendar, error: calendarError } = await supabase
      .from('gw_calendars')
      .select('id')
      .eq('name', 'My Google Calendar')
      .eq('created_by', user.id)
      .single();

    if (calendarError || !calendar) {
      // Create a new calendar for Google events
      const { data: newCalendar, error: createError } = await supabase
        .from('gw_calendars')
        .insert({
          name: 'My Google Calendar',
          description: 'Imported from Google Calendar',
          color: '#4285f4',
          is_visible: true,
          created_by: user.id
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }
      calendar = newCalendar;
    }

    const calendarDbId = calendar.id;
    let importedCount = 0;
    let updatedCount = 0;

    // Process each Google Calendar event
    for (const event of events) {
      if (!event.summary) continue; // Skip events without titles

      // Parse start and end dates
      const startDate = event.start.dateTime || event.start.date;
      const endDate = event.end.dateTime || event.end.date;
      
      if (!startDate) continue;

      // Check if event already exists (by Google Calendar ID)
      const { data: existingEvent } = await supabase
        .from('gw_events')
        .select('id')
        .eq('external_id', event.id)
        .eq('calendar_id', calendarDbId)
        .single();

      const eventData = {
        title: event.summary,
        description: event.description || null,
        event_type: 'other',
        start_date: startDate,
        end_date: endDate,
        location: event.location || null,
        venue_name: event.location || null,
        is_public: false,
        registration_required: false,
        status: 'scheduled',
        calendar_id: calendarDbId,
        external_id: event.id,
        external_source: 'google_calendar',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingEvent) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('gw_events')
          .update(eventData)
          .eq('id', existingEvent.id);

        if (!updateError) {
          updatedCount++;
        }
      } else {
        // Insert new event
        const { error: insertError } = await supabase
          .from('gw_events')
          .insert(eventData);

        if (!insertError) {
          importedCount++;
        }
      }
    }

    console.log(`Import complete: ${importedCount} new events, ${updatedCount} updated events`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: importedCount, 
        updated: updatedCount,
        total: events.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error syncing Google Calendar:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});