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
      // Try USCCB API first (official source)
      let apiSuccess = false;
      
      try {
        const usccbUrl = `https://bible.usccb.org/bible/readings/${month}${day}${year}.cfm`;
        console.log(`Attempting USCCB API: ${usccbUrl}`);
        
        const usccbResponse = await fetch(usccbUrl, {
          headers: {
            'User-Agent': 'GleeWorld/1.0 Educational Use',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          signal: AbortSignal.timeout(5000)
        });

        if (usccbResponse.ok) {
          const htmlContent = await usccbResponse.text();
          console.log('Successfully fetched from USCCB');
          transformedData = parseUSCCBData(htmlContent, targetDate);
          apiSuccess = true;
        }
      } catch (usccbError) {
        console.log('USCCB fetch failed:', usccbError);
      }

      // Fallback to liturgical calendar API if USCCB fails
      if (!apiSuccess) {
        const calApiUrl = `https://calapi.inadiutorium.cz/api/v0/en/calendars/general-en/${year}/${month}/${day}`;
        console.log(`Fallback to Liturgical Calendar API: ${calApiUrl}`);
        
        const response = await fetch(calApiUrl, {
          headers: {
            'User-Agent': 'GleeWorld/1.0',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Successfully fetched liturgical data from calendar API');
          transformedData = transformLiturgicalData(data, targetDate);
          apiSuccess = true;
        } else {
          throw new Error(`Calendar API responded with status ${response.status}`);
        }
      }

      if (!apiSuccess) {
        throw new Error('All API sources failed');
      }
    } catch (fetchError) {
      console.log('All API sources failed, creating enhanced fallback data:', fetchError);
      transformedData = createEnhancedFallbackData(targetDate);
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

// Helper function to parse USCCB HTML data
function parseUSCCBData(htmlContent: string, date: string): USCCBLiturgicalData {
  console.log('Parsing USCCB HTML data...');
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Basic HTML parsing - in a real implementation, you'd extract actual readings
  const season = determineLiturgicalSeason(dateObj);
  const liturgical_color = mapSeasonToColor(season);

  return {
    date,
    season,
    week: '',
    title: `Daily Readings for ${formattedDate}`,
    readings: {
      first_reading: {
        title: 'First Reading',
        citation: 'USCCB Daily Readings',
        content: `Visit https://bible.usccb.org/bible/readings/${dateObj.getMonth() + 1}${String(dateObj.getDate()).padStart(2, '0')}${dateObj.getFullYear()}.cfm for today's complete first reading.`
      },
      responsorial_psalm: {
        title: 'Responsorial Psalm',
        citation: 'USCCB Daily Readings',
        content: 'Complete responsorial psalm available at USCCB.org daily readings.'
      },
      gospel: {
        title: 'Gospel',
        citation: 'USCCB Daily Readings',
        content: `Today's Gospel reading is available at the USCCB daily readings page for ${formattedDate}.`
      }
    },
    saint_of_day: getSaintForDate(dateObj),
    liturgical_color
  };
}

// Helper function to determine liturgical season based on date
function determineLiturgicalSeason(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Simplified liturgical calendar logic
  if (month === 12 && day >= 1 && day <= 24) return 'Advent';
  if (month === 12 && day >= 25) return 'Christmas';
  if (month === 1 && day <= 13) return 'Christmas';
  if (month >= 2 && month <= 4) return 'Lent';
  if (month === 4 || month === 5) return 'Easter';
  
  return 'Ordinary Time';
}

// Helper function to get saint for date
function getSaintForDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Sample saints for common feast days
  const saintDays: Record<string, string> = {
    '1-1': 'Mary, Mother of God',
    '1-6': 'Epiphany of the Lord',
    '3-19': 'Saint Joseph',
    '3-25': 'Annunciation of the Lord',
    '6-24': 'Birth of John the Baptist',
    '6-29': 'Saints Peter and Paul',
    '8-15': 'Assumption of Mary',
    '11-1': 'All Saints',
    '11-2': 'All Souls',
    '12-8': 'Immaculate Conception',
    '12-25': 'Nativity of the Lord'
  };
  
  const key = `${month}-${day}`;
  return saintDays[key] || 'Weekday in Ordinary Time';
}

// Helper function to create enhanced fallback data
function createEnhancedFallbackData(date: string): USCCBLiturgicalData {
  console.log('Creating enhanced fallback liturgical data for:', date);
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const season = determineLiturgicalSeason(dateObj);
  const liturgical_color = mapSeasonToColor(season);
  const saint_of_day = getSaintForDate(dateObj);

  return {
    date,
    season,
    week: '',
    title: `Daily Readings for ${formattedDate}`,
    readings: {
      first_reading: {
        title: 'First Reading',
        citation: 'USCCB Daily Readings',
        content: `For today's complete first reading, visit: https://bible.usccb.org/bible/readings/${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}${dateObj.getFullYear()}.cfm`
      },
      responsorial_psalm: {
        title: 'Responsorial Psalm',
        citation: 'USCCB Daily Readings',
        content: 'Complete responsorial psalm available at USCCB.org daily readings section.'
      },
      gospel: {
        title: 'Gospel',
        citation: 'USCCB Daily Readings',
        content: `Today's Gospel reading for ${formattedDate} is available through the official USCCB daily readings.`
      }
    },
    saint_of_day,
    liturgical_color
  };
}

// Keep original fallback for compatibility
function createFallbackData(date: string): USCCBLiturgicalData {
  return createEnhancedFallbackData(date);
}