// Student-side data access.
//
// Reads go through gw_all_state_my_participations / _my_audition_attempts —
// curated views that simply do not contain director_notes, scores, or
// adjudicator comments. Never query the base tables from student surfaces;
// they are staff-only by policy and will return zero rows anyway.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeReadiness } from './taskGenerator';
import type { TaskRow } from './useCohorts';

export interface MyParticipation {
  id: string;
  cohort_id: string;
  program_id: string;
  status: string;
  final_result: string | null;
  alternate_rank: number | null;
  cohort_name: string;
  program_name: string;
  program_season: string;
  state_name: string;
  state_slug: string;
}

export function useMyParticipations() {
  return useQuery<MyParticipation[]>({
    queryKey: ['all-state-me', 'participations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_my_participations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MyParticipation[];
    },
  });
}

export function useMyTasks(participationIds: string[]) {
  return useQuery<TaskRow[]>({
    queryKey: ['all-state-me', 'tasks', participationIds.join(',')],
    enabled: participationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_tasks')
        .select('*')
        .in('participation_id', participationIds)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as TaskRow[];
    },
  });
}

export { computeReadiness };

/**
 * Where a task sends a student to actually do the work.
 *
 * Honest about a real limitation: most GleeWorld practice tools accept no
 * context via URL. Part Tracks, the metronome, the pitch pipe and the recorder
 * have no params at all, and /read-music takes path segments only — so these
 * are tool links, not deep links, and the student still has to pick their
 * piece once they arrive. The two that DO take context are the music library
 * (?view=<scoreId>) and sight-reading (?tab=), and there is no score id on an
 * All-State task to hand the former. Wiring real deep links means adding
 * params to those pages, which is a change to shared surfaces.
 */
export function practiceLinkFor(taskType: string): { href: string; label: string } | null {
  switch (taskType) {
    case 'sight_reading':
      return { href: '/dashboard/reading-music?tab=sight_singing', label: 'Practise sight-reading' };
    case 'scales':
      return { href: '/dashboard/reading-music?tab=pitch_intervals', label: 'Practise pitch & intervals' };
    case 'materials':
    case 'repertoire':
      return { href: '/dashboard/music-library', label: 'Open music library' };
    case 'recording':
      return { href: '/dashboard/music-tools', label: 'Open recorder' };
    default:
      return null;
  }
}
