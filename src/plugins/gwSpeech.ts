// TypeScript bridge for the native GWSpeech plugins (iOS SFSpeechRecognizer,
// Android SpeechRecognizer).
//
// iOS WebKit has no Web Speech recognition API (window.SpeechRecognition
// is undefined in WKWebView), so the Assistant's mic was dead in the app.
// The native plugin taps the mic through AVAudioEngine, streams partial
// transcripts as they firm up, and finalizes on silence or explicit stop.
// speechSynthesis (output) DOES work in WKWebView, so only input lives here.
// Outside Capacitor iOS the wrapper is never selected (see getSpeechInput),
// so no web no-op shims are needed.

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface GWSpeechResultEvent {
  transcript: string;
  /** True on the utterance's final transcript — emitted once per session,
   *  right before speechEnd (on silence-finalize or explicit stop). */
  isFinal: boolean;
}

export interface GWSpeechPluginShape {
  start(): Promise<void>;
  stop(): Promise<void>;
  addListener(event: 'speechResult', cb: (e: GWSpeechResultEvent) => void): Promise<PluginListenerHandle>;
  addListener(event: 'speechEnd', cb: () => void): Promise<PluginListenerHandle>;
}

export const GWSpeech = registerPlugin<GWSpeechPluginShape>('GWSpeech');

export function isNativeSpeechAvailable(): boolean {
  // Neither WKWebView nor the Android WebView implements Web Speech
  // recognition; both platforms carry a native GWSpeech plugin.
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'android';
}
