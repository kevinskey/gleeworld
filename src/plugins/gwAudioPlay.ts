// TypeScript bridge for the iOS GWAudioPlayPlugin (AVAudioPlayer).
//
// WebKit renders Web Audio under an ambient-style session that obeys the
// ring/silent switch and inherits stale routes, so the Assistant's spoken
// replies "played" silently in the app. AVAudioPlayer under the app's own
// .playback session behaves like a media app: speaker route, silent switch
// ignored. Only reply playback lives here — everything else still uses
// Web Audio.

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface GWAudioPlayPluginShape {
  /** Starts playback of base64-encoded audio (any AVAudioPlayer-supported
   *  codec; we send ElevenLabs MP3). Resolves once playback has started.
   *  Exactly one playEnded follows, on natural finish or stop(). A play()
   *  during another clip stops the first WITHOUT emitting its playEnded. */
  play(opts: { b64: string; volume?: number }): Promise<void>;
  stop(): Promise<void>;
  addListener(event: 'playEnded', cb: () => void): Promise<PluginListenerHandle>;
}

export const GWAudioPlay = registerPlugin<GWAudioPlayPluginShape>('GWAudioPlay');

export function isNativeAudioPlayAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios';
}
