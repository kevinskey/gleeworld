import { describe, it, expect } from 'vitest';
import { decodeJwtClaims, claimsToDemoRole, DEMO_HOME } from './demoSession';

// Build an unsigned JWT with the given payload (header/signature are ignored
// by the decoder — it only reads the middle segment).
function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}

describe('decodeJwtClaims', () => {
  it('decodes a base64url payload', () => {
    const claims = decodeJwtClaims(fakeJwt({ tenant_slug: 'demo', demo_viewer: true }));
    expect(claims).toMatchObject({ tenant_slug: 'demo', demo_viewer: true });
  });

  it('returns null on garbage', () => {
    expect(decodeJwtClaims('not-a-jwt')).toBeNull();
    expect(decodeJwtClaims('')).toBeNull();
  });
});

describe('claimsToDemoRole', () => {
  it('maps admin demo viewer to director', () => {
    expect(claimsToDemoRole({ demo_viewer: true, tenant_slug: 'demo', tenant_role: 'admin' }))
      .toBe('director');
  });

  it('maps student and fan roles', () => {
    expect(claimsToDemoRole({ demo_viewer: true, tenant_slug: 'demo', tenant_role: 'student' }))
      .toBe('student');
    expect(claimsToDemoRole({ demo_viewer: true, tenant_slug: 'demo', tenant_role: 'fan' }))
      .toBe('fan');
  });

  it('returns null when demo_viewer is absent (demo-admin, real tenants)', () => {
    expect(claimsToDemoRole({ tenant_slug: 'demo', tenant_role: 'admin' })).toBeNull();
    expect(claimsToDemoRole({ demo_viewer: true, tenant_slug: 'spellman-x', tenant_role: 'admin' })).toBeNull();
    expect(claimsToDemoRole(null)).toBeNull();
  });
});

describe('DEMO_HOME', () => {
  it('routes each role to its post-login home', () => {
    expect(DEMO_HOME.director).toBe('/dashboard');
    expect(DEMO_HOME.student).toBe('/dashboard');
    expect(DEMO_HOME.fan).toBe('/fan');
  });
});
