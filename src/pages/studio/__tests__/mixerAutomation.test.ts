import { describe, it, expect } from 'vitest';
import { captureWriteModeAutomation } from '../MixerView';
import type { Automation } from '@/lib/studio/session';

const env = (
  mode: Automation['mode'],
  param: Automation['param'],
  points: Automation['points'] = [],
  target_id = 'track-a',
  target_kind: Automation['target_kind'] = 'track',
): Automation => ({ target_id, target_kind, param, mode, points });

const PLAYING = { isPlaying: true, positionSeconds: 1.5 };
const STOPPED = { isPlaying: false, positionSeconds: 1.5 };

describe('captureWriteModeAutomation', () => {
  it('no-ops when transport is stopped', () => {
    const auto = [env('write', 'volume_db')];
    const out = captureWriteModeAutomation(auto, 'track-a', 'track', { volume_db: -3 }, STOPPED);
    expect(out).toBe(auto);
  });

  it('no-ops when the patch has no volume/pan (mute/solo only)', () => {
    const auto = [env('write', 'volume_db')];
    const out = captureWriteModeAutomation(auto, 'track-a', 'track', { mute: true }, PLAYING);
    expect(out).toBe(auto);
  });

  it('no-ops when there is no envelope for the strip', () => {
    const auto = [env('write', 'volume_db', [], 'other-track')];
    const out = captureWriteModeAutomation(auto, 'track-a', 'track', { volume_db: -3 }, PLAYING);
    expect(out).toBe(auto);
  });

  it('no-ops when the matching envelope is in read mode', () => {
    const auto = [env('read', 'volume_db')];
    const out = captureWriteModeAutomation(auto, 'track-a', 'track', { volume_db: -3 }, PLAYING);
    expect(out).toBe(auto);
  });

  it('captures a volume point when write mode is on and transport is playing', () => {
    const auto = [env('write', 'volume_db')];
    const out = captureWriteModeAutomation(auto, 'track-a', 'track', { volume_db: -3 }, PLAYING);
    expect(out).not.toBe(auto);
    expect(out[0].points).toEqual([{ time_seconds: 1.5, value: -3, curve: 'linear' }]);
  });

  it('captures both volume and pan in the same patch when both are in write', () => {
    const auto = [
      env('write', 'volume_db'),
      env('write', 'pan'),
    ];
    const out = captureWriteModeAutomation(
      auto, 'track-a', 'track', { volume_db: -3, pan: 0.5 }, PLAYING,
    );
    expect(out[0].points).toEqual([{ time_seconds: 1.5, value: -3, curve: 'linear' }]);
    expect(out[1].points).toEqual([{ time_seconds: 1.5, value: 0.5, curve: 'linear' }]);
  });

  it('captures pan without touching a matching read-mode volume envelope', () => {
    const auto = [
      env('read', 'volume_db', [{ time_seconds: 0, value: -6, curve: 'linear' }]),
      env('write', 'pan'),
    ];
    const out = captureWriteModeAutomation(
      auto, 'track-a', 'track', { pan: 0.25 }, PLAYING,
    );
    // read envelope untouched (identity by index preserved)
    expect(out[0]).toBe(auto[0]);
    expect(out[1].points).toHaveLength(1);
  });

  it('scopes capture to the correct target_kind (track vs bus)', () => {
    const auto = [
      env('write', 'volume_db', [], 'x', 'track'),
      env('write', 'volume_db', [], 'x', 'bus'),
    ];
    const out = captureWriteModeAutomation(auto, 'x', 'bus', { volume_db: -12 }, PLAYING);
    expect(out[0]).toBe(auto[0]); // track envelope untouched
    expect(out[1].points).toEqual([{ time_seconds: 1.5, value: -12, curve: 'linear' }]);
  });

  it('overwrites nearby points via punch-write on repeated moves', () => {
    const auto = [env('write', 'volume_db', [
      { time_seconds: 1.48, value: -10, curve: 'linear' },
      { time_seconds: 1.52, value: -8, curve: 'linear' },
    ])];
    const out = captureWriteModeAutomation(auto, 'track-a', 'track', { volume_db: -3 }, PLAYING);
    expect(out[0].points).toEqual([{ time_seconds: 1.5, value: -3, curve: 'linear' }]);
  });
});
