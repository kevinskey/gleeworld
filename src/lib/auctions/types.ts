// Row types for the Auctions module. Mirrors the schema in
// supabase/migrations/20260818120000_auctions_module.sql. The generated
// Database type is stale for recent tables, so these are hand-maintained
// (same convention as src/types/seatingCharts.ts).

// The modalities the tracker understands. Kept in sync with the CHECK
// constraint on ext_auction_lots.modality.
export const MODALITIES = [
  'mri',
  'ct',
  'c_arm',
  'ultrasound',
  'xray',
  'lab_analyzer',
  'other',
] as const;

export type Modality = (typeof MODALITIES)[number];

export const MODALITY_LABELS: Record<Modality, string> = {
  mri: 'MRI',
  ct: 'CT',
  c_arm: 'C-arm',
  ultrasound: 'Ultrasound',
  xray: 'X-ray',
  lab_analyzer: 'Lab analyzer',
  other: 'Other',
};

export type IngestMethod = 'manual' | 'email' | 'api' | 'feed';

export const INGEST_METHOD_LABELS: Record<IngestMethod, string> = {
  manual: 'Entered by hand',
  email: 'From auction emails',
  api: 'From the house API',
  feed: 'From a published feed',
};

export type AuctionStatus =
  | 'announced'
  | 'catalog_posted'
  | 'open'
  | 'closed'
  | 'cancelled';

// What a house's own terms allow. Only 'email_ok'/'api_ok' may leave the
// manual ingest tier — the database enforces that, it is not a convention.
export type TermsPosition = 'unreviewed' | 'manual_only' | 'email_ok' | 'api_ok' | 'prohibited';

export const TERMS_POSITION_LABELS: Record<TermsPosition, string> = {
  unreviewed: 'Terms not reviewed yet',
  manual_only: 'Manual entry only',
  email_ok: 'Email notifications allowed',
  api_ok: 'API access allowed',
  prohibited: 'Automated access prohibited',
};

export interface AuctionSource {
  id: string;
  name: string;
  slug: string;
  base_url: string | null;
  ingest_method: IngestMethod;
  buyer_premium_pct: number | null;
  // Provenance for the premium — it feeds the landed-cost maths, so a number
  // without a source URL is refused by a CHECK constraint.
  buyer_premium_note: string | null;
  buyer_premium_source_url: string | null;
  terms_url: string | null;
  terms_reviewed_at: string | null;
  terms_position: TermsPosition;
  calendar_url: string | null;
  email_alerts_url: string | null;
  notes: string | null;
  active: boolean;
  last_refreshed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Auction {
  id: string;
  source_id: string;
  external_id: string | null;
  title: string;
  location_city: string | null;
  location_state: string | null;
  opens_at: string | null;
  closes_at: string | null;
  catalog_url: string | null;
  catalog_released_at: string | null;
  status: AuctionStatus;
  modality_focus: Modality[];
  // True when the source published a date but no clock time, so opens_at /
  // closes_at carry a placeholder. The UI must then show the date alone.
  times_are_estimated: boolean;
  created_at: string;
  updated_at: string;
}

// An auction joined to the house that runs it, as the calendar renders it.
export interface AuctionWithSource extends Auction {
  source: Pick<AuctionSource, 'id' | 'name' | 'slug' | 'ingest_method' | 'last_refreshed_at'> | null;
  /** How many lots are visible to this viewer — RLS already hides the rest. */
  lot_count?: number;
}

// ── Phase 2 ───────────────────────────────────────────────────────────────

// 'pending' and 'rejected' lots are invisible to members by RLS; only 'auto'
// and 'approved' reach search results.
export type LotReviewStatus = 'pending' | 'auto' | 'needs_review' | 'approved' | 'rejected';

export interface AuctionLot {
  id: string;
  auction_id: string;
  lot_number: string | null;
  // Immutable source text, exactly as the house published it.
  raw_title: string;
  raw_text: string | null;
  // Derived by the normalizer; null means "not extracted", not "absent".
  modality: Modality | null;
  manufacturer: string | null;
  model: string | null;
  year_of_manufacture: number | null;
  serial: string | null;
  condition_notes: string | null;
  current_bid_cents: number | null;
  currency: string;
  closes_at: string | null;
  url: string | null;
  normalized_at: string | null;
  normalization_confidence: number | null;
  review_status: LotReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface LotWithAuction extends AuctionLot {
  auction: (Pick<Auction, 'id' | 'title' | 'location_city' | 'location_state' | 'closes_at'> & {
    source: Pick<AuctionSource, 'id' | 'name' | 'slug'> | null;
  }) | null;
}

// Mirrors the Criteria type in supabase/functions/_shared/auctionMatching.ts,
// which is the authority — the matcher runs there.
export interface SearchCriteria {
  modality?: Modality[];
  manufacturer?: string[];
  model_contains?: string;
  year_min?: number;
  max_hammer_cents?: number;
  states?: string[];
  radius_miles?: number;
  origin_zip?: string;
  condition?: string[];
}

export type NotifyChannel = 'none' | 'in_app' | 'email' | 'both';
export type NotifyFrequency = 'instant' | 'daily' | 'weekly';

export const NOTIFY_CHANNEL_LABELS: Record<NotifyChannel, string> = {
  none: 'Do not alert me',
  in_app: 'In the app',
  email: 'By email',
  both: 'In the app and by email',
};

export const NOTIFY_FREQUENCY_LABELS: Record<NotifyFrequency, string> = {
  instant: 'As soon as they appear',
  daily: 'Once a day',
  weekly: 'Once a week',
};

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  criteria: SearchCriteria;
  notify_channel: NotifyChannel;
  notify_frequency: NotifyFrequency;
  notify_whatsapp: boolean;
  active: boolean;
  last_run_at: string | null;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionMatch {
  id: string;
  saved_search_id: string;
  lot_id: string;
  score: number;
  notified_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export interface MatchWithLot extends AuctionMatch {
  lot: LotWithAuction | null;
  saved_search: Pick<SavedSearch, 'id' | 'name'> | null;
}

export interface WatchlistEntry {
  id: string;
  lot_id: string;
  notify_minutes_before: number[];
  created_at: string;
}
