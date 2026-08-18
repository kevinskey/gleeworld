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

export interface AuctionSource {
  id: string;
  name: string;
  slug: string;
  base_url: string | null;
  ingest_method: IngestMethod;
  buyer_premium_pct: number | null;
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
  created_at: string;
  updated_at: string;
}

// An auction joined to the house that runs it, as the calendar renders it.
export interface AuctionWithSource extends Auction {
  source: Pick<AuctionSource, 'id' | 'name' | 'slug' | 'ingest_method' | 'last_refreshed_at'> | null;
}
