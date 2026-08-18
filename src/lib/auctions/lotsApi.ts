// Data access for lots. RLS already hides lots that have not cleared review,
// so nothing here filters on review_status — a member simply cannot see them.
import { supabase } from '@/integrations/supabase/client';
import type { LotWithAuction, Modality, WatchlistEntry } from './types';

const LOT_COLUMNS =
  'id, auction_id, lot_number, raw_title, raw_text, modality, manufacturer, model, ' +
  'year_of_manufacture, serial, condition_notes, current_bid_cents, currency, closes_at, url, ' +
  'normalized_at, normalization_confidence, review_status, created_at, updated_at';

const LOT_WITH_AUCTION =
  `${LOT_COLUMNS}, auction:ext_auctions(id, title, location_city, location_state, closes_at, ` +
  'source:ext_auction_sources(id, name, slug))';

export interface ListLotsOptions {
  modality?: Modality;
  auctionId?: string;
  search?: string;
  // Hide lots whose sale has already closed.
  openOnly?: boolean;
  limit?: number;
}

export async function listLots(opts: ListLotsOptions = {}): Promise<LotWithAuction[]> {
  let query = supabase
    .from('ext_auction_lots')
    .select(LOT_WITH_AUCTION)
    .order('closes_at', { ascending: true, nullsFirst: false })
    .limit(opts.limit ?? 200);

  if (opts.modality) query = query.eq('modality', opts.modality);
  if (opts.auctionId) query = query.eq('auction_id', opts.auctionId);
  if (opts.openOnly) {
    query = query.or(`closes_at.is.null,closes_at.gte.${new Date().toISOString()}`);
  }
  if (opts.search?.trim()) {
    // Search the house's own wording — the normalizer may not have split out
    // whatever the person typed.
    query = query.ilike('raw_title', `%${opts.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LotWithAuction[];
}

export async function getLot(id: string): Promise<LotWithAuction | null> {
  const { data, error } = await supabase
    .from('ext_auction_lots')
    .select(LOT_WITH_AUCTION)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as LotWithAuction) ?? null;
}

// ── Watchlist ─────────────────────────────────────────────────────────────
// Owner-private by RLS; user_id defaults to auth.uid() in the database.

export async function listWatchlist(): Promise<WatchlistEntry[]> {
  const { data, error } = await supabase
    .from('gw_auction_watchlist')
    .select('id, lot_id, notify_minutes_before, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WatchlistEntry[];
}

export async function addToWatchlist(lotId: string): Promise<void> {
  const { error } = await supabase.from('gw_auction_watchlist').insert({ lot_id: lotId });
  if (error) throw error;
}

export async function removeFromWatchlist(lotId: string): Promise<void> {
  const { error } = await supabase.from('gw_auction_watchlist').delete().eq('lot_id', lotId);
  if (error) throw error;
}
