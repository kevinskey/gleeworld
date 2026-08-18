// Data access for saved searches and their matches. Both tables are
// owner-private: the database defaults user_id to auth.uid() and RLS refuses
// anything else, so no call here passes a user id.
import { supabase } from '@/integrations/supabase/client';
import type {
  MatchWithLot, NotifyChannel, NotifyFrequency, SavedSearch, SearchCriteria,
} from './types';

const SEARCH_COLUMNS =
  'id, user_id, name, criteria, notify_channel, notify_frequency, notify_whatsapp, active, ' +
  'last_run_at, last_notified_at, created_at, updated_at';

export async function listSavedSearches(): Promise<SavedSearch[]> {
  const { data, error } = await supabase
    .from('gw_auction_saved_searches')
    .select(SEARCH_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedSearch[];
}

export interface SavedSearchInput {
  name: string;
  criteria: SearchCriteria;
  notify_channel: NotifyChannel;
  notify_frequency: NotifyFrequency;
  notify_whatsapp: boolean;
  active: boolean;
}

export async function createSavedSearch(input: SavedSearchInput): Promise<SavedSearch> {
  const { data, error } = await supabase
    .from('gw_auction_saved_searches')
    .insert(input)
    .select(SEARCH_COLUMNS)
    .single();
  if (error) throw error;
  return data as SavedSearch;
}

export async function updateSavedSearch(
  id: string,
  patch: Partial<SavedSearchInput>,
): Promise<SavedSearch> {
  const { data, error } = await supabase
    .from('gw_auction_saved_searches')
    .update(patch)
    .eq('id', id)
    .select(SEARCH_COLUMNS)
    .single();
  if (error) throw error;
  return data as SavedSearch;
}

export async function deleteSavedSearch(id: string): Promise<void> {
  const { error } = await supabase.from('gw_auction_saved_searches').delete().eq('id', id);
  if (error) throw error;
}

// ── Matches ───────────────────────────────────────────────────────────────

export async function listMatches(includeDismissed = false): Promise<MatchWithLot[]> {
  let query = supabase
    .from('gw_auction_matches')
    .select(
      'id, saved_search_id, lot_id, score, notified_at, dismissed_at, created_at, ' +
      'lot:ext_auction_lots(id, auction_id, lot_number, raw_title, raw_text, modality, ' +
      'manufacturer, model, year_of_manufacture, serial, condition_notes, current_bid_cents, ' +
      'currency, closes_at, url, normalized_at, normalization_confidence, review_status, ' +
      'created_at, updated_at, ' +
      'auction:ext_auctions(id, title, location_city, location_state, closes_at, ' +
      'source:ext_auction_sources(id, name, slug))), ' +
      'saved_search:gw_auction_saved_searches(id, name)',
    )
    .order('score', { ascending: false })
    .limit(300);

  if (!includeDismissed) query = query.is('dismissed_at', null);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MatchWithLot[];
}

export async function dismissMatch(id: string): Promise<void> {
  const { error } = await supabase
    .from('gw_auction_matches')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function restoreMatch(id: string): Promise<void> {
  const { error } = await supabase
    .from('gw_auction_matches')
    .update({ dismissed_at: null })
    .eq('id', id);
  if (error) throw error;
}
