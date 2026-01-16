import React, { useState } from 'react';
import { Radio, Play, Pause, Volume2, Users, SkipForward, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';
import { SongBrowser } from '@/components/radio/SongBrowser';
import { useAuth } from '@/contexts/AuthContext';

export const RadioModule = () => {
  const [showSongBrowser, setShowSongBrowser] = useState(false);
  const { user } = useAuth();
  
  console.log('RadioModule: Component rendering');
  
  try {
    const { 
      isPlaying, 
      isLoading, 
      isLive, 
      isOnline,
      listenerCount, 
      currentTrack,
      upNextTrack,
      volume, 
      togglePlayPause, 
      setVolume 
    } = useRadioPlayer();

    console.log('RadioModule: Radio state:', { 
      isPlaying, isLoading, isLive, isOnline, listenerCount, currentTrack, upNextTrack 
    });

    return (
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-4 text-xl">
            <Radio className="h-10 w-10" />
            Glee World Radio
            <Badge 
              variant={isOnline ? (isLive ? "default" : "secondary") : "outline"}
              className={`text-base px-3 py-1 ${isLive ? "bg-red-500 hover:bg-red-600" : isOnline ? "bg-green-500 hover:bg-green-600" : ""}`}
            >
              {isLive ? 'LIVE DJ' : isOnline ? 'ONLINE' : 'OFFLINE'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Now Playing & Up Next */}
          {isOnline && (
            <div className="space-y-4">
              {/* Now Playing */}
              {currentTrack && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Now Playing</p>
                  <div>
                    <p className="font-semibold text-lg text-foreground">{currentTrack.title}</p>
                    {currentTrack.artist && (
                      <p className="text-base text-muted-foreground">{currentTrack.artist}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Up Next */}
              {upNextTrack && (
                <div className="space-y-2 pt-3 border-t border-border/50">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <SkipForward className="h-4 w-4" />
                    Up Next
                  </p>
                  <div>
                    <p className="text-base text-foreground/80">{upNextTrack.title}</p>
                    {upNextTrack.artist && (
                      <p className="text-sm text-muted-foreground">{upNextTrack.artist}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 text-lg text-muted-foreground">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" />
              <span>{listenerCount} listeners</span>
            </div>
            <span>Est. 1924 • 100+ Years</span>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                console.log('RadioModule: Play/Pause button clicked');
                togglePlayPause();
              }}
              disabled={isLoading}
              className="w-full h-16 text-lg font-medium"
            >
              {isLoading ? (
                <div className="h-7 w-7 border-3 border-primary border-t-transparent rounded-full animate-spin mr-3" />
              ) : isPlaying ? (
                <Pause className="h-7 w-7 mr-3" />
              ) : (
                <Play className="h-7 w-7 ml-0.5 mr-3" />
              )}
              {isLoading ? 'Loading...' : isPlaying ? 'Pause Radio' : 'Play Radio'}
            </Button>

            {/* Request Song Button - only for logged in users */}
            {user && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowSongBrowser(true)}
                className="w-full h-14 text-base"
              >
                <Music className="h-6 w-6 mr-3" />
                Request a Song
              </Button>
            )}

            {/* Volume Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium">Volume</span>
                <span className="text-base text-muted-foreground">{Math.round(volume * 100)}%</span>
              </div>
              <div className="flex items-center gap-4">
                <Volume2 className="h-7 w-7" />
                <Slider
                  value={[volume]}
                  onValueChange={([value]) => setVolume(value)}
                  max={1}
                  step={0.1}
                  className="flex-1 h-6 [&_[role=slider]]:h-6 [&_[role=slider]]:w-6"
                />
              </div>
            </div>
          </div>

          <div className="text-center pt-8 border-t text-base text-muted-foreground">
            "To Amaze and Inspire" • Official Spelman Glee Club Radio
          </div>
        </CardContent>

        {/* Song Browser Dialog */}
        <SongBrowser
          open={showSongBrowser}
          onOpenChange={setShowSongBrowser}
        />
      </Card>
    );
  } catch (error) {
    console.error('RadioModule: Error rendering component:', error);
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <Radio className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Radio Error</h3>
            <p>Failed to load radio player</p>
          </div>
        </CardContent>
      </Card>
    );
  }
};