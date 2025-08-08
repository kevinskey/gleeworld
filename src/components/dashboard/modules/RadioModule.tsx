import React from 'react';
import { Radio, Play, Pause, Volume2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';

export const RadioModule = () => {
  console.log('RadioModule: Component rendering');
  
  try {
    const { 
      isPlaying, 
      isLoading, 
      isLive, 
      isOnline,
      listenerCount, 
      currentTrack, 
      volume, 
      togglePlayPause, 
      setVolume 
    } = useRadioPlayer();

    console.log('RadioModule: Radio state:', { 
      isPlaying, isLoading, isLive, isOnline, listenerCount, currentTrack 
    });

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Glee World Radio
            <Badge 
              variant={isOnline ? (isLive ? "default" : "secondary") : "outline"}
              className={isLive ? "bg-red-500 hover:bg-red-600" : isOnline ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {isLive ? 'LIVE DJ' : isOnline ? 'ONLINE' : 'OFFLINE'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Now Playing */}
          {currentTrack && isOnline && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">NOW PLAYING</p>
              <div>
                <p className="font-medium">{currentTrack.title}</p>
                <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{listenerCount} listeners</span>
            </div>
            <span>Est. 1924 • 100+ Years</span>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                console.log('RadioModule: Play/Pause button clicked');
                togglePlayPause();
              }}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 ml-0.5 mr-2" />
              )}
              {isLoading ? 'Loading...' : isPlaying ? 'Pause Radio' : 'Play Radio'}
            </Button>

            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Volume</span>
                <span className="text-sm text-muted-foreground">{Math.round(volume * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <Slider
                  value={[volume]}
                  onValueChange={([value]) => setVolume(value)}
                  max={1}
                  step={0.1}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="text-center pt-4 border-t text-xs text-muted-foreground">
            "To Amaze and Inspire" • Official Spelman Glee Club Radio
          </div>
        </CardContent>
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