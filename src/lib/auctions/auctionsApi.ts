// Data access for individual auctions (sales). Same posture as sourcesApi:
// reads for every signed-in user, writes gated by RLS to platform staff.
import { supabase } from '@/integrations/supabase/client';
import type { Auction, AuctionStatus, AuctionWithSource, Modality } from './types';

const COLUMNS =
  'id, source_id, external_id, title, location_city, location_state, opens_at, closes_at, ' +
  'catalog_url, catalog_released_at, status, modality_focus, times_are_estimated, created_at, updated_at';

// The lot count comes back as an aggregate; PostgREST returns it as an array
// of one object, which listAuctions flattens to a plain number.
const COLUMNS_WITH_SOURCE =
  `${COLUMNS}, source:ext_auction_sources(id, name, slug, ingest_method, last_refreshed_at), ` +
  'lots:ext_auction_lots(count)';

export interface ListAuctionsOptions {
  // Hide sales that closed more than this many days ago. The calendar is a
  // forward-looking surface; history belongs to comps in Phase 4.
  lookbackDays?: number;
  sourceId?: string;
}

export async function listAuctions(opts: ListAuctionsOptions = {}): Promise<AuctionWithSource[]> {
  const lookbackDays = opts.lookbackDays ?? 60;
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('ext_auctions')
    .select(COLUMNS_WITH_SOURCE)
    // Undated sales (opens_at IS NULL) are kept deliberately: a house often
    // announces a sale before it sets a date, and those are worth showing.
    .or(
      `opens_at.gte.${since},closes_at.gte.${since},catalog_released_at.gte.${since},opens_at.is.null`,
    )
    .order('opens_at', { ascending: true, nullsFirst: false })
    .limit(500);

  if (opts.sourceId) query = query.eq('source_id', opts.sourceId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(flattenLotCount) as unknown as AuctionWithSource[];
}

// PostgREST returns an embedded aggregate as `lots: [{ count: n }]`.
function flattenLotCount(row: Record<string, unknown>): Record<string, unknown> {
  const lots = row.lots as Array<{ count?: number }> | undefined;
  const { lots: _drop, ...rest } = row;
  return { ...rest, lot_count: lots?.[0]?.count ?? 0 };
}

export async function getAuction(id: string): Promise<AuctionWithSource | null> {
  const { data, error } = await supabase
    .from('ext_auctions')
    .select(COLUMNS_WITH_SOURCE)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data
    ? (flattenLotCount(data as Record<string, unknown>) as unknown as AuctionWithSource)
    : null;
}

export interface AuctionInput {
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
}

export async function createAuction(input: AuctionInput): Promise<Auction> {
  const { data, error } = await supabase
    .from('ext_auctions')
    .insert(input)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as Auction;
}

export async function updateAuction(id: string, patch: Partial<AuctionInput>): Promise<Auction> {
  const { data, error } = await supabase
    .from('ext_auctions')
    .update(patch)
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as Auction;
}

export async function deleteAuction(id: string): Promise<void> {
  const { error } = await supabase.from('ext_auctions').delete().eq('id', id);
  if (error) throw error;
}
