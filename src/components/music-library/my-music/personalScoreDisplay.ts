import type { PersonalScore } from '@/hooks/usePersonalScores';

export const SOURCE_LABEL: Record<PersonalScore['source'], string> = {
  upload: 'Upload',
  cpdl: 'CPDL',
  purchase: 'GW Sheet Music Store',
  imslp: 'IMSLP',
  external: 'External',
};

// Rows saved from Repertoire (IMSLP / external sites) carry no PDF of their
// own — they open at the source site instead of the in-app viewer.
export const isExternalOnly = (s: PersonalScore) => !s.storage_path && !!s.external_url;
