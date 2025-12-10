import React, { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Music, X, Maximize2, Minimize2 } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);

  if (!showMusicLibrary) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen flex flex-col">
      <ResizablePanelGroup direction="vertical" className="flex-1">
        {/* Top: Glee Lounge */}
        <ResizablePanel 
          defaultSize={isExpanded ? 30 : 50} 
          minSize={20}
          className="relative"
        >
          <div className="h-full overflow-auto">
            {children}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />

        {/* Bottom: Music Library */}
        <ResizablePanel 
          defaultSize={isExpanded ? 70 : 50} 
          minSize={20}
          className="relative overflow-hidden"
        >
          <div className="h-full flex flex-col bg-background border-t border-border overflow-hidden">
            {/* Music Library Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-card border-b border-border">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Music Library</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8 w-8"
                >
                  {isExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleMusicLibrary}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Music Library Content - needs to scroll */}
            <div className="flex-1 min-h-0 overflow-auto">
              <MusicLibrary />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
