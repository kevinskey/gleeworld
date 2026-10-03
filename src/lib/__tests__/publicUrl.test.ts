import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { publicBaseUrl, publicUrl } from '../publicUrl';

type Win = {
  location: { protocol: string; origin: string };
  __TENANT_CONFIG__?: { tenant?: string; customDomain?: string };
};

function setWindow(protocol: string, origin: string, cfg?: Win['__TENANT_CONFIG__']) {
  (globalThis as unknown as { window: Win }).window = {
    location: { protocol, origin },
    __TENANT_CONFIG__: cfg,
  };
}

const original = (globalThis as { window?: unknown }).window;
beforeEach(() => { /* each test sets its own */ });
afterEach(() => { (globalThis as { window?: unknown }).window = original; });

describe('publicBaseUrl', () => {
  // The important half of this fix: the web must behave exactly as before.
  it('returns the real origin on https, untouched', () => {
    setWindow('https:', 'https://yo-doc.com', { tenant: 'kevin', customDomain: 'yo-doc.com' });
    expect(publicBaseUrl()).toBe('https://yo-doc.com');
  });

  it('leaves http localhost alone during development', () => {
    setWindow('http:', 'http://localhost:8080', { tenant: 'kevin' });
    expect(publicBaseUrl()).toBe('http://localhost:8080');
  });

  it('never returns capacitor://localhost — the whole point', () => {
    setWindow('capacitor:', 'capacitor://localhost', { tenant: 'kevin', customDomain: 'yo-doc.com' });
    const url = publicBaseUrl();
    expect(url).not.toContain('capacitor');
    expect(url).not.toContain('localhost');
    expect(url).toBe('https://yo-doc.com');
  });

  it('falls back to the tenant subdomain when there is no custom domain', () => {
    setWindow('capacitor:', 'capacitor://localhost', { tenant: 'lykehouse' });
    expect(publicBaseUrl()).toBe('https://lykehouse.gleeworld.org');
  });

  it("maps 'main' to the apex, not main.gleeworld.org", () => {
    setWindow('capacitor:', 'capacitor://localhost', { tenant: 'main' });
    expect(publicBaseUrl()).toBe('https://gleeworld.org');
  });

  it('falls back to the apex with no cached tenant at all', () => {
    setWindow('capacitor:', 'capacitor://localhost', undefined);
    expect(publicBaseUrl()).toBe('https://gleeworld.org');
  });

  it('tolerates a custom_domain an admin pasted as a full URL', () => {
    setWindow('capacitor:', 'capacitor://localhost', { tenant: 'kevin', customDomain: 'https://yo-doc.com/' });
    expect(publicBaseUrl()).toBe('https://yo-doc.com');
  });
});

describe('publicUrl', () => {
  it('joins with or without a leading slash', () => {
    setWindow('capacitor:', 'capacitor://localhost', { tenant: 'kevin', customDomain: 'yo-doc.com' });
    expect(publicUrl('/attendance-scan?token=x')).toBe('https://yo-doc.com/attendance-scan?token=x');
    expect(publicUrl('attendance-scan')).toBe('https://yo-doc.com/attendance-scan');
  });
});
