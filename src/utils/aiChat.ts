import { supabase } from "@/integrations/supabase/client";

export async function callAI(prompt: string) {
  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { prompt }
    });

    if (error) {
      throw new Error(error.message || 'Failed to call AI function');
    }

    return data;
  } catch (error) {
    console.error('Error calling AI:', error);
    throw error;
  }
}