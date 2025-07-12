import React from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Music,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';

export const GlobalMusicPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    isVisible,
    isMinimized,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoading,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleMute,
    toggleMinimized,
    hidePlayer,
    formatTime
  } = useMusicPlayer();

  if (!isVisible || !currentTrack) return null;

  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * duration;
    seekTo(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Minimized player (bottom bar)
  if (isMinimized) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t shadow-lg">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-4">
            {/* Track Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/40 rounded-md overflow-hidden flex-shrink-0">
                {currentTrack.album?.cover_image_url ? (
                  <img
                    src={currentTrack.album.cover_image_url}
                    alt={`${currentTrack.album.title} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="h-6 w-6 text-primary" />
                  </div>
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm truncate">{currentTrack.title}</h4>
                <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={playPrevious}>
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={togglePlayPause}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-10 h-10"
                size="sm"
              >
                {isLoading ? (
                  <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              
              <Button variant="ghost" size="sm" onClick={playNext}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress */}
            <div className="hidden md:flex items-center gap-2 flex-1 max-w-xs">
              <span className="text-xs text-muted-foreground w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[progressPercentage]}
                onValueChange={handleSeek}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10">
                {formatTime(duration)}
              </span>
            </div>

            {/* Volume */}
            <div className="hidden lg:flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-20"
              />
            </div>

            {/* Player Controls */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={toggleMinimized}>
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={hidePlayer}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expanded player (modal-like overlay)
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-background/95 backdrop-blur-md border shadow-2xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Now Playing</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleMinimized}>
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={hidePlayer}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Track Info */}
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg overflow-hidden flex-shrink-0">
              {currentTrack.album?.cover_image_url ? (
                <img
                  src={currentTrack.album.cover_image_url}
                  alt={`${currentTrack.album.title} cover`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="h-12 w-12 text-primary" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{currentTrack.title}</h2>
              <p className="text-lg text-muted-foreground truncate">{currentTrack.artist}</p>
              {currentTrack.album && (
                <p className="text-sm text-muted-foreground truncate">{currentTrack.album.title}</p>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <Slider
              value={[progressPercentage]}
              onValueChange={handleSeek}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <Button variant="ghost" size="lg" onClick={playPrevious}>
              <SkipBack className="h-6 w-6" />
            </Button>
            
            <Button
              onClick={togglePlayPause}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-16 h-16"
            >
              {isLoading ? (
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
              ) : isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8" />
              )}
            </Button>
            
            <Button variant="ghost" size="lg" onClick={playNext}>
              <SkipForward className="h-6 w-6" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="sm" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};