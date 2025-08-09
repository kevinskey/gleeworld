
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

export const useRadioPlayer = () => {
  console.log('useRadioPlayer: Hook starting...');
  
  const [state, setState] = useState<RadioPlayerState>({
    isPlaying: false,
    isLoading: false,
    listenerCount: 0,
    currentTrack: null,
    isLive: false,
    isOnline: false,
    volume: 0.7,
    streamerName: undefined,
  });

  // Helper to sanitize unknown artists
  const sanitizeArtist = (name?: string | null): string => {
    const a = (name || '').trim();
    if (!a) return '';
    return /^\[?\s*unknown(?:\s+artist)?\s*\]?$/i.test(a) || /^n\/a$/i.test(a) ? '' : a;
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  useEffect(() => {
    console.log('useRadioPlayer: Initializing audio element...');
    
    // Initialize audio element
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'none';
    audioRef.current = audio;

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
        error: e.target?.error,
        networkState: e.target?.networkState,
        readyState: e.target?.readyState,
        src: e.target?.src
      });
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isPlaying: false, 
        isLive: false 
      }));
    };

    const handlePlay = () => {
      console.log('Radio stream playing');
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      console.log('Radio stream paused');
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      console.log('useRadioPlayer: Cleaning up audio element...');
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []); // Empty dependency array - only run once

  // Subscribe to real-time radio station updates
  useEffect(() => {
    console.log('Setting up real-time radio station subscription...');

    // Initial fetch of station state
    const fetchInitialState = async () => {
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

    fetchInitialState();

    // Set up real-time subscription
    const channel = supabase
      .channel('radio-station-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gw_radio_station_state',
          filter: 'station_id=eq.glee_world_radio'
        },
        (payload) => {
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
      )
      .subscribe((status) => {
        console.log('Radio subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to radio updates');
        }
      });

    return () => {
      console.log('Cleaning up radio subscription...');
      supabase.removeChannel(channel);
    };
  }, []); // Empty dependency array - only run once

  const play = useCallback(async () => {
    console.log('Radio play() called');
    console.log('Current state:', state);
    
    if (!audioRef.current) {
      console.log('No audio ref available');
      return;
    }

    const urls = streamUrls();
    console.log('Available stream URLs:', urls);
    
    console.log('Setting loading state and starting stream attempt...');
    setState(prev => ({ ...prev, isLoading: true }));

    // Try each stream URL until one works
    const allUrls = [...urls, azuraCastService.getPublicStreamUrl()];
    console.log('All stream URLs to try:', allUrls);

    for (let i = 0; i < allUrls.length; i++) {
      const streamUrl = allUrls[i];
      try {
        console.log(`Attempting to play stream ${i + 1}/${allUrls.length}: ${streamUrl}`);
        
        // Clear any previous source first
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
        
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set new source and load
        audioRef.current.src = streamUrl;
        audioRef.current.volume = state.volume;
        audioRef.current.load();
        
        console.log('Waiting for canplay event...');
        
        // Wait for the stream to be ready
        await new Promise((resolve, reject) => {
          const audio = audioRef.current!;
          let resolved = false;
          
          const handleCanPlay = () => {
            if (!resolved) {
              resolved = true;
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
              resolve(void 0);
            }
          };
          
          const handleError = (e: any) => {
            if (!resolved) {
              resolved = true;
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
              reject(e);
            }
          };
          
          audio.addEventListener('canplay', handleCanPlay);
          audio.addEventListener('error', handleError);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
              reject(new Error('Stream load timeout'));
            }
          }, 10000);
        });
        
        console.log('Stream ready, calling play()...');
        
        // Try to play with user gesture requirement handling
        try {
          await audioRef.current.play();
        } catch (playError: any) {
          console.error('Audio play error:', playError);
          
          // Handle common autoplay restriction
          if (playError.name === 'NotAllowedError') {
            throw new Error('Browser blocked audio playback. Please interact with the page first (click anywhere).');
          } else {
            throw playError;
          }
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
          type: (error as any)?.type
        });
        
        // If this was the last URL, show error
        if (i === allUrls.length - 1) {
          console.error('All stream URLs failed, showing error to user');
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
        } else {
          console.log(`Trying next stream URL (${i + 2}/${allUrls.length})...`);
        }
      }
    }
  }, [state.volume, streamUrls, toast]);

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
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  return {
    ...state,
    play,
    pause,
    togglePlayPause,
    setVolume,
  };
};
