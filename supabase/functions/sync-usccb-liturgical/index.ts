import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma',
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
    let source = 'unknown';

    try {
      // Try multiple liturgical sources in order of preference
      let apiSuccess = false;
      const sources = [
        {
          name: 'usccb',
          url: `https://bible.usccb.org/bible/readings/${month}${day}${year}.cfm`,
          headers: {
            'User-Agent': 'GleeWorld/1.0 Educational Use',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 5000,
          parser: 'html'
        },
        {
          name: 'calendar_api',
          url: `https://calapi.inadiutorium.cz/api/v0/en/calendars/general-en/${year}/${month}/${day}`,
          headers: {
            'User-Agent': 'GleeWorld/1.0',
            'Accept': 'application/json'
          },
          timeout: 8000,
          parser: 'json'
        },
        {
          name: 'universalis',
          url: `https://universalis.com/${year}${month}${day}/readings.json`,
          headers: {
            'User-Agent': 'GleeWorld/1.0',
            'Accept': 'application/json'
          },
          timeout: 8000,
          parser: 'json'
        },
        {
          name: 'catholic_calendar',
          url: `https://api.catholiccalendar.com/readings/${year}-${month}-${day}`,
          headers: {
            'User-Agent': 'GleeWorld/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 8000,
          parser: 'json'
        },
        {
          name: 'ibreviary',
          url: `https://ibreviary.org/api/readings/${year}${month}${day}`,
          headers: {
            'User-Agent': 'GleeWorld/1.0',
            'Accept': 'application/json'
          },
          timeout: 8000,
          parser: 'json'
        }
      ];

      for (const sourceConfig of sources) {
        if (apiSuccess) break;
        
        try {
          console.log(`Attempting ${sourceConfig.name}: ${sourceConfig.url}`);
          
          const response = await fetch(sourceConfig.url, {
            headers: sourceConfig.headers,
            signal: AbortSignal.timeout(sourceConfig.timeout)
          });

          if (response.ok) {
            if (sourceConfig.parser === 'html') {
              const htmlContent = await response.text();
              console.log(`Successfully fetched from ${sourceConfig.name}`);
              transformedData = parseUSCCBData(htmlContent, targetDate);
              apiSuccess = true;
              source = sourceConfig.name;
            } else if (sourceConfig.parser === 'json') {
              const data = await response.json();
              console.log(`Successfully fetched from ${sourceConfig.name}`);
              
              // Handle different JSON response formats
              if (sourceConfig.name === 'calendar_api') {
                transformedData = transformLiturgicalData(data, targetDate);
              } else if (sourceConfig.name === 'universalis') {
                transformedData = transformUniversalisData(data, targetDate);
              } else if (sourceConfig.name === 'catholic_calendar') {
                transformedData = transformCatholicCalendarData(data, targetDate);
              } else if (sourceConfig.name === 'ibreviary') {
                transformedData = transformIBreviaryData(data, targetDate);
              } else {
                // Generic transformation for unknown sources
                transformedData = transformGenericLiturgicalData(data, targetDate);
              }
              
              apiSuccess = true;
              source = sourceConfig.name;
            }
          } else {
            console.log(`${sourceConfig.name} responded with status ${response.status}`);
          }
        } catch (error) {
          console.log(`${sourceConfig.name} failed:`, error.message);
        }
      }

      if (!apiSuccess) {
        throw new Error('All liturgical API sources failed');
      }
    } catch (fetchError) {
      console.log('All API sources failed, creating enhanced fallback data:', fetchError);
      transformedData = createEnhancedFallbackData(targetDate);
      source = 'fallback';
    }

    console.log('Successfully prepared response data');

    return new Response(
      JSON.stringify({
        success: true,
        data: transformedData,
        source,
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

  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const yyyy = String(dateObj.getFullYear());
  const usccbUrl = `https://bible.usccb.org/bible/readings/${mm}${dd}${yyyy}.cfm`;

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
      citation: 'USCCB Daily Readings',
      content: `Full readings: ${usccbUrl}`
    },
    responsorial_psalm: {
      title: 'Responsorial Psalm',
      citation: 'USCCB Daily Readings',
      content: `Full readings: ${usccbUrl}`
    },
    gospel: {
      title: 'Gospel',
      citation: 'USCCB Daily Readings',
      content: `Full readings: ${usccbUrl}`
    }
  } as any;

  // Add second reading for Sundays and major feasts
  const isImportantDay = data.rank === 'solemnity' || data.rank === 'feast' || dateObj.getDay() === 0;
  if (isImportantDay) {
    (readings as any).second_reading = {
      title: 'Second Reading',
      citation: 'USCCB Daily Readings',
      content: `Full readings: ${usccbUrl}`
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

// Additional transformation functions for different API sources

// Transform Universalis API data
function transformUniversalisData(data: any, date: string): USCCBLiturgicalData {
  console.log('Transforming Universalis API data...');
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const season = data.season?.name || determineLiturgicalSeason(dateObj);
  const liturgical_color = data.colour || mapSeasonToColor(season);
  
  return {
    date,
    season,
    week: data.week || '',
    title: data.title || `Daily Readings for ${formattedDate}`,
    readings: {
      first_reading: {
        title: 'First Reading',
        citation: data.readings?.first?.citation || 'Universalis',
        content: data.readings?.first?.text || 'First reading available at Universalis.com'
      },
      responsorial_psalm: {
        title: 'Responsorial Psalm',
        citation: data.readings?.psalm?.citation || 'Universalis',
        content: data.readings?.psalm?.text || 'Responsorial psalm available at Universalis.com'
      },
      gospel: {
        title: 'Gospel',
        citation: data.readings?.gospel?.citation || 'Universalis',
        content: data.readings?.gospel?.text || 'Gospel reading available at Universalis.com'
      }
    },
    saint_of_day: data.saint || getSaintForDate(dateObj),
    liturgical_color
  };
}

// Transform Catholic Calendar API data
function transformCatholicCalendarData(data: any, date: string): USCCBLiturgicalData {
  console.log('Transforming Catholic Calendar API data...');
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const season = data.liturgical_season || determineLiturgicalSeason(dateObj);
  const liturgical_color = data.liturgical_color || mapSeasonToColor(season);
  
  const readings: any = {
    first_reading: {
      title: 'First Reading',
      citation: data.readings?.first_reading?.citation || 'Catholic Calendar',
      content: data.readings?.first_reading?.text || 'First reading available through Catholic Calendar API'
    },
    responsorial_psalm: {
      title: 'Responsorial Psalm',
      citation: data.readings?.psalm?.citation || 'Catholic Calendar',
      content: data.readings?.psalm?.text || 'Responsorial psalm available through Catholic Calendar API'
    },
    gospel: {
      title: 'Gospel',
      citation: data.readings?.gospel?.citation || 'Catholic Calendar',
      content: data.readings?.gospel?.text || 'Gospel reading available through Catholic Calendar API'
    }
  };

  // Add second reading if available
  if (data.readings?.second_reading) {
    readings.second_reading = {
      title: 'Second Reading',
      citation: data.readings.second_reading.citation || 'Catholic Calendar',
      content: data.readings.second_reading.text || 'Second reading available through Catholic Calendar API'
    };
  }

  return {
    date,
    season,
    week: data.week || '',
    title: data.title || `Daily Readings for ${formattedDate}`,
    readings,
    saint_of_day: data.saint || getSaintForDate(dateObj),
    liturgical_color
  };
}

// Transform iBreviary API data
function transformIBreviaryData(data: any, date: string): USCCBLiturgicalData {
  console.log('Transforming iBreviary API data...');
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const season = data.season || determineLiturgicalSeason(dateObj);
  const liturgical_color = data.color || mapSeasonToColor(season);
  
  return {
    date,
    season,
    week: data.week || '',
    title: data.title || `Daily Readings for ${formattedDate}`,
    readings: {
      first_reading: {
        title: 'First Reading',
        citation: data.first_reading?.reference || 'iBreviary',
        content: data.first_reading?.text || 'First reading available through iBreviary app'
      },
      responsorial_psalm: {
        title: 'Responsorial Psalm',
        citation: data.psalm?.reference || 'iBreviary',
        content: data.psalm?.text || 'Responsorial psalm available through iBreviary app'
      },
      gospel: {
        title: 'Gospel',
        citation: data.gospel?.reference || 'iBreviary',
        content: data.gospel?.text || 'Gospel reading available through iBreviary app'
      }
    },
    saint_of_day: data.commemoration || getSaintForDate(dateObj),
    liturgical_color
  };
}

// Generic transformation function for unknown API formats
function transformGenericLiturgicalData(data: any, date: string): USCCBLiturgicalData {
  console.log('Transforming generic liturgical API data...');
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const season = data.season || data.liturgical_season || determineLiturgicalSeason(dateObj);
  const liturgical_color = data.color || data.liturgical_color || mapSeasonToColor(season);
  
  return {
    date,
    season,
    week: data.week || '',
    title: data.title || `Daily Readings for ${formattedDate}`,
    readings: {
      first_reading: {
        title: 'First Reading',
        citation: 'Liturgical Source',
        content: 'First reading available from liturgical source'
      },
      responsorial_psalm: {
        title: 'Responsorial Psalm',
        citation: 'Liturgical Source',
        content: 'Responsorial psalm available from liturgical source'
      },
      gospel: {
        title: 'Gospel',
        citation: 'Liturgical Source',
        content: 'Gospel reading available from liturgical source'
      }
    },
    saint_of_day: data.saint || data.commemoration || getSaintForDate(dateObj),
    liturgical_color
  };
}

// Keep original fallback for compatibility
function createFallbackData(date: string): USCCBLiturgicalData {
  return createEnhancedFallbackData(date);
}