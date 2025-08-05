import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Radio, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeRadioPlayerProps {
  className?: string;
}

interface RadioState {
  id: string;
  current_track_id: string | null;
  current_track_title: string | null;
  current_track_artist: string | null;
  playback_position_seconds: number;
  is_playing: boolean;
  started_at: string | null;
  updated_at: string;
}

interface AudioTrack {
  id: string;
  title: string;
  artist_info: string | null;
  audio_url: string;
}

export const RealtimeRadioPlayer = ({ className = '' }: RealtimeRadioPlayerProps) => {
  const [radioState, setRadioState] = useState<RadioState | null>(null);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Fetch available tracks
  useEffect(() => {
    fetchAudioTracks();
  }, []);

  const fetchAudioTracks = async () => {
    try {
      const { data: tracks, error } = await supabase
        .from('audio_archive')
        .select('id, title, artist_info, audio_url')
        .eq('is_public', true)
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching audio tracks:', error);
        return;
      }

      if (tracks && tracks.length > 0) {
        setAudioTracks(tracks);
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
    }
  };

  // Subscribe to real-time radio state changes
  useEffect(() => {
    const fetchInitialState = async () => {
      const { data, error } = await supabase
        .from('radio_state')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      if (error) {
        console.error('Error fetching radio state:', error);
        return;
      }

      if (data) {
        setRadioState(data);
        syncAudioWithState(data);
      }
    };

    fetchInitialState();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('radio-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'radio_state'
        },
        (payload) => {
          console.log('Radio state changed:', payload);
          const newState = payload.new as RadioState;
          setRadioState(newState);
          syncAudioWithState(newState);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Subscribe to user presence for listener count
  useEffect(() => {
    const roomOne = supabase.channel('radio_listeners');
    
    roomOne
      .on('presence', { event: 'sync' }, () => {
        const state = roomOne.presenceState();
        const count = Object.keys(state).length;
        setListenerCount(count);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('New listeners joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Listeners left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await roomOne.track({
            user_id: (await supabase.auth.getUser()).data.user?.id || 'anonymous',
            listening_since: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(roomOne);
    };
  }, []);

  const syncAudioWithState = (state: RadioState) => {
    if (!audioRef.current || !state) return;

    // Find the current track
    const currentTrack = audioTracks.find(track => track.id === state.current_track_id);
    if (!currentTrack) return;

    // Set audio source if different
    if (audioRef.current.src !== currentTrack.audio_url) {
      audioRef.current.src = currentTrack.audio_url;
      audioRef.current.load();
    }

    // Calculate correct playback position based on server time
    let targetPosition = state.playback_position_seconds;
    if (state.is_playing && state.started_at) {
      const elapsed = (Date.now() - new Date(state.started_at).getTime()) / 1000;
      targetPosition += elapsed;
    }

    // Sync position (only if difference is significant)
    const currentPos = audioRef.current.currentTime;
    const positionDiff = Math.abs(currentPos - targetPosition);
    
    if (positionDiff > 2) { // 2 second tolerance
      audioRef.current.currentTime = targetPosition;
    }

    // Sync play/pause state
    if (state.is_playing && audioRef.current.paused) {
      audioRef.current.play().catch(console.error);
    } else if (!state.is_playing && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  };

  const handleTogglePlay = async () => {
    if (!radioState || !audioTracks.length) {
      toast({
        title: "No Audio Available",
        description: "No tracks available to play",
        variant: "destructive",
      });
      return;
    }

    try {
      const newIsPlaying = !radioState.is_playing;
      const currentPosition = audioRef.current?.currentTime || 0;

      // Update radio state in database (only admins can do this for now)
      const { error } = await supabase
        .from('radio_state')
        .update({
          is_playing: newIsPlaying,
          playback_position_seconds: currentPosition,
          started_at: newIsPlaying ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) {
        console.error('Error updating radio state:', error);
        toast({
          title: "Permission Denied",
          description: "Only admins can control the radio",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: newIsPlaying ? "Radio Playing" : "Radio Paused",
        description: newIsPlaying 
          ? `Now playing: ${radioState.current_track_title}` 
          : "Global radio paused",
      });

    } catch (error) {
      console.error('Error toggling radio:', error);
      toast({
        title: "Error",
        description: "Failed to control radio",
        variant: "destructive",
      });
    }
  };

  const playNextTrack = async () => {
    if (!audioTracks.length) return;

    const nextIndex = (currentTrackIndex + 1) % audioTracks.length;
    const nextTrack = audioTracks[nextIndex];

    try {
      const { error } = await supabase
        .from('radio_state')
        .update({
          current_track_id: nextTrack.id,
          current_track_title: nextTrack.title,
          current_track_artist: nextTrack.artist_info || 'Glee Club',
          playback_position_seconds: 0,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (!error) {
        setCurrentTrackIndex(nextIndex);
      }
    } catch (error) {
      console.error('Error switching track:', error);
    }
  };

  const displayTitle = radioState?.current_track_title || 'Glee World Radio';
  const displayArtist = radioState?.current_track_artist || 'Spelman College Glee Club';

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={playNextTrack}
        onError={(e) => {
          console.error('Audio error:', e);
          toast({
            title: "Playback Error",
            description: "Switching to next track...",
            variant: "destructive",
          });
          playNextTrack();
        }}
      />
      
      {/* Radio Player Controls */}
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant={radioState?.is_playing ? "default" : "ghost"}
          size="sm"
          onClick={handleTogglePlay}
          className={`h-8 w-8 p-0 border rounded transition-all duration-200 ${
            radioState?.is_playing 
              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
              : 'hover:bg-muted border-border'
          }`}
          title={`Global Radio - ${displayTitle}`}
        >
          {radioState?.is_playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        {/* Real-time status indicators */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <div className={`flex items-center gap-1 ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
            <Radio className="h-3 w-3" />
            <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>
          
          {listenerCount > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{listenerCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Now Playing Display (optional, for larger screens) */}
      {radioState?.current_track_title && (
        <div className="hidden lg:block ml-3 text-xs">
          <div className="font-medium truncate max-w-48">{displayTitle}</div>
          <div className="text-muted-foreground truncate max-w-48">{displayArtist}</div>
        </div>
      )}
    </>
  );
};