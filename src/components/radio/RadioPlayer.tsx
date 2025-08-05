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
    // Try the stream with explicit format
    audio_url: 'http://134.199.204.155/public/glee_world_radio'
  });
  const [streamError, setStreamError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Effect to handle audio source changes
  useEffect(() => {
    if (audioRef.current) {
      console.log('Setting audio source:', currentTrack.audio_url);
      audioRef.current.src = currentTrack.audio_url!;
      audioRef.current.volume = 0.8; // Increase volume
      audioRef.current.preload = 'none'; // Don't preload for streams
      // Remove crossOrigin for now to test
      audioRef.current.load();
      setStreamError(null);
      console.log('Audio element configured, volume:', audioRef.current.volume);
      
      // Test if URL is reachable
      fetch(currentTrack.audio_url!)
        .then(response => {
          console.log('Stream URL response:', response.status, response.statusText);
          console.log('Content-Type:', response.headers.get('content-type'));
        })
        .catch(error => {
          console.error('Stream URL fetch error:', error);
        });
    }
  }, [currentTrack.audio_url]);

  // Separate effect to handle play state changes
  useEffect(() => {
    console.log('Play state changed:', isPlaying, 'Audio URL:', currentTrack.audio_url);
    if (audioRef.current && currentTrack.audio_url) {
      console.log('Audio element exists, attempting to', isPlaying ? 'play' : 'pause');
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        console.log('Play promise:', playPromise);
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Play promise resolved successfully');
          }).catch(error => {
            console.error('Error playing stream:', error);
            setIsPlaying(false);
            setStreamError("Unable to play stream. Check if stream is online and try again.");
            toast({
              title: "Playback Error", 
              description: "Stream may be offline. Please try again.",
              variant: "destructive",
            });
          });
        }
      } else {
        audioRef.current.pause();
      }
    } else {
      console.log('Audio ref or URL missing:', { 
        hasAudioRef: !!audioRef.current, 
        audioUrl: currentTrack.audio_url 
      });
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
    console.log('Toggle play clicked, current state:', isPlaying);
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
      if (streamError) {
        toast({
          title: "Stream Status",
          description: "Attempting to reconnect to radio stream...",
        });
      } else {
        toast({
          title: "Radio Playing",
          description: "Glee World Radio Live Stream",
        });
      }
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
        onPlay={() => {
          console.log('Audio started playing');
          setIsPlaying(true);
          setStreamError(null);
        }}
        onPause={() => {
          console.log('Audio paused');
          setIsPlaying(false);
        }}
        onError={(e) => {
          console.error('Stream error:', e);
          console.log('Error details:', e.currentTarget.error);
          setIsPlaying(false);
          const errorMsg = "Radio stream unavailable - server may be offline";
          setStreamError(errorMsg);
          toast({
            title: "Stream Error",
            description: errorMsg,
            variant: "destructive",
          });
        }}
        onCanPlay={() => {
          console.log('Audio can play, readyState:', audioRef.current?.readyState);
          setStreamError(null);
        }}
        onLoadStart={() => console.log('Audio load started')}
        onLoadedData={() => console.log('Audio data loaded')}
        onWaiting={() => console.log('Audio waiting for data')}
        onStalled={() => console.log('Audio stalled')}
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