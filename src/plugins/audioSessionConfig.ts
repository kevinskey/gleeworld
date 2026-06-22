// TypeScript bridge for the iOS AudioSessionConfigPlugin.
//
// When running inside the Capacitor iOS app, the plugin gives us
// `AVAudioSession.Mode.measurement` for the mic — bypassing every
// speech-DSP step iOS normally applies to recordings (echo cancel,
// noise suppression, AGC). Outside Capacitor (web/desktop) the wrapper
// no-ops so callers can use it unconditionally.

import { Capacitor, registerPlugin } from '@capacitor/core';

interface AudioRoute {
  inputs: Array<{ portName: string; portType: string }>;
  outputs: Array<{ portName: string; portType: string }>;
  hasHeadphones: boolean;
}

interface AudioSessionInfo {
  sampleRate: number;
  inputNumberOfChannels: number;
  ioBufferDuration: number;
  category: string;
  mode: string;
  route: AudioRoute;
}

interface AudioSessionConfigPlugin {
  configureForMusicRecording(): Promise<AudioSessionInfo>;
  restoreDefault(): Promise<void>;
  getCurrentRoute(): Promise<{ route: AudioRoute; sampleRate: number }>;
}

const Native = registerPlugin<AudioSessionConfigPlugin>('AudioSessionConfig');

function isAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/** Switch iOS into measurement-mode capture before a recording starts.
 *  Safe to call on web — returns null without touching anything. */
export async function configureForMusicRecording(): Promise<AudioSessionInfo | null> {
  if (!isAvailable()) return null;
  try {
    return await Native.configureForMusicRecording();
  } catch (e) {
    console.warn('[AudioSessionConfig] configureForMusicRecording failed', e);
    return null;
  }
}

/** Restore the default ambient session after a recording session ends. */
export async function restoreDefaultAudioSession(): Promise<void> {
  if (!isAvailable()) return;
  try {
    await Native.restoreDefault();
  } catch (e) {
    console.warn('[AudioSessionConfig] restoreDefault failed', e);
  }
}

/** Inspect the current audio route — used to auto-enable music mode
 *  when AirPods / wired headphones are connected. */
export async function getCurrentAudioRoute(): Promise<{ route: AudioRoute; sampleRate: number } | null> {
  if (!isAvailable()) return null;
  try {
    return await Native.getCurrentRoute();
  } catch {
    return null;
  }
}

export function isNativeAudioSessionAvailable(): boolean {
  return isAvailable();
}
