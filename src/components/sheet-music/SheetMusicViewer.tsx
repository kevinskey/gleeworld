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
import { MobileSheetMusicViewer } from "./MobileSheetMusicViewer";
import { SheetMusicNav } from "./SheetMusicNav";
import { SheetMusicSeekBar } from "./SheetMusicSeekBar";
import { Metronome } from "./audio-utilities/Metronome";
import { PitchPipe } from "./audio-utilities/PitchPipe";
import { Tuner } from "./audio-utilities/Tuner";

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];

interface SheetMusicViewerProps {
  sheetMusic: SheetMusic;
  onBack: () => void;
}

export const SheetMusicViewer = ({ sheetMusic, onBack }: SheetMusicViewerProps) => {
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [showMobileViewer, setShowMobileViewer] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(5); // Mock total pages - would come from PDF
  const [activeAudioUtility, setActiveAudioUtility] = useState<string | null>(null);
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

  // Navigation handlers
  const handleSongSelect = (songId: string) => {
    console.log('Song selected:', songId);
    // Handle song selection
  };

  const handleSetlistSelect = (setlistId: string) => {
    console.log('Setlist selected:', setlistId);
    // Handle setlist selection
  };

  const handleSearchSelect = (documentId: string) => {
    console.log('Document selected:', documentId);
    // Handle document selection
  };

  const handleAudioUtilitySelect = (utility: string) => {
    setActiveAudioUtility(utility);
  };

  const handleToolSelect = (tool: string) => {
    console.log('Tool selected:', tool);
    // Handle tool selection
  };

  // Seek bar handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // PDF Menu handlers
  const handleScoresClick = () => {
    console.log('Scores clicked');
  };

  const handleBookmarksClick = () => {
    console.log('Bookmarks clicked');
  };

  const handleSetlistsClick = () => {
    console.log('Setlists clicked');
  };

  const handleTitleDisplayClick = () => {
    console.log('Title display clicked');
  };

  const handleSearchClick = () => {
    console.log('Search clicked');
  };

  const handleAudioUtilitiesClick = () => {
    console.log('Audio utilities clicked');
  };

  const handleToolsClick = () => {
    console.log('Tools clicked');
  };

  // Use mobile viewer when on mobile devices
  if (isMobile) {
    return (
      <>
        <MobileSheetMusicViewer
          isOpen={showMobileViewer}
          onClose={() => setShowMobileViewer(false)}
          sheetMusicId={sheetMusic.id}
        />
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" onClick={(e) => { e.preventDefault(); onBack(); }}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Library
              </Button>
              
              <Button onClick={() => setShowMobileViewer(true)} size="lg" className="bg-primary text-primary-foreground">
                Open Mobile Reader
              </Button>
            </div>

            {/* Title and Details */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">{sheetMusic.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground mb-4">
                {sheetMusic.composer && (
                  <span className="text-sm">by {sheetMusic.composer}</span>
                )}
                {sheetMusic.arranger && (
                  <span className="text-sm">• arr. {sheetMusic.arranger}</span>
                )}
                {sheetMusic.language && (
                  <span className="text-sm">• {sheetMusic.language}</span>
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
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-4">
                {sheetMusic.audio_preview_url && (
                  <Button variant="outline" onClick={handleAudioToggle} className="flex-1">
                    {audioPlaying ? (
                      <Pause className="h-4 w-4 mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {audioPlaying ? 'Pause' : 'Play'} Preview
                  </Button>
                )}
                
                {sheetMusic.pdf_url && (
                  <Button onClick={handleDownload} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Tabs for mobile */}
          <Tabs defaultValue="practice" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="practice">
                <Star className="h-4 w-4 mr-2" />
                Practice
              </TabsTrigger>
              <TabsTrigger value="recordings">
                <Mic className="h-4 w-4 mr-2" />
                Recordings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="practice">
              <ScoreTracker sheetMusicId={sheetMusic.id} />
            </TabsContent>

            <TabsContent value="recordings">
              <RecordingManager sheetMusicId={sheetMusic.id} />
            </TabsContent>
          </Tabs>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-2">
        <Button variant="outline" onClick={(e) => { e.preventDefault(); onBack(); }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Button>
      </div>

      {/* Navigation */}
      <SheetMusicNav
        currentTitle={sheetMusic.title}
        onSongSelect={handleSongSelect}
        onSetlistSelect={handleSetlistSelect}
        onSearchSelect={handleSearchSelect}
        onAudioUtilitySelect={handleAudioUtilitySelect}
        onToolSelect={handleToolSelect}
      />

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6">
        {/* Sheet Music Details */}
        <div className="mb-6">
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

        {/* PDF Viewer */}
        <Card>
          <CardContent className="p-6">
            {sheetMusic.pdf_url ? (
              <div className="w-full border rounded-lg h-[600px]">
                <iframe
                  src={`${sheetMusic.pdf_url}#toolbar=0&navpanes=0&scrollbar=1&zoom=page-fit&view=FitH`}
                  className="w-full h-full rounded-lg"
                  title={`${sheetMusic.title} - Sheet Music`}
                  style={{ border: 'none' }}
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

        {/* Additional Tools Tabs */}
        <Tabs defaultValue="practice" className="space-y-6">
          <TabsList>
            <TabsTrigger value="practice">
              <Star className="h-4 w-4 mr-2" />
              Practice Scores
            </TabsTrigger>
            <TabsTrigger value="recordings">
              <Mic className="h-4 w-4 mr-2" />
              Recordings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="practice">
            <ScoreTracker sheetMusicId={sheetMusic.id} />
          </TabsContent>

          <TabsContent value="recordings">
            <RecordingManager sheetMusicId={sheetMusic.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Seek Bar Footer */}
      <SheetMusicSeekBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
      />

      {/* Audio Utility Modals */}
      <Metronome
        isOpen={activeAudioUtility === 'metronome'}
        onClose={() => setActiveAudioUtility(null)}
      />
      <PitchPipe
        isOpen={activeAudioUtility === 'pitch-pipe'}
        onClose={() => setActiveAudioUtility(null)}
      />
      <Tuner
        isOpen={activeAudioUtility === 'tuner'}
        onClose={() => setActiveAudioUtility(null)}
      />
    </div>
  );
};