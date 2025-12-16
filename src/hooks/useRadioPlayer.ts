
import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { azuraCastService, type AzuraCastNowPlaying } from '@/services/azuracast';
import { supabase } from "@/integrations/supabase/client";

interface RadioStationState {
  id: string;
  station_id: string;
  station_name: string | null;
  is_online: boolean;
  is_live: boolean;
  streamer_name: string | null;
  listener_count: number;
  current_song_title: string | null;
  current_song_artist: string | null;
  current_song_album: string | null;
  current_song_art: string | null;
  song_started_at: string | null;
  last_event_type: string | null;
  last_updated: string;
  created_at: string;
}

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
  isOnline: boolean;
  volume: number;
  streamerName?: string;
}

// Shared audio element to persist across route changes
let sharedAudio: HTMLAudioElement | null = null;
let sharedAudioContext: AudioContext | null = null;
let sharedGainNode: GainNode | null = null;
let sharedSourceNode: MediaElementAudioSourceNode | null = null;

// Maximum gain to prevent clipping (0.7 = -3dB headroom)
const MAX_GAIN = 0.7;

export const useRadioPlayer = () => {
  
  const [state, setState] = useState<RadioPlayerState>({
    isPlaying: false,
    isLoading: false,
    listenerCount: 0,
    currentTrack: null,
    isLive: false,
    isOnline: false,
    volume: 0.8, // Default to 80% to prevent clipping
    streamerName: undefined,
  });

  

  // Helper to sanitize unknown artists
  const sanitizeArtist = (name?: string | null): string => {
    const a = (name || '').trim();
    if (!a) return '';
    return /^\[?\s*unknown(?:\s+artist)?\s*\]?$/i.test(a) || /^n\/a$/i.test(a) ? '' : a;
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const isReconnectingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Stable stream URLs - memoize to prevent re-computation
  const streamUrls = useCallback(() => {
    try {
      const urls = azuraCastService.getStreamUrls();
      console.log('useRadioPlayer: Stream URLs:', urls);
      return urls;
    } catch (error) {
      console.error('useRadioPlayer: Error getting stream URLs:', error);
      return [];
    }
  }, []);

  // Append a timestamp to bust caches / reconnect closed streams
  const withCacheBuster = useCallback((url: string) => {
    const hasQuery = url.includes('?');
    const sep = hasQuery ? '&' : '?';
    return `${url}${sep}ts=${Date.now()}`;
  }, []);

  const resetAudio = useCallback(async () => {
    console.log('useRadioPlayer.resetAudio() called');

    try {
      // Stop playback immediately
      if (sharedAudio) {
        try {
          sharedAudio.pause();
        } catch {}
        sharedAudio.src = '';
        sharedAudio.load();
      }

      // Disconnect WebAudio graph
      try {
        sharedSourceNode?.disconnect();
      } catch {}
      try {
        sharedGainNode?.disconnect();
      } catch {}

      sharedSourceNode = null;
      sharedGainNode = null;

      // Close context (forces a clean re-init next time)
      if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
        try {
          await sharedAudioContext.close();
        } catch {}
      }
      sharedAudioContext = null;

      // Force re-create audio element too
      sharedAudio = null;
      audioRef.current = null;

      // Reset local state
      isPlayingRef.current = false;
      isReconnectingRef.current = false;
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
      }));

      toast({
        title: 'Audio Reset',
        description: 'Radio audio has been reset. Press Play again.',
      });
    } catch (e) {
      console.error('resetAudio failed:', e);
      toast({
        title: 'Reset Failed',
        description: 'Could not reset audio. Try refreshing the page.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    console.log('useRadioPlayer: Initializing audio element (singleton)...');

    // Ensure a single shared audio element persists across route changes
    if (!sharedAudio) {
      const audio = new Audio();
      // NOTE: do NOT set crossOrigin here; it can cause some browsers to require CORS
      // headers for playback and break streaming on published domains.
      audio.preload = 'none';
      sharedAudio = audio;
      console.log('Created new shared radio audio element');
      
      // Set up Web Audio API for proper gain control (prevents clipping)
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass && !sharedAudioContext) {
          sharedAudioContext = new AudioContextClass();
          sharedGainNode = sharedAudioContext.createGain();
          // Start with default volume * MAX_GAIN to prevent clipping
          sharedGainNode.gain.value = 0.8 * MAX_GAIN;
          sharedGainNode.connect(sharedAudioContext.destination);
          
          // Connect audio element to gain node (must be done once per audio element)
          sharedSourceNode = sharedAudioContext.createMediaElementSource(audio);
          sharedSourceNode.connect(sharedGainNode);
          console.log('Created Web Audio mixer with gain node (MAX_GAIN:', MAX_GAIN, ')');
        }
      } catch (e) {
        console.warn('Could not create Web Audio mixer:', e);
      }
    } else {
      console.log('Reusing existing shared radio audio element');
    }

    const audio = sharedAudio!;
    audioRef.current = audio;
    
    // Keep audio element volume at 1.0 - we control gain via Web Audio
    audio.volume = 1.0;

    const handleLoadStart = () => {
      console.log('Radio stream load start');
      setState(prev => ({ ...prev, isLoading: true }));
    };

    const handleCanPlay = () => {
      console.log('Radio stream can play');
      setState(prev => ({ ...prev, isLoading: false }));
    };

    const handleError = (e: any) => {
      console.error('Radio stream error:', e);
      console.error('Audio error details:', {
        error: (e as any).target?.error,
        networkState: (e as any).target?.networkState,
        readyState: (e as any).target?.readyState,
        src: (e as any).target?.src,
        currentTime: (e as any).target?.currentTime,
        duration: (e as any).target?.duration
      });
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isPlaying: false, 
        isLive: false 
      }));
      isPlayingRef.current = false;
      
      // Only attempt reconnect if we were playing and not already reconnecting
      if (isPlayingRef.current && !isReconnectingRef.current) {
        isReconnectingRef.current = true;
        
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect radio stream after error...');
          isReconnectingRef.current = false;
          // Don't auto-reconnect on error - let user manually retry
        }, 5000);
      }
    };

    const handlePlay = () => {
      console.log('Radio stream playing');
      isPlayingRef.current = true;
      isReconnectingRef.current = false;
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      console.log('Radio stream paused');
      isPlayingRef.current = false;
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleStalled = () => {
      console.log('Radio stream stalled - waiting for buffer...');
      // Don't immediately reconnect on stalled - this is normal for streaming
      // The browser will automatically try to resume buffering
    };

    const handleSuspend = () => {
      console.log('Radio stream suspended - browser paused download');
      // This is normal browser behavior to save bandwidth
      // Don't trigger reconnection
    };

    const handleWaiting = () => {
      console.log('Radio stream buffering...');
      // Normal buffering, don't do anything aggressive
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('suspend', handleSuspend);
    audio.addEventListener('waiting', handleWaiting);

    return () => {
      console.log('useRadioPlayer: Cleaning up event listeners (not stopping audio)...');
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('suspend', handleSuspend);
      audio.removeEventListener('waiting', handleWaiting);
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Do not pause or clear src; keep sharedAudio alive for seamless playback
    };
  }, []); // Empty dependency array - only run once

  // Subscribe to real-time radio station updates
  useEffect(() => {
    console.log('Setting up real-time radio station subscription...');
    
    let channel: any = null;
    let isSubscribed = false;
    let isMounted = true;

    // Initial fetch of station state
    const fetchInitialState = async () => {
      if (!isMounted) return;
      try {
        console.log('Fetching initial radio station state...');
        const { data, error } = await supabase
          .from('gw_radio_station_state')
          .select('*')
          .eq('station_id', 'glee_world_radio')
          .single();

        if (error) {
          console.error('Error fetching initial station state:', error);
          return;
        }

        if (data) {
          console.log('Initial station state from DB:', data);
          setState(prev => ({
            ...prev,
            listenerCount: data.listener_count || 0,
            isLive: data.is_live || false,
            isOnline: data.is_online || false,
            streamerName: data.streamer_name || undefined,
            currentTrack: data.current_song_title ? {
              title: data.current_song_title,
              artist: sanitizeArtist(data.current_song_artist),
              album: data.current_song_album || undefined,
              art: data.current_song_art || undefined,
            } : null,
          }));
          console.log('Updated radio player state with DB data');
        }
      } catch (error) {
        console.error('Error in initial station state fetch:', error);
      }
    };

    const setupRealtimeSubscription = async () => {
      if (!isMounted) return;
      
      try {
        await fetchInitialState();
        
        if (!isMounted) return;
        
        // Create unique channel name to prevent conflicts
        const channelName = `radio-station-updates-${Date.now()}-${Math.random()}`;
        console.log('Creating radio channel:', channelName);
        
        // Set up real-time subscription
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'gw_radio_station_state',
              filter: 'station_id=eq.glee_world_radio'
            },
            (payload) => {
              if (!isMounted) return;
              console.log('Real-time radio update received:', payload);
              
              if (payload.new) {
                const data = payload.new as RadioStationState;
                console.log('Updating radio state with real-time data:', data);
                setState(prev => ({
                  ...prev,
                  listenerCount: data.listener_count || 0,
                  isLive: data.is_live || false,
                  isOnline: data.is_online || false,
                  streamerName: data.streamer_name || undefined,
                    currentTrack: data.current_song_title ? {
                      title: data.current_song_title,
                      artist: sanitizeArtist(data.current_song_artist),
                      album: data.current_song_album || undefined,
                      art: data.current_song_art || undefined,
                    } : null,
                }));
              }
            }
          );

        if (!isMounted) return;

        // Subscribe only once
        const subscriptionResult = await channel.subscribe();
        console.log('Radio subscription status:', subscriptionResult);
        isSubscribed = true;
        
        if (subscriptionResult === 'SUBSCRIBED') {
          console.log('Successfully subscribed to radio updates');
        }
      } catch (error) {
        console.error('Error setting up radio subscription:', error);
      }
    };

    setupRealtimeSubscription();

    return () => {
      console.log('Cleaning up radio subscription...');
      isMounted = false;
      if (channel && isSubscribed) {
        try {
          supabase.removeChannel(channel);
          isSubscribed = false;
        } catch (error) {
          console.error('Error cleaning up radio channel:', error);
        }
      }
    };
  }, []); // Empty dependency array - only run once

  const play = useCallback(async () => {
    console.log('useRadioPlayer: play() called');

    if (!audioRef.current) {
      console.log('useRadioPlayer: No audio ref available');
      return;
    }

    // If volume was muted elsewhere (e.g. radio bar), ensure header playback isn't silent.
    if (state.volume === 0) {
      const unmutedVolume = 0.8;
      console.log('useRadioPlayer: Volume is 0; restoring to', unmutedVolume);
      setState(prev => ({ ...prev, volume: unmutedVolume }));

      if (sharedGainNode && sharedAudioContext) {
        const actualGain = unmutedVolume * MAX_GAIN;
        sharedGainNode.gain.setValueAtTime(actualGain, sharedAudioContext.currentTime);
        console.log('useRadioPlayer: Mixer gain restored to:', actualGain);
      } else {
        audioRef.current.volume = unmutedVolume * MAX_GAIN;
      }
    }

    const urls = streamUrls();
    console.log('useRadioPlayer: Available stream URLs:', urls);

    console.log('useRadioPlayer: Setting loading state and starting stream attempt...');
    setState(prev => ({ ...prev, isLoading: true }));

    // Try each stream URL until one works
    const allUrls = [...urls, azuraCastService.getPublicStreamUrl()];
    console.log('All stream URLs to try:', allUrls);

    for (let i = 0; i < allUrls.length; i++) {
      const streamUrl = allUrls[i];
      try {
        console.log(`Attempting to play stream ${i + 1}/${allUrls.length}: ${streamUrl}`);

        // IMPORTANT (iOS): keep this inside the user gesture as much as possible.
        // Kick off AudioContext resume immediately (don’t wait for any timers first).
        const resumePromise = (sharedAudioContext && sharedAudioContext.state === 'suspended')
          ? sharedAudioContext.resume()
          : Promise.resolve();

        // Stop any previous stream
        audioRef.current.pause();

        // Set new source and attempt playback immediately.
        // For live streams, waiting for canplay can break iOS user-gesture playback.
        audioRef.current.src = withCacheBuster(streamUrl);
        audioRef.current.volume = 1.0; // Keep at 1.0, gain control via Web Audio
        audioRef.current.load();

        try {
          await resumePromise;
          if (sharedAudioContext) {
            console.log('Web Audio context state:', sharedAudioContext.state);
          }
        } catch (e) {
          console.warn('Could not resume Web Audio context:', e);
        }

        console.log('Calling play()...');

        try {
          await audioRef.current.play();
        } catch (playError: any) {
          console.error('Audio play error:', playError);

          // Handle common autoplay restriction
          if (playError?.name === 'NotAllowedError') {
            throw new Error('Browser blocked audio playback. Please interact with the page first (tap/click anywhere), then press Play again.');
          }

          throw playError;
        }

        console.log('Successfully started playing stream:', streamUrl);
        toast({
          title: "Now Playing",
          description: "Glee World Radio is now streaming",
        });
        return; // Success - exit the loop

      } catch (error) {
        console.error(`Failed to play stream ${streamUrl}:`, error);
        console.error('Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          code: (error as any)?.code,
          target: (error as any)?.target,
          type: (error as any)?.type,
        });

        // If this is an autoplay/user-gesture restriction, don't cycle through URLs.
        // The browser will block ALL of them the same way.
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('Browser blocked audio playback')) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isPlaying: false,
          }));
          toast({
            title: 'Tap to enable audio',
            description: msg,
            variant: 'destructive',
          });
          return;
        }

        // If this was the last URL, show error
        if (i === allUrls.length - 1) {
          console.error('All stream URLs failed, showing error to user');
          setState(prev => ({
            ...prev,
            isLoading: false,
            isPlaying: false,
          }));
          toast({
            title: "Radio Unavailable",
            description: "All radio streams are currently offline. Please try again later.",
            variant: "destructive",
          });
        } else {
          console.log(`Trying next stream URL (${i + 2}/${allUrls.length})...`);
        }
      }
    }
  }, [state.volume, streamUrls, toast, withCacheBuster]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
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
    setState(prev => ({ ...prev, volume: clampedVolume }));
    
    // Use Web Audio gain node for proper mixing (prevents clipping)
    if (sharedGainNode && sharedAudioContext) {
      // Apply MAX_GAIN ceiling to prevent clipping from hot audio sources
      const actualGain = clampedVolume * MAX_GAIN;
      sharedGainNode.gain.setValueAtTime(actualGain, sharedAudioContext.currentTime);
      console.log('Mixer gain set to:', actualGain, '(volume:', clampedVolume, ')');
    } else if (audioRef.current) {
      // Fallback to direct audio volume if Web Audio not available
      audioRef.current.volume = clampedVolume * MAX_GAIN;
    }
  }, []);

  // Switch to a different stream URL (for channel switching)
  const switchStream = useCallback(async (newStreamUrl: string) => {
    console.log('Radio switchStream() called with:', newStreamUrl);

    if (!audioRef.current) {
      console.log('No audio ref available');
      return;
    }

    const wasPlaying = state.isPlaying;

    // Stop current stream
    audioRef.current.pause();
    audioRef.current.src = '';
    audioRef.current.load();

    setState(prev => ({ ...prev, isLoading: true }));

    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));

    // Set new source with cache buster
    const hasQuery = newStreamUrl.includes('?');
    const sep = hasQuery ? '&' : '?';
    const nextUrl = `${newStreamUrl}${sep}ts=${Date.now()}`;
    audioRef.current.src = nextUrl;
    audioRef.current.load();

    const audio = audioRef.current;

    try {
      // For live MP3 streams, 'canplay' is not always reliable.
      // If the user was already playing, attempt to resume immediately.
      if (wasPlaying) {
        await audio.play();
        setState(prev => ({ ...prev, isLoading: false }));
        toast({
          title: 'Channel Switched',
          description: 'Now playing new channel',
        });
        return;
      }

      // If not playing yet, just finish the switch; user can hit play.
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error: any) {
      console.error('Failed to switch stream:', error);
      console.error('Switch stream audio details:', {
        src: audio?.src,
        networkState: audio?.networkState,
        readyState: audio?.readyState,
        error: audio?.error,
      });

      setState(prev => ({ ...prev, isLoading: false, isPlaying: false }));
      toast({
        title: 'Channel Unavailable',
        description: 'Could not connect to this channel. Try another.',
        variant: 'destructive',
      });
    }
  }, [state.isPlaying, toast]);

  // Health check watchdog to auto-reconnect if playback stalls
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let last = audio.currentTime;
    const interval = setInterval(() => {
      if (!audioRef.current) return;
      const a = audioRef.current;
      if (state.isPlaying) {
        if (a.currentTime <= last + 1) {
          console.log('Radio health-check: no progress, reconnecting...');
          play();
        }
        last = a.currentTime;
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [state.isPlaying, play]);

  // Skip to next track
  const skipTrack = useCallback(async () => {
    try {
      await azuraCastService.skipTrack();
      toast({
        title: 'Skipped',
        description: 'Moving to the next track...',
      });
    } catch (error) {
      console.error('Failed to skip track:', error);
      toast({
        title: 'Skip Failed',
        description: 'Could not skip to next track.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    ...state,
    play,
    pause,
    togglePlayPause,
    setVolume,
    switchStream,
    skipTrack,
    resetAudio,
  };
};
