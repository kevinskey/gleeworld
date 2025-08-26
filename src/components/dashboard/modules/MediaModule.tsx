import React from 'react';
import { MediaLibrary } from '@/components/radio/MediaLibrary';
import { Camera } from 'lucide-react';

export const MediaModule = () => {
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-background">
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-background/60">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Media Library</h3>
        </div>
      </div>
      <div className="p-4">
        <MediaLibrary />
      </div>
    </div>
  );
};