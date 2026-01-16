import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Church, 
  Calendar, 
  BookOpen, 
  Music,
  Sun,
  Sparkles,
  Cross,
  ChevronDown
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, isSunday, nextSunday } from 'date-fns';

interface LiturgicalColors {
  primary: string;
  secondary?: string;
  name: string;
}

interface LiturgicalWeekData {
  sundayDate: Date;
  sundayTitle: string;
  season: string;
  seasonWeek: number;
  liturgicalYear: string;
  colors: LiturgicalColors;
  readings: {
    first: string;
    psalm: string;
    second?: string;
    gospel: string;
  };
  feastDays: { date: Date; name: string; rank: string }[];
}

// Liturgical year readings for 2026 (Year B/C cycle)
const SUNDAY_READINGS_2026: Record<string, { title: string; first: string; psalm: string; second?: string; gospel: string }> = {
  '2026-01-18': {
    title: 'Second Sunday in Ordinary Time',
    first: '1 Samuel 3:3b-10, 19',
    psalm: 'Psalm 40:2, 4, 7-8, 8-9, 10',
    second: '1 Corinthians 6:13c-15a, 17-20',
    gospel: 'John 1:35-42'
  },
  '2026-01-25': {
    title: 'Third Sunday in Ordinary Time',
    first: 'Jonah 3:1-5, 10',
    psalm: 'Psalm 25:4-5, 6-7, 8-9',
    second: '1 Corinthians 7:29-31',
    gospel: 'Mark 1:14-20'
  },
  '2026-02-01': {
    title: 'Fourth Sunday in Ordinary Time',
    first: 'Deuteronomy 18:15-20',
    psalm: 'Psalm 95:1-2, 6-7, 7-9',
    second: '1 Corinthians 7:32-35',
    gospel: 'Mark 1:21-28'
  },
  '2026-02-08': {
    title: 'Fifth Sunday in Ordinary Time',
    first: 'Job 7:1-4, 6-7',
    psalm: 'Psalm 147:1-2, 3-4, 5-6',
    second: '1 Corinthians 9:16-19, 22-23',
    gospel: 'Mark 1:29-39'
  },
  '2026-02-15': {
    title: 'Sixth Sunday in Ordinary Time',
    first: 'Leviticus 13:1-2, 44-46',
    psalm: 'Psalm 32:1-2, 5, 11',
    second: '1 Corinthians 10:31—11:1',
    gospel: 'Mark 1:40-45'
  },
  '2026-02-18': {
    title: 'Ash Wednesday',
    first: 'Joel 2:12-18',
    psalm: 'Psalm 51:3-4, 5-6ab, 12-13, 14 and 17',
    second: '2 Corinthians 5:20—6:2',
    gospel: 'Matthew 6:1-6, 16-18'
  },
  '2026-02-22': {
    title: 'First Sunday of Lent',
    first: 'Genesis 9:8-15',
    psalm: 'Psalm 25:4-5, 6-7, 8-9',
    second: '1 Peter 3:18-22',
    gospel: 'Mark 1:12-15'
  },
  '2026-03-01': {
    title: 'Second Sunday of Lent',
    first: 'Genesis 22:1-2, 9a, 10-13, 15-18',
    psalm: 'Psalm 116:10, 15, 16-17, 18-19',
    second: 'Romans 8:31b-34',
    gospel: 'Mark 9:2-10'
  },
  '2026-03-08': {
    title: 'Third Sunday of Lent',
    first: 'Exodus 20:1-17',
    psalm: 'Psalm 19:8, 9, 10, 11',
    second: '1 Corinthians 1:22-25',
    gospel: 'John 2:13-25'
  },
  '2026-03-15': {
    title: 'Fourth Sunday of Lent (Laetare Sunday)',
    first: '2 Chronicles 36:14-16, 19-23',
    psalm: 'Psalm 137:1-2, 3, 4-5, 6',
    second: 'Ephesians 2:4-10',
    gospel: 'John 3:14-21'
  },
  '2026-03-22': {
    title: 'Fifth Sunday of Lent',
    first: 'Jeremiah 31:31-34',
    psalm: 'Psalm 51:3-4, 12-13, 14-15',
    second: 'Hebrews 5:7-9',
    gospel: 'John 12:20-33'
  },
  '2026-03-29': {
    title: 'Palm Sunday of the Passion of the Lord',
    first: 'Isaiah 50:4-7',
    psalm: 'Psalm 22:8-9, 17-18, 19-20, 23-24',
    second: 'Philippians 2:6-11',
    gospel: 'Mark 14:1—15:47'
  },
  '2026-04-05': {
    title: 'Easter Sunday of the Resurrection of the Lord',
    first: 'Acts 10:34a, 37-43',
    psalm: 'Psalm 118:1-2, 16-17, 22-23',
    second: 'Colossians 3:1-4',
    gospel: 'John 20:1-9'
  },
  '2026-04-12': {
    title: 'Second Sunday of Easter (Divine Mercy Sunday)',
    first: 'Acts 4:32-35',
    psalm: 'Psalm 118:2-4, 13-15, 22-24',
    second: '1 John 5:1-6',
    gospel: 'John 20:19-31'
  },
  '2026-04-19': {
    title: 'Third Sunday of Easter',
    first: 'Acts 3:13-15, 17-19',
    psalm: 'Psalm 4:2, 4, 7-8, 9',
    second: '1 John 2:1-5a',
    gospel: 'Luke 24:35-48'
  },
  '2026-04-26': {
    title: 'Fourth Sunday of Easter',
    first: 'Acts 4:8-12',
    psalm: 'Psalm 118:1, 8-9, 21-23, 26, 28, 29',
    second: '1 John 3:1-2',
    gospel: 'John 10:11-18'
  }
};

// Major feast days in 2026
const FEAST_DAYS_2026: { date: string; name: string; rank: string }[] = [
  { date: '2026-02-02', name: 'Presentation of the Lord', rank: 'Feast' },
  { date: '2026-02-18', name: 'Ash Wednesday', rank: 'Day of Fast and Abstinence' },
  { date: '2026-03-19', name: 'St. Joseph, Spouse of the Blessed Virgin Mary', rank: 'Solemnity' },
  { date: '2026-03-25', name: 'Annunciation of the Lord', rank: 'Solemnity' },
  { date: '2026-04-02', name: 'Holy Thursday', rank: 'Solemnity' },
  { date: '2026-04-03', name: 'Good Friday', rank: 'Day of Fast and Abstinence' },
  { date: '2026-04-04', name: 'Holy Saturday / Easter Vigil', rank: 'Solemnity' },
  { date: '2026-04-05', name: 'Easter Sunday', rank: 'Solemnity' },
  { date: '2026-05-14', name: 'Ascension of the Lord', rank: 'Solemnity' },
  { date: '2026-05-24', name: 'Pentecost Sunday', rank: 'Solemnity' }
];

const getLiturgicalSeason = (date: Date): { season: string; week: number; colors: LiturgicalColors } => {
  const year = date.getFullYear();
  
  // Calculate Easter for the year
  const getEasterDate = (y: number): Date => {
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
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
    return new Date(y, month - 1, day);
  };

  const easter = getEasterDate(year);
  const ashWednesday = new Date(easter);
  ashWednesday.setDate(easter.getDate() - 46);
  
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);

  // Advent calculation
  const christmas = new Date(year, 11, 25);
  const christmasDay = christmas.getDay();
  const advent = new Date(christmas);
  advent.setDate(christmas.getDate() - (christmasDay === 0 ? 28 : 28 - christmasDay + 7));

  if (date >= advent && date < christmas) {
    const weekNum = Math.floor((date.getTime() - advent.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    return { season: 'Advent', week: weekNum, colors: { primary: '#663399', name: 'Purple' } };
  }
  
  if (date >= christmas || date < new Date(year, 0, 13)) {
    return { season: 'Christmas', week: 1, colors: { primary: '#FFFFFF', secondary: '#FFD700', name: 'White/Gold' } };
  }
  
  if (date >= ashWednesday && date < easter) {
    const weekNum = Math.floor((date.getTime() - ashWednesday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    return { season: 'Lent', week: weekNum, colors: { primary: '#663399', name: 'Purple' } };
  }
  
  if (date >= easter && date <= pentecost) {
    const weekNum = Math.floor((date.getTime() - easter.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    return { season: 'Easter', week: weekNum, colors: { primary: '#FFFFFF', secondary: '#FFD700', name: 'White/Gold' } };
  }

  return { season: 'Ordinary Time', week: 1, colors: { primary: '#228B22', name: 'Green' } };
};

const getLiturgicalYear = (date: Date): string => {
  const year = date.getFullYear();
  // 2026 is Year B for most of the year
  return year % 3 === 0 ? 'C' : year % 3 === 1 ? 'A' : 'B';
};

const LiturgicalWeekCard: React.FC = () => {
  const [weekData, setWeekData] = useState<LiturgicalWeekData | null>(null);
  const [readingsOpen, setReadingsOpen] = useState(true);
  const [feastsOpen, setFeastsOpen] = useState(true);

  useEffect(() => {
    const today = new Date();
    const upcomingSunday = isSunday(today) ? today : nextSunday(today);
    const sundayKey = format(upcomingSunday, 'yyyy-MM-dd');
    
    const seasonData = getLiturgicalSeason(upcomingSunday);
    const liturgicalYear = getLiturgicalYear(upcomingSunday);
    
    // Get readings for this Sunday
    const sundayReadings = SUNDAY_READINGS_2026[sundayKey];
    
    // Get feast days for this week
    const weekStart = startOfWeek(upcomingSunday, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(upcomingSunday, { weekStartsOn: 0 });
    const weekFeastDays = FEAST_DAYS_2026.filter(feast => {
      const feastDate = new Date(feast.date);
      return feastDate >= weekStart && feastDate <= weekEnd;
    }).map(feast => ({
      date: new Date(feast.date),
      name: feast.name,
      rank: feast.rank
    }));

    setWeekData({
      sundayDate: upcomingSunday,
      sundayTitle: sundayReadings?.title || `${seasonData.season} - Week ${seasonData.week}`,
      season: seasonData.season,
      seasonWeek: seasonData.week,
      liturgicalYear,
      colors: seasonData.colors,
      readings: sundayReadings ? {
        first: sundayReadings.first,
        psalm: sundayReadings.psalm,
        second: sundayReadings.second,
        gospel: sundayReadings.gospel
      } : {
        first: 'Readings to be announced',
        psalm: 'Responsorial Psalm',
        gospel: 'Gospel Reading'
      },
      feastDays: weekFeastDays
    });
  }, []);

  if (!weekData) return null;

  const colorStyle = {
    backgroundColor: weekData.colors.primary === '#FFFFFF' 
      ? 'hsl(var(--primary) / 0.1)' 
      : weekData.colors.primary,
    color: weekData.colors.primary === '#FFFFFF' || weekData.colors.primary === '#FFD700'
      ? 'hsl(var(--foreground))'
      : '#FFFFFF'
  };

  return (
    <Card className="overflow-hidden">
      {/* Header with liturgical color - Enhanced sizing */}
      <div 
        className="p-4 sm:p-6 lg:p-8 text-center"
        style={colorStyle}
      >
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <Church className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
          <span className="text-sm sm:text-base lg:text-lg font-medium uppercase tracking-wide">
            Liturgical Week Profile
          </span>
        </div>
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">{weekData.sundayTitle}</h3>
        <p className="text-sm sm:text-base lg:text-lg opacity-90 mt-2">
          {format(weekData.sundayDate, 'MMMM d, yyyy')} • Year {weekData.liturgicalYear}
        </p>
      </div>

      <CardContent className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Season & Color Info - Enhanced */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <span className="text-sm sm:text-base lg:text-lg font-medium">{weekData.season}</span>
            {weekData.seasonWeek > 0 && (
              <Badge variant="outline" className="text-xs sm:text-sm">Week {weekData.seasonWeek}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-background shadow-sm"
              style={{ backgroundColor: weekData.colors.primary }}
            />
            <span className="text-sm sm:text-base text-muted-foreground">{weekData.colors.name}</span>
          </div>
        </div>

        {/* Readings - Collapsible */}
        <Collapsible open={readingsOpen} onOpenChange={setReadingsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 sm:py-3 border-t border-b">
            <div className="flex items-center gap-2 sm:gap-3">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary" />
              <span className="text-base sm:text-lg lg:text-xl font-semibold">Sunday Readings</span>
            </div>
            <ChevronDown className={`h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground transition-transform ${readingsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 sm:pt-4">
            <div className="grid gap-2 sm:gap-3">
              <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 lg:p-4 rounded-lg bg-muted/50">
                <Badge variant="secondary" className="text-xs sm:text-sm shrink-0 mt-0.5">1st</Badge>
                <span className="text-sm sm:text-base lg:text-lg">{weekData.readings.first}</span>
              </div>
              
              <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 lg:p-4 rounded-lg bg-primary/5 border border-primary/20">
                <Badge className="text-xs sm:text-sm shrink-0 mt-0.5 bg-primary/20 text-primary hover:bg-primary/30">Psalm</Badge>
                <span className="text-sm sm:text-base lg:text-lg font-medium">{weekData.readings.psalm}</span>
              </div>
              
              {weekData.readings.second && (
                <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 lg:p-4 rounded-lg bg-muted/50">
                  <Badge variant="secondary" className="text-xs sm:text-sm shrink-0 mt-0.5">2nd</Badge>
                  <span className="text-sm sm:text-base lg:text-lg">{weekData.readings.second}</span>
                </div>
              )}
              
              <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 lg:p-4 rounded-lg bg-muted/50">
                <Badge variant="outline" className="text-xs sm:text-sm shrink-0 mt-0.5 border-primary text-primary">Gospel</Badge>
                <span className="text-sm sm:text-base lg:text-lg">{weekData.readings.gospel}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Feast Days - Collapsible */}
        {weekData.feastDays.length > 0 && (
          <Collapsible open={feastsOpen} onOpenChange={setFeastsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 sm:py-3 border-t border-b">
              <div className="flex items-center gap-2 sm:gap-3">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-500" />
                <span className="text-base sm:text-lg lg:text-xl font-semibold">Feast Days This Week</span>
              </div>
              <ChevronDown className={`h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground transition-transform ${feastsOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 sm:pt-4">
              <div className="space-y-2 sm:space-y-3">
                {weekData.feastDays.map((feast, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 sm:p-3 lg:p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Cross className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                      <span className="text-sm sm:text-base lg:text-lg font-medium">{feast.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-xs sm:text-sm">{format(feast.date, 'EEE, MMM d')}</span>
                      <Badge variant="outline" className="text-xs sm:text-sm">{feast.rank}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Music suggestions hint - Enhanced */}
        <div className="pt-3 sm:pt-4 border-t">
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm lg:text-base text-muted-foreground">
            <Music className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Select hymns for this Sunday in the Modules tab → Order of Mass</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiturgicalWeekCard;
