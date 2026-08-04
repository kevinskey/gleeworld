// Shared row shape + card chrome for the Music Library Scores tab.
// Extracted verbatim from MusicLibraryPage.tsx so the page, cards, and
// dialogs agree on one definition.

// Card chrome for library surfaces — design-system tokens only
// (shadow-card → var(--shadow-card); corners are square system-wide).
export const SOFT_CARD = 'border-0 bg-card shadow-card';

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
  arranger: string | null;
  language: string | null;
  tags: string[] | null;
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

// At-a-glance sharing summary for librarian badges. Returns the compact
// badge label plus a full breakdown for the title/tooltip.
export function sharingSummary(row: ScoreRow): { shared: boolean; label: string; detail: string } {
  if (row.shared_with_members) {
    return { shared: true, label: 'Everyone', detail: 'Visible to every member of this workspace' };
  }
  const people = row.shared_with_users?.length ?? 0;
  const classes = row.shared_with_courses?.length ?? 0;
  const parts = row.shared_with_voice_parts?.length ?? 0;
  const segments: string[] = [];
  if (classes > 0) segments.push(`${classes} ${classes === 1 ? 'class' : 'classes'}`);
  if (people > 0) segments.push(`${people} ${people === 1 ? 'person' : 'people'}`);
  if (parts > 0) segments.push(`${parts} ${parts === 1 ? 'part' : 'parts'}`);
  if (segments.length === 0) {
    return { shared: false, label: 'Not shared', detail: 'Visible only to librarians and admins' };
  }
  const label = segments.join(' · ');
  return { shared: true, label, detail: `Shared with ${label}` };
}

export const isSharedAnyLane = (row: ScoreRow): boolean => sharingSummary(row).shared;

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
