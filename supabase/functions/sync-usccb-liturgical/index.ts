import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  console.log('=== USCCB Liturgical Sync Function Started ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing POST request...');
    
    // Parse request body safely
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Raw request body:', bodyText);
      requestBody = JSON.parse(bodyText);
      console.log('Parsed request body:', requestBody);
    } catch (jsonError) {
      console.error('Error parsing request body:', jsonError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { date } = requestBody;
    const targetDate = date || new Date().toISOString().split('T')[0];
    console.log('Target date:', targetDate);

    // Parse the date for API format
    const dateObj = new Date(targetDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    console.log(`Formatted date: ${year}-${month}-${day}`);

    let transformedData: USCCBLiturgicalData;

    try {
      // Use the Liturgical Calendar API (free Catholic liturgical data)
      const apiUrl = `https://calapi.inadiutorium.cz/api/v0/en/calendars/general-en/${year}/${month}/${day}`;
      console.log(`Fetching from Liturgical Calendar API: ${apiUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'GleeWorld/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`API Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log('Successfully fetched liturgical data from API');
        transformedData = transformLiturgicalData(data, targetDate);
      } else {
        const errorText = await response.text();
        console.log(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`API responded with status ${response.status}`);
      }
    } catch (fetchError) {
      console.log('API fetch failed, using fallback data:', fetchError);
      transformedData = createFallbackData(targetDate);
    }

    console.log('Successfully prepared response data');

    return new Response(
      JSON.stringify({
        success: true,
        data: transformedData,
        source: transformedData.title?.includes('fallback') ? 'fallback' : 'liturgical_calendar_api',
        note: 'Liturgical data provided for Glee World'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    
    // Always provide a fallback response
    try {
      const fallbackData = createFallbackData(new Date().toISOString().split('T')[0]);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: fallbackData,
          source: 'fallback',
          note: 'Using fallback data due to system error'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return new Response(
        JSON.stringify({ 
          error: 'Service temporarily unavailable',
          success: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }
  }
});

// Helper function to transform liturgical API data
function transformLiturgicalData(data: any, date: string): USCCBLiturgicalData {
  console.log('Transforming liturgical API data...');
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Extract season and color from API data
  const season = data.season?.name || 'Ordinary Time';
  const liturgical_color = mapSeasonToColor(season);
  
  // Extract celebrations (saints, feast days)
  const celebrations = data.celebrations || [];
  const saint_of_day = celebrations
    .filter((c: any) => c.rank !== 'commemoration')
    .map((c: any) => c.title)
    .join(', ') || '';

  // Create readings structure
  const readings = {
    first_reading: {
      title: 'First Reading',
      citation: 'Daily Mass Readings',
      content: `Today's liturgical celebration: ${data.title || formattedDate}. Please visit your local parish or Catholic liturgical resources for complete readings.`
    },
    responsorial_psalm: {
      title: 'Responsorial Psalm',
      citation: 'Daily Mass Readings',
      content: 'Please visit your local parish or Catholic liturgical resources for the complete responsorial psalm.'
    },
    gospel: {
      title: 'Gospel',
      citation: 'Daily Mass Readings',
      content: `Today's Gospel reading is available through your local parish or Catholic liturgical resources for ${formattedDate}.`
    }
  };

  // Add second reading for Sundays and major feasts
  const isImportantDay = data.rank === 'solemnity' || data.rank === 'feast' || dateObj.getDay() === 0;
  if (isImportantDay) {
    readings.second_reading = {
      title: 'Second Reading',
      citation: 'Daily Mass Readings',
      content: 'Please visit your local parish or Catholic liturgical resources for the complete second reading.'
    };
  }

  return {
    date,
    season,
    week: data.week || '',
    title: data.title || `Daily Readings for ${formattedDate}`,
    readings,
    saint_of_day: saint_of_day || 'No special celebration today',
    liturgical_color
  };
}

// Helper function to map liturgical season to color
function mapSeasonToColor(season: string): string {
  const seasonLower = season.toLowerCase();
  
  if (seasonLower.includes('advent')) return 'Purple';
  if (seasonLower.includes('christmas')) return 'White';
  if (seasonLower.includes('lent')) return 'Purple';
  if (seasonLower.includes('easter')) return 'White';
  if (seasonLower.includes('ordinary')) return 'Green';
  
  return 'Green'; // Default
}

// Helper function to create fallback data
function createFallbackData(date: string): USCCBLiturgicalData {
  console.log('Creating fallback liturgical data for:', date);
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return {
    date,
    season: 'Ordinary Time',
    week: '',
    title: `Daily Readings for ${formattedDate} (Fallback Data)`,
    readings: {
      first_reading: {
        title: 'First Reading',
        citation: 'Daily Mass Readings',
        content: `Liturgical readings for ${formattedDate} are available through your local parish or Catholic liturgical resources.`
      },
      responsorial_psalm: {
        title: 'Responsorial Psalm',
        citation: 'Daily Mass Readings',
        content: 'Please visit your local parish for the complete responsorial psalm.'
      },
      gospel: {
        title: 'Gospel',
        citation: 'Daily Mass Readings',
        content: `Today's Gospel reading is available through your local parish or Catholic liturgical resources.`
      }
    },
    saint_of_day: 'Check your local liturgical calendar',
    liturgical_color: 'Green'
  };
}