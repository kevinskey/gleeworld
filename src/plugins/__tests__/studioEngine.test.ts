// Task 5 (headphone/bleed guard) — unit tests for the pure route
// classification helper. `getAudioRoute` itself lives in
// ios/App/App/StudioEnginePlugin.swift (native, no vitest coverage);
// `classifyRouteOutputs` mirrors that classification on the TS side so
// it's directly testable, and `getNativeAudioRoute` ORs the two together
// (see studioEngine.ts's module header comment above the helper) so a
// drift between the Swift and TS mappings still resolves to "warn",
// never "silently suppress".

import { describe, test, expect } from 'vitest';
import { classifyRouteOutputs } from '../studioEngine';

describe('classifyRouteOutputs', () => {
  test('classifies each documented headphone-ish port type as true', () => {
    expect(classifyRouteOutputs(['Headphones'])).toBe(true);
    expect(classifyRouteOutputs(['BluetoothA2DPOutput'])).toBe(true);
    expect(classifyRouteOutputs(['BluetoothHFP'])).toBe(true);
    expect(classifyRouteOutputs(['BluetoothLE'])).toBe(true);
    expect(classifyRouteOutputs(['USBAudio'])).toBe(true);
    expect(classifyRouteOutputs(['CarAudio'])).toBe(true);
  });

  test('classifies the built-in speaker/receiver as false', () => {
    expect(classifyRouteOutputs(['Speaker'])).toBe(false);
    expect(classifyRouteOutputs(['Receiver'])).toBe(false);
  });

  test('classifies unrecognized port types as false (conservative default)', () => {
    expect(classifyRouteOutputs(['HDMI'])).toBe(false);
    expect(classifyRouteOutputs(['AirPlay'])).toBe(false);
    expect(classifyRouteOutputs(['LineOut'])).toBe(false);
  });

  test('true if ANY output in a multi-port route is headphone-ish', () => {
    expect(classifyRouteOutputs(['Speaker', 'Headphones'])).toBe(true);
    expect(classifyRouteOutputs(['AirPlay', 'BluetoothA2DPOutput'])).toBe(true);
  });

  test('false when every output is non-headphone-ish', () => {
    expect(classifyRouteOutputs(['Speaker', 'Receiver', 'AirPlay'])).toBe(false);
  });

  test('empty outputs list classifies as false', () => {
    expect(classifyRouteOutputs([])).toBe(false);
  });
});
