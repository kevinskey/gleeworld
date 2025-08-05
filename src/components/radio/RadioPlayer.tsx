import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Radio, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RadioPlayerProps {
  className?: string;
  isPlaying?: boolean;
  onToggle?: () => void;
  isPersonalRadio?: boolean; // Distinguish between personal radio (header) and timeline radio
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

export const RadioPlayer = ({ className = '', isPlaying: externalIsPlaying, onToggle, isPersonalRadio = true }: RadioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(externalIsPlaying || false);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack>({
    title: 'Glee World Radio',
    artist: 'Loading tracks...',
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

  // Effect to handle audio source changes (without isPlaying dependency to avoid loops)
  useEffect(() => {
    if (audioRef.current && currentTrack.audio_url) {
      audioRef.current.src = currentTrack.audio_url;
      audioRef.current.volume = volume / 100;
      audioRef.current.load();
    }
  }, [currentTrack.audio_url, volume]);

  // Separate effect to handle play state changes
  useEffect(() => {
    if (audioRef.current && currentTrack.audio_url) {
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Error playing track:', error);
          setIsPlaying(false);
          toast({
            title: "Playback Error", 
            description: "Unable to play track",
            variant: "destructive",
          });
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack.audio_url]);

  useEffect(() => {
    // Sync with external state if provided
    if (externalIsPlaying !== undefined) {
      setIsPlaying(externalIsPlaying);
      return;
    }

    // Use different localStorage keys for personal vs timeline radio
    const storageKey = isPersonalRadio ? 'gleeworld-personal-radio-playing' : 'gleeworld-timeline-radio-playing';
    const radioState = localStorage.getItem(storageKey);
    const initialIsPlaying = radioState === 'true';
    setIsPlaying(initialIsPlaying);

    // The separate useEffect will handle audio play/pause based on isPlaying state

    // Listen for radio state changes - use different event names
    const eventName = isPersonalRadio ? 'personal-radio-toggle' : 'timeline-radio-toggle';
    const handleRadioToggle = (event: CustomEvent) => {
      setIsPlaying(event.detail.isPlaying);
      // Audio play/pause is handled by the useEffect above
    };

    window.addEventListener(eventName, handleRadioToggle as EventListener);

    return () => {
      window.removeEventListener(eventName, handleRadioToggle as EventListener);
    };
  }, [isPersonalRadio]);

  const playNextTrack = () => {
    if (audioTracks.length === 0) return;
    
    const nextIndex = (currentTrackIndex + 1) % audioTracks.length;
    const nextTrack = audioTracks[nextIndex];
    
    setCurrentTrackIndex(nextIndex);
    const newTrack = {
      title: nextTrack.title,
      artist: nextTrack.artist_info || 'Glee Club',
      category: 'Radio Stream',
      audio_url: nextTrack.audio_url
    };
    setCurrentTrack(newTrack);
    
    // The useEffect will handle loading the new audio source automatically
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
    
    // Update localStorage with appropriate key
    const storageKey = isPersonalRadio ? 'gleeworld-personal-radio-playing' : 'gleeworld-timeline-radio-playing';
    localStorage.setItem(storageKey, newState.toString());
    
    // Dispatch custom event for other components with appropriate event name
    const eventName = isPersonalRadio ? 'personal-radio-toggle' : 'timeline-radio-toggle';
    window.dispatchEvent(new CustomEvent(eventName, { 
      detail: { isPlaying: newState } 
    }));

    // Call external toggle if provided (for parent state sync)
    if (onToggle) {
      onToggle();
    }

    // Audio play/pause is now handled by useEffect
    if (newState) {
      toast({
        title: "Radio Playing",
        description: `Now playing: ${currentTrack.title}`,
      });
    } else {
      toast({
        title: "Radio Paused", 
        description: "Glee World Radio paused",
      });
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
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          // Auto play next track when current one ends
          playNextTrack();
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
      <div className={`flex items-center ${className}`}>
        <Button
          variant={isPlaying ? "default" : "ghost"}
          size="sm"
          onClick={handleTogglePlay}
          className={`h-5 w-5 p-0 border rounded transition-all duration-200 ${
            isPlaying 
              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
              : 'hover:bg-muted border-border'
          }`}
          title="Glee Radio"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 sm:h-5 sm:w-5 stroke-2" />
          ) : (
            <Play className="h-4 w-4 sm:h-5 sm:w-5 stroke-2" />
          )}
        </Button>
      </div>
    </>
  );
};