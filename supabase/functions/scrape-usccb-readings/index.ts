import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All Sundays and major feasts in liturgical year
const LITURGICAL_DAYS = [
  // Advent
  { day: "First Sunday of Advent", season: "Advent" },
  { day: "Second Sunday of Advent", season: "Advent" },
  { day: "Third Sunday of Advent", season: "Advent" },
  { day: "Fourth Sunday of Advent", season: "Advent" },
  // Christmas
  { day: "Christmas - Vigil Mass", season: "Christmas" },
  { day: "Christmas - Mass at Midnight", season: "Christmas" },
  { day: "Christmas - Mass at Dawn", season: "Christmas" },
  { day: "Christmas - Mass During the Day", season: "Christmas" },
  { day: "Holy Family", season: "Christmas" },
  { day: "Mary, Mother of God", season: "Christmas" },
  { day: "Second Sunday after Christmas", season: "Christmas" },
  { day: "Epiphany of the Lord", season: "Christmas" },
  { day: "Baptism of the Lord", season: "Christmas" },
  // Ordinary Time (before Lent)
  { day: "Second Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Third Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Fourth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Fifth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Sixth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Seventh Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Eighth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Ninth Sunday in Ordinary Time", season: "Ordinary Time" },
  // Lent
  { day: "Ash Wednesday", season: "Lent" },
  { day: "First Sunday of Lent", season: "Lent" },
  { day: "Second Sunday of Lent", season: "Lent" },
  { day: "Third Sunday of Lent", season: "Lent" },
  { day: "Fourth Sunday of Lent", season: "Lent" },
  { day: "Fifth Sunday of Lent", season: "Lent" },
  { day: "Palm Sunday", season: "Lent" },
  // Triduum
  { day: "Holy Thursday - Evening Mass of the Lord's Supper", season: "Triduum" },
  { day: "Good Friday - Celebration of the Lord's Passion", season: "Triduum" },
  { day: "Easter Vigil", season: "Triduum" },
  // Easter
  { day: "Easter Sunday", season: "Easter" },
  { day: "Second Sunday of Easter (Divine Mercy)", season: "Easter" },
  { day: "Third Sunday of Easter", season: "Easter" },
  { day: "Fourth Sunday of Easter", season: "Easter" },
  { day: "Fifth Sunday of Easter", season: "Easter" },
  { day: "Sixth Sunday of Easter", season: "Easter" },
  { day: "Ascension of the Lord", season: "Easter" },
  { day: "Seventh Sunday of Easter", season: "Easter" },
  { day: "Pentecost - Vigil Mass", season: "Easter" },
  { day: "Pentecost Sunday", season: "Easter" },
  // Ordinary Time (after Pentecost)
  { day: "Most Holy Trinity", season: "Ordinary Time" },
  { day: "Most Holy Body and Blood of Christ", season: "Ordinary Time" },
  { day: "Tenth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Eleventh Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Twelfth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Thirteenth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Fourteenth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Fifteenth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Sixteenth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Seventeenth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Eighteenth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Nineteenth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Twentieth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Twenty-First Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Twenty-Second Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Twenty-Third Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Twenty-Fourth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Twenty-Fifth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Twenty-Sixth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Twenty-Seventh Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Twenty-Eighth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Twenty-Ninth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Thirtieth Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Thirty-First Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Thirty-Second Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Thirty-Third Sunday in Ordinary Time", season: "Ordinary Time" },
  { day: "Christ the King", season: "Ordinary Time" },
];

// URL slug mappings for USCCB
const URL_SLUGS: Record<string, string> = {
  "First Sunday of Advent": "first-sunday-advent",
  "Second Sunday of Advent": "second-sunday-advent",
  "Third Sunday of Advent": "third-sunday-advent",
  "Fourth Sunday of Advent": "fourth-sunday-advent",
  "Christmas - Vigil Mass": "december-24-vigil-mass",
  "Christmas - Mass at Midnight": "december-25-mass-night",
  "Christmas - Mass at Dawn": "december-25-mass-dawn",
  "Christmas - Mass During the Day": "december-25-mass-day",
  "Holy Family": "holy-family",
  "Mary, Mother of God": "january-1-solemnity-mary-mother-god",
  "Second Sunday after Christmas": "second-sunday-after-christmas",
  "Epiphany of the Lord": "epiphany-lord",
  "Baptism of the Lord": "baptism-lord",
  "Ash Wednesday": "ash-wednesday",
  "First Sunday of Lent": "first-sunday-lent",
  "Second Sunday of Lent": "second-sunday-lent",
  "Third Sunday of Lent": "third-sunday-lent",
  "Fourth Sunday of Lent": "fourth-sunday-lent",
  "Fifth Sunday of Lent": "fifth-sunday-lent",
  "Palm Sunday": "palm-sunday-passion-lord",
  "Holy Thursday - Evening Mass of the Lord's Supper": "holy-thursday-evening-mass-lords-supper",
  "Good Friday - Celebration of the Lord's Passion": "good-friday-celebration-lords-passion",
  "Easter Vigil": "easter-vigil",
  "Easter Sunday": "easter-sunday",
  "Second Sunday of Easter (Divine Mercy)": "second-sunday-easter",
  "Third Sunday of Easter": "third-sunday-easter",
  "Fourth Sunday of Easter": "fourth-sunday-easter",
  "Fifth Sunday of Easter": "fifth-sunday-easter",
  "Sixth Sunday of Easter": "sixth-sunday-easter",
  "Ascension of the Lord": "ascension-lord",
  "Seventh Sunday of Easter": "seventh-sunday-easter",
  "Pentecost - Vigil Mass": "pentecost-vigil-mass",
  "Pentecost Sunday": "pentecost-sunday",
  "Most Holy Trinity": "most-holy-trinity",
  "Most Holy Body and Blood of Christ": "most-holy-body-and-blood-christ-corpus-christi",
  "Christ the King": "our-lord-jesus-christ-king-universe",
};

// Generate ordinal URL slugs
for (let i = 2; i <= 34; i++) {
  const ordinals = [
    "", "", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth",
    "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth",
    "seventeenth", "eighteenth", "nineteenth", "twentieth", "twenty-first", "twenty-second",
    "twenty-third", "twenty-fourth", "twenty-fifth", "twenty-sixth", "twenty-seventh",
    "twenty-eighth", "twenty-ninth", "thirtieth", "thirty-first", "thirty-second",
    "thirty-third", "thirty-fourth"
  ];
  const ordinalNames = [
    "", "", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth",
    "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth",
    "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth", "Twenty-First", "Twenty-Second",
    "Twenty-Third", "Twenty-Fourth", "Twenty-Fifth", "Twenty-Sixth", "Twenty-Seventh",
    "Twenty-Eighth", "Twenty-Ninth", "Thirtieth", "Thirty-First", "Thirty-Second",
    "Thirty-Third", "Thirty-Fourth"
  ];
  URL_SLUGS[`${ordinalNames[i]} Sunday in Ordinary Time`] = `${ordinals[i]}-sunday-ordinary-time`;
}

async function scrapeReading(firecrawlApiKey: string, day: string, cycle: string): Promise<any> {
  const slug = URL_SLUGS[day];
  if (!slug) {
    console.log(`No URL slug for: ${day}`);
    return null;
  }

  const url = `https://bible.usccb.org/bible/readings/${slug}-cycle-${cycle.toLowerCase()}.cfm`;
  console.log(`Scraping: ${url}`);

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error(`Failed to scrape ${url}:`, data.error || response.status);
      return null;
    }

    return {
      content: data.data?.markdown || data.markdown || '',
      sourceUrl: url,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

function parseReadings(markdown: string): any {
  const result: any = {};

  // Extract reading references
  const firstReadingMatch = markdown.match(/Reading\s*1[:\s]*([^\n]+)/i);
  const psalmMatch = markdown.match(/Responsorial Psalm[:\s]*([^\n]+)/i);
  const secondReadingMatch = markdown.match(/Reading\s*2[:\s]*([^\n]+)/i);
  const gospelMatch = markdown.match(/Gospel[:\s]*([^\n]+)/i);
  const acclamationMatch = markdown.match(/Alleluia[:\s]*([^\n]+)/i);

  result.first_reading_reference = firstReadingMatch?.[1]?.trim() || null;
  result.psalm_response = psalmMatch?.[1]?.trim() || null;
  result.second_reading_reference = secondReadingMatch?.[1]?.trim() || null;
  result.gospel_reference = gospelMatch?.[1]?.trim() || null;
  result.gospel_acclamation = acclamationMatch?.[1]?.trim() || null;

  // Extract actual reading content (simplified extraction)
  const sections = markdown.split(/#{1,3}\s+/);
  
  for (const section of sections) {
    if (section.toLowerCase().includes('reading 1') || section.toLowerCase().includes('first reading')) {
      result.first_reading = section.substring(0, 2000);
    } else if (section.toLowerCase().includes('responsorial psalm')) {
      result.responsorial_psalm = section.substring(0, 1500);
    } else if (section.toLowerCase().includes('reading 2') || section.toLowerCase().includes('second reading')) {
      result.second_reading = section.substring(0, 2000);
    } else if (section.toLowerCase().includes('gospel') && !section.toLowerCase().includes('acclamation')) {
      result.gospel = section.substring(0, 2500);
    }
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { cycle = 'C', days, batchSize = 5 } = await req.json();
    
    // Use provided days or default to all liturgical days
    const daysToScrape = days || LITURGICAL_DAYS;
    
    console.log(`Starting scrape for ${daysToScrape.length} days, cycle ${cycle}`);

    const results: any[] = [];
    const errors: any[] = [];

    // Process in batches to avoid rate limiting
    for (let i = 0; i < daysToScrape.length; i += batchSize) {
      const batch = daysToScrape.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(daysToScrape.length / batchSize)}`);

      const batchPromises = batch.map(async (item: any) => {
        const dayName = typeof item === 'string' ? item : item.day;
        const season = typeof item === 'string' ? 'Unknown' : item.season;

        const scraped = await scrapeReading(firecrawlApiKey, dayName, cycle);
        
        if (scraped) {
          const parsed = parseReadings(scraped.content);
          
          const record = {
            liturgical_day: dayName,
            liturgical_season: season,
            year_cycle: cycle.toUpperCase(),
            liturgical_date: new Date().toISOString().split('T')[0], // Placeholder date
            full_content: scraped.content,
            source_url: scraped.sourceUrl,
            ...parsed,
          };

          // Upsert to database
          const { error: dbError } = await supabase
            .from('usccb_readings')
            .upsert(record, { 
              onConflict: 'liturgical_day,year_cycle',
              ignoreDuplicates: false 
            });

          if (dbError) {
            console.error(`DB error for ${dayName}:`, dbError);
            errors.push({ day: dayName, error: dbError.message });
          } else {
            results.push({ day: dayName, success: true });
          }
        } else {
          errors.push({ day: dayName, error: 'Failed to scrape' });
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < daysToScrape.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Completed: ${results.length} success, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        scraped: results.length,
        errors: errors.length,
        results,
        errorDetails: errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-usccb-readings:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape readings' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
