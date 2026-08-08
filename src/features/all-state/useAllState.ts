// Data access for All-State Layer 1.
//
// TanStack Query rather than the hand-rolled useState/refetch shape some newer
// features use: this is read-mostly reference data shared across several pages
// (directory, state page, future cohort pickers), so a shared cache is the
// whole point. staleTime is generous because editorial canon changes rarely.
//
// Layer 1 is tenantless, so no tenant filter here — RLS gates public reads on
// verification_status and writes on is_platform_owner().

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  AllStateState, AllStateProgram, ProgramDetail,
} from './types';

const HOUR = 60 * 60 * 1000;

export function useAllStateStates() {
  return useQuery<AllStateState[]>({
    queryKey: ['all-state', 'states'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_states')
        .select('id,name,abbreviation,slug,region,active')
        .order('name');
      if (error) throw error;
      return (data ?? []) as AllStateState[];
    },
    staleTime: 12 * HOUR,
    gcTime: 24 * HOUR,
  });
}

/**
 * Season labels per state, for the directory.
 *
 * Associations do not agree on how to name a season: Georgia says "2026-27",
 * Nebraska says "2026", Wisconsin says "2027", and several states currently
 * only publish "2025-26". Showing the label verbatim on each card is the only
 * honest option — any normalisation would either hide that Vermont is a year
 * behind, or wrongly flag Nebraska as stale.
 */
export function useStateSeasons() {
  return useQuery<Record<string, string[]>>({
    queryKey: ['all-state', 'state-seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_programs')
        .select('state_id,season');
      if (error) throw error;
      const byState: Record<string, Set<string>> = {};
      for (const row of (data ?? []) as Array<{ state_id: string; season: string }>) {
        (byState[row.state_id] ??= new Set()).add(row.season);
      }
      return Object.fromEntries(
        Object.entries(byState).map(([k, v]) => [k, [...v].sort().reverse()]),
      );
    },
    staleTime: HOUR,
  });
}

/** Programs for one state slug. Only verified ones are visible to non-staff. */
export function useStatePrograms(stateSlug: string | undefined) {
  return useQuery<{ state: AllStateState | null; programs: AllStateProgram[] }>({
    queryKey: ['all-state', 'state-programs', stateSlug],
    enabled: !!stateSlug,
    queryFn: async () => {
      const { data: stateRow, error: stateErr } = await supabase
        .from('gw_all_state_states')
        .select('id,name,abbreviation,slug,region,active')
        .eq('slug', stateSlug)
        .maybeSingle();
      if (stateErr) throw stateErr;
      if (!stateRow) return { state: null, programs: [] };

      const { data: programs, error: progErr } = await supabase
        .from('gw_all_state_programs')
        .select('*')
        .eq('state_id', (stateRow as AllStateState).id)
        .eq('active', true)
        .order('season', { ascending: false })
        .order('name');
      if (progErr) throw progErr;

      return {
        state: stateRow as AllStateState,
        programs: (programs ?? []) as AllStateProgram[],
      };
    },
    staleTime: HOUR,
  });
}

/**
 * One program with everything hanging off it. Six child queries run in
 * parallel rather than as a chain — none depends on another's result, and a
 * waterfall here would be six round trips on a page a director opens daily.
 */
export function useProgramDetail(programId: string | undefined) {
  return useQuery<ProgramDetail | null>({
    queryKey: ['all-state', 'program-detail', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data: program, error } = await supabase
        .from('gw_all_state_programs')
        .select('*')
        .eq('id', programId)
        .maybeSingle();
      if (error) throw error;
      if (!program) return null;

      const [dates, requirements, repertoire, fees, documents, voiceParts, org] =
        await Promise.all([
          supabase.from('gw_all_state_dates').select('*')
            .eq('program_id', programId).order('sort_order').order('start_at'),
          supabase.from('gw_all_state_requirements').select('*')
            .eq('program_id', programId).order('sort_order'),
          supabase.from('gw_all_state_repertoire').select('*')
            .eq('program_id', programId).order('sort_order'),
          supabase.from('gw_all_state_fees').select('*')
            .eq('program_id', programId),
          supabase.from('gw_all_state_documents').select('*')
            .eq('program_id', programId).order('sort_order'),
          supabase.from('gw_all_state_voice_parts').select('*')
            .eq('program_id', programId).order('sort_order'),
          (program as AllStateProgram).organization_id
            ? supabase.from('gw_all_state_organizations').select('*')
                .eq('id', (program as AllStateProgram).organization_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

      return {
        program: program as AllStateProgram,
        organization: (org?.data ?? null) as ProgramDetail['organization'],
        dates: (dates.data ?? []) as ProgramDetail['dates'],
        requirements: (requirements.data ?? []) as ProgramDetail['requirements'],
        repertoire: (repertoire.data ?? []) as ProgramDetail['repertoire'],
        fees: (fees.data ?? []) as ProgramDetail['fees'],
        documents: (documents.data ?? []) as ProgramDetail['documents'],
        voiceParts: (voiceParts.data ?? []) as ProgramDetail['voiceParts'],
      };
    },
    staleTime: HOUR,
  });
}
