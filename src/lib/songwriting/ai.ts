import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';

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
  if (error) {
    let message = error.message ?? 'AI request failed';
    let status: number | undefined;
    if (error instanceof FunctionsHttpError && error.context) {
      status = error.context.status;
      try {
        const body = await error.context.json();
        if (body?.error) message = body.error;
      } catch { /* body not JSON — keep the generic message */ }
    }
    throw new AiError(message, status);
  }
  if (data?.error) throw new AiError(data.error);
  return data;
}
