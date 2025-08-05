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
    artist: 'Spelman College Glee Club',
    category: 'Live Radio',
    audio_url: 'http://134.199.204.155/public/glee_world_radio'
  });
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Effect to handle audio source changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = currentTrack.audio_url!;
      audioRef.current.volume = 0.7; // Fixed volume for radio stream
      audioRef.current.load();
    }
  }, [currentTrack.audio_url]);

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

    // Listen for radio state changes - use different event names
    const eventName = isPersonalRadio ? 'personal-radio-toggle' : 'timeline-radio-toggle';
    const handleRadioToggle = (event: CustomEvent) => {
      setIsPlaying(event.detail.isPlaying);
    };

    window.addEventListener(eventName, handleRadioToggle as EventListener);

    return () => {
      window.removeEventListener(eventName, handleRadioToggle as EventListener);
    };
  }, [isPersonalRadio]);

  const handleTogglePlay = () => {
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

    if (newState) {
      toast({
        title: "Radio Playing",
        description: "Glee World Radio Live Stream",
      });
    } else {
      toast({
        title: "Radio Paused", 
        description: "Glee World Radio paused",
      });
    }
  };


  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={(e) => {
          console.error('Stream error:', e);
          setIsPlaying(false);
          toast({
            title: "Stream Error",
            description: "Unable to connect to radio stream",
            variant: "destructive",
          });
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