// Module-singleton store for the detached SoundCloud player. Lives outside
// React so the command-center page (which unmounts on navigation) and the
// App-level floating host can share state without another provider in the
// tree — and so App.tsx can check "is anything detached?" without pulling
// in the player chunk.
import { useSyncExternalStore } from 'react';
import type { SoundCloudTrack } from '@/lib/soundcloud';

let current: SoundCloudTrack | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function detachSoundCloudPlayer(track: SoundCloudTrack) {
  current = track;
  emit();
}

export function closeSoundCloudPlayer() {
  current = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFloatingSoundCloudTrack(): SoundCloudTrack | null {
  return useSyncExternalStore(subscribe, () => current);
}
