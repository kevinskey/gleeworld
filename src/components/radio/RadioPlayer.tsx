import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Radio, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RadioPlayerProps {
  className?: string;
}

interface CurrentTrack {
  title: string;
  artist: string;
  category: string;
  audio_url?: string;
}

interface AudioTrack {
  id: string;
  title: string;
  artist_info: string | null;
  audio_url: string;
}

export const RadioPlayer = ({ className = '' }: RadioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack>({
    title: 'Glee World Radio',
    artist: 'Loading...',
    category: 'Live Radio'
  });
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(70);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Fetch audio tracks from the database
  useEffect(() => {
    fetchAudioTracks();
  }, []);

  const fetchAudioTracks = async () => {
    try {
      const { data: tracks, error } = await supabase
        .from('audio_archive')
        .select('id, title, artist_info, audio_url')
        .eq('is_public', true)
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching audio tracks:', error);
        return;
      }

      if (tracks && tracks.length > 0) {
        setAudioTracks(tracks);
        setCurrentTrack({
          title: tracks[0].title,
          artist: tracks[0].artist_info || 'Glee Club',
          category: 'Radio Stream',
          audio_url: tracks[0].audio_url
        });
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
    }
  };

  useEffect(() => {
    // Check initial radio state from localStorage
    const radioState = localStorage.getItem('gleeworld-radio-playing');
    const initialIsPlaying = radioState === 'true';
    setIsPlaying(initialIsPlaying);

    // Initialize audio element
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
      if (currentTrack.audio_url) {
        audioRef.current.src = currentTrack.audio_url;
        if (initialIsPlaying) {
          audioRef.current.play().catch(console.error);
        }
      }
    }

    // Listen for radio state changes
    const handleRadioToggle = (event: CustomEvent) => {
      setIsPlaying(event.detail.isPlaying);
      if (audioRef.current) {
        if (event.detail.isPlaying) {
          audioRef.current.play().catch(console.error);
        } else {
          audioRef.current.pause();
        }
      }
    };

    window.addEventListener('radio-toggle', handleRadioToggle as EventListener);

    return () => {
      window.removeEventListener('radio-toggle', handleRadioToggle as EventListener);
    };
  }, [volume, currentTrack.audio_url]);

  const playNextTrack = () => {
    if (audioTracks.length === 0) return;
    
    const nextIndex = (currentTrackIndex + 1) % audioTracks.length;
    const nextTrack = audioTracks[nextIndex];
    
    setCurrentTrackIndex(nextIndex);
    setCurrentTrack({
      title: nextTrack.title,
      artist: nextTrack.artist_info || 'Glee Club',
      category: 'Radio Stream',
      audio_url: nextTrack.audio_url
    });
  };

  const handleTogglePlay = () => {
    if (!currentTrack.audio_url) {
      toast({
        title: "No Audio Available",
        description: "No tracks available to play",
        variant: "destructive",
      });
      return;
    }

    const newState = !isPlaying;
    setIsPlaying(newState);
    
    // Update localStorage
    localStorage.setItem('gleeworld-radio-playing', newState.toString());
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('radio-toggle', { 
      detail: { isPlaying: newState } 
    }));

    if (audioRef.current) {
      if (newState) {
        audioRef.current.play().catch((error) => {
          console.error('Playback error:', error);
          setIsPlaying(false);
          toast({
            title: "Playback Error",
            description: "Unable to play audio. Trying next track...",
            variant: "destructive",
          });
          // Try next track if current one fails
          playNextTrack();
        });
        toast({
          title: "Radio Playing",
          description: `Now playing: ${currentTrack.title}`,
        });
      } else {
        audioRef.current.pause();
        toast({
          title: "Radio Paused",
          description: "Glee World Radio paused",
        });
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack.audio_url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          // Auto play next track when current one ends
          playNextTrack();
          if (isPlaying) {
            // Small delay to allow track to change, then resume playing
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.play().catch(console.error);
              }
            }, 100);
          }
        }}
        onError={(e) => {
          console.error('Audio error:', e);
          setIsPlaying(false);
          toast({
            title: "Playback Error",
            description: "Switching to next track...",
            variant: "destructive",
          });
          // Try next track on error
          playNextTrack();
        }}
      />
      
      {/* Radio Player Button */}
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant="ghost"
          onClick={handleTogglePlay}
          className="gap-2 text-primary hover:bg-primary/10 border-2 border-primary/50 bg-primary/5 h-8 sm:h-10 px-2 sm:px-3 lg:px-4"
          title={isPlaying ? 'Pause Radio' : 'Play Radio'}
        >
          <Radio className="h-3 w-3 sm:h-4 sm:w-4" />
          {isPlaying ? (
            <Pause className="h-3 w-3 sm:h-4 sm:w-4" />
          ) : (
            <Play className="h-3 w-3 sm:h-4 sm:w-4" />
          )}
          <span className="hidden sm:inline text-xs sm:text-sm">
            {isPlaying ? '📻 Live' : '📻 Radio'}
          </span>
        </Button>
        
        {/* Volume Control for larger screens */}
        <div className="hidden lg:flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-primary/20 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${volume}%, hsl(var(--primary) / 0.2) ${volume}%, hsl(var(--primary) / 0.2) 100%)`
            }}
          />
        </div>
      </div>
    </>
  );
};