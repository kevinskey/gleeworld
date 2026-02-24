import React, { useRef, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, 
  ChevronUp, ListMusic, Repeat, Clock, Gauge, Maximize2, BookOpen
} from 'lucide-react';
import { useCoursePlaylist } from '@/hooks/useCoursePlaylist';
import { cn } from '@/lib/utils';
import { forceUnlockAudio } from '@/utils/mobileAudioUnlock';
import { CourseModulesSheet } from './CourseModulesSheet';
import { PracticeBarDrawer } from './PracticeBarDrawer';

interface CoursePracticeBarProps {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  instructorName?: string;
  className?: string;
}

export const CoursePracticeBar: React.FC<CoursePracticeBarProps> = ({
  courseId,
  courseCode,
  courseTitle,
  instructorName,
  className,
}) => {
  const {
    playlists,
    selectedPlaylist,
    tracks,
    loading,
    selectPlaylist,
  } = useCoursePlaylist(courseId);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack?.track_data?.audio_url) return;
    forceUnlockAudio();
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const playTrack = (index: number) => {
    if (index >= 0 && index < tracks.length) {
      setCurrentTrackIndex(index);
      setIsPlaying(true);
    }
  };

  const handleFirstPlay = () => {
    forceUnlockAudio();
    if (tracks.length > 0) {
      setCurrentTrackIndex(0);
      setIsPlaying(true);
    }
  };

  const skipPrevious = () => {
    if (currentTrackIndex !== null && currentTrackIndex > 0) {
      playTrack(currentTrackIndex - 1);
    }
  };

  const skipNext = () => {
    if (currentTrackIndex !== null && currentTrackIndex < tracks.length - 1) {
      playTrack(currentTrackIndex + 1);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && duration > 0) {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
      setProgress(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      audioRef.current.volume = newMuted ? 0 : volume / 100;
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  useEffect(() => {
    if (audioRef.current && currentTrack?.track_data?.audio_url) {
      audioRef.current.src = currentTrack.track_data.audio_url;
      audioRef.current.loop = isLooping;
      audioRef.current.playbackRate = playbackRate;
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      if (isLooping) return;
      if (currentTrackIndex !== null && currentTrackIndex < tracks.length - 1) {
        skipNext();
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex, tracks.length, isLooping]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  const showPlayer = !loading && playlists.length > 0;

  // Clean display title - remove timestamps and hashes
  const cleanDisplayTitle = (title: string) => {
    return title
      .replace(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_/, '')
      .replace(/_[a-f0-9]{8}$/, '')
      .replace(/_/g, ' ')
      .replace(/\.[^/.]+$/, '');
  };

  if (!showPlayer) {
    return (
      <Card className={cn("mx-3 sm:mx-4 md:mx-6 mt-3 md:mt-4", className)}>
        <div className="p-3 flex items-center gap-3">
          <CourseModulesSheet courseId={courseId} courseCode={courseCode} />
          <div className="flex items-center gap-2 text-muted-foreground">
            <Music className="h-4 w-4" />
            <span className="text-sm">No playlists available</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <audio ref={audioRef} preload="metadata" />
      
      <Card className={cn(
        "mx-3 sm:mx-4 md:mx-6 mt-3 md:mt-4 shadow-md border-border/80 overflow-hidden",
        className
      )}>
        {/* Row 1: Course Identity + Now Playing */}
        <div className="px-3 sm:px-4 py-1.5 sm:py-2.5 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Course Badge */}
            <Badge variant="secondary" className="font-mono text-xs shrink-0">
              {courseCode}
            </Badge>

            {/* Album Art & Track Info */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0 border border-border/50">
                {currentTrack ? (
                  <Music className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                ) : (
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                  {currentTrack?.track_data?.title 
                    ? cleanDisplayTitle(currentTrack.track_data.title) 
                    : 'Course Listening & Practice Engine'}
                </p>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                  {currentTrack ? (
                    <>
                      <span className="truncate">
                        {selectedPlaylist?.title || 'Listening'}
                      </span>
                      <span className="text-border">•</span>
                      <span className="shrink-0">
                        Track {(currentTrackIndex ?? 0) + 1} of {tracks.length}
                      </span>
                    </>
                  ) : (
                    <span>Select a track to begin practicing</span>
                  )}
                </div>
              </div>
            </div>

            {/* Assignment Tag (when applicable) */}
            {currentTrack && (
              <Badge className="hidden sm:flex bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 border-amber-300 dark:border-amber-700 text-[10px] font-medium">
                Listening Assignment
              </Badge>
            )}

            {/* Expand Button */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              onClick={() => setDrawerOpen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Row 2: Transport + Waveform + Tools */}
        <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-card">
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Modules Button */}
            <CourseModulesSheet courseId={courseId} courseCode={courseCode} />

            {/* Transport Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8"
                onClick={skipPrevious}
                disabled={currentTrackIndex === null || currentTrackIndex === 0}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                variant="default"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-md shadow-sm"
                onClick={currentTrack ? togglePlay : handleFirstPlay}
                disabled={tracks.length === 0}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8"
                onClick={skipNext}
                disabled={currentTrackIndex === null || currentTrackIndex >= tracks.length - 1}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Time Display (Current) */}
            <span className="text-xs text-muted-foreground tabular-nums w-10 text-right hidden sm:inline">
              {formatTime(currentTime)}
            </span>

            {/* Waveform/Progress Scrubber */}
            <div className="flex-1 max-w-md">
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="cursor-pointer"
                disabled={!currentTrack}
              />
            </div>

            {/* Time Display (Duration) */}
            <span className="text-xs text-muted-foreground tabular-nums w-10 hidden sm:inline">
              {formatTime(duration)}
            </span>

            {/* Tool Buttons */}
            <div className="hidden md:flex items-center gap-1 border-l border-border pl-2 ml-1">
              {/* Loop */}
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn("h-7 w-7", isLooping && "text-primary bg-primary/10")}
                onClick={() => setIsLooping(!isLooping)}
                title="Loop"
              >
                <Repeat className="h-3.5 w-3.5" />
              </Button>

              {/* Tempo/Playback Rate */}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs tabular-nums",
                  playbackRate !== 1 && "text-primary bg-primary/10"
                )}
                onClick={cyclePlaybackRate}
                title="Playback Speed"
              >
                {playbackRate}x
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-1 group">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7"
                  onClick={toggleMute}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </Button>
                <div className="w-16 hidden lg:block">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Playlist/Queue Button */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 shrink-0"
              onClick={() => setDrawerOpen(true)}
            >
              <ListMusic className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Tools Row */}
        <div className="md:hidden px-3 py-2 border-t border-border/50 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn("h-7 w-7", isLooping && "text-primary bg-primary/10")}
              onClick={() => setIsLooping(!isLooping)}
            >
              <Repeat className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-xs",
                playbackRate !== 1 && "text-primary bg-primary/10"
              )}
              onClick={cyclePlaybackRate}
            >
              {playbackRate}x
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </Card>

      {/* Expanded Drawer */}
      <PracticeBarDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        courseId={courseId}
        courseCode={courseCode}
        tracks={tracks}
        currentTrackIndex={currentTrackIndex}
        isPlaying={isPlaying}
        playlists={playlists}
        selectedPlaylist={selectedPlaylist}
        onSelectPlaylist={selectPlaylist}
        onPlayTrack={playTrack}
        onTogglePlay={togglePlay}
      />
    </>
  );
};
