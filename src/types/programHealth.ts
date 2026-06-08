export const VOICE_PARTS = [
  'soprano_1',
  'soprano_2',
  'alto_1',
  'alto_2',
  'tenor_1',
  'tenor_2',
  'bass_1',
  'bass_2',
] as const;

export type VoicePart = (typeof VOICE_PARTS)[number];

export const VOICE_PART_LABEL: Record<VoicePart, string> = {
  soprano_1: 'Soprano 1',
  soprano_2: 'Soprano 2',
  alto_1: 'Alto 1',
  alto_2: 'Alto 2',
  tenor_1: 'Tenor 1',
  tenor_2: 'Tenor 2',
  bass_1: 'Bass 1',
  bass_2: 'Bass 2',
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
