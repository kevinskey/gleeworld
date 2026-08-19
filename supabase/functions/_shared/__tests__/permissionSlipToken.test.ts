import { describe, it, expect } from 'vitest';
import { signSlipToken, verifySlipToken } from '../permissionSlipToken';

process.env.SLIP_SIGNING_KEY = 'test-secret-32-chars-long-xxxxxxxxxx';

describe('permissionSlipToken', () => {
  it('roundtrips a signed token', async () => {
    const t = await signSlipToken({ slipId: 's1', guardianId: 'g1', tenantId: 't1', jti: 'j1' });
    const claims = await verifySlipToken(t);
    expect(claims.slipId).toBe('s1');
    expect(claims.jti).toBe('j1');
  });
  it('rejects a tampered token', async () => {
    const t = await signSlipToken({ slipId: 's1', guardianId: 'g1', tenantId: 't1', jti: 'j1' });
    const bad = t.slice(0, -4) + 'AAAA';
    await expect(verifySlipToken(bad)).rejects.toThrow();
  });
  it('rejects an expired token', async () => {
    const t = await signSlipToken({ slipId: 's1', guardianId: 'g1', tenantId: 't1', jti: 'j1', ttlDays: -1 });
    await expect(verifySlipToken(t)).rejects.toThrow();
  });
});
