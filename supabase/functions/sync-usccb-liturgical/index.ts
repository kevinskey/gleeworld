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

Deno.serve(async (req) => {
  console.log('=== USCCB Liturgical Sync Function Started ===');
  console.log('Request method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Raw request body:', bodyText);
      requestBody = JSON.parse(bodyText);
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

    const dateObj = new Date(targetDate);
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = dateObj.getFullYear();

    // Build USCCB URL
    const usccbUrl = `https://bible.usccb.org/bible/readings/${month}${day}${String(year).slice(-2)}.cfm`;
    console.log('USCCB URL:', usccbUrl);

    // Try to scrape with Firecrawl
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    let scrapedReadings: any = null;

    if (apiKey) {
      console.log('Firecrawl API key found, attempting to scrape USCCB...');
      try {
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: usccbUrl,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });

        const scrapeData = await scrapeResponse.json();
        console.log('Firecrawl response status:', scrapeResponse.status);

        if (scrapeResponse.ok && scrapeData.success !== false) {
          const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
          console.log('Scraped markdown length:', markdown.length);
          
          if (markdown) {
            scrapedReadings = parseUSCCBMarkdown(markdown);
            console.log('Parsed readings:', Object.keys(scrapedReadings));
          }
        } else {
          console.error('Firecrawl scrape failed:', scrapeData.error || scrapeData);
        }
      } catch (scrapeError) {
        console.error('Error scraping USCCB:', scrapeError);
      }
    } else {
      console.log('No Firecrawl API key, using fallback data');
    }

    // Build liturgical data
    const season = determineLiturgicalSeason(dateObj);
    const liturgical_color = mapSeasonToColor(season);
    const saint_of_day = getSaintForDate(dateObj);
    const week = getWeekInSeason(dateObj, season);
    const liturgicalYear = getLiturgicalYear(dateObj);

    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Use scraped readings if available, otherwise use fallback
    const readings = scrapedReadings || getFallbackReadings(season, liturgicalYear, usccbUrl);

    const transformedData: USCCBLiturgicalData = {
      date: targetDate,
      season,
      week,
      title: `${formattedDate} - ${season} (Year ${liturgicalYear})`,
      readings,
      saint_of_day,
      liturgical_color,
    };

    console.log('Successfully prepared response data');

    return new Response(
      JSON.stringify({
        success: true,
        data: transformedData,
        source: scrapedReadings ? 'usccb_scraped' : 'fallback',
        note: scrapedReadings ? 'Live USCCB readings' : 'Using fallback data',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);

    const fallbackData = createFallbackData(new Date().toISOString().split('T')[0]);

    return new Response(
      JSON.stringify({
        success: true,
        data: fallbackData,
        source: 'fallback',
        note: 'Using fallback data due to error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Parse USCCB markdown to extract readings
function parseUSCCBMarkdown(markdown: string): any {
  const readings: any = {};

  // Common patterns in USCCB pages
  const sections = [
    { key: 'first_reading', patterns: ['Reading 1', 'First Reading', 'Reading I', 'READING 1', 'FIRST READING'] },
    { key: 'responsorial_psalm', patterns: ['Responsorial Psalm', 'RESPONSORIAL PSALM', 'Psalm'] },
    { key: 'second_reading', patterns: ['Reading 2', 'Second Reading', 'Reading II', 'READING 2', 'SECOND READING'] },
    { key: 'gospel', patterns: ['Gospel', 'GOSPEL'] },
  ];

  const lines = markdown.split('\n');
  let currentSection: string | null = null;
  let currentContent: string[] = [];
  let currentCitation = '';

  const finishSection = () => {
    if (currentSection && currentContent.length > 0) {
      const content = currentContent.join('\n').trim();
      if (content.length > 20) {
        readings[currentSection] = {
          title: formatTitle(currentSection),
          citation: currentCitation || 'See full reading',
          content: cleanContent(content),
        };
      }
    }
    currentContent = [];
    currentCitation = '';
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this line starts a new section
    let foundSection: string | null = null;
    for (const section of sections) {
      for (const pattern of section.patterns) {
        if (trimmedLine.toLowerCase().includes(pattern.toLowerCase()) && 
            (trimmedLine.startsWith('#') || trimmedLine.startsWith('**') || trimmedLine === trimmedLine.toUpperCase())) {
          foundSection = section.key;
          break;
        }
      }
      if (foundSection) break;
    }

    if (foundSection) {
      finishSection();
      currentSection = foundSection;
      
      // Try to extract citation from the same or next line
      const citationMatch = trimmedLine.match(/(\d+\s*\w+\s+\d+[:\d\-,\s]*|\w+\s+\d+[:\d\-,\s]*)/);
      if (citationMatch) {
        currentCitation = citationMatch[1].trim();
      }
    } else if (currentSection) {
      // Skip navigation/header content
      if (!trimmedLine.startsWith('[') && 
          !trimmedLine.includes('Skip to') && 
          !trimmedLine.includes('Daily Readings') &&
          trimmedLine.length > 0) {
        
        // Check for citation in content
        if (!currentCitation) {
          const inlineCitation = trimmedLine.match(/^([A-Za-z]+\s+\d+[:\d\-,\s]*)/);
          if (inlineCitation && trimmedLine.length < 50) {
            currentCitation = inlineCitation[1].trim();
          }
        }
        
        currentContent.push(trimmedLine);
      }
    }
  }

  finishSection();

  return Object.keys(readings).length > 0 ? readings : null;
}

function formatTitle(key: string): string {
  const titles: Record<string, string> = {
    first_reading: 'First Reading',
    responsorial_psalm: 'Responsorial Psalm',
    second_reading: 'Second Reading',
    gospel: 'Gospel',
  };
  return titles[key] || key;
}

function cleanContent(content: string): string {
  return content
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 2000); // Limit content length
}

// Fallback readings when scraping fails
function getFallbackReadings(season: string, cycle: string, usccbUrl: string): any {
  return {
    first_reading: {
      title: 'First Reading',
      citation: 'See USCCB',
      content: `The first reading for today's liturgy. Visit the USCCB website for the complete text:\n${usccbUrl}`,
    },
    responsorial_psalm: {
      title: 'Responsorial Psalm',
      citation: 'See USCCB',
      content: `Today's responsorial psalm. Visit the USCCB website for the complete text:\n${usccbUrl}`,
    },
    gospel: {
      title: 'Gospel',
      citation: 'See USCCB',
      content: `Today's Gospel reading. Visit the USCCB website for the complete text:\n${usccbUrl}`,
    },
  };
}

function createFallbackData(date: string): USCCBLiturgicalData {
  const dateObj = new Date(date);
  const season = determineLiturgicalSeason(dateObj);
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const year = dateObj.getFullYear();
  const usccbUrl = `https://bible.usccb.org/bible/readings/${month}${day}${String(year).slice(-2)}.cfm`;

  return {
    date,
    season,
    week: getWeekInSeason(dateObj, season),
    title: `${dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - ${season}`,
    readings: getFallbackReadings(season, 'A', usccbUrl),
    saint_of_day: getSaintForDate(dateObj),
    liturgical_color: mapSeasonToColor(season),
  };
}

// Calculate Easter
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function determineLiturgicalSeason(date: Date): string {
  const year = date.getFullYear();
  const easter = calculateEaster(year);

  const christmas = new Date(year, 11, 25);
  const adventStart = new Date(christmas);
  adventStart.setDate(christmas.getDate() - (22 + christmas.getDay()) % 7);

  const epiphany = new Date(year + 1, 0, 6);
  const baptismOfLord = new Date(epiphany);
  baptismOfLord.setDate(epiphany.getDate() + (7 - epiphany.getDay()) % 7);

  const ashWednesday = new Date(easter);
  ashWednesday.setDate(ashWednesday.getDate() - 46);

  const pentecost = new Date(easter);
  pentecost.setDate(pentecost.getDate() + 49);

  if (date >= adventStart && date < christmas) return 'Advent';
  if (date >= christmas && date <= baptismOfLord) return 'Christmas';
  if (date >= ashWednesday && date < easter) return 'Lent';
  if (date >= easter && date <= pentecost) return 'Easter';

  return 'Ordinary Time';
}

function getWeekInSeason(date: Date, season: string): string {
  const year = date.getFullYear();
  const easter = calculateEaster(year);

  if (season === 'Ordinary Time') {
    const pentecost = new Date(easter);
    pentecost.setDate(pentecost.getDate() + 49);

    if (date > pentecost) {
      const weeksDiff = Math.floor((date.getTime() - pentecost.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const weekNumber = Math.min(weeksDiff + 10, 34);
      return `${weekNumber}th Sunday in Ordinary Time`;
    } else {
      const baptismOfLord = new Date(year, 0, 13);
      const weeksDiff = Math.floor((date.getTime() - baptismOfLord.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const weekNumber = Math.max(1, Math.min(weeksDiff + 1, 8));
      return `${weekNumber}th Sunday in Ordinary Time`;
    }
  }

  if (season === 'Advent') {
    const christmas = new Date(year, 11, 25);
    const adventStart = new Date(christmas);
    adventStart.setDate(christmas.getDate() - (22 + christmas.getDay()) % 7);
    const weeksDiff = Math.floor((date.getTime() - adventStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${weeksDiff + 1}st Sunday of Advent`;
  }

  if (season === 'Lent') {
    const ashWednesday = new Date(easter);
    ashWednesday.setDate(ashWednesday.getDate() - 46);
    const weeksDiff = Math.floor((date.getTime() - ashWednesday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (weeksDiff >= 5) return 'Palm Sunday';
    return `${weeksDiff + 1}st Sunday of Lent`;
  }

  return season;
}

function getLiturgicalYear(date: Date): string {
  const year = date.getFullYear();
  const advent = new Date(year, 10, 27);
  const liturgicalYear = date >= advent ? year + 1 : year;
  const cycle = liturgicalYear % 3;
  return cycle === 1 ? 'A' : cycle === 2 ? 'B' : 'C';
}

function mapSeasonToColor(season: string): string {
  const seasonLower = season.toLowerCase();
  if (seasonLower.includes('advent') || seasonLower.includes('lent')) return 'Purple';
  if (seasonLower.includes('christmas') || seasonLower.includes('easter')) return 'White';
  return 'Green';
}

function getSaintForDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const saintDays: Record<string, string> = {
    '1-1': 'Mary, Mother of God',
    '1-6': 'Epiphany of the Lord',
    '2-2': 'Presentation of the Lord',
    '3-19': 'Saint Joseph',
    '3-25': 'Annunciation of the Lord',
    '6-24': 'Birth of John the Baptist',
    '6-29': 'Saints Peter and Paul',
    '8-15': 'Assumption of Mary',
    '9-29': 'Saints Michael, Gabriel and Raphael, Archangels',
    '11-1': 'All Saints',
    '11-2': 'All Souls',
    '12-8': 'Immaculate Conception',
    '12-25': 'Nativity of the Lord',
  };

  return saintDays[`${month}-${day}`] || '';
}
