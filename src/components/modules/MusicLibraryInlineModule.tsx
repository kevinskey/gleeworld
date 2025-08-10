import React from 'react';
import { ModuleProps } from '@/types/unified-modules';
import { MusicLibrary } from '@/components/music-library/MusicLibrary';
import { Music } from 'lucide-react';

export const MusicLibraryInlineModule: React.FC<ModuleProps> = () => {
  return (
    <div className="h-[calc(100vh-180px)] min-h-[60vh] overflow-hidden">
      <div className="h-full [&_div.mb-6]:hidden [&_div.mb-2]:hidden">
        <MusicLibrary embedded heightClass="h-full" />
      </div>
    </div>
  );
};
