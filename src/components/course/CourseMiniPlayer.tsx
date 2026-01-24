import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCoursePlaylist } from '@/hooks/useCoursePlaylist';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CourseMiniPlayerProps {
  courseId: string;
  className?: string;
}

export const CourseMiniPlayer: React.FC<CourseMiniPlayerProps> = ({
  courseId,
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
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const currentTrack = tracks[currentTrackIndex];

  // Handle play/pause
  const togglePlay = () => {
    if (!audioRef.current || !currentTrack?.track_data?.audio_url) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  // Handle track change
  const playTrack = (index: number) => {
    if (index >= 0 && index < tracks.length) {
      setCurrentTrackIndex(index);
      setIsPlaying(true);
    }
  };

  const skipPrevious = () => {
    if (currentTrackIndex > 0) {
      playTrack(currentTrackIndex - 1);
    }
  };

  const skipNext = () => {
    if (currentTrackIndex < tracks.length - 1) {
      playTrack(currentTrackIndex + 1);
    }
  };

  // Update audio source when track changes
  useEffect(() => {
    if (audioRef.current && currentTrack?.track_data?.audio_url) {
      audioRef.current.src = currentTrack.track_data.audio_url;
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentTrack, isPlaying]);

  // Handle time update
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      if (currentTrackIndex < tracks.length - 1) {
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
  }, [currentTrackIndex, tracks.length]);

  // Handle mute toggle
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Don't render if no playlists
  if (loading || playlists.length === 0) return null;

  return (
    <div className={cn(
      "bg-[#002244] border-t border-white/10 transition-all duration-300",
      className
    )}>
      <audio ref={audioRef} preload="metadata" />
      
      {/* Main Mini Player Bar */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Music Icon & Track Info */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-8 w-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
            <Music className="h-4 w-4 text-white/70" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white font-medium truncate">
              {currentTrack?.track_data?.title || 'Select a track'}
            </p>
            <p className="text-[10px] text-white/60 truncate">
              {selectedPlaylist?.title || 'No playlist selected'}
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            onClick={skipPrevious}
            disabled={currentTrackIndex === 0}
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/10 rounded-full"
            onClick={togglePlay}
            disabled={!currentTrack}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            onClick={skipNext}
            disabled={currentTrackIndex >= tracks.length - 1}
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Volume */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Playlist Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1"
            >
              <span className="hidden sm:inline">{playlists.length} playlists</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {playlists.map((playlist) => (
              <DropdownMenuItem
                key={playlist.id}
                onClick={() => selectPlaylist(playlist)}
                className={cn(
                  "cursor-pointer",
                  selectedPlaylist?.id === playlist.id && "bg-accent"
                )}
              >
                {playlist.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Expand/Collapse Track List */}
        {tracks.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      {currentTrack && (
        <div className="h-0.5 bg-white/10 mx-3 mb-1 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-400 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Expanded Track List */}
      {isExpanded && tracks.length > 0 && (
        <div className="border-t border-white/10 max-h-48 overflow-y-auto">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              onClick={() => playTrack(index)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors",
                currentTrackIndex === index && "bg-white/10"
              )}
            >
              <span className="text-xs text-white/40 w-4">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">
                  {track.track_data?.title || 'Unknown'}
                </p>
                {track.track_data?.artist && (
                  <p className="text-[10px] text-white/50 truncate">
                    {track.track_data.artist}
                  </p>
                )}
              </div>
              {currentTrackIndex === index && isPlaying && (
                <div className="flex gap-0.5">
                  <span className="w-0.5 h-3 bg-amber-400 animate-pulse" />
                  <span className="w-0.5 h-3 bg-amber-400 animate-pulse delay-75" />
                  <span className="w-0.5 h-3 bg-amber-400 animate-pulse delay-150" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
