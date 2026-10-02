import { describe, expect, it } from 'vitest';
import { buildConfirmLink } from '../confirmLink.ts';

const linkData = {
  action_link: 'https://supabase.gleeworld.org/auth/v1/verify?token=abc&type=magiclink',
  properties: { hashed_token: 'abc123', verification_type: 'magiclink' },
};

describe('buildConfirmLink', () => {
  it('points at our confirm page, never at GoTrue /verify', () => {
    const url = buildConfirmLink('https://yo-doc.com', linkData, '/welcome');
    // The whole defence: the emailed URL must not be the one that spends
    // the token. If this ever contains /auth/v1/verify again, scanners are
    // back to consuming members' logins.
    expect(url).not.toContain('/auth/v1/verify');
    expect(url).toContain('https://yo-doc.com/auth/confirm');
  });

  it('carries the token hash, type and next destination', () => {
    const url = new URL(buildConfirmLink('https://yo-doc.com', linkData, '/welcome')!);
    expect(url.searchParams.get('token_hash')).toBe('abc123');
    expect(url.searchParams.get('type')).toBe('magiclink');
    expect(url.searchParams.get('next')).toBe('/welcome');
  });

  it('passes recovery through so the page can route to /reset-password', () => {
    const url = new URL(buildConfirmLink('https://yo-doc.com', {
      properties: { hashed_token: 'h', verification_type: 'recovery' },
    })!);
    expect(url.searchParams.get('type')).toBe('recovery');
    expect(url.searchParams.get('next')).toBeNull();
  });

  it('returns undefined without an origin or a hashed_token, so callers can fall back', () => {
    expect(buildConfirmLink(undefined, linkData)).toBeUndefined();
    expect(buildConfirmLink('https://yo-doc.com', { action_link: 'x' })).toBeUndefined();
    expect(buildConfirmLink('not a url', linkData)).toBeUndefined();
  });
});
