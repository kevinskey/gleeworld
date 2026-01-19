import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, ExternalLink, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface USCCBReading {
  id: string;
  liturgical_day: string;
  liturgical_date: string;
  liturgical_season: string | null;
  year_cycle: string | null;
  first_reading: string | null;
  first_reading_reference: string | null;
  responsorial_psalm: string | null;
  psalm_response: string | null;
  second_reading: string | null;
  second_reading_reference: string | null;
  gospel: string | null;
  gospel_reference: string | null;
  source_url: string | null;
}

const getSeasonColor = (season: string | null): string => {
  switch (season?.toLowerCase()) {
    case 'advent':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    case 'christmas':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'lent':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300';
    case 'triduum':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'easter':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    default:
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  }
};

export const USCCBReadingsScroll: React.FC = () => {
  const [readings, setReadings] = useState<USCCBReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReading, setSelectedReading] = useState<USCCBReading | null>(null);

  useEffect(() => {
    const fetchReadings = async () => {
      try {
        const { data, error } = await supabase
          .from('usccb_readings')
          .select('*')
          .eq('year_cycle', 'C')
          .order('liturgical_date', { ascending: true });

        if (error) throw error;
        setReadings(data || []);
        if (data && data.length > 0) {
          setSelectedReading(data[0]);
        }
      } catch (error) {
        console.error('Error fetching USCCB readings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReadings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-200px)] min-h-[500px]">
      {/* Left sidebar - scrollable list of all Sundays */}
      <Card className="w-full lg:w-80 flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Year C Sundays ({readings.length})
          </CardTitle>
        </CardHeader>
        <ScrollArea className="h-[calc(100%-60px)]">
          <div className="space-y-1 p-2">
            {readings.map((reading) => {
              const isSelected = selectedReading?.id === reading.id;
              const date = reading.liturgical_date 
                ? new Date(reading.liturgical_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })
                : null;

              return (
                <button
                  key={reading.id}
                  onClick={() => setSelectedReading(reading)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    isSelected 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'hover:bg-muted/50 border border-transparent hover:border-border'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      {date && (
                        <span className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {date}
                        </span>
                      )}
                      <Badge 
                        variant="secondary" 
                        className={`text-[10px] px-1.5 py-0 ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : getSeasonColor(reading.liturgical_season)}`}
                      >
                        {reading.liturgical_season || 'Ordinary'}
                      </Badge>
                    </div>
                    <span className={`text-sm font-medium line-clamp-2 ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                      {reading.liturgical_day}
                    </span>
                  </div>
                </button>
              );
            })}
            {readings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No readings scraped yet</p>
                <p className="text-xs mt-1">Click "Scrape USCCB Readings" to populate</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Right content - selected reading details */}
      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {selectedReading ? (
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedReading.liturgical_day}</h2>
                  {selectedReading.liturgical_date && (
                    <p className="text-muted-foreground">
                      {new Date(selectedReading.liturgical_date).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  )}
                </div>
                {selectedReading.source_url && (
                  <a 
                    href={selectedReading.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm flex items-center gap-1"
                  >
                    USCCB <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* First Reading */}
              {(selectedReading.first_reading || selectedReading.first_reading_reference) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Badge variant="outline">First Reading</Badge>
                    {selectedReading.first_reading_reference && (
                      <span className="text-sm text-muted-foreground font-normal">
                        {selectedReading.first_reading_reference}
                      </span>
                    )}
                  </h3>
                  {selectedReading.first_reading && (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedReading.first_reading}
                    </p>
                  )}
                </div>
              )}

              {/* Responsorial Psalm */}
              {(selectedReading.responsorial_psalm || selectedReading.psalm_response) && (
                <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10">Responsorial Psalm</Badge>
                  </h3>
                  {selectedReading.psalm_response && (
                    <p className="text-sm font-medium italic">
                      R. {selectedReading.psalm_response}
                    </p>
                  )}
                  {selectedReading.responsorial_psalm && (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedReading.responsorial_psalm}
                    </p>
                  )}
                </div>
              )}

              {/* Second Reading */}
              {(selectedReading.second_reading || selectedReading.second_reading_reference) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Badge variant="outline">Second Reading</Badge>
                    {selectedReading.second_reading_reference && (
                      <span className="text-sm text-muted-foreground font-normal">
                        {selectedReading.second_reading_reference}
                      </span>
                    )}
                  </h3>
                  {selectedReading.second_reading && (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedReading.second_reading}
                    </p>
                  )}
                </div>
              )}

              {/* Gospel */}
              {(selectedReading.gospel || selectedReading.gospel_reference) && (
                <div className="space-y-2 border-l-4 border-primary pl-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Badge className="bg-primary">Gospel</Badge>
                    {selectedReading.gospel_reference && (
                      <span className="text-sm text-muted-foreground font-normal">
                        {selectedReading.gospel_reference}
                      </span>
                    )}
                  </h3>
                  {selectedReading.gospel && (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedReading.gospel}
                    </p>
                  )}
                </div>
              )}

              {/* Empty state if no parsed content */}
              {!selectedReading.first_reading && !selectedReading.responsorial_psalm && 
               !selectedReading.second_reading && !selectedReading.gospel && (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Readings content not yet parsed</p>
                  <p className="text-sm mt-1">
                    Visit the <a href={selectedReading.source_url || '#'} target="_blank" rel="noopener noreferrer" className="text-primary underline">USCCB website</a> for full readings
                  </p>
                </div>
              )}
            </CardContent>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a Sunday to view readings</p>
              </div>
            </CardContent>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
};

export default USCCBReadingsScroll;
