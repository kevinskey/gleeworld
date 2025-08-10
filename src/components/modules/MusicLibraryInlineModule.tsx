import React from 'react';
import { ModuleProps } from '@/types/unified-modules';
import { MusicLibrary } from '@/components/music-library/MusicLibrary';
import { Music } from 'lucide-react';

// Wrapper to render the full Music Library inside the dashboard inline view
// Adds a compact header and hides the full-page PageHeader inside MusicLibrary
export const MusicLibraryInlineModule: React.FC<ModuleProps> = () => {
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-background">
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-background/60">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Music Library</h3>
        </div>
      </div>
      <div className="[&_div.mb-6]:hidden">
        <MusicLibrary />
      </div>
    </div>
  );
};
