import { supabase } from '@/integrations/supabase/client';

export type AiFeature = 'rhymes' | 'next_line' | 'synonyms' | 'sensory' | 'related' | 'rewrite';

export class AiError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

export async function askSongwritingAI(
  feature: AiFeature,
  payload: Record<string, unknown>,
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('songwriting-ai', {
    body: { feature, payload },
  });
  if (error) throw new AiError(error.message ?? 'AI request failed');
  if (data?.error) throw new AiError(data.error);
  return data;
}
