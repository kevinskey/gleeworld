// Svix webhook signature verification — the scheme Resend uses for its
// webhooks, implemented against the published algorithm with Web Crypto so
// no library has to be pulled into the Deno runtime.
//
// This is the only thing standing between the public internet and rows in
// our database, so it fails closed: any missing header, unparseable value,
// absent secret, or unknown signature version returns false rather than
// falling through to "probably fine".
//
// Algorithm: HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${raw body}`,
// keyed with the base64-decoded portion of the secret after `whsec_`, then
// base64-encoded. The svix-signature header holds space-delimited
// `v1,<signature>` entries; any one may match.

// Signatures older or newer than this are refused, so a captured request
// cannot be replayed later. Svix's own recommendation is five minutes.
const TOLERANCE_SECONDS = 5 * 60;

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary);
}

// Length-independent comparison, so how much of a forged signature was
// correct cannot be inferred from how long the check took.
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifySvixSignature(
  rawBody: string,
  headers: Record<string, string | null | undefined>,
  signingSecret: string | null | undefined,
): Promise<boolean> {
  if (!signingSecret) return false;

  const id = headers['svix-id'];
  const timestamp = headers['svix-timestamp'];
  const signatureHeader = headers['svix-signature'];
  if (!id || !timestamp || !signatureHeader) return false;

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  const skew = Math.abs(Math.floor(Date.now() / 1000) - sentAt);
  if (skew > TOLERANCE_SECONDS) return false;

  const secretPart = signingSecret.startsWith('whsec_')
    ? signingSecret.slice('whsec_'.length)
    : signingSecret;

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      'raw',
      base64ToBytes(secretPart),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
  } catch {
    return false;
  }

  const signed = `${id}.${timestamp}.${rawBody}`;
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
  const expected = bytesToBase64(digest);

  // The header may carry several signatures during a secret rotation; any
  // one matching is enough, but only v1 entries are understood.
  for (const entry of signatureHeader.split(' ')) {
    const [version, value] = entry.split(',');
    if (version !== 'v1' || !value) continue;
    if (constantTimeEquals(value, expected)) return true;
  }

  return false;
}
