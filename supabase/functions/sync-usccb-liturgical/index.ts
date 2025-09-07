import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface USCCBReading {
  title: string;
  citation: string;
  content: string;
}

interface USCCBLiturgicalData {
  date: string;
  season: string;
  week: string;
  readings: {
    first_reading?: USCCBReading;
    responsorial_psalm?: USCCBReading;
    second_reading?: USCCBReading;
    gospel?: USCCBReading;
  };
  saint_of_day?: string;
  liturgical_color?: string;
  title?: string;
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

    const { date } = await req.json();
    const targetDate = date || new Date().toISOString().split('T')[0];

    console.log(`Syncing USCCB liturgical data for date: ${targetDate}`);

    // Parse the date for USCCB API format
    const dateObj = new Date(targetDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const formattedDate = `${year}${month}${day}`;

    // Fetch liturgical data from USCCB
    // Note: USCCB doesn't have a direct public API, so we'll provide a fallback response
    console.log(`Attempting to fetch liturgical data for date: ${targetDate}`);

    // Create a basic liturgical data response as USCCB API access is limited
    const transformedData: USCCBLiturgicalData = {
      date: targetDate,
      season: 'Ordinary Time',
      week: '',
      title: `Daily Readings for ${new Date(targetDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`,
      readings: {
        first_reading: {
          title: 'First Reading',
          citation: 'Please visit USCCB.org for complete daily readings',
          content: `Visit https://bible.usccb.org/bible/readings/${formattedDate}.cfm for the complete liturgical readings for ${new Date(targetDate).toLocaleDateString()}.`
        },
        responsorial_psalm: {
          title: 'Responsorial Psalm',
          citation: 'Please visit USCCB.org for complete daily readings',
          content: 'Visit USCCB.org for the complete responsorial psalm.'
        },
        gospel: {
          title: 'Gospel',
          citation: 'Please visit USCCB.org for complete daily readings',
          content: `Visit https://bible.usccb.org/bible/readings/${formattedDate}.cfm for the complete Gospel reading for ${new Date(targetDate).toLocaleDateString()}.`
        }
      },
      saint_of_day: 'Visit USCCB.org for saint information',
      liturgical_color: 'Green'
    };

    console.log('Successfully created liturgical data response');

    return new Response(
      JSON.stringify({
        success: true,
        data: transformedData,
        source: 'fallback_usccb_info',
        note: 'USCCB API access is limited. Visit USCCB.org directly for complete readings.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('USCCB sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to parse HTML when API is not available
function parseUSCCBHTML(html: string, date: string): USCCBLiturgicalData {
  // Basic HTML parsing fallback - in a real implementation, you'd use a proper HTML parser
  // This is a simplified version
  
  const getTextBetween = (str: string, start: string, end: string): string => {
    const startIndex = str.indexOf(start);
    if (startIndex === -1) return '';
    const endIndex = str.indexOf(end, startIndex + start.length);
    if (endIndex === -1) return '';
    return str.substring(startIndex + start.length, endIndex).trim();
  };

  // Extract basic information
  const title = getTextBetween(html, '<title>', '</title>') || 'Daily Readings';
  
  return {
    date,
    season: 'Ordinary Time', // Default fallback
    week: '',
    title,
    readings: {
      first_reading: {
        title: 'First Reading',
        citation: 'See USCCB.org',
        content: 'Please visit USCCB.org for complete daily readings'
      },
      gospel: {
        title: 'Gospel',
        citation: 'See USCCB.org',
        content: 'Please visit USCCB.org for complete daily readings'
      }
    },
    saint_of_day: '',
    liturgical_color: 'Green'
  };
}