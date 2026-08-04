import { SignJWT, jwtVerify } from 'npm:jose@5';

const enc = new TextEncoder();
function key() {
  const raw = Deno.env.get('SLIP_SIGNING_KEY');
  if (!raw || raw.length < 32) throw new Error('SLIP_SIGNING_KEY missing or too short');
  return enc.encode(raw);
}

export async function signSlipToken(p: {
  slipId: string; guardianId: string; tenantId: string; jti: string; ttlDays?: number;
}): Promise<string> {
  const ttl = p.ttlDays ?? 14;
  return await new SignJWT({ slipId: p.slipId, guardianId: p.guardianId, tenantId: p.tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(p.jti)
    .setIssuedAt()
    .setExpirationTime(`${ttl}d`)
    .sign(key());
}

export async function verifySlipToken(token: string) {
  const { payload } = await jwtVerify(token, key());
  return {
    slipId: String(payload.slipId),
    guardianId: String(payload.guardianId),
    tenantId: String(payload.tenantId),
    jti: String(payload.jti),
    exp: Number(payload.exp),
  };
}
