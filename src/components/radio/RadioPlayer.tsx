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

    // Listen for radio state changes - use different event names
    const eventName = isPersonalRadio ? 'personal-radio-toggle' : 'timeline-radio-toggle';
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

    window.addEventListener(eventName, handleRadioToggle as EventListener);

    return () => {
      window.removeEventListener(eventName, handleRadioToggle as EventListener);
    };
  }, [volume, currentTrack.audio_url, isPersonalRadio]);

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

    // Call external toggle if provided
    if (onToggle) {
      onToggle();
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
      <div className={`flex items-center ${className}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTogglePlay}
          className="h-5 w-5 p-0 hover:bg-transparent border border-black rounded"
          title="Glee Radio"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 sm:h-5 sm:w-5 text-black stroke-2" />
          ) : (
            <Play className="h-4 w-4 sm:h-5 sm:w-5 text-black stroke-2" />
          )}
        </Button>
      </div>
    </>
  );
};