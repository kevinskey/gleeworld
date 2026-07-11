// Templates: system rows (seeded by migration, read-only) + the user's
// own. Applying a template substitutes allowlisted {{placeholders}}
// client-side (templates.ts) — never code execution.
import { supabase } from '@/integrations/supabase/client';
import { docToMarkdown } from './markdown';
import type { DocNode, NoteType, PlannerTemplate } from './types';

export async function listTemplates(): Promise<PlannerTemplate[]> {
  const { data, error } = await supabase
    .from('gw_planner_templates')
    .select('*')
    .eq('is_active', true)
    .order('is_system', { ascending: false })
    .order('name');
  if (error) throw error;
  return (data ?? []) as PlannerTemplate[];
}

export async function createTemplate(input: {
  name: string;
  description?: string;
  note_type?: NoteType;
  content: DocNode;
}): Promise<PlannerTemplate> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('gw_planner_templates')
    .insert({
      user_id: auth?.user?.id,
      name: input.name,
      description: input.description ?? '',
      note_type: input.note_type ?? 'note',
      content: input.content,
      content_md: docToMarkdown(input.content),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PlannerTemplate;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('gw_planner_templates').delete().eq('id', id);
  if (error) throw error;
}
