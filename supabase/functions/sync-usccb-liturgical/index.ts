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

    // Fetch liturgical data from USCCB website
    console.log(`Attempting to fetch liturgical data for date: ${targetDate}`);

    let transformedData: USCCBLiturgicalData;

    try {
      // Try to scrape USCCB website for readings
      const usccbUrl = `https://bible.usccb.org/bible/readings/${formattedDate}.cfm`;
      console.log(`Fetching from USCCB URL: ${usccbUrl}`);
      
      const response = await fetch(usccbUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GleeWorld/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (response.ok) {
        const htmlContent = await response.text();
        console.log('Successfully fetched USCCB page');
        transformedData = parseUSCCBHTML(htmlContent, targetDate);
      } else {
        console.log(`Failed to fetch USCCB page: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch USCCB page');
      }
    } catch (fetchError) {
      console.log('Error fetching from USCCB, using fallback:', fetchError);
      
      // Fallback response when USCCB site is unavailable
      transformedData = {
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
            citation: 'USCCB readings temporarily unavailable',
            content: `Please visit https://bible.usccb.org/bible/readings/${formattedDate}.cfm for the complete liturgical readings for ${new Date(targetDate).toLocaleDateString()}.`
          },
          responsorial_psalm: {
            title: 'Responsorial Psalm',
            citation: 'USCCB readings temporarily unavailable',
            content: 'Please visit USCCB.org for the complete responsorial psalm.'
          },
          gospel: {
            title: 'Gospel',
            citation: 'USCCB readings temporarily unavailable',
            content: `Please visit https://bible.usccb.org/bible/readings/${formattedDate}.cfm for the complete Gospel reading for ${new Date(targetDate).toLocaleDateString()}.`
          }
        },
        saint_of_day: 'Visit USCCB.org for saint information',
        liturgical_color: 'Green'
      };
    }

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

// Helper function to parse HTML from USCCB website
function parseUSCCBHTML(html: string, date: string): USCCBLiturgicalData {
  console.log('Parsing USCCB HTML content...');
  
  const getTextBetween = (str: string, start: string, end: string): string => {
    const startIndex = str.indexOf(start);
    if (startIndex === -1) return '';
    const endIndex = str.indexOf(end, startIndex + start.length);
    if (endIndex === -1) return '';
    return str.substring(startIndex + start.length, endIndex).trim();
  };

  const cleanText = (text: string): string => {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  };

  // Extract title from page
  let title = getTextBetween(html, '<title>', '</title>');
  title = cleanText(title) || `Daily Readings for ${new Date(date).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`;

  // Extract liturgical season and color
  let season = 'Ordinary Time';
  let liturgical_color = 'Green';
  
  // Look for season indicators in the HTML
  const seasonMatch = html.match(/(?:Season|Time)\s*[^<]*(?:Advent|Christmas|Lent|Easter|Ordinary)/i);
  if (seasonMatch) {
    season = cleanText(seasonMatch[0]);
  }

  // Extract saint of the day
  let saint_of_day = '';
  const saintMatch = html.match(/<[^>]*saint[^>]*>([^<]+)/i) || 
                    html.match(/Saint\s+[^<,]+/i) ||
                    html.match(/St\.\s+[^<,]+/i);
  if (saintMatch) {
    saint_of_day = cleanText(saintMatch[0]);
  }

  // Try to extract readings - USCCB structure may vary
  const readings: any = {};

  // Look for reading sections
  const readingPatterns = [
    { key: 'first_reading', pattern: /(?:First Reading|Reading 1)[\s\S]*?(?=(?:Responsorial Psalm|Reading 2|Gospel|$))/i },
    { key: 'responsorial_psalm', pattern: /(?:Responsorial Psalm|Psalm)[\s\S]*?(?=(?:Reading 2|Second Reading|Gospel|$))/i },
    { key: 'second_reading', pattern: /(?:Second Reading|Reading 2)[\s\S]*?(?=(?:Gospel|$))/i },
    { key: 'gospel', pattern: /Gospel[\s\S]*?(?=(?:Reflection|Commentary|$))/i }
  ];

  readingPatterns.forEach(({ key, pattern }) => {
    const match = html.match(pattern);
    if (match) {
      const section = match[0];
      
      // Extract citation
      const citationMatch = section.match(/(?:cf\.|see|from)\s*([^<\n]+)/i) ||
                           section.match(/\b[0-9]+:[0-9]+-?[0-9]*\b/);
      const citation = citationMatch ? cleanText(citationMatch[0]) : 'See USCCB.org';
      
      // Extract content (first substantial paragraph)
      const contentMatch = section.match(/<p[^>]*>([^<]+(?:<[^>]*>[^<]*)*)<\/p>/i) ||
                          section.match(/\n\s*([A-Z][^.\n]{50,})/);
      let content = contentMatch ? cleanText(contentMatch[1]) : 'Please visit USCCB.org for complete reading';
      
      // Limit content length
      if (content.length > 300) {
        content = content.substring(0, 300) + '... (Visit USCCB.org for complete reading)';
      }

      readings[key] = {
        title: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        citation,
        content
      };
    }
  });

  // Ensure we have at least basic readings
  if (!readings.first_reading) {
    readings.first_reading = {
      title: 'First Reading',
      citation: 'Available at USCCB.org',
      content: 'Visit USCCB.org for the complete First Reading'
    };
  }

  if (!readings.gospel) {
    readings.gospel = {
      title: 'Gospel',
      citation: 'Available at USCCB.org',
      content: 'Visit USCCB.org for the complete Gospel reading'
    };
  }

  console.log('Successfully parsed USCCB content');

  return {
    date,
    season,
    week: '',
    title,
    readings,
    saint_of_day: saint_of_day || 'Visit USCCB.org for saint information',
    liturgical_color
  };
}