import React from 'react';
import { ModuleProps } from '@/types/unified-modules';
import { MusicLibrary } from '@/components/music-library/MusicLibrary';
import { Music } from 'lucide-react';

// Wrapper to render the full Music Library inside the dashboard inline view
// Adds a compact header and hides the full-page PageHeader inside MusicLibrary
export const MusicLibraryInlineModule: React.FC<ModuleProps> = () => {
  return (
    <div className="overflow-hidden">
      <div className="[&_div.mb-6]:hidden [&_div.mb-2]:hidden">
        <MusicLibrary />
      </div>
    </div>
  );
};
