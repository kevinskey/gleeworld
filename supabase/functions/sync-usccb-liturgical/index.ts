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
    const usccbUrl = `https://bible.usccb.org/api/bible/readings/${formattedDate}`;
    console.log(`Fetching from USCCB API: ${usccbUrl}`);

    const usccbResponse = await fetch(usccbUrl, {
      headers: {
        'User-Agent': 'GleeWorld-BowmanScholars/1.0',
        'Accept': 'application/json'
      }
    });

    if (!usccbResponse.ok) {
      console.error(`USCCB API error: ${usccbResponse.status} - ${usccbResponse.statusText}`);
      // Try alternative format for USCCB
      const altUrl = `https://bible.usccb.org/bible/readings/${formattedDate}.cfm`;
      const altResponse = await fetch(altUrl);
      
      if (!altResponse.ok) {
        throw new Error(`Failed to fetch liturgical data: ${usccbResponse.status}`);
      }
      
      // Parse HTML response as fallback
      const htmlContent = await altResponse.text();
      const parsedData = parseUSCCBHTML(htmlContent, targetDate);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: parsedData,
          source: 'usccb_html'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const liturgicalData = await usccbResponse.json();
    console.log(`Successfully fetched liturgical data from USCCB`);

    // Transform USCCB data to our format
    const transformedData: USCCBLiturgicalData = {
      date: targetDate,
      season: liturgicalData.season || '',
      week: liturgicalData.week || '',
      readings: {
        first_reading: liturgicalData.readings?.first_reading ? {
          title: liturgicalData.readings.first_reading.title || 'First Reading',
          citation: liturgicalData.readings.first_reading.citation || '',
          content: liturgicalData.readings.first_reading.content || ''
        } : undefined,
        responsorial_psalm: liturgicalData.readings?.responsorial_psalm ? {
          title: liturgicalData.readings.responsorial_psalm.title || 'Responsorial Psalm',
          citation: liturgicalData.readings.responsorial_psalm.citation || '',
          content: liturgicalData.readings.responsorial_psalm.content || ''
        } : undefined,
        second_reading: liturgicalData.readings?.second_reading ? {
          title: liturgicalData.readings.second_reading.title || 'Second Reading',
          citation: liturgicalData.readings.second_reading.citation || '',
          content: liturgicalData.readings.second_reading.content || ''
        } : undefined,
        gospel: liturgicalData.readings?.gospel ? {
          title: liturgicalData.readings.gospel.title || 'Gospel',
          citation: liturgicalData.readings.gospel.citation || '',
          content: liturgicalData.readings.gospel.content || ''
        } : undefined
      },
      saint_of_day: liturgicalData.saint_of_day || '',
      liturgical_color: liturgicalData.liturgical_color || '',
      title: liturgicalData.title || ''
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: transformedData,
        source: 'usccb_api'
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