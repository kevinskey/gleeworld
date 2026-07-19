// HMAC-signed state tokens for OAuth flows (currently Stripe Connect).
//
// The state param round-trips through the OAuth provider and comes back to us
// as an untrusted query string. Signing it with a server-only secret lets the
// callback trust {tenant_id, slug, user_id, return_path} without another DB
// lookup, and blocks a CSRF-style attack where a hostile page tricks a signed-
// in tenant admin into completing a connect that binds the attacker's Stripe
// account to the victim's tenant (or vice versa).
//
// Format: <base64url(json payload)>.<hex(HMAC-SHA-256)>
// Expiry: enforced by the caller against payload.exp (unix seconds).

const enc = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function b64urlEncode(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(str: string): Uint8Array {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const raw = atob((str + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexDecode(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Constant-time compare so a truncated signature guess can't be probed. */
function ctEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signState(payload: Record<string, unknown>, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)));
  return `${body}.${hexEncode(sig)}`;
}

export async function verifyState<T = Record<string, unknown>>(
  token: string | null | undefined,
  secret: string,
): Promise<T | null> {
  if (!token || !token.includes('.')) return null;
  const [body, sigHex] = token.split('.');
  if (!body || !sigHex) return null;
  const key = await hmacKey(secret);
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)));
  const given = hexDecode(sigHex);
  if (!ctEq(expected, given)) return null;
  try {
    const decoded = new TextDecoder().decode(b64urlDecode(body));
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}
