// GleeWorld Planner — shared types. Rows mirror the gw_planner_* tables
// (see supabase/migrations/20260711120000_planner_module.sql); the doc
// types are a minimal structural view of a TipTap document so the pure
// libs (markdown, taskSync, templates) stay editor-agnostic.

export type NoteType = 'note' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type TaskStatus = 'open' | 'done' | 'cancelled';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export type PlannerEntityType =
  | 'event'
  | 'concert_program'
  | 'sheet_music'
  | 'course'
  | 'ensemble'
  | 'member';

/** Minimal structural TipTap node (compatible with JSONContent). */
export interface DocNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

export interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** every N freq units; default 1 */
  interval?: number;
  /** 0=Sunday … 6=Saturday (date-fns getDay convention) */
  byweekday?: number[];
  /** ISO date string; no occurrences after this */
  until?: string;
  /** max total occurrences in the series */
  count?: number;
}

export interface PlannerNote {
  id: string;
  user_id: string;
  folder_id: string | null;
  note_type: NoteType;
  date_key: string | null;
  title: string;
  content: DocNode;
  content_text: string;
  content_md: string;
  tags: string[];
  properties: Record<string, unknown>;
  is_favorite: boolean;
  entity_type: PlannerEntityType | null;
  entity_id: string | null;
  deleted_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export type PlannerNoteSummary = Pick<
  PlannerNote,
  | 'id' | 'folder_id' | 'note_type' | 'date_key' | 'title' | 'tags'
  | 'is_favorite' | 'deleted_at' | 'updated_at' | 'created_at'
>;

export interface PlannerTask {
  id: string;
  user_id: string;
  note_id: string | null;
  block_id: string | null;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  scheduled_date: string | null; // YYYY-MM-DD
  due_at: string | null;
  completed_at: string | null;
  recurrence: Recurrence | null;
  recurrence_parent_id: string | null;
  tags: string[];
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlannerFolder {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PlannerTemplate {
  id: string;
  user_id: string | null;
  is_system: boolean;
  name: string;
  description: string;
  note_type: NoteType;
  content: DocNode;
  content_md: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  query: SavedFilterQuery;
  position: number;
}

export interface SavedFilterQuery {
  text?: string;
  tags?: string[];
  status?: TaskStatus;
  noteType?: NoteType;
  favorite?: boolean;
}

export interface NoteLink {
  id: string;
  note_id: string;
  target_note_id: string | null;
  target_entity_type: string | null;
  target_entity_id: string | null;
  link_text: string;
}
