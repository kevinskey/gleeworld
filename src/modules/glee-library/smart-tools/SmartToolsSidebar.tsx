import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Brain, Music, Languages, Info, Volume2 } from 'lucide-react';

interface SheetMusic {
  id: string;
  title: string;
  composer: string | null;
  language: string | null;
  voice_parts: string[] | null;
  tags: string[] | null;
}

interface SmartToolsSidebarProps {
  sheetMusic: SheetMusic;
}

export const SmartToolsSidebar = ({ sheetMusic }: SmartToolsSidebarProps) => {
  const [pronunciationData, setPronunciationData] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<string | null>(null);
  const [loading, setLoading] = useState({
    pronunciation: false,
    historical: false
  });

  // Placeholder for AI integration - to be implemented later
  const generatePronunciation = async () => {
    setLoading({ ...loading, pronunciation: true });
    // TODO: Integrate with AI service for IPA generation
    setTimeout(() => {
      setPronunciationData(`
        IPA Pronunciation Guide for "${sheetMusic.title}":
        
        [This is a placeholder for AI-generated pronunciation guide]
        
        Common Latin/foreign terms:
        • Gloria: ['glo.ri.a]
        • Kyrie: ['ki.ri.e]
        • Sanctus: ['saŋ.ktus]
        
        Note: This will be powered by AI in a future update.
      `);
      setLoading({ ...loading, pronunciation: false });
    }, 1000);
  };

  const generateHistoricalContext = async () => {
    setLoading({ ...loading, historical: true });
    // TODO: Integrate with AI service for historical context
    setTimeout(() => {
      setHistoricalData(`
        About "${sheetMusic.title}":
        
        [This is a placeholder for AI-generated historical context]
        
        Composer: ${sheetMusic.composer || 'Unknown'}
        
        Historical Context:
        • This piece represents the rich tradition of choral music
        • The composition style reflects the era's musical characteristics
        • Performance notes and cultural significance will be detailed here
        
        Note: This will be powered by AI in a future update.
      `);
      setLoading({ ...loading, historical: false });
    }, 1000);
  };

  const analyzeVoiceParts = () => {
    const parts = sheetMusic.voice_parts || [];
    const totalParts = parts.length;
    
    const analysis = {
      arrangement: totalParts <= 2 ? 'Simple' : totalParts <= 4 ? 'Standard' : 'Complex',
      difficulty: totalParts <= 2 ? 'Beginner' : totalParts <= 4 ? 'Intermediate' : 'Advanced',
      recommended: totalParts <= 4 ? 'Suitable for most choirs' : 'Requires experienced singers'
    };

    return analysis;
  };

  const voiceAnalysis = analyzeVoiceParts();

  return (
    <div className="w-80 border-l bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5" />
        <h3 className="font-semibold">Smart Tools</h3>
      </div>

      <Tabs defaultValue="pronunciation" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pronunciation" className="text-xs">IPA</TabsTrigger>
          <TabsTrigger value="about" className="text-xs">About</TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs">Parts</TabsTrigger>
        </TabsList>

        <TabsContent value="pronunciation" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Pronunciation Helper
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span>Language:</span>
                <Badge variant="outline">
                  {sheetMusic.language || 'Not specified'}
                </Badge>
              </div>
              
              {!pronunciationData ? (
                <Button
                  size="sm"
                  onClick={generatePronunciation}
                  disabled={loading.pronunciation}
                  className="w-full"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  {loading.pronunciation ? 'Generating...' : 'Generate IPA Guide'}
                </Button>
              ) : (
                <div className="text-xs whitespace-pre-line bg-muted p-3 rounded text-muted-foreground">
                  {pronunciationData}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                About This Piece
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Title:</span>
                  <p className="text-muted-foreground">{sheetMusic.title}</p>
                </div>
                {sheetMusic.composer && (
                  <div>
                    <span className="font-medium">Composer:</span>
                    <p className="text-muted-foreground">{sheetMusic.composer}</p>
                  </div>
                )}
              </div>

              <Separator />

              {!historicalData ? (
                <Button
                  size="sm"
                  onClick={generateHistoricalContext}
                  disabled={loading.historical}
                  className="w-full"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {loading.historical ? 'Generating...' : 'Get Historical Context'}
                </Button>
              ) : (
                <div className="text-xs whitespace-pre-line bg-muted p-3 rounded text-muted-foreground">
                  {historicalData}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Music className="h-4 w-4" />
                Voice Part Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Voice Parts:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(sheetMusic.voice_parts || []).map(part => (
                      <Badge key={part} variant="secondary" className="text-xs">
                        {part}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-medium">Arrangement:</span>
                  <p className="text-muted-foreground">{voiceAnalysis.arrangement}</p>
                </div>

                <div>
                  <span className="font-medium">Difficulty:</span>
                  <Badge variant={voiceAnalysis.difficulty === 'Beginner' ? 'default' : 
                                 voiceAnalysis.difficulty === 'Intermediate' ? 'secondary' : 'destructive'}>
                    {voiceAnalysis.difficulty}
                  </Badge>
                </div>

                <div>
                  <span className="font-medium">Recommendation:</span>
                  <p className="text-xs text-muted-foreground">{voiceAnalysis.recommended}</p>
                </div>

                {sheetMusic.tags && sheetMusic.tags.length > 0 && (
                  <div>
                    <span className="font-medium">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sheetMusic.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};