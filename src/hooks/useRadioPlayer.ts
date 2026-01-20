import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { radioCoService } from '@/services/radioco';

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
  upNextTrack: RadioTrack | null;
  isLive: boolean;
  isOnline: boolean;
  volume: number;
  streamerName?: string;
  currentStationId: string;
}

let sharedAudio: HTMLAudioElement | null = null;

export const useRadioPlayer = () => {
  const [state, setState] = useState<RadioPlayerState>({
    isPlaying: false,
    isLoading: false,
    listenerCount: 0,
    currentTrack: null,
    upNextTrack: null,
    isLive: false,
    isOnline: false,
    volume: 0.8,
    streamerName: undefined,
    currentStationId: 'sd0d2e77cf',
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentStreamUrlIndexRef = useRef(0);
  const { toast } = useToast();

  const refreshNowPlaying = useCallback(async () => {
    try {
      const status = await radioCoService.getStatus();
      const currentTrack = status?.current_track;

      setState(prev => ({
        ...prev,
        isOnline: status?.status === 'online',
        currentTrack: currentTrack?.title ? {
          title: currentTrack.title,
          artist: '',
          art: currentTrack.artwork_url_large || currentTrack.artwork_url || undefined,
        } : prev.currentTrack,
      }));
    } catch (error) {
      console.warn('refreshNowPlaying failed:', error);
    }
  }, []);

  // Clear any pending reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Attempt to reconnect after stream failure
  const attemptReconnect = useCallback(async () => {
    if (!audioRef.current || !isPlayingRef.current) return;
    
    reconnectAttemptRef.current += 1;
    console.log(`useRadioPlayer: Reconnect attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts}`);
    
    if (reconnectAttemptRef.current > maxReconnectAttempts) {
      console.error('useRadioPlayer: Max reconnect attempts reached');
      setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
      isPlayingRef.current = false;
      toast({ 
        title: 'Stream Disconnected', 
        description: 'Could not maintain connection. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    const audio = audioRef.current;
    const streamUrls = radioCoService.getStreamUrls();
    
    // Try next stream URL in rotation
    currentStreamUrlIndexRef.current = (currentStreamUrlIndexRef.current + 1) % streamUrls.length;
    const url = streamUrls[currentStreamUrlIndexRef.current];
    
    console.log(`useRadioPlayer: Trying stream URL ${currentStreamUrlIndexRef.current + 1}: ${url}`);
    
    try {
      audio.src = url;
      audio.load();
      await audio.play();
      console.log('useRadioPlayer: Reconnected successfully');
      reconnectAttemptRef.current = 0; // Reset on success
      await refreshNowPlaying();
    } catch (error) {
      console.warn('useRadioPlayer: Reconnect failed, scheduling retry...', error);
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current - 1), 16000);
      reconnectTimeoutRef.current = setTimeout(attemptReconnect, delay);
    }
  }, [refreshNowPlaying, toast]);

  useEffect(() => {
    if (!sharedAudio) {
      sharedAudio = new Audio();
      sharedAudio.preload = 'none';
    }
    const audio = sharedAudio;
    audioRef.current = audio;
    audio.volume = 0.8;

    const handlePlay = () => {
      isPlayingRef.current = true;
      reconnectAttemptRef.current = 0; // Reset reconnect counter on successful play
      setState(prev => ({ ...prev, isPlaying: true, isLoading: false }));
    };
    
    const handlePause = () => {
      isPlayingRef.current = false;
      clearReconnectTimeout();
      setState(prev => ({ ...prev, isPlaying: false }));
    };
    
    const handleError = (e: Event) => {
      console.error('useRadioPlayer: Stream error', e);
      setState(prev => ({ ...prev, isLoading: false }));
      
      // Only attempt reconnect if we were supposed to be playing
      if (isPlayingRef.current) {
        console.log('useRadioPlayer: Scheduling reconnect due to error...');
        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(attemptReconnect, 1000);
      } else {
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    };
    
    const handleWaiting = () => {
      console.log('useRadioPlayer: Stream buffering...');
      setState(prev => ({ ...prev, isLoading: true }));
    };
    
    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isLoading: false }));
    };
    
    const handleStalled = () => {
      console.warn('useRadioPlayer: Stream stalled');
      // Only trigger reconnect if playing and stalled for too long
      if (isPlayingRef.current) {
        clearReconnectTimeout();
        // Wait 3 seconds before attempting reconnect for stalled streams
        reconnectTimeoutRef.current = setTimeout(() => {
          if (audio.readyState < 3 && isPlayingRef.current) {
            console.log('useRadioPlayer: Stream still stalled, reconnecting...');
            attemptReconnect();
          }
        }, 3000);
      }
    };
    
    const handleEnded = () => {
      console.log('useRadioPlayer: Stream ended unexpectedly');
      // Live streams shouldn't end - attempt reconnect
      if (isPlayingRef.current) {
        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(attemptReconnect, 1000);
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('ended', handleEnded);

    if (!audio.paused && audio.src) {
      isPlayingRef.current = true;
      setState(prev => ({ ...prev, isPlaying: true }));
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('ended', handleEnded);
      clearReconnectTimeout();
    };
  }, [attemptReconnect, clearReconnectTimeout]);

  // Poll Radio.co for now playing
  useEffect(() => {
    refreshNowPlaying();
    const interval = setInterval(refreshNowPlaying, 15000);
    return () => clearInterval(interval);
  }, [refreshNowPlaying]);

  const play = useCallback(async () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    setState(prev => ({ ...prev, isLoading: true }));
    reconnectAttemptRef.current = 0;
    currentStreamUrlIndexRef.current = 0;

    const streamUrls = radioCoService.getStreamUrls();
    console.log('useRadioPlayer: Attempting to connect to Radio.co streams...');
    
    for (let i = 0; i < streamUrls.length; i++) {
      try {
        const url = streamUrls[i];
        console.log(`useRadioPlayer: Trying stream ${i + 1}:`, url);
        currentStreamUrlIndexRef.current = i;
        audio.src = url;
        audio.load();
        
        // Set isPlaying intent before attempting play
        isPlayingRef.current = true;
        
        await audio.play();
        console.log(`useRadioPlayer: Successfully connected to stream ${i + 1}`);
        await refreshNowPlaying();
        return;
      } catch (error) {
        console.warn(`useRadioPlayer: Failed stream ${i + 1}:`, error);
      }
    }

    isPlayingRef.current = false;
    setState(prev => ({ ...prev, isLoading: false }));
    toast({ title: 'Connection Error', description: 'Could not connect to radio stream. The station may be offline.', variant: 'destructive' });
  }, [refreshNowPlaying, toast]);

  const pause = useCallback(() => {
    clearReconnectTimeout();
    isPlayingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [clearReconnectTimeout]);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  const switchStream = useCallback(async (streamUrl: string, stationName?: string) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const wasPlaying = isPlayingRef.current;

    clearReconnectTimeout();
    
    // Pause cleanly first
    audio.pause();

    // Give browser a moment to process the pause before loading new source
    await new Promise(resolve => setTimeout(resolve, 50));

    audio.src = streamUrl;
    audio.load();

    if (wasPlaying) {
      isPlayingRef.current = true;
      
      // Wait for the new source to be ready before playing
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          reject(new Error('Stream load timeout'));
        }, 10000);
        
        const onCanPlay = () => {
          clearTimeout(timeout);
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          resolve();
        };
        const onError = () => {
          clearTimeout(timeout);
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          reject(new Error('Stream failed to load'));
        };
        audio.addEventListener('canplay', onCanPlay, { once: true });
        audio.addEventListener('error', onError, { once: true });
      });

      try {
        await audio.play();
        await refreshNowPlaying();
        if (stationName) {
          toast({ title: 'Now Playing', description: stationName });
        }
      } catch (error) {
        console.error('Failed to play new stream:', error);
        isPlayingRef.current = false;
      }
    }
  }, [clearReconnectTimeout, refreshNowPlaying, toast]);

  const resetAudio = useCallback(async () => {
    clearReconnectTimeout();
    if (sharedAudio) {
      sharedAudio.pause();
      sharedAudio.src = '';
    }
    sharedAudio = null;
    audioRef.current = null;
    isPlayingRef.current = false;
    reconnectAttemptRef.current = 0;
    setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
    toast({ title: 'Audio Reset', description: 'Press Play to restart.' });
  }, [clearReconnectTimeout, toast]);

  return {
    ...state,
    play,
    pause,
    togglePlayPause,
    setVolume,
    switchStream,
    resetAudio,
    refreshNowPlaying,
  };
};
