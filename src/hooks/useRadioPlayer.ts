import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { radioCoService } from '@/services/radioco';
import { supabase } from "@/integrations/supabase/client";

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

  const withCacheBuster = useCallback((url: string) => {
    const hasQuery = url.includes('?');
    const sep = hasQuery ? '&' : '?';
    return `${url}${sep}ts=${Date.now()}`;
  }, []);

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
      setState(prev => ({ ...prev, isPlaying: true, isLoading: false }));
    };
    const handlePause = () => {
      isPlayingRef.current = false;
      setState(prev => ({ ...prev, isPlaying: false }));
    };
    const handleError = () => {
      setState(prev => ({ ...prev, isLoading: false, isPlaying: false }));
      isPlayingRef.current = false;
    };
    const handleWaiting = () => setState(prev => ({ ...prev, isLoading: true }));
    const handleCanPlay = () => setState(prev => ({ ...prev, isLoading: false }));

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);

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
    };
  }, []);

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

    const streamUrls = radioCoService.getStreamUrls();
    console.log('useRadioPlayer: Attempting to connect to Radio.co streams...');
    
    for (let i = 0; i < streamUrls.length; i++) {
      try {
        const url = withCacheBuster(streamUrls[i]);
        console.log(`useRadioPlayer: Trying stream ${i + 1}:`, url);
        audio.src = url;
        audio.load();
        await audio.play();
        console.log(`useRadioPlayer: Successfully connected to stream ${i + 1}`);
        await refreshNowPlaying();
        return;
      } catch (error) {
        console.warn(`useRadioPlayer: Failed stream ${i + 1}:`, error);
      }
    }

    setState(prev => ({ ...prev, isLoading: false }));
    toast({ title: 'Connection Error', description: 'Could not connect to radio stream. The station may be offline.', variant: 'destructive' });
  }, [withCacheBuster, refreshNowPlaying, toast]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

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

    // Pause cleanly first
    audio.pause();

    // Give browser a moment to process the pause before loading new source
    await new Promise(resolve => setTimeout(resolve, 50));

    audio.src = withCacheBuster(streamUrl);
    audio.load();

    if (wasPlaying) {
      // Wait for the new source to be ready before playing
      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          resolve();
        };
        const onError = () => {
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
      }
    }
  }, [withCacheBuster, refreshNowPlaying, toast]);

  const resetAudio = useCallback(async () => {
    if (sharedAudio) {
      sharedAudio.pause();
      sharedAudio.src = '';
    }
    sharedAudio = null;
    audioRef.current = null;
    setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
    toast({ title: 'Audio Reset', description: 'Press Play to restart.' });
  }, [toast]);

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
