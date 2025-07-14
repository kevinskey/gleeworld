import { useState } from "react";
import { ArrowLeft, Download, Star, TrendingUp, Mic, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "@/integrations/supabase/types";
import { ScoreTracker } from "./ScoreTracker";
import { RecordingManager } from "./RecordingManager";
import { useIsMobile } from "@/hooks/use-mobile";

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];

interface SheetMusicViewerProps {
  sheetMusic: SheetMusic;
  onBack: () => void;
}

export const SheetMusicViewer = ({ sheetMusic, onBack }: SheetMusicViewerProps) => {
  const [audioPlaying, setAudioPlaying] = useState(false);
  const isMobile = useIsMobile();

  const handleDownload = async () => {
    if (sheetMusic.pdf_url) {
      const link = document.createElement('a');
      link.href = sheetMusic.pdf_url;
      link.download = `${sheetMusic.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleAudioToggle = () => {
    setAudioPlaying(!audioPlaying);
    // Audio playback logic would go here
  };

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
          
          <div className="flex items-center gap-2">
            {sheetMusic.audio_preview_url && (
              <Button variant="outline" onClick={handleAudioToggle}>
                {audioPlaying ? (
                  <Pause className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {audioPlaying ? 'Pause' : 'Play'} Preview
              </Button>
            )}
            
            {sheetMusic.pdf_url && (
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
          </div>
        </div>

        {/* Title and Details */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{sheetMusic.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
            {sheetMusic.composer && (
              <span>by {sheetMusic.composer}</span>
            )}
            {sheetMusic.arranger && (
              <span>• arr. {sheetMusic.arranger}</span>
            )}
            {sheetMusic.language && (
              <span>• {sheetMusic.language}</span>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {sheetMusic.difficulty_level && (
              <Badge className={getDifficultyColor(sheetMusic.difficulty_level)}>
                {sheetMusic.difficulty_level}
              </Badge>
            )}
            
            {sheetMusic.voice_parts && sheetMusic.voice_parts.map((part) => (
              <Badge key={part} variant="outline">
                {part}
              </Badge>
            ))}
            
            {sheetMusic.tags && sheetMusic.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Musical Details */}
          {(sheetMusic.key_signature || sheetMusic.time_signature || sheetMusic.tempo_marking) && (
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              {sheetMusic.key_signature && (
                <span>Key: {sheetMusic.key_signature}</span>
              )}
              {sheetMusic.time_signature && (
                <span>Time: {sheetMusic.time_signature}</span>
              )}
              {sheetMusic.tempo_marking && (
                <span>Tempo: {sheetMusic.tempo_marking}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="viewer" className="space-y-6">
        <TabsList>
          <TabsTrigger value="viewer">Sheet Music</TabsTrigger>
          <TabsTrigger value="practice">
            <Star className="h-4 w-4 mr-2" />
            Practice Scores
          </TabsTrigger>
          <TabsTrigger value="recordings">
            <Mic className="h-4 w-4 mr-2" />
            Recordings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="viewer">
          <Card>
            <CardContent className="p-6">
              {sheetMusic.pdf_url ? (
                <div className={`w-full border rounded-lg ${isMobile ? 'h-[80vh]' : 'h-[800px]'}`}>
                  <iframe
                    src={`${sheetMusic.pdf_url}#toolbar=0&navpanes=0&scrollbar=1&zoom=${isMobile ? 'page-width' : 'page-fit'}&view=FitH`}
                    className="w-full h-full rounded-lg"
                    title={`${sheetMusic.title} - Sheet Music`}
                    style={{ 
                      border: 'none',
                      ...(isMobile && { 
                        width: '100vw', 
                        maxWidth: '100%',
                        transform: 'scale(1)',
                        transformOrigin: 'top left'
                      })
                    }}
                    onLoad={() => console.log('iframe loaded:', sheetMusic.pdf_url)}
                    onError={() => console.error('iframe error:', sheetMusic.pdf_url)}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">No PDF available for this sheet music</p>
                    {sheetMusic.thumbnail_url && (
                      <img 
                        src={sheetMusic.thumbnail_url} 
                        alt={sheetMusic.title}
                        className="max-w-sm mx-auto rounded-lg"
                      />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="practice">
          <ScoreTracker sheetMusicId={sheetMusic.id} />
        </TabsContent>

        <TabsContent value="recordings">
          <RecordingManager sheetMusicId={sheetMusic.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};