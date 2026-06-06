/**
 * Minimal no-op replacement for the original audio coordinator that was
 * deleted along with the Radio.co feature on 2026-05-31. The original
 * coordinated playback between the radio stream and the music player so
 * only one would play at a time. With radio gone, the music player is the
 * only audio source — this stub lets existing call sites compile without
 * functional changes.
 */
export function useAudioCoordinator() {
  return {
    requestPlayback: async (_source: string) => true,
    registerPauseCallback: (_source: string, _cb: () => void) => {},
    unregisterPauseCallback: (_source: string) => {},
    notifyPaused: (_source: string) => {},
    activeSource: null as string | null,
  };
}
