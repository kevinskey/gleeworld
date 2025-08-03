import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Radio, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RadioPlayerProps {
  className?: string;
}

interface CurrentTrack {
  title: string;
  artist: string;
  category: string;
}

export const RadioPlayer = ({ className = '' }: RadioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack>({
    title: 'Evening Harmonies',
    artist: 'Glee World 101',
    category: 'Live Radio'
  });
  const [volume, setVolume] = useState(70);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Mock audio stream URL - in production this would be your actual radio stream
  const streamUrl = '/audio/radio-stream.mp3';

  useEffect(() => {
    // Check initial radio state from localStorage
    const radioState = localStorage.getItem('gleeworld-radio-playing');
    const initialIsPlaying = radioState === 'true';
    setIsPlaying(initialIsPlaying);

    // Initialize audio element
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
      if (initialIsPlaying) {
        audioRef.current.play().catch(console.error);
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
  }, [volume]);

  const handleTogglePlay = () => {
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
        audioRef.current.play().catch(console.error);
        toast({
          title: "Radio Playing",
          description: "Now playing Glee World 101",
        });
      } else {
        audioRef.current.pause();
        toast({
          title: "Radio Paused",
          description: "Glee World 101 paused",
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
        src={streamUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={(e) => {
          console.error('Audio error:', e);
          setIsPlaying(false);
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