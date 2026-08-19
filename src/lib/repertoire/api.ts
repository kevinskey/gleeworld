import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RepertoireItem {
  id: string;
  source: string;
  source_id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  language: string | null;
  ensemble_type: string | null;
  publisher: string | null;
  editors_choice: boolean;
  list_price_cents: number | null;
  currency: string | null;
  source_page_url: string;
  product_url: string | null;
  affiliate_url: string | null;
  thumbnail_url: string | null;
  audio_preview_url: string | null;
  attribution: string | null;
  has_cached_pdf: boolean;
  rank: number;
}

export interface RepertoireSearchParams {
  query?: string;
  ensemble?: string;
  voicing?: string;
  language?: string;
  composer?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

export function repertoireSearchQueryKey(params: RepertoireSearchParams): unknown[] {
  return [
    'repertoire-search',
    params.query ?? '',
    params.ensemble ?? '',
    params.voicing ?? '',
    params.language ?? '',
    params.composer ?? '',
    params.source ?? '',
    params.limit ?? 50,
    params.offset ?? 0,
  ];
}

export function repertoireFeaturedQueryKey(ensemble?: string, limit = 24): unknown[] {
  return ['repertoire-featured', ensemble ?? '', limit];
}

export function useRepertoireSearch(
  params: RepertoireSearchParams,
  opts?: { enabled?: boolean }
): UseQueryResult<RepertoireItem[]> {
  return useQuery({
    queryKey: repertoireSearchQueryKey(params),
    enabled: opts?.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('repertoire_search', {
        p_query: params.query || null,
        p_ensemble: params.ensemble || null,
        p_voicing: params.voicing || null,
        p_language: params.language || null,
        p_composer: params.composer || null,
        p_source: params.source || null,
        p_limit: params.limit ?? 50,
        p_offset: params.offset ?? 0,
      });
      if (error) throw error;
      return (data ?? []) as RepertoireItem[];
    },
  });
}

export function useRepertoireFeatured(
  ensemble?: string,
  limit = 24
): UseQueryResult<RepertoireItem[]> {
  return useQuery({
    queryKey: repertoireFeaturedQueryKey(ensemble, limit),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('repertoire_featured', {
        p_ensemble: ensemble || null,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as RepertoireItem[];
    },
  });
}

// ---------------------------------------------------------------------------
// Add to Library — writes a RepertoireItem into the user's My Music library
// (gw_personal_scores) or the current tenant's shared library (gw_sheet_music).
// RLS enforces the correct user_id / current_tenant_id() on both tables;
// the client just INSERTs. Duplicate saves surface as a unique-violation
// (Postgres 23505) which we translate into a friendly "already saved" outcome.

const UNIQUE_VIOLATION = '23505';

interface AddResult {
  alreadyExisted: boolean;
  id: string | null;
}

async function addToMyMusicImpl(item: RepertoireItem): Promise<AddResult> {
  const isPD = item.source === 'cpdl';
  const isExt = !isPD;
  const externalUrl = item.affiliate_url || item.product_url || item.source_page_url;

  const row = {
    title: item.title,
    composer: item.composer,
    voicing: item.voicing,
    source: item.source,
    pd_work_id: isPD ? item.id : null,
    ext_catalog_item_id: isExt ? item.id : null,
    storage_path: null as string | null,
    external_url: externalUrl,
    thumbnail_path: item.thumbnail_url,
  };

  const { data, error } = await supabase
    .from('gw_personal_scores')
    .insert(row)
    .select('id')
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { alreadyExisted: true, id: null };
    throw error;
  }
  return { alreadyExisted: false, id: data?.id ?? null };
}

async function addToTenantLibraryImpl(item: RepertoireItem): Promise<AddResult> {
  const isPD = item.source === 'cpdl';
  const isExt = !isPD;
  const externalUrl = item.affiliate_url || item.product_url || item.source_page_url;

  const row = {
    title: item.title,
    composer: item.composer,
    voicing: item.voicing,
    pd_work_id: isPD ? item.id : null,
    ext_catalog_item_id: isExt ? item.id : null,
    pdf_url: externalUrl,
    thumbnail_url: item.thumbnail_url,
    audio_preview_url: item.audio_preview_url,
  };

  const { data, error } = await supabase
    .from('gw_sheet_music')
    .insert(row)
    .select('id')
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { alreadyExisted: true, id: null };
    throw error;
  }
  return { alreadyExisted: false, id: data?.id ?? null };
}

export function useAddToMyMusic(): UseMutationResult<AddResult, Error, RepertoireItem> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addToMyMusicImpl,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-scores'] });
      qc.invalidateQueries({ queryKey: ['my-music'] });
    },
  });
}

export function useAddToTenantLibrary(): UseMutationResult<AddResult, Error, RepertoireItem> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addToTenantLibraryImpl,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sheet-music'] });
    },
  });
}
