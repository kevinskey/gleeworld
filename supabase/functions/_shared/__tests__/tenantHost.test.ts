import { describe, expect, it } from 'vitest';
import {
  normalizeHost,
  resolveTenantSlugFromOrigin,
  slugFromGleeworldHost,
  slugFromTenantRows,
  type TenantHostRow,
} from '../tenantHost.ts';

// The real rows as of 2026-10-01: one tenant whose slug has nothing to do
// with its branded host, which is the case the old label-guess got wrong.
const ROWS: TenantHostRow[] = [
  { slug: 'kevin', subdomain: 'kevin', custom_domain: 'yo-doc.com' },
  {
    slug: 'the-silvertones-chorus',
    subdomain: 'the-silvertones-chorus',
    custom_domain: 'thesilvertoneschorus.com',
  },
  { slug: 'demo-choir', subdomain: 'demo-choir.gleeworld.org', custom_domain: null },
  { slug: 'main', subdomain: 'gleeworld.org', custom_domain: null },
];

describe('normalizeHost', () => {
  it('reduces a full origin to a bare host', () => {
    expect(normalizeHost('https://yo-doc.com/reset-password')).toBe('yo-doc.com');
  });

  it('tolerates the pasted-URL form an admin can type into custom_domain', () => {
    expect(normalizeHost('https://example.org/')).toBe('example.org');
  });

  it('strips ports and www', () => {
    expect(normalizeHost('localhost:8080')).toBe('localhost');
    expect(normalizeHost('www.yo-doc.com')).toBe('yo-doc.com');
  });

  it('returns empty for junk rather than throwing', () => {
    expect(normalizeHost(null)).toBe('');
    expect(normalizeHost('   ')).toBe('');
    expect(normalizeHost('http://')).toBe('');
  });
});

describe('slugFromGleeworldHost', () => {
  it('reads the slug off a tenant subdomain', () => {
    expect(slugFromGleeworldHost('lykehouse.gleeworld.org')).toBe('lykehouse');
  });

  it('maps the root domain to main', () => {
    expect(slugFromGleeworldHost('gleeworld.org')).toBe('main');
    expect(slugFromGleeworldHost('https://www.gleeworld.org')).toBe('main');
  });

  it('returns null for a branded host so the caller falls through to the DB', () => {
    expect(slugFromGleeworldHost('yo-doc.com')).toBeNull();
  });

  it('refuses a multi-label prefix instead of inventing a dotted slug', () => {
    expect(slugFromGleeworldHost('a.b.gleeworld.org')).toBeNull();
  });
});

describe('slugFromTenantRows', () => {
  it('resolves a branded host whose slug it does not resemble', () => {
    // The whole point: 'yo-doc.com' must reach tenant 'kevin', not 'yo-doc'.
    expect(slugFromTenantRows(ROWS, 'yo-doc.com')).toBe('kevin');
    expect(slugFromTenantRows(ROWS, 'https://www.yo-doc.com/auth')).toBe('kevin');
  });

  it('matches a subdomain column holding a bare label', () => {
    expect(slugFromTenantRows(ROWS, 'kevin.gleeworld.org')).toBe('kevin');
  });

  it('matches a subdomain column holding a full host', () => {
    expect(slugFromTenantRows(ROWS, 'demo-choir.gleeworld.org')).toBe('demo-choir');
  });

  it('returns null for an unknown host', () => {
    expect(slugFromTenantRows(ROWS, 'not-a-tenant.example')).toBeNull();
    expect(slugFromTenantRows([], 'yo-doc.com')).toBeNull();
  });
});

describe('resolveTenantSlugFromOrigin', () => {
  it('never queries when the host is a gleeworld.org subdomain', async () => {
    let called = false;
    const slug = await resolveTenantSlugFromOrigin('https://lykehouse.gleeworld.org', async () => {
      called = true;
      return ROWS;
    });
    expect(slug).toBe('lykehouse');
    expect(called).toBe(false);
  });

  it('queries for a branded host', async () => {
    const slug = await resolveTenantSlugFromOrigin('https://yo-doc.com', async () => ROWS);
    expect(slug).toBe('kevin');
  });

  it('returns null instead of throwing when the lookup fails', async () => {
    const slug = await resolveTenantSlugFromOrigin('https://yo-doc.com', async () => {
      throw new Error('db down');
    });
    expect(slug).toBeNull();
  });
});
