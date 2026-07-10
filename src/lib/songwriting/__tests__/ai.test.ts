import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { supabase } from '@/integrations/supabase/client';
import { askSongwritingAI, AiError } from '../ai';

describe('askSongwritingAI', () => {
  it('returns parsed data on success', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: { perfect: ['moon'] }, error: null });
    await expect(askSongwritingAI('rhymes', { word: 'June' })).resolves.toEqual({ perfect: ['moon'] });
  });
  it('throws AiError on function error', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(askSongwritingAI('rhymes', { word: 'x' })).rejects.toBeInstanceOf(AiError);
  });
  it('throws AiError on embedded error payload (429 etc.)', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: { error: 'Too many AI requests. Try again in a few minutes.' }, error: null });
    await expect(askSongwritingAI('rhymes', { word: 'x' })).rejects.toThrow(/Too many/);
  });
});
