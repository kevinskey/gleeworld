import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Track, Album } from '@/hooks/useMusic';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MusicPlayerState {
  // Current playback state
  currentTrack: Track | null;
  currentAlbum: Album | null;
  currentTrackIndex: number;
  playlist: Track[];
  
  // Audio controls
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  
  // Player visibility
  isMinimized: boolean;
  isVisible: boolean;
  
  // Playback modes
  isShuffled: boolean;
  repeatMode: 'none' | 'one' | 'all';
}

interface MusicPlayerActions {
  // Track management
  playTrack: (track: Track, playlist?: Track[], album?: Album) => void;
  playAlbum: (album: Album, startTrackIndex?: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  
  // Audio controls
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  
  // Player controls
  toggleMinimized: () => void;
  showPlayer: () => void;
  hidePlayer: () => void;
  
  // Playback modes
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  
  // Utilities
  formatTime: (seconds: number) => string;
}

interface MusicPlayerContextType extends MusicPlayerState, MusicPlayerActions {}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

interface MusicPlayerProviderProps {
  children: ReactNode;
}

export const MusicPlayerProvider = ({ children }: MusicPlayerProviderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [state, setState] = useState<MusicPlayerState>({
    currentTrack: null,
    currentAlbum: null,
    currentTrackIndex: 0,
    playlist: [],
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isLoading: false,
    isMinimized: true,
    isVisible: false,
    isShuffled: false,
    repeatMode: 'none'
  });

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleDurationChange = () => {
      setState(prev => ({ ...prev, duration: audio.duration || 0 }));
    };

    const handleEnded = () => {
      playNext();
    };

    const handleLoadStart = () => {
      setState(prev => ({ ...prev, isLoading: true }));
    };

    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isLoading: false }));
    };

    const handleError = () => {
      setState(prev => ({ ...prev, isLoading: false, isPlaying: false }));
      toast({
        title: "Playback Error",
        description: "Could not play the audio file",
        variant: "destructive"
      });
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [state.currentTrack]);

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.isMuted ? 0 : state.volume;
    }
  }, [state.volume, state.isMuted]);

  const playTrack = async (track: Track, playlist: Track[] = [track], album?: Album) => {
    const trackIndex = playlist.findIndex(t => t.id === track.id);
    
    setState(prev => ({
      ...prev,
      currentTrack: track,
      currentAlbum: album || null,
      currentTrackIndex: Math.max(0, trackIndex),
      playlist,
      isVisible: true,
      isLoading: true
    }));

    if (audioRef.current) {
      audioRef.current.src = track.audio_url;
      try {
        await audioRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
        
        // Increment play count
        await supabase.rpc('increment_play_count', { track_uuid: track.id });
      } catch (error) {
        console.error('Error playing track:', error);
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    }
  };

  const playAlbum = (album: Album, startTrackIndex: number = 0) => {
    if (!album.tracks || album.tracks.length === 0) {
      toast({
        title: "No tracks",
        description: "This album doesn't have any tracks yet",
      });
      return;
    }

    const startTrack = album.tracks[startTrackIndex];
    if (startTrack) {
      playTrack(startTrack, album.tracks, album);
    }
  };

  const playNext = () => {
    const { playlist, currentTrackIndex, repeatMode, isShuffled } = state;
    
    if (playlist.length === 0) return;

    let nextIndex;
    
    if (repeatMode === 'one') {
      nextIndex = currentTrackIndex;
    } else if (isShuffled) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = currentTrackIndex + 1;
      if (nextIndex >= playlist.length) {
        nextIndex = repeatMode === 'all' ? 0 : playlist.length - 1;
        if (repeatMode === 'none' && nextIndex === playlist.length - 1) {
          setState(prev => ({ ...prev, isPlaying: false }));
          return;
        }
      }
    }

    const nextTrack = playlist[nextIndex];
    if (nextTrack) {
      playTrack(nextTrack, playlist, state.currentAlbum);
    }
  };

  const playPrevious = () => {
    const { playlist, currentTrackIndex, currentTime } = state;
    
    if (playlist.length === 0) return;

    if (currentTime > 3) {
      // If more than 3 seconds in, restart current track
      seekTo(0);
    } else {
      // Go to previous track
      const prevIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : playlist.length - 1;
      const prevTrack = playlist[prevIndex];
      if (prevTrack) {
        playTrack(prevTrack, playlist, state.currentAlbum);
      }
    }
  };

  const togglePlayPause = async () => {
    if (!audioRef.current || !state.currentTrack) return;

    if (state.isPlaying) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    } else {
      try {
        await audioRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
      } catch (error) {
        console.error('Error playing audio:', error);
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, currentTime: time }));
    }
  };

  const setVolume = (volume: number) => {
    setState(prev => ({ ...prev, volume, isMuted: false }));
  };

  const toggleMute = () => {
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const toggleMinimized = () => {
    setState(prev => ({ ...prev, isMinimized: !prev.isMinimized }));
  };

  const showPlayer = () => {
    setState(prev => ({ ...prev, isVisible: true }));
  };

  const hidePlayer = () => {
    setState(prev => ({ ...prev, isVisible: false, isPlaying: false }));
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const toggleShuffle = () => {
    setState(prev => ({ ...prev, isShuffled: !prev.isShuffled }));
  };

  const toggleRepeat = () => {
    setState(prev => {
      const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all'];
      const currentIndex = modes.indexOf(prev.repeatMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      return { ...prev, repeatMode: nextMode };
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const contextValue: MusicPlayerContextType = {
    // State
    ...state,
    
    // Actions
    playTrack,
    playAlbum,
    playNext,
    playPrevious,
    togglePlayPause,
    seekTo,
    setVolume,
    toggleMute,
    toggleMinimized,
    showPlayer,
    hidePlayer,
    toggleShuffle,
    toggleRepeat,
    formatTime
  };

  return (
    <MusicPlayerContext.Provider value={contextValue}>
      {children}
      <audio ref={audioRef} preload="metadata" />
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};