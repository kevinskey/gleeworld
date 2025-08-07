import { useState, useRef, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

export interface RadioTrack {
  title: string;
  artist: string;
}

export interface RadioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  listenerCount: number;
  currentTrack: RadioTrack | null;
  isLive: boolean;
  volume: number;
}

export const useRadioPlayer = () => {
  const [state, setState] = useState<RadioPlayerState>({
    isPlaying: false,
    isLoading: false,
    listenerCount: 0,
    currentTrack: null,
    isLive: false,
    volume: 0.7,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  
  // Multiple stream URLs with fallbacks
  const RADIO_STREAM_URLS = [
    'https://134.199.204.155/public/glee_world_radio', // HTTPS version
    'https://stream.zeno.fm/your-station-id', // Example backup stream
    'https://ice1.somafm.com/groovesalad-256-mp3' // Demo stream for testing
  ];

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = 'anonymous';
    audioRef.current.preload = 'none';
    
    const audio = audioRef.current;

    const handleLoadStart = () => {
      setState(prev => ({ ...prev, isLoading: true }));
    };

    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isLoading: false, isLive: true }));
    };

    const handleError = (e: ErrorEvent) => {
      console.error('Radio stream error:', e);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isPlaying: false, 
        isLive: false 
      }));
      toast({
        title: "Radio Stream Error",
        description: "Unable to connect to Glee World Radio",
        variant: "destructive",
      });
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.src = '';
    };
  }, [toast]);

  const play = async () => {
    if (!audioRef.current) return;

    setState(prev => ({ ...prev, isLoading: true }));

    // Try each stream URL until one works
    for (const streamUrl of RADIO_STREAM_URLS) {
      try {
        console.log(`Attempting to play stream: ${streamUrl}`);
        
        audioRef.current.src = streamUrl;
        audioRef.current.volume = state.volume;
        
        await audioRef.current.play();
        
        toast({
          title: "Now Playing",
          description: "Glee World Radio is now streaming",
        });
        return; // Success - exit the loop
        
      } catch (error) {
        console.error(`Failed to play stream ${streamUrl}:`, error);
        
        // If this was the last URL, show error
        if (streamUrl === RADIO_STREAM_URLS[RADIO_STREAM_URLS.length - 1]) {
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            isPlaying: false 
          }));
          toast({
            title: "Radio Unavailable",
            description: "All radio streams are currently offline. Please try again later.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const togglePlayPause = () => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const setVolume = (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setState(prev => ({ ...prev, volume: clampedVolume }));
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  };

  // Mock updating current track info (would be from stats endpoint)
  useEffect(() => {
    if (state.isPlaying) {
      const interval = setInterval(() => {
        setState(prev => ({
          ...prev,
          listenerCount: Math.floor(Math.random() * 50) + 100,
          currentTrack: {
            title: "Spelman College Glee Club Performance",
            artist: "Live from Atlanta"
          }
        }));
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [state.isPlaying]);

  return {
    ...state,
    play,
    pause,
    togglePlayPause,
    setVolume,
  };
};