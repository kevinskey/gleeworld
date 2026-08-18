// Data access for auction houses. Reads are open to any signed-in user;
// writes are refused by RLS for anyone who is not platform staff, so the UI
// hides the admin surface rather than relying on the error.
import { supabase } from '@/integrations/supabase/client';
import type { AuctionSource, IngestMethod } from './types';

const COLUMNS =
  'id, name, slug, base_url, ingest_method, buyer_premium_pct, notes, active, last_refreshed_at, created_at, updated_at';

export async function listSources(includeInactive = false): Promise<AuctionSource[]> {
  let query = supabase.from('ext_auction_sources').select(COLUMNS).order('name');
  if (!includeInactive) query = query.eq('active', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AuctionSource[];
}

export interface SourceInput {
  name: string;
  slug: string;
  base_url: string | null;
  ingest_method: IngestMethod;
  buyer_premium_pct: number | null;
  notes: string | null;
  active: boolean;
}

export async function createSource(input: SourceInput): Promise<AuctionSource> {
  const { data, error } = await supabase
    .from('ext_auction_sources')
    .insert(input)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as AuctionSource;
}

export async function updateSource(id: string, patch: Partial<SourceInput>): Promise<AuctionSource> {
  const { data, error } = await supabase
    .from('ext_auction_sources')
    .update(patch)
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as AuctionSource;
}

export async function deleteSource(id: string): Promise<void> {
  const { error } = await supabase.from('ext_auction_sources').delete().eq('id', id);
  if (error) throw error;
}

// Stamped when an admin confirms a source's listings are current, so the
// calendar can show how fresh each house's data is.
export async function touchSourceRefreshed(id: string): Promise<void> {
  const { error } = await supabase
    .from('ext_auction_sources')
    .update({ last_refreshed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
