import { useState } from 'react';

export interface LiturgicalColors {
  primary: string;
  secondary?: string;
  name: string;
}

export interface SaintData {
  name: string;
  title?: string;
  feast_level: 'memorial' | 'feast' | 'solemnity' | 'optional_memorial';
  description?: string;
}

export interface LiturgicalMusicSuggestions {
  entrance_hymn: string[];
  responsorial_psalm: string[];
  alleluia: string[];
  offertory: string[];
  communion: string[];
  closing_hymn: string[];
}

export interface EnhancedLiturgicalData {
  date: string;
  liturgical_year: string; // A, B, or C
  season: string;
  season_week: number;
  liturgical_colors: LiturgicalColors;
  rank: string; // weekday, sunday, feast, etc.
  celebration_name?: string;
  saints: SaintData[];
  readings: {
    first_reading: { citation: string; text?: string };
    psalm: { citation: string; refrain?: string; text?: string };
    second_reading?: { citation: string; text?: string };
    gospel: { citation: string; text?: string };
  };
  music_suggestions: LiturgicalMusicSuggestions;
  preface_suggestion?: string;
  prayer_suggestions: {
    collect?: string;
    prayer_over_offerings?: string;
    prayer_after_communion?: string;
  };
  additional_notes?: string;
}

export const useEnhancedLiturgicalData = () => {
  const [data, setData] = useState<EnhancedLiturgicalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLiturgicalYear = (date: Date): string => {
    // Liturgical year starts with First Sunday of Advent
    const year = date.getFullYear();
    const advent = getFirstSundayOfAdvent(year);
    
    if (date >= advent) {
      return ((year + 1) % 3 === 1) ? 'A' : ((year + 1) % 3 === 2) ? 'B' : 'C';
    } else {
      return (year % 3 === 1) ? 'A' : (year % 3 === 2) ? 'B' : 'C';
    }
  };

  const getFirstSundayOfAdvent = (year: number): Date => {
    const christmas = new Date(year, 11, 25); // December 25
    const dayOfWeek = christmas.getDay(); // 0 = Sunday, 6 = Saturday
    const daysToSubtract = dayOfWeek === 0 ? 28 : (28 - dayOfWeek);
    const advent = new Date(christmas);
    advent.setDate(christmas.getDate() - daysToSubtract);
    return advent;
  };

  const getLiturgicalSeason = (date: Date): { season: string; week: number; colors: LiturgicalColors } => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Calculate key liturgical dates
    const easter = getEasterDate(year);
    const ashWednesday = new Date(easter);
    ashWednesday.setDate(easter.getDate() - 46);
    
    const advent = getFirstSundayOfAdvent(year);
    const christmas = new Date(year, 11, 25);
    const epiphany = new Date(year + 1, 0, 6);
    const baptismOfLord = getBaptismOfLord(year + 1);
    
    // Determine season
    if (date >= advent && date < christmas) {
      const weekNum = Math.floor((date.getTime() - advent.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      return {
        season: 'Advent',
        week: weekNum,
        colors: { primary: '#663399', name: 'Purple' }
      };
    } else if (date >= christmas && date < baptismOfLord) {
      return {
        season: 'Christmas',
        week: 1,
        colors: { primary: '#FFD700', secondary: '#FFFFFF', name: 'Gold/White' }
      };
    } else if (date >= ashWednesday && date < easter) {
      const weekNum = Math.floor((date.getTime() - ashWednesday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      return {
        season: 'Lent',
        week: weekNum,
        colors: { primary: '#663399', name: 'Purple' }
      };
    } else if (date >= easter) {
      const pentecost = new Date(easter);
      pentecost.setDate(easter.getDate() + 49);
      
      if (date <= pentecost) {
        const weekNum = Math.floor((date.getTime() - easter.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        return {
          season: 'Easter',
          week: weekNum,
          colors: { primary: '#FFFFFF', secondary: '#FFD700', name: 'White/Gold' }
        };
      }
    }
    
    // Default to Ordinary Time
    return {
      season: 'Ordinary Time',
      week: 1,
      colors: { primary: '#228B22', name: 'Green' }
    };
  };

  const getEasterDate = (year: number): Date => {
    // Simplified Easter calculation (Gregorian calendar)
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
  };

  const getBaptismOfLord = (year: number): Date => {
    const epiphany = new Date(year, 0, 6);
    const dayOfWeek = epiphany.getDay();
    const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const baptism = new Date(epiphany);
    baptism.setDate(epiphany.getDate() + daysToAdd);
    return baptism;
  };

  const getMusicSuggestions = (season: string, liturgicalYear: string): LiturgicalMusicSuggestions => {
    const suggestions: Record<string, LiturgicalMusicSuggestions> = {
      'Advent': {
        entrance_hymn: ['O Come, O Come Emmanuel', 'The King Shall Come When Morning Dawns', 'Wake, Awake, for Night Is Flying'],
        responsorial_psalm: ['Lord, Let Us See Your Kindness', 'Let the Lord Enter'],
        alleluia: ['Gospel Acclamation for Advent', 'Come, Lord Jesus'],
        offertory: ['Creator of the Stars of Night', 'Maranatha, Lord Messiah'],
        communion: ['Each Winter As the Year Grows Older', 'My Soul in Stillness Waits'],
        closing_hymn: ['Come, Thou Long Expected Jesus', 'Lift Up Your Heads']
      },
      'Christmas': {
        entrance_hymn: ['O Come, All Ye Faithful', 'Joy to the World', 'Angels We Have Heard on High'],
        responsorial_psalm: ['All the Ends of the Earth', 'Today a Savior Has Been Born'],
        alleluia: ['Gospel Acclamation for Christmas', 'Glory to God in the Highest'],
        offertory: ['What Child Is This', 'Mary Had a Baby'],
        communion: ['Silent Night', 'The First Noel', 'O Holy Night'],
        closing_hymn: ['Go Tell It on the Mountain', 'Hark! The Herald Angels Sing']
      },
      'Lent': {
        entrance_hymn: ['Again We Keep This Solemn Fast', 'Lord, Who Throughout These Forty Days'],
        responsorial_psalm: ['Be Merciful, O Lord', 'Remember Your Mercies'],
        alleluia: ['Praise to You, Lord Jesus Christ', 'Glory and Praise to Our God'],
        offertory: ['Tree of Life', 'Somebody\'s Knocking at Your Door'],
        communion: ['Amazing Grace', 'Were You There'],
        closing_hymn: ['Lift High the Cross', 'Take Up Your Cross']
      },
      'Easter': {
        entrance_hymn: ['Jesus Christ Is Risen Today', 'This Is the Day', 'Alleluia! Alleluia!'],
        responsorial_psalm: ['This Is the Day the Lord Has Made', 'Alleluia, Alleluia, Give Thanks'],
        alleluia: ['Alleluia! Christ Is Risen', 'Celtic Alleluia'],
        offertory: ['Be Joyful, Mary', 'That Easter Day with Joy Was Bright'],
        communion: ['I Am the Bread of Life', 'One Bread, One Body'],
        closing_hymn: ['Crown Him with Many Crowns', 'Thine Is the Glory']
      },
      'Ordinary Time': {
        entrance_hymn: ['All Are Welcome', 'Gather Us In', 'Here I Am, Lord'],
        responsorial_psalm: ['Psalm 23', 'The Lord Is My Shepherd', 'Taste and See'],
        alleluia: ['Celtic Alleluia', 'Gospel Acclamation'],
        offertory: ['Take and Receive', 'We Bring the Sacrifice of Praise'],
        communion: ['One Bread, One Body', 'We Come to Your Feast'],
        closing_hymn: ['Here I Am, Lord', 'Go Make a Difference']
      }
    };

    return suggestions[season] || suggestions['Ordinary Time'];
  };

  const fetchEnhancedLiturgicalData = async (dateString: string): Promise<EnhancedLiturgicalData | null> => {
    setLoading(true);
    setError(null);

    try {
      const targetDate = new Date(dateString);
      const liturgicalYear = getLiturgicalYear(targetDate);
      const seasonData = getLiturgicalSeason(targetDate);
      const musicSuggestions = getMusicSuggestions(seasonData.season, liturgicalYear);

      // For now, we'll use the existing USCCB data for readings
      // In production, you could integrate with additional APIs
      const response = await fetch(`/api/usccb-readings?date=${dateString}`);
      let readingsData = null;
      
      if (response.ok) {
        readingsData = await response.json();
      }

      const enhancedData: EnhancedLiturgicalData = {
        date: dateString,
        liturgical_year: liturgicalYear,
        season: seasonData.season,
        season_week: seasonData.week,
        liturgical_colors: seasonData.colors,
        rank: 'weekday', // This would be determined by more complex logic
        saints: [], // This would come from a saints API
        readings: readingsData?.readings || {
          first_reading: { citation: '', text: '' },
          psalm: { citation: '', refrain: '', text: '' },
          gospel: { citation: '', text: '' }
        },
        music_suggestions: musicSuggestions,
        prayer_suggestions: {
          collect: `Grant us, Lord, the wisdom to prepare for your coming...`,
          prayer_over_offerings: `Accept, O Lord, these gifts we offer...`,
          prayer_after_communion: `May this communion strengthen us...`
        },
        additional_notes: `${seasonData.season} is a time of ${
          seasonData.season === 'Advent' ? 'preparation and anticipation' :
          seasonData.season === 'Christmas' ? 'joy and celebration' :
          seasonData.season === 'Lent' ? 'penance and preparation' :
          seasonData.season === 'Easter' ? 'rejoicing in the resurrection' :
          'growth in ordinary Christian living'
        }.`
      };

      setData(enhancedData);
      return enhancedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch enhanced liturgical data';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    fetchEnhancedLiturgicalData
  };
};