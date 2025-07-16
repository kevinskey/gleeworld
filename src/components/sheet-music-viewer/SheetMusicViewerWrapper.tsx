import React, { useState } from 'react';
import { Database } from '@/integrations/supabase/types';
import { SheetMusicLibrary } from './SheetMusicLibrary';
import { SheetMusicViewer } from './SheetMusicViewer';

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];

interface SheetMusicViewerWrapperProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SheetMusicViewerWrapper: React.FC<SheetMusicViewerWrapperProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedSheetMusic, setSelectedSheetMusic] = useState<SheetMusic | null>(null);

  const handleSelectSheetMusic = (sheetMusic: SheetMusic) => {
    setSelectedSheetMusic(sheetMusic);
  };

  const handleBackToLibrary = () => {
    setSelectedSheetMusic(null);
  };

  const handleClose = () => {
    setSelectedSheetMusic(null);
    onClose();
  };

  // Show full-screen viewer when a sheet music is selected
  if (selectedSheetMusic && isOpen) {
    return (
      <SheetMusicViewer
        sheetMusic={selectedSheetMusic}
        onBack={handleBackToLibrary}
      />
    );
  }

  // Show library dialog when open but no sheet music selected
  return (
    <SheetMusicLibrary
      isOpen={isOpen}
      onClose={handleClose}
      onSelectSheetMusic={handleSelectSheetMusic}
    />
  );
};