import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, 
  ChevronDown, ChevronUp, ArrowLeft, Mail, Clock, MapPin, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCoursePlaylist } from '@/hooks/useCoursePlaylist';
import { cn } from '@/lib/utils';
import { forceUnlockAudio } from '@/utils/mobileAudioUnlock';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import equalizerBg from '@/assets/audio-equalizer-bg.png';
import { useAuth } from '@/contexts/AuthContext';
import { useMergedProfile } from '@/hooks/useMergedProfile';

interface CourseHeroPlayerProps {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  instructorName?: string;
  instructorEmail?: string;
  instructorOffice?: string;
  instructorOfficeHours?: string;
  instructorImageUrl?: string;
  teachingAssistants?: Array<{
    id: string;
    profile?: { full_name?: string };
    notes?: string;
  }>;
  className?: string;
}

export const CourseHeroPlayer: React.FC<CourseHeroPlayerProps> = ({
  courseId,
  courseCode,
  courseTitle,
  instructorName = 'Dr. Kevin Johnson',
  instructorEmail = 'kjohns10@spelman.edu',
  instructorOffice = 'Fine Arts 105',
  instructorOfficeHours = 'MWF 3-5 PM',
  instructorImageUrl,
  teachingAssistants = [],
  className,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, displayName } = useMergedProfile(user);
  
  const {
    playlists,
    selectedPlaylist,
    tracks,
    loading,
    selectPlaylist,
  } = useCoursePlaylist(courseId);
  
  // Get user avatar and initials
  const userAvatarUrl = profile?.avatar_url;
  const userInitials = displayName ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'U';

  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null;

  // Format time display
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

  // Get TAs list
  const tas = teachingAssistants.filter(ta => 
    !ta.notes?.toLowerCase().includes('instructor') && 
    !ta.notes?.toLowerCase().includes('secretary')
  );

  const showPlayer = !loading && playlists.length > 0;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Background with Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0d2847] to-[#003366]" />
      
      {/* Equalizer Background Image - Desktop/Tablet */}
      <div 
        className="absolute inset-0 hidden md:block opacity-60"
        style={{
          backgroundImage: `url(${equalizerBg})`,
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      />
      
      {/* Mobile Equalizer */}
      <div 
        className="absolute inset-x-0 bottom-0 h-32 md:hidden opacity-50"
        style={{
          backgroundImage: `url(${equalizerBg})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      />
      
      {/* Content Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#001a33]/90 via-transparent to-[#0a1628]/70" />

      <audio ref={audioRef} preload="metadata" />

      {/* Main Content */}
      <div className="relative z-10">
        {/* Back Button - Top Right */}
        <div className="absolute top-3 right-3 md:top-4 md:right-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/glee-academy')} 
            className="text-white/80 hover:text-white hover:bg-white/10 gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex items-start gap-6 lg:gap-10">
            {/* Left: Course Info */}
            <div className="flex-1 min-w-0">
              <Badge className="bg-primary hover:bg-primary text-primary-foreground font-mono text-sm px-3 py-1 mb-3">
                {courseCode}
              </Badge>
              
              <h1 className="text-2xl lg:text-4xl font-bold text-white mb-4 leading-tight">
                {courseTitle}
              </h1>
              
              <div className="space-y-2 text-white/90">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-semibold text-white text-lg">{instructorName}</span>
                  <span className="text-white/70">{instructorEmail}</span>
                </div>
                
                <div className="flex items-center gap-4 flex-wrap text-sm text-white/80">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Office: {instructorOffice}
                  </span>
                  <span className="text-white/40">|</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Office Hours: {instructorOfficeHours}
                  </span>
                </div>
                
                {tas.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>TA: {tas.map(ta => ta.profile?.full_name || 'TA').join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right: Student Photo */}
            <div className="flex-shrink-0">
              <Avatar className="h-24 w-24 lg:h-32 lg:w-32 ring-4 ring-white/20 shadow-2xl">
                <AvatarImage 
                  src={userAvatarUrl} 
                  alt={displayName} 
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/30 text-white text-2xl lg:text-3xl">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden px-4 pt-16 pb-4">
          <div className="flex flex-col items-center text-center">
            <Badge className="bg-primary hover:bg-primary text-primary-foreground font-mono text-xs px-2 py-0.5 mb-3">
              {courseCode}
            </Badge>
            
            <h1 className="text-xl font-bold text-white mb-4 leading-tight">
              {courseTitle}
            </h1>
            
            <Avatar className="h-20 w-20 ring-3 ring-white/20 shadow-xl mb-4">
              <AvatarImage 
                src={userAvatarUrl} 
                alt={displayName} 
                className="object-cover"
              />
              <AvatarFallback className="bg-primary/30 text-white text-lg">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            
            <p className="font-semibold text-white text-base mb-1">{instructorName}</p>
            
            <div className="space-y-1 text-xs text-white/80">
              <p className="flex items-center justify-center gap-1">
                <Mail className="h-3 w-3" />
                {instructorEmail}
              </p>
              <p className="flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Office Hours: {instructorOfficeHours}
              </p>
            </div>
          </div>
        </div>

        {/* Music Player Section */}
        {showPlayer && (
          <div className="relative border-t border-white/10 bg-gradient-to-r from-[#001a33]/80 via-[#002244]/80 to-[#001a33]/80 backdrop-blur-sm">
            {/* Desktop/Tablet Layout */}
            <div className="hidden sm:block px-6 lg:px-8 py-3">
              <div className="flex items-center gap-3">
                {/* Music Icon & Track Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Music className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {currentTrack?.track_data?.title || 'MUSIC PLAYER'}
                    </p>
                    <p className="text-xs text-white/60 truncate">
                      {currentTrack ? (selectedPlaylist?.title || 'Playlist') : 'Select a track to play'}
                    </p>
                  </div>
                </div>

                {/* Time Display */}
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>{formatTime(currentTime)}</span>
                  <span>/</span>
                  <span>{formatTime(duration)}</span>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 max-w-[200px] lg:max-w-[300px]">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-100 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={skipPrevious}
                    disabled={currentTrackIndex === null || currentTrackIndex === 0}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-white bg-primary hover:bg-primary/90 rounded-full shadow-lg"
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
                    size="icon"
                    className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={skipNext}
                    disabled={currentTrackIndex === null || currentTrackIndex >= tracks.length - 1}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                {/* Volume */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>

                {/* Playlist Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1 px-2"
                    >
                      <span>{playlists.length} playlists</span>
                      <ChevronDown className="h-3.5 w-3.5" />
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

                {/* Expand Track List */}
                {tracks.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile Layout - Stacked */}
            <div className="sm:hidden px-4 py-4 space-y-4">
              {/* Track Info Row */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Music className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white truncate">
                    {currentTrack?.track_data?.title || 'MUSIC PLAYER'}
                  </p>
                  <p className="text-sm text-white/60 truncate">
                    {currentTrack ? (selectedPlaylist?.title || 'Playlist') : 'Select a track'}
                  </p>
                </div>
                
                {/* Playlist & Expand buttons */}
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10 touch-manipulation"
                      >
                        <Music className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      {playlists.map((playlist) => (
                        <DropdownMenuItem
                          key={playlist.id}
                          onClick={() => selectPlaylist(playlist)}
                          className={cn(
                            "cursor-pointer touch-manipulation min-h-[48px]",
                            selectedPlaylist?.id === playlist.id && "bg-accent"
                          )}
                        >
                          {playlist.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {tracks.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10 touch-manipulation"
                      onClick={() => setIsExpanded(!isExpanded)}
                      onTouchEnd={(e) => { e.preventDefault(); setIsExpanded(!isExpanded); }}
                    >
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-100 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/50">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls - Centered */}
              <div className="flex items-center justify-center gap-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 text-white/70 hover:text-white hover:bg-white/10 touch-manipulation"
                  onClick={skipPrevious}
                  onTouchEnd={(e) => { e.preventDefault(); skipPrevious(); }}
                  disabled={currentTrackIndex === null || currentTrackIndex === 0}
                >
                  <SkipBack className="h-6 w-6" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-16 w-16 text-white bg-primary hover:bg-primary/90 rounded-full shadow-xl touch-manipulation"
                  onClick={currentTrack ? togglePlay : handleFirstPlay}
                  onTouchEnd={(e) => { e.preventDefault(); currentTrack ? togglePlay() : handleFirstPlay(); }}
                  onPointerDown={() => forceUnlockAudio()}
                  disabled={tracks.length === 0}
                >
                  {isPlaying ? (
                    <Pause className="h-7 w-7" />
                  ) : (
                    <Play className="h-7 w-7 ml-1" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 text-white/70 hover:text-white hover:bg-white/10 touch-manipulation"
                  onClick={skipNext}
                  onTouchEnd={(e) => { e.preventDefault(); skipNext(); }}
                  disabled={currentTrackIndex === null || currentTrackIndex >= tracks.length - 1}
                >
                  <SkipForward className="h-6 w-6" />
                </Button>
              </div>
            </div>

            {/* Expanded Track List */}
            {isExpanded && tracks.length > 0 && (
              <div className="border-t border-white/10 max-h-48 overflow-y-auto overscroll-contain bg-[#001a33]/90">
                {tracks.map((track, index) => (
                  <button
                    key={track.id}
                    onClick={() => playTrack(index)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 md:px-6 lg:px-8 py-3 text-left hover:bg-white/5 transition-colors touch-manipulation min-h-[48px]",
                      currentTrackIndex === index && "bg-white/10"
                    )}
                  >
                    <span className="text-xs text-white/40 w-5">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {track.track_data?.title || 'Unknown'}
                      </p>
                      {track.track_data?.artist && (
                        <p className="text-xs text-white/50 truncate">
                          {track.track_data.artist}
                        </p>
                      )}
                    </div>
                    {currentTrackIndex === index && isPlaying && (
                      <div className="flex gap-0.5">
                        <span className="w-0.5 h-3 bg-primary animate-pulse" />
                        <span className="w-0.5 h-3 bg-primary animate-pulse delay-75" />
                        <span className="w-0.5 h-3 bg-primary animate-pulse delay-150" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fallback if no player */}
        {!showPlayer && !loading && (
          <div className="h-2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        )}
      </div>
    </div>
  );
};