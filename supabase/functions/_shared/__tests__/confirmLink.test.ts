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

describe('buildConfirmLink — GoTrue response shapes', () => {
  // The droplet's GoTrue returns these at the TOP LEVEL, not nested under
  // `properties`. Reading only the nested shape made buildConfirmLink return
  // undefined, so every caller fell back to action_link and the scanner
  // protection was inert for a day. This test is the regression guard.
  it('reads a TOP-LEVEL response (what our GoTrue actually sends)', () => {
    const url = buildConfirmLink('https://yo-doc.com', {
      action_link: 'https://supabase.gleeworld.org/auth/v1/verify?token=x',
      hashed_token: 'tophash',
      verification_type: 'magiclink',
    }, '/welcome');
    expect(url).toBeDefined();
    expect(url).not.toContain('/auth/v1/verify');
    expect(new URL(url!).searchParams.get('token_hash')).toBe('tophash');
  });

  it('still reads the NESTED response (other GoTrue versions)', () => {
    const url = buildConfirmLink('https://yo-doc.com', {
      properties: { hashed_token: 'nestedhash', verification_type: 'recovery' },
    });
    expect(new URL(url!).searchParams.get('token_hash')).toBe('nestedhash');
    expect(new URL(url!).searchParams.get('type')).toBe('recovery');
  });

  it('prefers the nested value when both are present', () => {
    const url = buildConfirmLink('https://yo-doc.com', {
      hashed_token: 'top',
      properties: { hashed_token: 'nested' },
    });
    expect(new URL(url!).searchParams.get('token_hash')).toBe('nested');
  });
});
