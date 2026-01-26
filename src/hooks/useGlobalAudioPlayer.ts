import { create } from 'zustand';

export interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  audio_url: string;
  duration?: number;
}

interface GlobalAudioPlayerState {
  // State
  playlist: AudioTrack[];
  currentTrack: AudioTrack | null;
  currentIndex: number;
  isPlaying: boolean;
  audio: HTMLAudioElement | null;
  
  // Actions
  setPlaylist: (tracks: AudioTrack[]) => void;
  playTrack: (track: AudioTrack, index: number) => void;
  togglePlay: () => void;
  pause: () => void;
  play: () => void;
  skipNext: () => void;
  skipPrevious: () => void;
  stop: () => void;
}

// Create a singleton audio element
let audioElement: HTMLAudioElement | null = null;

const getAudioElement = () => {
  if (!audioElement && typeof window !== 'undefined') {
    audioElement = new Audio();
    audioElement.preload = 'metadata';
  }
  return audioElement;
};

export const useGlobalAudioPlayer = create<GlobalAudioPlayerState>((set, get) => ({
  playlist: [],
  currentTrack: null,
  currentIndex: -1,
  isPlaying: false,
  audio: null,

  setPlaylist: (tracks) => {
    set({ playlist: tracks });
  },

  playTrack: (track, index) => {
    const audio = getAudioElement();
    if (!audio) return;

    // Stop current playback
    audio.pause();
    audio.currentTime = 0;

    // Set new source
    audio.src = track.audio_url;
    
    // Play the track
    audio.play().then(() => {
      set({ 
        currentTrack: track, 
        currentIndex: index, 
        isPlaying: true,
        audio 
      });
    }).catch(err => {
      console.error('Error playing audio:', err);
      set({ isPlaying: false });
    });

    // Handle track end - auto play next
    audio.onended = () => {
      const state = get();
      if (state.currentIndex < state.playlist.length - 1) {
        const nextIndex = state.currentIndex + 1;
        const nextTrack = state.playlist[nextIndex];
        if (nextTrack) {
          get().playTrack(nextTrack, nextIndex);
        }
      } else {
        set({ isPlaying: false });
      }
    };
  },

  togglePlay: () => {
    const { audio, isPlaying, currentTrack, playlist, currentIndex } = get();
    
    if (!audio && currentTrack) {
      // Reinitialize if audio was lost
      get().playTrack(currentTrack, currentIndex);
      return;
    }

    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      set({ isPlaying: false });
    } else {
      audio.play().then(() => {
        set({ isPlaying: true });
      }).catch(err => {
        console.error('Error resuming audio:', err);
      });
    }
  },

  pause: () => {
    const { audio } = get();
    if (audio) {
      audio.pause();
      set({ isPlaying: false });
    }
  },

  play: () => {
    const { audio, currentTrack, currentIndex } = get();
    if (audio) {
      audio.play().then(() => {
        set({ isPlaying: true });
      }).catch(err => {
        console.error('Error playing audio:', err);
      });
    } else if (currentTrack) {
      get().playTrack(currentTrack, currentIndex);
    }
  },

  skipNext: () => {
    const { playlist, currentIndex } = get();
    if (currentIndex < playlist.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextTrack = playlist[nextIndex];
      if (nextTrack) {
        get().playTrack(nextTrack, nextIndex);
      }
    }
  },

  skipPrevious: () => {
    const { playlist, currentIndex, audio } = get();
    
    // If more than 3 seconds in, restart current track
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevTrack = playlist[prevIndex];
      if (prevTrack) {
        get().playTrack(prevTrack, prevIndex);
      }
    }
  },

  stop: () => {
    const { audio } = get();
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      set({ isPlaying: false, currentTrack: null, currentIndex: -1 });
    }
  },
}));
