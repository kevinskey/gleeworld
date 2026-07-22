import React from 'react';
import { MusicLibrary } from '@/components/music-library/MusicLibrary';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export const MusicLibraryPage: React.FC = () => {
  return (
    <UniversalLayout>
      <div className="w-full h-full">
        <MusicLibrary />
      </div>
    </UniversalLayout>
  );
};

export default MusicLibraryPage;
