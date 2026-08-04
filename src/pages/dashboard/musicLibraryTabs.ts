// Music Library top-tab order. The GW Sheet Music Store sits immediately
// before Public Domain by design — buying scores is a library activity.
// Spec: docs/superpowers/specs/2026-07-31-gw-sheet-music-store-design.md
export type MusicLibraryTabKey = 'scores' | 'my-music' | 'setlists' | 'store' | 'public-domain';

export const MUSIC_LIBRARY_TABS: Array<{ key: MusicLibraryTabKey; label: string }> = [
  { key: 'scores',        label: 'Scores' },
  { key: 'my-music',      label: 'My Music' },
  { key: 'setlists',      label: 'Setlists' },
  { key: 'store',         label: 'GW Sheet Music Store' },
  { key: 'public-domain', label: 'Public Domain' },
];
