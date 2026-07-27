import { useQuery, type UseQueryResult } from '@tanstack/react-query';
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
