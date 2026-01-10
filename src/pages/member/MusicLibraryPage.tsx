import React from 'react';
import { MusicLibrary } from '@/components/music-library/MusicLibrary';

export const MusicLibraryPage: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[calc(100dvh-4rem)]">
      <MusicLibrary />
    </div>
  );
};

export default MusicLibraryPage;
