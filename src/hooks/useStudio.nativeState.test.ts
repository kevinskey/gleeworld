// Regression tests for the native (iOS) engine-state mapping. The native
// bridge has no recordingActive field of its own — StudioEditor flips a
// JS-side flag around takes (setRecordingActive), and the mapper must
// surface it. Hardcoding `recordingActive: false` here silently disabled
// ALL MIDI capture on iOS (handlers gate on state.recordingActive).
import { describe, it, expect } from 'vitest';
import { mapNativeEngineState } from './useStudio';
import type { NativeEngineState } from '@/plugins/studioEngine';

const nativeState = (overrides: Partial<NativeEngineState> = {}): NativeEngineState => ({
  isReady: true,
  isPlaying: true,
  positionSeconds: 1.5,
  tempoBpm: 120,
  metronomeOn: false,
  ...overrides,
});

describe('mapNativeEngineState', () => {
  it('passes the JS-side recordingActive flag through to engine state', () => {
    expect(mapNativeEngineState(nativeState(), true).recordingActive).toBe(true);
    expect(mapNativeEngineState(nativeState(), false).recordingActive).toBe(false);
  });

  it('coerces bridge metronomeOn NSNumber 0/1 to a real boolean', () => {
    expect(mapNativeEngineState(nativeState({ metronomeOn: 1 as unknown as boolean }), false).metronomeOn).toBe(true);
    expect(mapNativeEngineState(nativeState({ metronomeOn: 0 as unknown as boolean }), false).metronomeOn).toBe(false);
  });

  it('carries transport fields across unchanged', () => {
    const s = mapNativeEngineState(nativeState(), false);
    expect(s.isPlaying).toBe(true);
    expect(s.positionSeconds).toBe(1.5);
    expect(s.tempoBpm).toBe(120);
  });
});
