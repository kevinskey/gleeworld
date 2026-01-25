import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCoursePlaylist } from '@/hooks/useCoursePlaylist';
import { cn } from '@/lib/utils';
import { forceUnlockAudio } from '@/utils/mobileAudioUnlock';
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
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null;

  // Handle play/pause with iOS audio unlock
  const togglePlay = () => {
    if (!audioRef.current || !currentTrack?.track_data?.audio_url) return;
    
    // CRITICAL: Unlock audio context for iOS/Safari
    forceUnlockAudio();

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

  // Start playing first track when user clicks play with no track selected
  const handleFirstPlay = () => {
    // CRITICAL: Unlock audio context for iOS/Safari
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
      "bg-gradient-to-b from-[#003366] via-[#002244] to-[#001a33] border-t border-white/20 transition-all duration-300",
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.4)]",
      "rounded-b-xl",
      className
    )}>
      <audio ref={audioRef} preload="metadata" />
      
      {/* Main Mini Player Bar */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Music Icon & Track Info */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Music className="h-4 w-4 text-white/80" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white font-semibold tracking-wide truncate">
              {currentTrack?.track_data?.title || 'MUSIC PLAYER'}
            </p>
            <p className="text-[10px] text-white/60 truncate">
              {currentTrack ? (selectedPlaylist?.title || 'Playlist') : 'Select a track to play'}
            </p>
          </div>
        </div>

        {/* Playback Controls - Minimal sizing */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 text-white/70 hover:text-white touch-manipulation p-0"
            onClick={skipPrevious}
            onTouchEnd={(e) => { e.preventDefault(); skipPrevious(); }}
            disabled={currentTrackIndex === null || currentTrackIndex === 0}
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/10 rounded-full bg-white/10 touch-manipulation p-0"
            onClick={currentTrack ? togglePlay : handleFirstPlay}
            onTouchEnd={(e) => { e.preventDefault(); currentTrack ? togglePlay() : handleFirstPlay(); }}
            onPointerDown={() => forceUnlockAudio()}
            disabled={tracks.length === 0}
          >
            {isPlaying ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3 ml-0.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 text-white/70 hover:text-white touch-manipulation p-0"
            onClick={skipNext}
            onTouchEnd={(e) => { e.preventDefault(); skipNext(); }}
            disabled={currentTrackIndex === null || currentTrackIndex >= tracks.length - 1}
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Volume - Hidden on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:flex h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 touch-manipulation"
          onClick={() => setIsMuted(!isMuted)}
          onTouchEnd={(e) => { e.preventDefault(); setIsMuted(!isMuted); }}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>

        {/* Playlist Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 sm:h-8 text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1 touch-manipulation px-2"
            >
              <span className="hidden xs:inline">{playlists.length} playlists</span>
              <ChevronDown className="h-4 w-4 sm:h-3 sm:w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {playlists.map((playlist) => (
              <DropdownMenuItem
                key={playlist.id}
                onClick={() => selectPlaylist(playlist)}
                className={cn(
                  "cursor-pointer touch-manipulation min-h-[44px]",
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
            className="h-10 w-10 sm:h-8 sm:w-8 text-white/70 hover:text-white hover:bg-white/10 touch-manipulation"
            onClick={() => setIsExpanded(!isExpanded)}
            onTouchEnd={(e) => { e.preventDefault(); setIsExpanded(!isExpanded); }}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 sm:h-4 sm:w-4" />
            ) : (
              <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4" />
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

      {/* Expanded Track List - Touch optimized */}
      {isExpanded && tracks.length > 0 && (
        <div className="border-t border-white/10 max-h-48 overflow-y-auto overscroll-contain">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              onClick={() => playTrack(index)}
              onTouchEnd={(e) => { e.preventDefault(); playTrack(index); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 sm:py-2 text-left hover:bg-white/5 transition-colors touch-manipulation min-h-[48px]",
                currentTrackIndex === index && "bg-white/10"
              )}
            >
              <span className="text-sm sm:text-xs text-white/40 w-5 sm:w-4">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-xs text-white truncate">
                  {track.track_data?.title || 'Unknown'}
                </p>
                {track.track_data?.artist && (
                  <p className="text-xs sm:text-[10px] text-white/50 truncate">
                    {track.track_data.artist}
                  </p>
                )}
              </div>
              {currentTrackIndex === index && isPlaying && (
                <div className="flex gap-0.5">
                  <span className="w-0.5 h-4 sm:h-3 bg-amber-400 animate-pulse" />
                  <span className="w-0.5 h-4 sm:h-3 bg-amber-400 animate-pulse delay-75" />
                  <span className="w-0.5 h-4 sm:h-3 bg-amber-400 animate-pulse delay-150" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
