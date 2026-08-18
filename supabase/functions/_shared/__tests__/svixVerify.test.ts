import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifySvixSignature } from '../svixVerify.ts';

const SECRET = 'whsec_' + Buffer.from('super-secret-signing-key-value!!').toString('base64');
const KEY = Buffer.from(SECRET.slice('whsec_'.length), 'base64');

const BODY = JSON.stringify({ type: 'email.received', data: { email_id: 'abc' } });
const ID = 'msg_2abc';

function sign(id: string, timestamp: string, body: string): string {
  return createHmac('sha256', KEY).update(`${id}.${timestamp}.${body}`).digest('base64');
}

function headers(over: Record<string, string> = {}, ts = Math.floor(Date.now() / 1000)) {
  const timestamp = String(ts);
  return {
    'svix-id': ID,
    'svix-timestamp': timestamp,
    'svix-signature': `v1,${sign(ID, timestamp, BODY)}`,
    ...over,
  };
}

describe('verifySvixSignature', () => {
  it('accepts a correctly signed payload', async () => {
    await expect(verifySvixSignature(BODY, headers(), SECRET)).resolves.toBe(true);
  });

  it('accepts when the header carries several signatures and one matches', async () => {
    const h = headers();
    h['svix-signature'] = `v1,ZmFrZQ== ${h['svix-signature']}`;
    await expect(verifySvixSignature(BODY, h, SECRET)).resolves.toBe(true);
  });

  it('rejects a tampered body', async () => {
    const tampered = JSON.stringify({ type: 'email.received', data: { email_id: 'EVIL' } });
    await expect(verifySvixSignature(tampered, headers(), SECRET)).resolves.toBe(false);
  });

  it('rejects a signature made with a different secret', async () => {
    const other = 'whsec_' + Buffer.from('a-completely-different-key-here!').toString('base64');
    await expect(verifySvixSignature(BODY, headers(), other)).resolves.toBe(false);
  });

  it('rejects a swapped message id, so a signature cannot be replayed onto another message', async () => {
    await expect(verifySvixSignature(BODY, headers({ 'svix-id': 'msg_other' }), SECRET))
      .resolves.toBe(false);
  });

  it('rejects a timestamp outside the tolerance window', async () => {
    const old = Math.floor(Date.now() / 1000) - 60 * 60;
    await expect(verifySvixSignature(BODY, headers({}, old), SECRET)).resolves.toBe(false);
  });

  it('rejects a timestamp far in the future', async () => {
    const future = Math.floor(Date.now() / 1000) + 60 * 60;
    await expect(verifySvixSignature(BODY, headers({}, future), SECRET)).resolves.toBe(false);
  });

  it('rejects when a required header is missing', async () => {
    const h = headers();
    delete (h as Record<string, string>)['svix-signature'];
    await expect(verifySvixSignature(BODY, h, SECRET)).resolves.toBe(false);
  });

  it('rejects an unparseable timestamp rather than treating it as now', async () => {
    await expect(verifySvixSignature(BODY, headers({ 'svix-timestamp': 'soon' }), SECRET))
      .resolves.toBe(false);
  });

  it('rejects when no signing secret is configured, instead of trusting the caller', async () => {
    await expect(verifySvixSignature(BODY, headers(), '')).resolves.toBe(false);
  });

  it('ignores signature entries with an unknown version prefix', async () => {
    const h = headers();
    h['svix-signature'] = `v2,${sign(ID, h['svix-timestamp'], BODY)}`;
    await expect(verifySvixSignature(BODY, h, SECRET)).resolves.toBe(false);
  });
});
