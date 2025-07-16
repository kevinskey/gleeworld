import React, { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Database } from '@/integrations/supabase/types';
import { SheetMusicLibraryPage } from '@/components/sheet-music-viewer/SheetMusicLibraryPage';
import { SheetMusicViewer } from '@/components/sheet-music-viewer/SheetMusicViewer';

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];

const SheetMusicPage: React.FC = () => {
  const [selectedSheetMusic, setSelectedSheetMusic] = useState<SheetMusic | null>(null);
  const navigate = useNavigate();

  const handleSelectSheetMusic = (sheetMusic: SheetMusic) => {
    setSelectedSheetMusic(sheetMusic);
  };

  const handleBackToLibrary = () => {
    setSelectedSheetMusic(null);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (selectedSheetMusic) {
    return (
      <SheetMusicViewer
        sheetMusic={selectedSheetMusic}
        onBack={handleBackToLibrary}
      />
    );
  }

  return (
    <UniversalLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button onClick={handleBackToDashboard} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <div className="flex items-center gap-2">
                <Music className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Sheet Music Library</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          <SheetMusicLibraryPage
            onSelectSheetMusic={handleSelectSheetMusic}
          />
        </div>
      </div>
    </UniversalLayout>
  );
};

export default SheetMusicPage;