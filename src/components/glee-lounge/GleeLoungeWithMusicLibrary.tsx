import React from 'react';
import { Button } from '@/components/ui/button';
import { Music, X } from 'lucide-react';
import { MusicLibrary } from '@/components/music-library/MusicLibrary';

interface GleeLoungeWithMusicLibraryProps {
  children: React.ReactNode;
  showMusicLibrary: boolean;
  onToggleMusicLibrary: () => void;
}

export function GleeLoungeWithMusicLibrary({ 
  children, 
  showMusicLibrary, 
  onToggleMusicLibrary 
}: GleeLoungeWithMusicLibraryProps) {
  if (!showMusicLibrary) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-40 flex bg-background">
      {/* Left: Glee Lounge - Fixed narrow width */}
      <div className="w-72 lg:w-80 flex-shrink-0 h-full overflow-auto border-r border-border bg-background">
        {children}
      </div>

      {/* Right: Music Library - Takes remaining space */}
      <div className="flex-1 h-full flex flex-col bg-background overflow-hidden">
        {/* Music Library Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Music Library</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMusicLibrary}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Music Library Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <MusicLibrary />
        </div>
      </div>
    </div>
  );
}
