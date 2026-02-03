import { create } from 'zustand';

/**
 * Audio Coordinator
 * 
 * Ensures only one audio source plays at a time across the app.
 * When a new source starts playing, all other sources are paused.
 * 
 * Sources:
 * - radio: Radio.co live stream (useRadioPlayer)
 * - music: Album/track playback (MusicPlayerContext)
 * - global: Global audio player (useGlobalAudioPlayer)
 */

export type AudioSource = 'radio' | 'music' | 'global' | 'course' | 'none';

interface AudioCoordinatorState {
  activeSource: AudioSource;
  pauseCallbacks: Map<AudioSource, () => void>;
}

interface AudioCoordinatorActions {
  registerPauseCallback: (source: AudioSource, callback: () => void) => void;
  unregisterPauseCallback: (source: AudioSource) => void;
  requestPlayback: (source: AudioSource) => void;
  notifyPaused: (source: AudioSource) => void;
}

type AudioCoordinatorStore = AudioCoordinatorState & AudioCoordinatorActions;

export const useAudioCoordinator = create<AudioCoordinatorStore>((set, get) => ({
  activeSource: 'none',
  pauseCallbacks: new Map(),

  registerPauseCallback: (source, callback) => {
    const { pauseCallbacks } = get();
    pauseCallbacks.set(source, callback);
    set({ pauseCallbacks: new Map(pauseCallbacks) });
  },

  unregisterPauseCallback: (source) => {
    const { pauseCallbacks } = get();
    pauseCallbacks.delete(source);
    set({ pauseCallbacks: new Map(pauseCallbacks) });
  },

  requestPlayback: (source) => {
    const { pauseCallbacks, activeSource } = get();
    
    // Pause all other sources
    pauseCallbacks.forEach((pauseCallback, callbackSource) => {
      if (callbackSource !== source) {
        console.log(`[AudioCoordinator] Pausing ${callbackSource} for ${source}`);
        try {
          pauseCallback();
        } catch (e) {
          console.warn(`[AudioCoordinator] Failed to pause ${callbackSource}:`, e);
        }
      }
    });
    
    console.log(`[AudioCoordinator] Active source: ${source}`);
    set({ activeSource: source });
  },

  notifyPaused: (source) => {
    const { activeSource } = get();
    if (activeSource === source) {
      set({ activeSource: 'none' });
    }
  },
}));

// Helper hook for components that need to coordinate audio
export const useAudioPlaybackRequest = (source: AudioSource) => {
  const requestPlayback = useAudioCoordinator((state) => state.requestPlayback);
  const notifyPaused = useAudioCoordinator((state) => state.notifyPaused);
  const registerPauseCallback = useAudioCoordinator((state) => state.registerPauseCallback);
  const unregisterPauseCallback = useAudioCoordinator((state) => state.unregisterPauseCallback);

  return {
    requestPlayback: () => requestPlayback(source),
    notifyPaused: () => notifyPaused(source),
    registerPauseCallback: (callback: () => void) => registerPauseCallback(source, callback),
    unregisterPauseCallback: () => unregisterPauseCallback(source),
  };
};
