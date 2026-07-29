// Shared types for the standalone Seating Charts feature.
// Mirrors the schema in supabase/migrations/20260729210000_seating_charts.sql.

export type SeatingChartMode = 'seating' | 'stage_plot' | 'classroom';
export type SeatingChartStatus = 'active' | 'archived';
export type SeatingChartOrientation = 'landscape' | 'portrait';

export type SeatingObjectType =
  | 'seat'
  | 'chair'
  | 'riser_slot'
  | 'table'
  | 'desk'
  | 'music_stand'
  | 'instrument'
  | 'microphone'
  | 'monitor'
  | 'stage_boundary'
  | 'label'
  | 'shape';

export type SeatingAssignmentStatus = 'assigned' | 'absent' | 'substitute' | 'guest';

export type SeatingAssociationType =
  | 'ensemble'
  | 'course'
  | 'event'
  | 'tour'
  | 'tour_event'
  | 'venue'
  | 'production';

export type SeatingShareRole =
  | 'owner'
  | 'editor'
  | 'viewer'
  | 'performer'
  | 'section_leader'
  | 'stage_crew'
  | 'substitute';

export interface SeatingChart {
  id: string;
  tenant_id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  chart_mode: SeatingChartMode;
  template_key: string | null;
  status: SeatingChartStatus;
  canvas_width: number;
  canvas_height: number;
  orientation: SeatingChartOrientation;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface SeatingArrangement {
  id: string;
  tenant_id: string;
  chart_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  sort_order: number;
  layout_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SeatingObjectStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
}

export interface SeatingObject {
  id: string;
  tenant_id: string;
  arrangement_id: string;
  object_type: SeatingObjectType;
  subtype: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  label: string | null;
  style: SeatingObjectStyle;
  properties: Record<string, unknown>;
  locked: boolean;
  group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeatingAssignment {
  id: string;
  tenant_id: string;
  arrangement_id: string;
  chart_object_id: string;
  profile_id: string | null;
  external_person_id: string | null;
  display_name: string | null;
  section: string | null;
  voice_part: string | null;
  instrument: string | null;
  chair_number: number | null;
  assignment_status: SeatingAssignmentStatus;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SeatingAssociation {
  id: string;
  tenant_id: string;
  chart_id: string;
  association_type: SeatingAssociationType;
  association_id: string;
  arrangement_id: string | null;
  created_at: string;
}

export interface SeatingShare {
  id: string;
  tenant_id: string;
  chart_id: string;
  user_id: string;
  role: SeatingShareRole;
  permissions: Record<string, unknown>;
  created_at: string;
}

// Person shape hydrated from gw_profiles_directory into assignments for
// display in the editor palette.
export interface SeatingPerson {
  user_id: string;
  full_name: string | null;
  voice_part: string | null;
  avatar_url: string | null;
}

// Payload the template generators return before insert.
export interface TemplateSpec {
  chart_mode: SeatingChartMode;
  canvas_width: number;
  canvas_height: number;
  orientation: SeatingChartOrientation;
  objects: Array<Omit<
    SeatingObject,
    'id' | 'tenant_id' | 'arrangement_id' | 'created_at' | 'updated_at'
  >>;
  settings?: Record<string, unknown>;
}

export type TemplateCategory =
  | 'choir'
  | 'band'
  | 'orchestra'
  | 'other_music'
  | 'classroom'
  | 'stage_plot'
  | 'custom';

export interface TemplateEntry {
  key: string;
  name: string;
  category: TemplateCategory;
  description: string;
  generate: (config?: Record<string, unknown>) => TemplateSpec;
}
