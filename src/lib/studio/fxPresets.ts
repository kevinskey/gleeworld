// Studio FX presets — save / list / delete a track's FX chain as a named,
// tenant-scoped preset (gw_studio_fx_presets). Applying a preset is a plain
// session edit on the caller's side (set track.fx = preset.effects), so no
// engine call lives here.

import { supabase } from '@/integrations/supabase/client';
import type { FxNode } from './session';

export interface FxPreset {
  id: string;
  name: string;
  effects: FxNode[];
  created_at: string;
}

export async function listFxPresets(): Promise<FxPreset[]> {
  const { data, error } = await supabase
    .from('gw_studio_fx_presets')
    .select('id,name,effects,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FxPreset[];
}

/** Save an FX chain under a name. tenant_id + owner_user_id default from the
 *  JWT (current_tenant_id() / auth.uid()) server-side. Returns the new id. */
export async function saveFxPreset(name: string, effects: FxNode[]): Promise<string> {
  const { data, error } = await supabase
    .from('gw_studio_fx_presets')
    .insert({ name: name.trim(), effects } as never)
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function deleteFxPreset(id: string): Promise<void> {
  const { error } = await supabase.from('gw_studio_fx_presets').delete().eq('id', id);
  if (error) throw error;
}
