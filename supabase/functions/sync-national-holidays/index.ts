import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NationalHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties?: string[];
  types: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { year } = await req.json();
    const targetYear = year || new Date().getFullYear();

    console.log(`Syncing national holidays for year: ${targetYear}`);

    // Fetch US national holidays from Nager.Date API
    const holidayResponse = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${targetYear}/US`);
    
    if (!holidayResponse.ok) {
      throw new Error(`Failed to fetch holidays: ${holidayResponse.status}`);
    }

    const holidays: NationalHoliday[] = await holidayResponse.json();
    console.log(`Found ${holidays.length} holidays from Nager.Date API`);

    // Get or create the Holidays calendar
    let { data: holidaysCalendar, error: calendarError } = await supabaseClient
      .from('gw_calendars')
      .select('*')
      .eq('name', 'Holidays')
      .single();

    if (calendarError && calendarError.code === 'PGRST116') {
      // Calendar doesn't exist, create it
      const { data: newCalendar, error: createError } = await supabaseClient
        .from('gw_calendars')
        .insert({
          name: 'Holidays',
          description: 'National holidays and observances',
          color: '#dc2626', // red-600
          is_visible: true,
          is_default: false,
          external_source: 'national_holidays',
          created_by: user.id
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create holidays calendar: ${createError.message}`);
      }
      holidaysCalendar = newCalendar;
    } else if (calendarError) {
      throw new Error(`Failed to fetch holidays calendar: ${calendarError.message}`);
    }

    let importedCount = 0;
    let updatedCount = 0;

    // Process each holiday
    for (const holiday of holidays) {
      const holidayDate = new Date(holiday.date);
      
      // Create external ID for deduplication
      const externalId = `us-holiday-${holiday.date}-${holiday.name.toLowerCase().replace(/\s+/g, '-')}`;
      
      // Check if holiday already exists
      const { data: existingEvent } = await supabaseClient
        .from('gw_events')
        .select('id')
        .eq('external_id', externalId)
        .single();

      const eventData = {
        title: holiday.localName || holiday.name,
        description: `US National Holiday: ${holiday.name}`,
        start_date: holiday.date,
        end_date: holiday.date,
        event_type: 'holiday',
        is_public: true,
        is_all_day: true,
        calendar_id: holidaysCalendar.id,
        external_id: externalId,
        external_source: 'national_holidays',
        created_by: user.id,
        location: 'United States'
      };

      if (existingEvent) {
        // Update existing event
        const { error: updateError } = await supabaseClient
          .from('gw_events')
          .update(eventData)
          .eq('id', existingEvent.id);

        if (updateError) {
          console.error(`Error updating holiday ${holiday.name}:`, updateError);
        } else {
          updatedCount++;
        }
      } else {
        // Insert new event
        const { error: insertError } = await supabaseClient
          .from('gw_events')
          .insert(eventData);

        if (insertError) {
          console.error(`Error inserting holiday ${holiday.name}:`, insertError);
        } else {
          importedCount++;
        }
      }
    }

    console.log(`Import complete: ${importedCount} new holidays, ${updatedCount} updated holidays`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: importedCount,
        updated: updatedCount,
        year: targetYear,
        total: holidays.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Holiday sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});