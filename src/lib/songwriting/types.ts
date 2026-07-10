// Song types for the Songwriting add-on.
//
// Ported from the standalone app's client/src/lib/api.ts (lines 18-78),
// which defined these as REST client types for a legacy Express backend.
// Here they describe the shape of rows in the `gw_songs` Supabase table
// (see Task 1 migration) plus the jsonb columns it stores. `id`/`user_id`
// are UUID strings (not numeric ids), and `visibility` is a new RLS-facing
// column that didn't exist in the old single-tenant app.

export type Section = {
  id: string;
  type: 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'outro';
  label?: string;
  lines: string[];
  // Optional reference to one of the song's chord_charts. Multiple sections
  // can share the same chart_id; editing the chart updates every section
  // using it.
  chart_id?: string;
};

export type GraveyardEntry = {
  id: string;
  line: string;
  section_label?: string;
  cut_at: string; // ISO timestamp
};

export type TimeSignature = '4/4' | '3/4' | '6/8' | '2/4';

export type ChordBar = {
  id: string;
  // One or more chord symbols, played in order across the bar's beats.
  // Most bars will have a single chord; splits are handled by adding more.
  chords: string[];
};

export type ChordLoop = {
  // Both indexes are 0-based and inclusive.
  startBar: number;
  endBar: number;
  // Number of times the loop region plays. 0 = infinite (until Stop).
  count: number;
};

export type ChordChart = {
  // Stable identity so sections can reference the chart by chart_id.
  id: string;
  // Optional human label shown alongside the chart.
  name?: string;
  time_signature: TimeSignature;
  bars: ChordBar[];
  loop?: ChordLoop | null;
};

export type Song = {
  id: string;
  user_id: string;
  title: string;
  sections: Section[];
  notes: string;
  tempo_bpm: number | null;
  key_signature: string | null;
  graveyard?: GraveyardEntry[];
  chord_chart?: ChordChart;
  chord_charts?: ChordChart[];
  visibility: 'private' | 'tenant';
  created_at: string;
  updated_at: string;
};

export type SongSummary = Omit<Song, 'sections' | 'notes' | 'graveyard' | 'chord_chart' | 'chord_charts'> & {
  section_count: number;
};
