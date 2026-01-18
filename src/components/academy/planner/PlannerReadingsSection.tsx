import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, Music, FileText, Cross, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { USCCBLiturgicalData, USCCBReading } from '@/hooks/useUSCCBSync';

interface PlannerReadingsSectionProps {
  liturgicalData: USCCBLiturgicalData | null;
  sundayDate?: string;
}

const ReadingCard: React.FC<{ reading: USCCBReading; icon: React.ReactNode; colorClass: string }> = ({ 
  reading, 
  icon, 
  colorClass 
}) => (
  <Card className="border-l-4" style={{ borderLeftColor: `var(--${colorClass})` }}>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-sm font-medium">{reading.title}</CardTitle>
        </div>
        <Badge variant="outline" className="text-xs">
          {reading.citation}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <ScrollArea className="max-h-32">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {reading.content}
        </p>
      </ScrollArea>
    </CardContent>
  </Card>
);

// Ordinary of the Mass sections for music planning
const ORDINARY_PARTS = [
  { id: 'kyrie', name: 'Kyrie (Lord, Have Mercy)', latin: 'Kyrie eleison', type: 'ordinary' },
  { id: 'gloria', name: 'Gloria', latin: 'Gloria in excelsis Deo', type: 'ordinary', excludeSeasons: ['lent', 'advent'] },
  { id: 'creed', name: 'Creed (Nicene/Apostles)', latin: 'Credo in unum Deum', type: 'ordinary' },
  { id: 'sanctus', name: 'Holy, Holy, Holy (Sanctus)', latin: 'Sanctus, Sanctus, Sanctus', type: 'ordinary' },
  { id: 'memorial', name: 'Memorial Acclamation', latin: 'Mysterium fidei', type: 'ordinary' },
  { id: 'agnus', name: 'Lamb of God (Agnus Dei)', latin: 'Agnus Dei', type: 'ordinary' },
];

const PROPER_PARTS = [
  { id: 'entrance', name: 'Entrance Antiphon/Hymn', type: 'proper' },
  { id: 'responsorial', name: 'Responsorial Psalm', type: 'proper' },
  { id: 'alleluia', name: 'Gospel Acclamation (Alleluia)', type: 'proper' },
  { id: 'offertory', name: 'Offertory/Preparation of Gifts', type: 'proper' },
  { id: 'communion', name: 'Communion Antiphon/Hymn', type: 'proper' },
  { id: 'recessional', name: 'Recessional Hymn', type: 'proper' },
];

export const PlannerReadingsSection: React.FC<PlannerReadingsSectionProps> = ({ 
  liturgicalData,
  sundayDate 
}) => {
  const season = liturgicalData?.season?.toLowerCase() || 'ordinary time';
  const shouldShowGloria = !['lent', 'advent'].includes(season);
  const alleluiaText = season === 'lent' ? 'Lenten Gospel Acclamation' : 'Alleluia';

  // Generate USCCB URL for the date
  const getUSCCBUrl = () => {
    if (!sundayDate) return null;
    const dateObj = new Date(sundayDate);
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `https://bible.usccb.org/bible/readings/${month}${day}${String(year).slice(-2)}.cfm`;
  };

  const usccbUrl = getUSCCBUrl();

  if (!liturgicalData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Click "Load USCCB Data" to populate readings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with USCCB Link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <Cross className="h-5 w-5 text-primary" />
            Liturgy of the Word
          </h4>
          <p className="text-sm text-muted-foreground">
            {liturgicalData.title || liturgicalData.week} • {liturgicalData.season}
          </p>
        </div>
        {usccbUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={usccbUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Full Readings on USCCB
            </a>
          </Button>
        )}
      </div>

      {/* Readings Grid */}
      <div className="grid grid-cols-1 gap-4">
        {liturgicalData.readings.first_reading && (
          <ReadingCard 
            reading={liturgicalData.readings.first_reading}
            icon={<BookOpen className="h-4 w-4 text-blue-600" />}
            colorClass="blue-600"
          />
        )}
        
        {liturgicalData.readings.responsorial_psalm && (
          <ReadingCard 
            reading={liturgicalData.readings.responsorial_psalm}
            icon={<Music className="h-4 w-4 text-amber-600" />}
            colorClass="amber-600"
          />
        )}
        
        {liturgicalData.readings.second_reading && (
          <ReadingCard 
            reading={liturgicalData.readings.second_reading}
            icon={<FileText className="h-4 w-4 text-green-600" />}
            colorClass="green-600"
          />
        )}
        
        {liturgicalData.readings.gospel && (
          <ReadingCard 
            reading={liturgicalData.readings.gospel}
            icon={<Cross className="h-4 w-4 text-red-600" />}
            colorClass="red-600"
          />
        )}
      </div>

      {/* Proper and Ordinary Accordion */}
      <Accordion type="multiple" defaultValue={['proper', 'ordinary']} className="w-full">
        {/* Proper of the Mass */}
        <AccordionItem value="proper">
          <AccordionTrigger className="text-base font-semibold">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Proper of the Mass
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {PROPER_PARTS.map((part) => (
                <Card key={part.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {part.id === 'alleluia' ? alleluiaText : part.name}
                      </p>
                      {part.id === 'responsorial' && liturgicalData.readings.responsorial_psalm && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {liturgicalData.readings.responsorial_psalm.citation}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Variable
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Ordinary of the Mass */}
        <AccordionItem value="ordinary">
          <AccordionTrigger className="text-base font-semibold">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              Ordinary of the Mass
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {ORDINARY_PARTS.map((part) => {
                // Skip Gloria in Lent/Advent
                if (part.excludeSeasons?.includes(season)) {
                  return (
                    <Card key={part.id} className="p-3 opacity-50 bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm line-through">{part.name}</p>
                          <p className="text-xs text-muted-foreground">{part.latin}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          Omitted
                        </Badge>
                      </div>
                    </Card>
                  );
                }
                
                return (
                  <Card key={part.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{part.name}</p>
                        <p className="text-xs text-muted-foreground">{part.latin}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Fixed
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4 px-1">
              💡 Tip: The Ordinary remains consistent across celebrations. Choose a Mass setting 
              (e.g., Mass of Creation, Chant Mass) that fits the liturgical season.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Liturgical Color */}
      {liturgicalData.liturgical_color && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded-full border-2 border-border" 
              style={{ 
                backgroundColor: getColorHex(liturgicalData.liturgical_color) 
              }} 
            />
            <div>
              <p className="font-medium">Liturgical Color: {liturgicalData.liturgical_color}</p>
              <p className="text-xs text-muted-foreground">
                {getColorMeaning(liturgicalData.liturgical_color)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

// Helper functions for liturgical colors
function getColorHex(color: string): string {
  const colors: Record<string, string> = {
    'Green': '#22c55e',
    'Purple': '#9333ea',
    'Violet': '#8b5cf6',
    'White': '#f8fafc',
    'Gold': '#eab308',
    'Red': '#ef4444',
    'Rose': '#ec4899',
    'Black': '#1e293b',
  };
  return colors[color] || '#94a3b8';
}

function getColorMeaning(color: string): string {
  const meanings: Record<string, string> = {
    'Green': 'Growth in faith during Ordinary Time',
    'Purple': 'Penance and preparation (Advent/Lent)',
    'Violet': 'Penance and preparation',
    'White': 'Joy, purity, and celebration (Christmas/Easter)',
    'Gold': 'Festive celebrations and solemnities',
    'Red': 'Holy Spirit, martyrs, Passion',
    'Rose': 'Rejoicing mid-Advent (Gaudete) or mid-Lent (Laetare)',
    'Black': 'Mourning (optional for funerals)',
  };
  return meanings[color] || 'Liturgical celebration';
}
