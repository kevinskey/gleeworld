// Canonical types for the Concert Planner card builder.
//
// Source-of-truth shapes that the DB rows get mapped into. The
// transform + validate libraries operate on these; the UI does too.

export type RightsStatus = 'public_domain' | 'licensed' | 'unknown';

// 8 hand-curated themes — each a typography + palette + hero backdrop
// bundle. Look + feel defined in themeClasses() in the editor + public
// renderer.
export type VisualTheme =
  | 'classic-concert'
  | 'modern-show'
  | 'chamber-minimalist'
  | 'cathedral'
  | 'sunset-recital'
  | 'jazz-club'
  | 'spring-pastoral'
  | 'black-tie';

export type PrintFormat = 'letter-portrait' | 'half-fold' | 'trifold' | 'qr-lobby';

export interface ConcertProgram {
  id: string;
  tenant_id: string;
  title: string;
  subtitle: string | null;
  event_date: string | null;     // ISO date
  call_time: string | null;      // HH:MM (no seconds)
  venue: string | null;
  conductor: string | null;
  accompanist: string | null;
  performer_group: string | null;
  cover_image_url: string | null;
  notes: string | null;
  target_length_minutes: number | null;
  theme: VisualTheme;
  print_format: PrintFormat;
  card_layout: ProgramCardLayout;
  published_at: string | null;
  published_by: string | null;
  published_slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConcertPiece {
  id: string;
  program_id: string;
  sort_order: number;
  section_heading: string | null;
  title: string;
  composer: string | null;
  arranger: string | null;
  voicing: string | null;
  soloists: string | null;
  duration_seconds: number | null;
  program_notes: string | null;
  rights_status: RightsStatus | null;
  copyright_info: string | null;
}

export interface RosterSection {
  id: string;
  program_id: string;
  section_name: string;
  sort_order: number;
  members: RosterMember[];
}

export interface RosterMember {
  id: string;
  section_id: string;
  member_name: string;
  sort_order: number;
}

// Per-program persisted layout overrides — what the admin re-ordered or
// hid in the editor. Kept simple (string lists keyed off card id) so it
// survives schema additions without a migration.
export interface ProgramCardLayout {
  hidden?: string[];      // card ids that are hidden in audience view
  order?: string[];       // explicit order of card ids; missing ids fall back to default
}

// One card in the stack. The transform layer derives these from the
// program + pieces + roster; the editor renders them in order.
export type CardKind =
  | 'hero-cover'
  | 'timeline-program'
  | 'piece-detail'   // formerly "split-media" in the prototype
  | 'grid-roster'
  | 'rights-footer'
  | 'qr-access';

export interface ProgramCard {
  id: string;                  // deterministic so layout overrides survive reorders of pieces
  kind: CardKind;
  title: string;
  visible: boolean;            // derived from default + card_layout.hidden
  /** When the card is bound to a specific piece (kind = 'piece-detail') */
  pieceId?: string;
}

export type ValidationLevel = 'ready' | 'warning' | 'required';

export type ValidationCategory =
  | 'metadata'
  | 'repertoire'
  | 'roster'
  | 'rights'
  | 'timing';

export interface ValidationItem {
  id: string;
  category: ValidationCategory;
  level: ValidationLevel;
  message: string;
}
