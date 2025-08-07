import { useState, useRef, useEffect } from 'react';
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
      setState(prev => ({ ...prev, isLoading: false }));
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
            isOnline: data.is_online || false, // Add online status
            streamerName: data.streamer_name || undefined,
            currentTrack: data.current_song_title ? {
              title: data.current_song_title,
              artist: data.current_song_artist || 'Unknown Artist',
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
                artist: data.current_song_artist || 'Unknown Artist',
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
  }, []);

  const play = async () => {
    console.log('Radio play() called');
    if (!audioRef.current) {
      console.log('No audio ref available');
      return;
    }

    console.log('Setting loading state and starting stream attempt...');
    setState(prev => ({ ...prev, isLoading: true }));

    // Try each stream URL until one works
    for (const streamUrl of RADIO_STREAM_URLS) {
      try {
        console.log(`Attempting to play stream: ${streamUrl}`);
        console.log('Audio ref state:', {
          src: audioRef.current.src,
          readyState: audioRef.current.readyState,
          networkState: audioRef.current.networkState
        });
        
        // Clear any previous source first
        audioRef.current.src = '';
        audioRef.current.load();
        
        // Set new source and load
        audioRef.current.src = streamUrl;
        audioRef.current.volume = state.volume;
        audioRef.current.load(); // Force load the new source
        
        console.log('Calling audio.play()...');
        await audioRef.current.play();
        
        console.log('Successfully started playing stream:', streamUrl);
        toast({
          title: "Now Playing",
          description: "Glee World Radio is now streaming",
        });
        return; // Success - exit the loop
        
      } catch (error) {
        console.error(`Failed to play stream ${streamUrl}:`, error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          code: error.code
        });
        
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