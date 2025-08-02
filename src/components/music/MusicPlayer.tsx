import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Share2,
  Music,
  Shuffle,
  Repeat
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  duration: number;
  album_id?: string;
  album?: {
    title: string;
    cover_image_url?: string;
  };
  play_count: number;
  isLiked?: boolean;
  likeCount?: number;
}

interface MusicPlayerProps {
  tracks: Track[];
  className?: string;
}

export const MusicPlayer = ({ tracks, className = "" }: MusicPlayerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');

  const currentTrack = tracks[currentTrackIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      handleNext();
    };
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [currentTrackIndex]);

  const handlePlayPause = async () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        // For mobile compatibility, ensure audio is loaded
        if (audioRef.current.readyState < 2) {
          await new Promise((resolve) => {
            const onLoadedData = () => {
              audioRef.current?.removeEventListener('loadeddata', onLoadedData);
              resolve(void 0);
            };
            audioRef.current?.addEventListener('loadeddata', onLoadedData);
            audioRef.current?.load();
          });
        }
        
        const playPromise = audioRef.current.play();
        
        // Handle mobile autoplay restrictions
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
          
          // Increment play count
          await supabase.rpc('increment_play_count', { track_uuid: currentTrack.id });
        }
      } catch (error) {
        console.error('Error playing audio:', error);
        
        // Handle mobile-specific errors
        if (error.name === 'NotAllowedError') {
          toast({
            title: "Tap to Play",
            description: "Please tap the play button to start audio",
          });
        } else {
          toast({
            title: "Playback Error",
            description: "Could not play the audio file",
            variant: "destructive"
          });
        }
      }
    }
  };

  const handleNext = () => {
    let nextIndex;
    if (repeatMode === 'one') {
      nextIndex = currentTrackIndex;
    } else if (isShuffled) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
      nextIndex = currentTrackIndex + 1;
      if (nextIndex >= tracks.length) {
        nextIndex = repeatMode === 'all' ? 0 : tracks.length - 1;
      }
    }
    setCurrentTrackIndex(nextIndex);
    setIsPlaying(false);
  };

  const handlePrevious = () => {
    if (currentTime > 3) {
      // If more than 3 seconds in, restart current track
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    } else {
      // Go to previous track
      const prevIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : tracks.length - 1;
      setCurrentTrackIndex(prevIndex);
      setIsPlaying(false);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && currentTrack) {
      const newTime = (value[0] / 100) * currentTrack.duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleLike = async () => {
    if (!user || !currentTrack) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like tracks",
      });
      return;
    }

    try {
      if (currentTrack.isLiked) {
        await supabase
          .from('track_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('track_id', currentTrack.id);
      } else {
        await supabase
          .from('track_likes')
          .insert({
            user_id: user.id,
            track_id: currentTrack.id
          });
      }

      toast({
        title: currentTrack.isLiked ? "Removed from favorites" : "Added to favorites",
        description: `"${currentTrack.title}" ${currentTrack.isLiked ? 'removed from' : 'added to'} your favorites`,
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Could not update favorite status",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    if (!currentTrack) return;

    try {
      await navigator.share({
        title: `${currentTrack.title} by ${currentTrack.artist}`,
        text: `Check out this track from Glee World!`,
        url: window.location.href
      });
    } catch (error) {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Track link copied to clipboard",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) {
    return (
      <Card className={`bg-white/20 backdrop-blur-md border border-white/30 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Music className="h-12 w-12 text-gray-400" />
            <p className="ml-3 text-gray-600">No tracks available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl w-full max-w-full ${className}`}>
      <CardContent className="p-3 sm:p-6">
        <audio
          ref={audioRef}
          src={currentTrack.audio_url}
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
        />
        
        {/* Track Info */}
        <div className="flex items-center space-x-2 sm:space-x-4 mb-3 sm:mb-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            {currentTrack.album?.cover_image_url ? (
              <img
                src={currentTrack.album.cover_image_url}
                alt={`${currentTrack.album.title} cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <Music className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            )}
          </div>
          
          <div className="flex-1 min-w-0 px-1">
            <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{currentTrack.title}</h3>
            <p className="text-xs sm:text-sm text-gray-600 truncate">{currentTrack.artist}</p>
            {currentTrack.album && (
              <p className="text-xs text-gray-500 truncate hidden sm:block">{currentTrack.album.title}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`${currentTrack.isLiked ? 'text-red-500' : 'text-gray-500'} hover:text-red-600`}
            >
              <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${currentTrack.isLiked ? 'fill-current' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="text-gray-500 hover:text-gray-700"
            >
              <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3 sm:mb-4">
          <Slider
            value={[currentTrack.duration > 0 ? (currentTime / currentTrack.duration) * 100 : 0]}
            onValueChange={handleSeek}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(currentTrack.duration || 0)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsShuffled(!isShuffled)}
              className={`${isShuffled ? 'text-primary' : 'text-gray-500'} hover:text-primary`}
            >
              <Shuffle className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all'];
                const currentIndex = modes.indexOf(repeatMode);
                setRepeatMode(modes[(currentIndex + 1) % modes.length]);
              }}
              className={`${repeatMode !== 'none' ? 'text-primary' : 'text-gray-500'} hover:text-primary`}
            >
              <Repeat className="h-3 w-3 sm:h-4 sm:w-4" />
              {repeatMode === 'one' && <span className="text-xs ml-1 hidden sm:inline">1</span>}
            </Button>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={tracks.length <= 1}
            >
              <SkipBack className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            
            <Button
              onClick={handlePlayPause}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-10 h-10 sm:w-12 sm:h-12"
            >
              {isLoading ? (
                <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Play className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={tracks.length <= 1}
            >
              <SkipForward className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="h-3 w-3 sm:h-4 sm:w-4" /> : <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-12 sm:w-16"
            />
          </div>
        </div>

        {/* Track List */}
        {tracks.length > 1 && (
          <div className="mt-3 sm:mt-4 max-h-48 sm:max-h-64 overflow-y-auto scroll-smooth">
            <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Playlist ({tracks.length} tracks)</h4>
            <div className="space-y-1">
              {tracks.map((track, index) => (
                <button
                  key={track.id}
                  onClick={() => {
                    setCurrentTrackIndex(index);
                    setIsPlaying(false);
                  }}
                  className={`w-full text-left p-1.5 sm:p-2 text-xs rounded transition-colors ${
                    index === currentTrackIndex
                      ? 'bg-primary/20 text-primary'
                      : 'hover:bg-white/20 text-gray-600'
                  }`}
                >
                  <div className="truncate text-xs sm:text-sm">{track.title}</div>
                  <div className="truncate text-gray-500 text-xs">{track.artist}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};