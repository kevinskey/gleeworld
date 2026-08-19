import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { scoreToLevel, type DomainId } from './domains';

export interface PlacementRow {
  user_id: string;
  level: number;
  taken_at: string;
}

export interface DomainSummaryRow {
  user_id: string;
  domain: DomainId;
  attempts: number;
  matched: number;
  accuracy_pct: number;
  last_activity_at: string | null;
}

export function useMyPlacement(): UseQueryResult<PlacementRow | null> {
  return useQuery({
    queryKey: ['reading-music-placement'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from('gw_reading_music_placement')
        .select('user_id, level, taken_at')
        .eq('user_id', uid)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as PlacementRow | null) ?? null;
    },
  });
}

export function useSubmitPlacement(): UseMutationResult<PlacementRow, Error, { correct: number; total: number }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ correct, total }) => {
      const level = scoreToLevel(correct, total);
      const { data, error } = await supabase
        .from('gw_reading_music_placement')
        .upsert({ level }, { onConflict: 'user_id' })
        .select('user_id, level, taken_at')
        .single();
      if (error) throw error;
      return data as PlacementRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reading-music-placement'] }),
  });
}

export function useDomainSummary(): UseQueryResult<DomainSummaryRow[]> {
  return useQuery({
    queryKey: ['reading-music-domain-summary'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from('reading_music_domain_summary')
        .select('user_id, domain, attempts, matched, accuracy_pct, last_activity_at')
        .eq('user_id', uid);
      if (error) throw error;
      return (data ?? []) as DomainSummaryRow[];
    },
  });
}
