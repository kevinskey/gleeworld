import { describe, it, expect } from 'vitest';
import { tenantHostFromRow, buildTenantHandoffUrl } from '../tenantRedirect';

describe('tenantHostFromRow', () => {
  it('maps the main tenant to the bare root domain', () => {
    // Guards the concatenation bug: main's row holds subdomain
    // 'gleeworld.org', so appending the root would yield
    // 'gleeworld.org.gleeworld.org'.
    expect(tenantHostFromRow({ slug: 'main', subdomain: 'gleeworld.org', custom_domain: null }, 'main'))
      .toBe('gleeworld.org');
  });

  it('passes through a subdomain already stored as a full host', () => {
    expect(tenantHostFromRow(
      { slug: 'demo-choir', subdomain: 'demo-choir.gleeworld.org', custom_domain: null },
      'demo-choir',
    )).toBe('demo-choir.gleeworld.org');
  });

  it('qualifies a subdomain stored as a bare label', () => {
    // The shape real tenants like 'kevin' actually have.
    expect(tenantHostFromRow({ slug: 'kevin', subdomain: 'kevin', custom_domain: null }, 'kevin'))
      .toBe('kevin.gleeworld.org');
  });

  it('prefers the canonical subdomain over a custom domain', () => {
    // Deliberate: custom domains are the least reliable host (Cloudflare
    // proxy reload loop) and this is a recovery path.
    expect(tenantHostFromRow(
      { slug: 'the-silvertones-chorus', subdomain: 'the-silvertones-chorus', custom_domain: 'thesilvertoneschorus.com' },
      'the-silvertones-chorus',
    )).toBe('the-silvertones-chorus.gleeworld.org');
  });

  it('falls back to the slug when the row is missing or blank', () => {
    expect(tenantHostFromRow(null, 'kevin')).toBe('kevin.gleeworld.org');
    expect(tenantHostFromRow({ slug: 'kevin', subdomain: '   ', custom_domain: null }, 'kevin'))
      .toBe('kevin.gleeworld.org');
  });
});

describe('buildTenantHandoffUrl', () => {
  const tokens = { accessToken: 'aaa.bbb.ccc', refreshToken: 'r-123' };

  it('puts both tokens in the fragment so they never reach the server', () => {
    const url = buildTenantHandoffUrl('kevin.gleeworld.org', tokens);
    const { hash, pathname, origin } = new URL(url);
    expect(origin).toBe('https://kevin.gleeworld.org');
    expect(pathname).toBe('/auth/callback');
    const frag = new URLSearchParams(hash.slice(1));
    expect(frag.get('access_token')).toBe('aaa.bbb.ccc');
    expect(frag.get('refresh_token')).toBe('r-123');
    // The query string carries only the destination — no credentials.
    expect(new URL(url).search).not.toContain('token');
  });

  it('degrades to a plain login page when tokens are unavailable', () => {
    expect(buildTenantHandoffUrl('kevin.gleeworld.org', { accessToken: null, refreshToken: null }))
      .toBe('https://kevin.gleeworld.org/auth');
    expect(buildTenantHandoffUrl('kevin.gleeworld.org', { accessToken: 'a', refreshToken: null }))
      .toBe('https://kevin.gleeworld.org/auth');
  });

  it('encodes the next destination', () => {
    const url = buildTenantHandoffUrl('kevin.gleeworld.org', tokens, '/dashboard/music?tab=1');
    expect(new URL(url).searchParams.get('next')).toBe('/dashboard/music?tab=1');
  });

  it('escapes token values rather than splicing them raw into the URL', () => {
    const url = buildTenantHandoffUrl('kevin.gleeworld.org', {
      accessToken: 'a&b=c',
      refreshToken: 'r#d',
    });
    const frag = new URLSearchParams(new URL(url).hash.slice(1));
    expect(frag.get('access_token')).toBe('a&b=c');
    expect(frag.get('refresh_token')).toBe('r#d');
  });
});
