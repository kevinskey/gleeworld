import { describe, it, expect } from 'vitest';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { edgeFunctionErrorMessage } from '../edgeFunctionError';

describe('edgeFunctionErrorMessage', () => {
  it('surfaces the {error} body from a non-2xx FunctionsHttpError instead of the generic message', async () => {
    const response = new Response(JSON.stringify({ error: 'email mismatch' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
    const error = new FunctionsHttpError(response);

    expect(await edgeFunctionErrorMessage(error, null)).toBe('email mismatch');
  });

  it('falls back to error.message when the response body is not JSON', async () => {
    const response = new Response('<html>bad gateway</html>', { status: 502 });
    const error = new FunctionsHttpError(response);

    expect(await edgeFunctionErrorMessage(error, null)).toBe(error.message);
  });

  it('surfaces data.error from a 2xx-with-error body when there is no thrown error', async () => {
    expect(await edgeFunctionErrorMessage(null, { error: 'token required' })).toBe('token required');
  });

  it('returns null when the call succeeded', async () => {
    expect(await edgeFunctionErrorMessage(null, { partner_id: 'abc' })).toBeNull();
  });
});
