import { supabase } from '@/integrations/supabase/client';
import type { PlacementResult } from './placement';

export async function explainMistake(args: {
  prompt: string;
  choices?: string[];
  correct: string;
  chosen: string;
  level?: number;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke('theory-ai', {
    body: { action: 'explain', ...args },
  });
  if (error) throw error;
  if (!data?.text) throw new Error(data?.error ?? 'No explanation returned');
  return data.text as string;
}

export async function placementSummary(result: PlacementResult): Promise<string> {
  const { data, error } = await supabase.functions.invoke('theory-ai', {
    body: { action: 'placement-summary', perLevel: result.perLevel, placedLevel: result.placedLevel },
  });
  if (error) throw error;
  if (!data?.text) throw new Error(data?.error ?? 'No summary returned');
  return data.text as string;
}
