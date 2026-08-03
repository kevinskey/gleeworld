// Shared row shape + card chrome for the Music Library Scores tab.
// Extracted verbatim from MusicLibraryPage.tsx so the page, cards, and
// dialogs agree on one definition.

import type { CSSProperties } from 'react';

export const SOFT_CARD = 'border-0 rounded-2xl bg-card';
export const SOFT_CARD_STYLE: CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export interface ScoreRow {
  id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  difficulty_level: string | null;
  pdf_url: string | null;
  storage_path: string | null;
  storage_bucket: string | null;
  audio_url: string | null;
  audio_title: string | null;
  physical_copies_count: number | null;
  physical_location: string | null;
  course_id: string | null;
  created_at: string | null;
  // Rights model (added via migration 20260622040000_sheet_music_rights.sql).
  // unknown = legacy row that still needs to be tagged by the librarian.
  rights_status: 'public_domain' | 'licensed' | 'all_rights_reserved' | 'unknown' | null;
  license_seat_count: number | null;
  license_expires_at: string | null;
  copyright_holder: string | null;
  // Sharing lanes (20260725010000_sheet_music_share_targets.sql). Listing is
  // server-enforced by the gw_sheet_music_browse view
  // (20260803140000_sheet_music_browse_view.sql); open-by-id on the base
  // table intentionally stays open for deep links and setlists.
  shared_with_members: boolean | null;
  shared_with_users: string[] | null;
  shared_with_courses: string[] | null;
  shared_with_voice_parts: string[] | null;
}

// Fixed section list — mirrors the CHECK constraint on
// gw_profiles.voice_part (20250713160258). Keep in sync with the DB.
export const VOICE_PARTS: Array<{ value: string; label: string }> = [
  { value: 'soprano_1', label: 'Soprano 1' },
  { value: 'soprano_2', label: 'Soprano 2' },
  { value: 'alto_1', label: 'Alto 1' },
  { value: 'alto_2', label: 'Alto 2' },
  { value: 'tenor_1', label: 'Tenor 1' },
  { value: 'tenor_2', label: 'Tenor 2' },
  { value: 'bass_1', label: 'Bass 1' },
  { value: 'bass_2', label: 'Bass 2' },
];
