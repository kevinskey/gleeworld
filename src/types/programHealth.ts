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
