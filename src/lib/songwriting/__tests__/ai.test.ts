import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { askSongwritingAI, AiError } from '../ai';

describe('askSongwritingAI', () => {
  it('returns parsed data on success', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: { perfect: ['moon'] }, error: null });
    await expect(askSongwritingAI('rhymes', { word: 'June' })).resolves.toEqual({ perfect: ['moon'] });
  });

  it('recovers the rate-limit message and status from a 429 FunctionsHttpError body', async () => {
    const response = new Response(
      JSON.stringify({ error: 'Too many AI requests. Try again in a few minutes.' }),
      { status: 429 },
    );
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(response),
    });
    let caught: unknown;
    try {
      await askSongwritingAI('rhymes', { word: 'x' });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AiError);
    expect((caught as AiError).message).toBe('Too many AI requests. Try again in a few minutes.');
    expect((caught as AiError).status).toBe(429);
  });

  it('recovers the not-enabled message and status from a 403 FunctionsHttpError body', async () => {
    const response = new Response(
      JSON.stringify({ error: 'songwriting_not_enabled' }),
      { status: 403 },
    );
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(response),
    });
    let caught: unknown;
    try {
      await askSongwritingAI('rhymes', { word: 'x' });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AiError);
    expect((caught as AiError).message).toBe('songwriting_not_enabled');
    expect((caught as AiError).status).toBe(403);
  });

  it('falls back to the generic message for a non-HTTP error', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: { message: 'fetch failed' },
    });
    let caught: unknown;
    try {
      await askSongwritingAI('rhymes', { word: 'x' });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AiError);
    expect((caught as AiError).message).toBe('fetch failed');
    expect((caught as AiError).status).toBeUndefined();
  });
});
