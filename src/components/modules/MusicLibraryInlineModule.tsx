import React from 'react';
import { ModuleProps } from '@/types/unified-modules';
import { MusicLibrary } from '@/components/music-library/MusicLibrary';

// Wrapper to render the full Music Library inside the dashboard inline view
// Hides the top PageHeader/description so it feels native in the module panel
export const MusicLibraryInlineModule: React.FC<ModuleProps> = () => {
  return (
    <div className="[&_div.mb-6]:hidden">
      <MusicLibrary />
    </div>
  );
};
