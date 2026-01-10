import React from 'react';
import { ModuleProps } from '@/types/unified-modules';
import { MusicLibrary } from '@/components/music-library/MusicLibrary';

// Wrapper to render the full Music Library inside the dashboard inline view
// On mobile, renders without additional headers since MobileMusicLibrary handles its own UI
export const MusicLibraryInlineModule: React.FC<ModuleProps> = () => {
  return (
    <div className="rounded-lg overflow-hidden bg-background h-[calc(100dvh-8rem)] sm:h-auto sm:border sm:border-border">
      {/* Remove redundant header - MobileMusicLibrary already has its own header */}
      <MusicLibrary />
    </div>
  );
};
