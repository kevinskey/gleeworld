import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScoreDisplayProps {
  musicXML: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ musicXML }) => {
  const { toast } = useToast();

  const handleDownloadMusicXML = () => {
    try {
      const blob = new Blob([musicXML], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sight-singing-exercise.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "MusicXML file is downloading",
      });
    } catch (error) {
      console.error('Error downloading MusicXML:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download MusicXML file",
        variant: "destructive"
      });
    }
  };

  // Extract basic info from MusicXML for display
  const extractMusicInfo = (xml: string) => {
    const measureCount = (xml.match(/<measure\s+number=/g) || []).length;
    const keyMatch = xml.match(/<fifths>(-?\d+)<\/fifths>/);
    const timeMatch = xml.match(/<beats>(\d+)<\/beats>[\s\S]*?<beat-type>(\d+)<\/beat-type>/);
    
    const keySignature = keyMatch ? 
      ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'][parseInt(keyMatch[1]) + 7] || 'C' : 'C';
    const timeSignature = timeMatch ? `${timeMatch[1]}/${timeMatch[2]}` : '4/4';
    
    return { measureCount, keySignature, timeSignature };
  };

  const musicInfo = musicXML ? extractMusicInfo(musicXML) : null;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Musical Score</h3>
          {musicXML && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadMusicXML}
            >
              <Download className="h-4 w-4 mr-2" />
              Download MusicXML
            </Button>
          )}
        </div>
        
        {musicXML ? (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Exercise Details</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Measures:</span>
                  <div className="font-medium">{musicInfo?.measureCount || 0}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Key:</span>
                  <div className="font-medium">{musicInfo?.keySignature} major</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Time:</span>
                  <div className="font-medium">{musicInfo?.timeSignature}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-background border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-2">MusicXML Content Preview:</div>
              <pre className="text-xs overflow-auto max-h-[200px] whitespace-pre-wrap break-words">
                {musicXML.substring(0, 500)}...
              </pre>
            </div>
          </div>
        ) : (
          <div className="min-h-[300px] flex items-center justify-center text-muted-foreground">
            Generate an exercise to see the musical score details
          </div>
        )}
      </CardContent>
    </Card>
  );
};