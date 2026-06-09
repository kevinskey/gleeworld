// Codes must match the live gw_profiles.voice_part CHECK constraint:
// S1, S2, A1, A2, T1, T2, B1, B2 (or NULL). The labels are display-only.
export const VOICE_PARTS = ['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'] as const;

export type VoicePart = (typeof VOICE_PARTS)[number];

export const VOICE_PART_LABEL: Record<VoicePart, string> = {
  S1: 'Soprano 1',
  S2: 'Soprano 2',
  A1: 'Alto 1',
  A2: 'Alto 2',
  T1: 'Tenor 1',
  T2: 'Tenor 2',
  B1: 'Bass 1',
  B2: 'Bass 2',
};

export type EnsembleMemberStatus = 'active' | 'prospect' | 'inactive' | 'dropped';

export interface Ensemble {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  course_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnsembleDirector {
  id: string;
  ensemble_id: string;
  profile_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface EnsembleMember {
  id: string;
  ensemble_id: string;
  profile_id: string;
  status: EnsembleMemberStatus;
  joined_on: string;
  left_on: string | null;
  created_at: string;
}

export interface SectionTarget {
  id: string;
  ensemble_id: string;
  voice_part: string;
  target_count: number;
  created_at: string;
  updated_at: string;
}

export const CONTACT_CHANNELS = ['email', 'call', 'text', 'in_person', 'other'] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const CONTACT_CHANNEL_LABEL: Record<ContactChannel, string> = {
  email: 'Email',
  call: 'Call',
  text: 'Text',
  in_person: 'In person',
  other: 'Other',
};

export interface ContactLogEntry {
  id: string;
  profile_id: string;
  ensemble_id: string | null;
  recorded_by: string | null;
  channel: ContactChannel;
  note: string | null;
  contacted_at: string;
  created_at: string;
}

export type HealthFlagSeverity = 'high' | 'medium' | 'low';
export type HealthFlagKey =
  | 'readiness_gap'
  | 'low_attendance'
  | 'attendance_falling'
  | 'retention_loss'
  | 'thin_section';

export interface HealthFlag {
  key: HealthFlagKey | string;
  severity: HealthFlagSeverity;
  title: string;
  detail: string;
  metric_value?: number;
  voice_part?: string;
}

export interface ThinSection {
  voice_part: string;
  current: number;
  target: number;
  severity: number;
}

export interface HealthSnapshot {
  id: string;
  ensemble_id: string;
  computed_at: string;
  attendance_rate_30d: number | null;
  attendance_delta: number | null;
  retention_rate: number | null;
  thin_sections: ThinSection[] | null;
  readiness_gap_days: number | null;
  stability_score: number | null;
  flags: HealthFlag[] | null;
  weights_version: string | null;
}

export type ActionPlanStatus = 'active' | 'archived';

// One ranked recommendation, locked to a single flag from the snapshot.
export interface ActionPlanRecommendation {
  rank: number;
  flag_key: HealthFlagKey | string;
  title: string;
  rationale: string;
  steps: string[];
  owner_hint?: string;
}

export interface ActionPlanPayload {
  recommendations: ActionPlanRecommendation[];
  snapshot_id: string;
}

export interface ActionPlan {
  id: string;
  ensemble_id: string;
  generated_at: string;
  model: string | null;
  input_context: string | null;
  plan: ActionPlanPayload;
  status: ActionPlanStatus;
}
