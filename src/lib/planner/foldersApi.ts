// Folder CRUD. Nesting is parent_id-based; deletion cascades to child
// folders (DB) while notes in deleted folders survive with
// folder_id = NULL (FK SET NULL).
import { supabase } from '@/integrations/supabase/client';
import type { PlannerFolder } from './types';

export async function listFolders(): Promise<PlannerFolder[]> {
  const { data, error } = await supabase
    .from('gw_planner_folders')
    .select('*')
    .order('position')
    .order('name');
  if (error) throw error;
  return (data ?? []) as PlannerFolder[];
}

export async function createFolder(name: string, parentId: string | null = null): Promise<PlannerFolder> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('gw_planner_folders')
    .insert({ user_id: auth?.user?.id, name, parent_id: parentId })
    .select('*')
    .single();
  if (error) throw error;
  return data as PlannerFolder;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('gw_planner_folders').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function moveFolder(id: string, parentId: string | null, position: number): Promise<void> {
  const { error } = await supabase
    .from('gw_planner_folders')
    .update({ parent_id: parentId, position })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from('gw_planner_folders').delete().eq('id', id);
  if (error) throw error;
}

/** parent_id → children, for tree rendering. */
export function folderTree(folders: PlannerFolder[]): Map<string | null, PlannerFolder[]> {
  const byParent = new Map<string | null, PlannerFolder[]>();
  for (const f of folders) {
    const key = f.parent_id ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(f);
  }
  return byParent;
}
