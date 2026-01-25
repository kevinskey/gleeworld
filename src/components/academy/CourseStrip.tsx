import React, { useRef, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, 
  ChevronDown, Mail, Clock, MapPin, User, ListMusic, LayoutGrid
} from 'lucide-react';
import { useCoursePlaylist } from '@/hooks/useCoursePlaylist';
import { cn } from '@/lib/utils';
import { forceUnlockAudio } from '@/utils/mobileAudioUnlock';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CourseModulesSheet } from './CourseModulesSheet';

interface CourseStripProps {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  instructorName?: string;
  instructorEmail?: string;
  instructorOffice?: string;
  instructorOfficeHours?: string;
  teachingAssistants?: Array<{
    id: string;
    profile?: { full_name?: string };
    notes?: string;
  }>;
  className?: string;
}

export const CourseStrip: React.FC<CourseStripProps> = ({
  courseId,
  courseCode,
  courseTitle,
  instructorName = 'Dr. Kevin Johnson',
  instructorEmail = 'kjohns10@spelman.edu',
  instructorOffice = 'Fine Arts 105',
  instructorOfficeHours = 'MWF 3-5 PM',
  teachingAssistants = [],
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  

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

  useEffect(() => {
    if (audioRef.current && currentTrack?.track_data?.audio_url) {
      audioRef.current.src = currentTrack.track_data.audio_url;
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
  }, [currentTrackIndex, tracks.length]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const tas = teachingAssistants.filter(ta => 
    !ta.notes?.toLowerCase().includes('instructor') && 
    !ta.notes?.toLowerCase().includes('secretary')
  );

  const showPlayer = !loading && playlists.length > 0;

  return (
    <div className={cn("bg-primary border-b border-border", className)}>
      <audio ref={audioRef} preload="metadata" />
      
      {/* Course Info Row */}
      <div className="px-4 md:px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Course Code Badge */}
          <Badge className="bg-primary hover:bg-primary text-primary-foreground font-mono text-xs px-2 py-0.5">
            {courseCode}
          </Badge>
          
          {/* Course Title */}
          <h1 className="text-lg md:text-xl font-bold text-white">
            {courseTitle}
          </h1>
          
          {/* Divider - Desktop only */}
          <span className="hidden md:inline text-white/30">|</span>
          
          {/* Instructor Info */}
          <div className="flex items-center gap-3 text-sm text-white/80">
            <span className="font-medium text-white">{instructorName}</span>
            <span className="hidden md:flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {instructorEmail}
            </span>
            <span className="hidden lg:flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {instructorOffice}
            </span>
            <span className="hidden lg:flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {instructorOfficeHours}
            </span>
          </div>
          
          {/* TAs */}
          {tas.length > 0 && (
            <span className="hidden xl:flex items-center gap-1 text-sm text-white/60">
              <User className="h-3 w-3" />
              TA: {tas.map(ta => ta.profile?.full_name || 'TA').join(', ')}
            </span>
          )}
          
        </div>
      </div>

      {/* Music Player Row */}
      {showPlayer && (
          <div className="border-t border-white/10 bg-primary/80 px-4 md:px-6 py-2">
          <div className="flex items-center gap-3">
            {/* Modules Button */}
            <CourseModulesSheet courseId={courseId} courseCode={courseCode} />

            {/* Music Icon & Track Info with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 min-w-0 h-auto py-1 px-2 hover:bg-white/10"
                >
                  <div className="h-8 w-8 rounded-md bg-primary/30 flex items-center justify-center flex-shrink-0">
                    <Music className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-medium text-white truncate max-w-[80px] sm:max-w-[120px] lg:max-w-[200px]">
                      {currentTrack?.track_data?.title || 'Music Player'}
                    </p>
                    <p className="text-[10px] text-white/50 hidden sm:block">
                      {tracks.length} tracks
                    </p>
                  </div>
                  <ListMusic className="h-3.5 w-3.5 text-white/50 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-slate-900 border-slate-700 shadow-lg z-50">
                <DropdownMenuLabel className="text-xs text-white/60">
                  Now Playing
                </DropdownMenuLabel>
                <div className="max-h-64 overflow-y-auto">
                  {tracks.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-white/50 text-center">
                      No tracks available
                    </div>
                  ) : (
                    tracks.map((track, idx) => (
                      <DropdownMenuItem
                        key={track.id || idx}
                        onClick={() => playTrack(idx)}
                        className={cn(
                          "cursor-pointer flex items-center gap-2 py-2 text-white hover:bg-white/10 focus:bg-white/10",
                          idx === currentTrackIndex && "bg-white/20"
                        )}
                      >
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                          {idx === currentTrackIndex && isPlaying ? (
                            <Pause className="h-3.5 w-3.5 text-primary" />
                          ) : idx === currentTrackIndex ? (
                            <Play className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <span className="text-xs text-white/50">{idx + 1}</span>
                          )}
                        </div>
                        <span className="truncate text-sm text-white">
                          {track.track_data?.title || `Track ${idx + 1}`}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Playback Controls - Minimal */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 text-white/50 hover:text-white disabled:opacity-30"
                onClick={skipPrevious}
                disabled={currentTrackIndex === null || currentTrackIndex === 0}
              >
                <SkipBack className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 text-white bg-primary hover:bg-primary/90 rounded-full"
                onClick={currentTrack ? togglePlay : handleFirstPlay}
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
                className="h-4 w-4 p-0 text-white/50 hover:text-white disabled:opacity-30"
                onClick={skipNext}
                disabled={currentTrackIndex === null || currentTrackIndex >= tracks.length - 1}
              >
                <SkipForward className="h-3 w-3" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="flex-1 max-w-[200px]">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-100 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Time */}
            <span className="text-[10px] text-white/50 hidden sm:inline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Volume */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex h-7 w-7 text-white/50 hover:text-white hover:bg-white/10"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>

            {/* Playlist Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] text-white/50 hover:text-white hover:bg-white/10 gap-0.5 px-2"
                >
                  <span className="hidden sm:inline">{playlists.length} playlists</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {playlists.map((playlist) => (
                  <DropdownMenuItem
                    key={playlist.id}
                    onClick={() => selectPlaylist(playlist)}
                    className={cn(
                      "cursor-pointer text-sm",
                      selectedPlaylist?.id === playlist.id && "bg-accent"
                    )}
                  >
                    {playlist.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
      
      {/* Modules Row - shown when no music player */}
      {!showPlayer && (
        <div className="border-t border-white/10 bg-primary/80 px-4 md:px-6 py-2">
          <div className="flex items-center gap-3">
            <CourseModulesSheet courseId={courseId} courseCode={courseCode} />
          </div>
        </div>
      )}
      
    </div>
  );
};
