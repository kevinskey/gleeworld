import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCoursePlaylist, CoursePlaylist, PlaylistTrack } from '@/hooks/useCoursePlaylist';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music,
  Shuffle,
  Repeat,
  ListMusic,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoursePlaylistPlayerProps {
  courseId: string;
  className?: string;
}

export const CoursePlaylistPlayer: React.FC<CoursePlaylistPlayerProps> = ({
  courseId,
  className,
}) => {
  const {
    playlists,
    selectedPlaylist,
    tracks,
    loading,
    tracksLoading,
    selectPlaylist,
  } = useCoursePlaylist(courseId);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const currentTrack = tracks[currentTrackIndex];

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => handleNext();
    const handleLoadStart = () => setIsAudioLoading(true);
    const handleCanPlay = () => setIsAudioLoading(false);
    const handleError = () => setIsAudioLoading(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrackIndex, tracks]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handlePlayPause = async () => {
    if (!audioRef.current || !currentTrack?.track_data) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Playback error:', error);
      }
    }
  };

  const handleNext = () => {
    if (tracks.length === 0) return;

    let nextIndex;
    if (repeatMode === 'one') {
      nextIndex = currentTrackIndex;
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    } else if (isShuffled) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
      nextIndex = currentTrackIndex + 1;
      if (nextIndex >= tracks.length) {
        nextIndex = repeatMode === 'all' ? 0 : tracks.length - 1;
        if (repeatMode === 'none' && nextIndex === tracks.length - 1) {
          setIsPlaying(false);
          return;
        }
      }
    }
    setCurrentTrackIndex(nextIndex);
  };

  const handlePrevious = () => {
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
    } else {
      const prevIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : tracks.length - 1;
      setCurrentTrackIndex(prevIndex);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = (value[0] / 100) * duration;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
    setIsMuted(false);
  };

  const handleTrackSelect = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    setTimeout(() => {
      audioRef.current?.play();
    }, 100);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cycleRepeatMode = () => {
    const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading playlists...</span>
        </CardContent>
      </Card>
    );
  }

  if (playlists.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Music className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No curated playlists available for this course yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Playlist Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListMusic className="h-5 w-5 text-primary" />
            Course Playlists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {playlists.map((playlist) => (
              <Button
                key={playlist.id}
                variant={selectedPlaylist?.id === playlist.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => selectPlaylist(playlist)}
                className="gap-2"
              >
                <Music className="h-4 w-4" />
                {playlist.title}
                {playlist.is_featured && (
                  <Badge variant="secondary" className="ml-1 text-xs">Featured</Badge>
                )}
              </Button>
            ))}
          </div>
          {selectedPlaylist?.description && (
            <p className="mt-3 text-sm text-muted-foreground">
              {selectedPlaylist.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Player */}
      {selectedPlaylist && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Hidden Audio Element */}
            {currentTrack?.track_data && (
              <audio
                ref={audioRef}
                src={currentTrack.track_data.audio_url}
                preload="metadata"
                playsInline
              />
            )}

            {/* Current Track Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <Music className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">
                  {currentTrack?.track_data?.title || 'Select a track'}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {currentTrack?.track_data?.artist || selectedPlaylist.title}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Slider
                value={[duration ? (currentTime / duration) * 100 : 0]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsShuffled(!isShuffled)}
                className={cn(isShuffled && 'text-primary')}
              >
                <Shuffle className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon" onClick={handlePrevious}>
                <SkipBack className="h-5 w-5" />
              </Button>

              <Button
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={handlePlayPause}
                disabled={!currentTrack?.track_data || isAudioLoading}
              >
                {isAudioLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-0.5" />
                )}
              </Button>

              <Button variant="ghost" size="icon" onClick={handleNext}>
                <SkipForward className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={cycleRepeatMode}
                className={cn(repeatMode !== 'none' && 'text-primary')}
              >
                <Repeat className="h-4 w-4" />
                {repeatMode === 'one' && (
                  <span className="absolute text-[8px] font-bold">1</span>
                )}
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={handleVolumeChange}
                max={100}
                className="w-24"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Track List */}
      {selectedPlaylist && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Tracks ({tracks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tracksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : tracks.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No tracks in this playlist yet.
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="divide-y">
                  {tracks.map((track, index) => (
                    <button
                      key={track.id}
                      onClick={() => handleTrackSelect(index)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left',
                        currentTrackIndex === index && 'bg-primary/10'
                      )}
                    >
                      <div className="w-8 h-8 flex items-center justify-center rounded bg-muted text-xs font-medium">
                        {currentTrackIndex === index && isPlaying ? (
                          <div className="flex gap-0.5">
                            <span className="w-1 h-3 bg-primary rounded-full animate-pulse" />
                            <span className="w-1 h-4 bg-primary rounded-full animate-pulse delay-75" />
                            <span className="w-1 h-2 bg-primary rounded-full animate-pulse delay-150" />
                          </div>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium truncate',
                          currentTrackIndex === index && 'text-primary'
                        )}>
                          {track.track_data?.title || 'Unknown Track'}
                        </p>
                        {track.track_data?.artist && (
                          <p className="text-xs text-muted-foreground truncate">
                            {track.track_data.artist}
                          </p>
                        )}
                      </div>
                      {track.track_data?.duration && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(track.track_data.duration)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
