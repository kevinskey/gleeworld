// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Default to WEB. The single most important property of this bridge is that it
// does nothing at all in a browser — downloads already work there, and breaking
// them to fix native would be a bad trade.
const isNative = vi.fn(() => false);
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => isNative() } }));

import { installNativeDownloadBridge, saveAndShareFile } from '../nativeDownload';

const WINDOW_FLAG = '__gwNativeDownloadBridge';

describe('installNativeDownloadBridge', () => {
  beforeEach(() => {
    isNative.mockReturnValue(false);
    delete (window as unknown as Record<string, unknown>)[WINDOW_FLAG];
    document.body.innerHTML = '';
  });
  afterEach(() => vi.restoreAllMocks());

  it('does NOT intercept anchor downloads on the web', () => {
    const spy = vi.spyOn(document, 'addEventListener');
    installNativeDownloadBridge();
    expect(spy).not.toHaveBeenCalled();
    expect((window as unknown as Record<string, unknown>)[WINDOW_FLAG]).toBeUndefined();
  });

  it('installs exactly one listener on native, even if called repeatedly', () => {
    isNative.mockReturnValue(true);
    const spy = vi.spyOn(document, 'addEventListener');
    installNativeDownloadBridge();
    installNativeDownloadBridge();
    installNativeDownloadBridge();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('prevents the default anchor download on native so the share sheet can take over', () => {
    isNative.mockReturnValue(true);
    installNativeDownloadBridge();

    const a = document.createElement('a');
    a.setAttribute('href', 'blob:http://localhost/abc');
    a.setAttribute('download', 'roster.csv');
    document.body.appendChild(a);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores anchors that are not downloads, and download anchors with no href', () => {
    isNative.mockReturnValue(true);
    installNativeDownloadBridge();

    const plain = document.createElement('a');
    plain.setAttribute('href', '/dashboard');
    document.body.appendChild(plain);
    const e1 = new MouseEvent('click', { bubbles: true, cancelable: true });
    plain.dispatchEvent(e1);
    expect(e1.defaultPrevented).toBe(false);

    const hrefless = document.createElement('a');
    hrefless.setAttribute('download', 'x.csv');
    hrefless.setAttribute('href', '#');
    document.body.appendChild(hrefless);
    const e2 = new MouseEvent('click', { bubbles: true, cancelable: true });
    hrefless.dispatchEvent(e2);
    expect(e2.defaultPrevented).toBe(false);
  });
});

describe('saveAndShareFile', () => {
  it('is a no-op on the web rather than throwing', async () => {
    isNative.mockReturnValue(false);
    await expect(saveAndShareFile(new Blob(['x']), 'x.txt')).resolves.toBeUndefined();
  });
});
