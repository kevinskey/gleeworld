import { useState, useRef, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { azuraCastService, type AzuraCastNowPlaying } from '@/services/azuracast';

export interface RadioTrack {
  title: string;
  artist: string;
  album?: string;
  art?: string;
}

export interface RadioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  listenerCount: number;
  currentTrack: RadioTrack | null;
  isLive: boolean;
  volume: number;
  streamerName?: string;
}

export const useRadioPlayer = () => {
  const [state, setState] = useState<RadioPlayerState>({
    isPlaying: false,
    isLoading: false,
    listenerCount: 0,
    currentTrack: null,
    isLive: false,
    volume: 0.7,
    streamerName: undefined,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get stream URLs from AzuraCast service
  const RADIO_STREAM_URLS = azuraCastService.getStreamUrls();

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
      console.log('Radio stream can play - checking if live...');
      setState(prev => ({ ...prev, isLoading: false, isLive: true }));
      
      // Additional check to see if stream is actually broadcasting
      if (audioRef.current) {
        setTimeout(() => {
          // If we can get duration or the stream is playing, it's likely live
          const isActuallyLive = audioRef.current && (
            audioRef.current.duration === Infinity || // Live streams often have infinite duration
            !audioRef.current.paused ||
            audioRef.current.readyState >= 3 // HAVE_FUTURE_DATA or better
          );
          console.log('Live status check:', isActuallyLive, 'Duration:', audioRef.current?.duration, 'ReadyState:', audioRef.current?.readyState);
          setState(prev => ({ ...prev, isLive: isActuallyLive }));
        }, 1000);
      }
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
      startDataUpdates();
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
      stopDataUpdates();
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
      stopDataUpdates();
    };
  }, [toast]);

  // Fetch real-time data from AzuraCast
  const updateNowPlaying = async () => {
    try {
      const nowPlaying = await azuraCastService.getNowPlaying();
      if (nowPlaying) {
        setState(prev => ({
          ...prev,
          listenerCount: nowPlaying.listeners.current,
          isLive: nowPlaying.live.is_live,
          streamerName: nowPlaying.live.streamer_name,
          currentTrack: nowPlaying.now_playing.song ? {
            title: nowPlaying.now_playing.song.title || 'Unknown Title',
            artist: nowPlaying.now_playing.song.artist || 'Unknown Artist',
            album: nowPlaying.now_playing.song.album,
            art: nowPlaying.now_playing.song.art,
          } : null,
        }));
        console.log('Updated now playing data:', nowPlaying.now_playing.song);
      }
    } catch (error) {
      console.error('Error updating now playing data:', error);
    }
  };

  const startDataUpdates = () => {
    // Update immediately
    updateNowPlaying();
    
    // Then update every 15 seconds
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
    updateIntervalRef.current = setInterval(updateNowPlaying, 15000);
  };

  const stopDataUpdates = () => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  };

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

  return {
    ...state,
    play,
    pause,
    togglePlayPause,
    setVolume,
  };
};