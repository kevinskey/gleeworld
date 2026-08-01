// Mirrors supabase/migrations/20260801090000_parttrack_pipeline.sql exactly.

export type PartTrackSourceType = 'musicxml' | 'mxl' | 'midi';

export type PartTrackStatus =
  | 'queued'
  | 'analyzing'
  | 'awaiting_confirmation'
  | 'rendering'
  | 'ready'
  | 'failed';

export type PartTrackTimbre = 'piano' | 'oboe' | 'choir';

export type PartTrackRightsBasis =
  | 'own_work'
  | 'public_domain'
  | 'ccli'
  | 'onelicense'
  | 'publisher_permission'
  | 'publisher_cleared';

export type PartTrackMixPreset = 'strong' | 'plus_piano' | 'alone' | 'full' | 'piano_only';

export interface ValidationWarning {
  code: string;
  severity: 'warning';
  message: string;
}

export interface ManifestMeasure {
  number: number;
  seconds: number;
}

export interface PartTrackManifest {
  duration_ms: number;
  tempo_map: Array<{ measure: number; bpm: number }>;
  measures: ManifestMeasure[];
  rehearsal_marks: Array<{ measure: number; label: string }>;
  beats: Array<{ measure: number; count: number }>;
}

export interface PartTrackScore {
  id: string;
  tenant_id: string;
  sheet_music_id: string;
  source_type: PartTrackSourceType;
  source_path: string;
  normalized_mxl_path: string | null;
  status: PartTrackStatus;
  validation_report: ValidationWarning[];
  manifest: PartTrackManifest | null;
  timbre: PartTrackTimbre;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartTrackPart {
  id: string;
  tenant_id: string;
  score_id: string;
  source_part_index: number;
  source_staff: number | null;
  source_voice: number | null;
  role: string;
  label: string;
  confidence: number;
  confirmed: boolean;
  include: boolean;
  created_at: string;
}

export interface PartTrackRights {
  id: string;
  tenant_id: string;
  score_id: string;
  basis: PartTrackRightsBasis;
  license_number: string | null;
  attested_by: string | null;
  attested_at: string;
}

export interface PartTrackRender {
  id: string;
  tenant_id: string;
  score_id: string;
  kind: 'stem' | 'mix';
  part_role: string | null;
  mix_preset: PartTrackMixPreset | null;
  audio_path: string;
  duration_ms: number | null;
  created_at: string;
}

export const PART_ROLES = [
  'soprano', 'soprano_1', 'soprano_2',
  'alto', 'alto_1', 'alto_2',
  'tenor', 'tenor_1', 'tenor_2',
  'bass', 'bass_1', 'bass_2',
  'piano', 'other',
] as const;
