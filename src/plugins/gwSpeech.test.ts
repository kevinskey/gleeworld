// The availability flag is what routes the assistant mic to the native
// plugin. Regression: Android was excluded, leaving the mic dead in the
// Android WebView (no Web Speech recognition there, same as WKWebView).
import { describe, it, expect, vi, afterEach } from 'vitest';

const platform = vi.hoisted(() => ({ value: 'web' }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => platform.value },
  registerPlugin: () => ({}),
}));

import { isNativeSpeechAvailable } from './gwSpeech';

afterEach(() => { platform.value = 'web'; });

describe('isNativeSpeechAvailable', () => {
  it('is true on iOS', () => {
    platform.value = 'ios';
    expect(isNativeSpeechAvailable()).toBe(true);
  });
  it('is true on Android', () => {
    platform.value = 'android';
    expect(isNativeSpeechAvailable()).toBe(true);
  });
  it('is false on plain web (Web Speech handles it there)', () => {
    platform.value = 'web';
    expect(isNativeSpeechAvailable()).toBe(false);
  });
});
