// iOS status bar text color for the edge-to-edge app (capacitor.config
// StatusBar.overlaysWebView: true — the clock/battery float over app
// content with a transparent background). The bar's TEXT must match the
// surface behind it:
//   'default'   — the app's light/cream theme → dark text (Style.Light)
//   'dark-room' — dark chrome like the Studio → white text (Style.Dark)
// Dark rooms flip on mount and restore on unmount. No-op outside the
// native iOS app (Web MIDI-era pattern: consumers never platform-branch).
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type StatusBarSurface = 'default' | 'dark-room';

export function applyStatusBarSurface(surface: StatusBarSurface): void {
  if (Capacitor.getPlatform() !== 'ios') return;
  void StatusBar.setStyle({
    style: surface === 'dark-room' ? Style.Dark : Style.Light,
  }).catch(() => { /* plugin unavailable on an old binary — cosmetic, ignore */ });
}
