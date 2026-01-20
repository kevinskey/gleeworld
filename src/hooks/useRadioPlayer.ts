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
  const wasPlayingBeforeHiddenRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentStreamUrlIndexRef = useRef(0);
  const lastKnownStreamUrlRef = useRef<string>('');
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
      
      // Update Media Session metadata if available
      if ('mediaSession' in navigator && currentTrack?.title) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title,
            artist: 'GleeWorld Radio',
            album: 'Live Stream',
            artwork: currentTrack.artwork_url_large ? [
              { src: currentTrack.artwork_url_large, sizes: '512x512', type: 'image/jpeg' }
            ] : []
          });
        } catch (e) {
          // Ignore media session errors
        }
      }
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

  // Resume playback - used for visibility change recovery
  const resumePlayback = useCallback(async () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    
    console.log('useRadioPlayer: Attempting to resume playback...');
    
    try {
      // If audio is paused but we should be playing, resume
      if (audio.paused && isPlayingRef.current) {
        await audio.play();
        console.log('useRadioPlayer: Playback resumed successfully');
      }
    } catch (error) {
      console.warn('useRadioPlayer: Resume failed, will reconnect...', error);
      // If resume fails, try reconnecting to the stream
      reconnectAttemptRef.current = 0;
      
      if (lastKnownStreamUrlRef.current) {
        try {
          audio.src = lastKnownStreamUrlRef.current;
          audio.load();
          await audio.play();
          console.log('useRadioPlayer: Reconnected after resume failure');
        } catch (reconnectError) {
          console.error('useRadioPlayer: Full reconnect also failed', reconnectError);
        }
      }
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
      lastKnownStreamUrlRef.current = url;
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

  // Setup Media Session API for lock screen controls
  const setupMediaSession = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        if (audioRef.current && !isPlayingRef.current) {
          isPlayingRef.current = true;
          audioRef.current.play().catch(console.error);
        }
      });
      
      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioRef.current) {
          isPlayingRef.current = false;
          audioRef.current.pause();
        }
      });
      
      navigator.mediaSession.setActionHandler('stop', () => {
        if (audioRef.current) {
          isPlayingRef.current = false;
          audioRef.current.pause();
          audioRef.current.src = '';
        }
      });
      
      console.log('useRadioPlayer: Media Session API configured');
    } catch (e) {
      console.warn('useRadioPlayer: Media Session setup failed', e);
    }
  }, []);

  useEffect(() => {
    if (!sharedAudio) {
      sharedAudio = new Audio();
      sharedAudio.preload = 'none';
      // Enable background playback on iOS
      sharedAudio.setAttribute('playsinline', 'true');
      sharedAudio.setAttribute('webkit-playsinline', 'true');
    }
    const audio = sharedAudio;
    audioRef.current = audio;
    audio.volume = 0.8;
    
    // Setup Media Session for lock screen controls
    setupMediaSession();

    const handlePlay = () => {
      isPlayingRef.current = true;
      reconnectAttemptRef.current = 0;
      setState(prev => ({ ...prev, isPlaying: true, isLoading: false }));
      
      // Update Media Session playback state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };
    
    const handlePause = () => {
      // Don't clear isPlayingRef on pause - we may want to auto-resume
      // Only clear it if user explicitly paused
      setState(prev => ({ ...prev, isPlaying: false }));
      
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
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
      if (isPlayingRef.current) {
        clearReconnectTimeout();
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
      if (isPlayingRef.current) {
        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(attemptReconnect, 1000);
      }
    };
    
    // Handle suspend (iOS may fire this when backgrounding)
    const handleSuspend = () => {
      console.log('useRadioPlayer: Audio suspended (possibly backgrounded)');
      // Don't do anything immediately - let visibility handler manage it
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('suspend', handleSuspend);

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
      audio.removeEventListener('suspend', handleSuspend);
      clearReconnectTimeout();
    };
  }, [attemptReconnect, clearReconnectTimeout, setupMediaSession]);

  // Handle visibility change for PWA background playback
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App going to background
        wasPlayingBeforeHiddenRef.current = isPlayingRef.current;
        console.log('useRadioPlayer: App hidden, wasPlaying:', wasPlayingBeforeHiddenRef.current);
      } else {
        // App coming to foreground
        console.log('useRadioPlayer: App visible, wasPlaying:', wasPlayingBeforeHiddenRef.current);
        
        if (wasPlayingBeforeHiddenRef.current && audioRef.current) {
          // Check if audio is still playing
          if (audioRef.current.paused) {
            console.log('useRadioPlayer: Audio paused while hidden, resuming...');
            // Small delay to let the browser settle
            setTimeout(() => {
              resumePlayback();
            }, 100);
          }
        }
      }
    };
    
    // Also handle page show for iOS PWA back navigation
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && wasPlayingBeforeHiddenRef.current) {
        console.log('useRadioPlayer: Page restored from bfcache, resuming...');
        setTimeout(() => {
          resumePlayback();
        }, 100);
      }
    };
    
    // Handle online/offline for network recovery
    const handleOnline = () => {
      console.log('useRadioPlayer: Network online');
      if (isPlayingRef.current && audioRef.current?.paused) {
        console.log('useRadioPlayer: Was playing, attempting to resume after network recovery...');
        reconnectAttemptRef.current = 0;
        attemptReconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
    };
  }, [resumePlayback, attemptReconnect]);

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
        lastKnownStreamUrlRef.current = url;
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
    wasPlayingBeforeHiddenRef.current = false; // User explicitly paused
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
    lastKnownStreamUrlRef.current = streamUrl;
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
    wasPlayingBeforeHiddenRef.current = false;
    reconnectAttemptRef.current = 0;
    lastKnownStreamUrlRef.current = '';
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
