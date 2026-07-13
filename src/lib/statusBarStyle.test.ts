// The iOS status bar overlays the webview (capacitor.config
// overlaysWebView: true), so its text color must match the surface
// behind it: dark text on the app's light theme, white text in dark
// rooms (Studio). Outside native iOS the helper must be a no-op.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setStyle = vi.fn().mockResolvedValue(undefined);
let platform = 'ios';

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: { setStyle: (...args: unknown[]) => setStyle(...args) },
  Style: { Light: 'LIGHT', Dark: 'DARK', Default: 'DEFAULT' },
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => platform },
}));

import { applyStatusBarSurface } from './statusBarStyle';

describe('applyStatusBarSurface', () => {
  beforeEach(() => { setStyle.mockClear(); platform = 'ios'; });

  it('dark-room surface → white status bar text (Style.Dark)', () => {
    applyStatusBarSurface('dark-room');
    expect(setStyle).toHaveBeenCalledWith({ style: 'DARK' });
  });

  it('default surface → dark status bar text (Style.Light)', () => {
    applyStatusBarSurface('default');
    expect(setStyle).toHaveBeenCalledWith({ style: 'LIGHT' });
  });

  it('no-op on web', () => {
    platform = 'web';
    applyStatusBarSurface('dark-room');
    expect(setStyle).not.toHaveBeenCalled();
  });
});
