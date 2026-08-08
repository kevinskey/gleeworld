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
 * These are real deep links, not "go to the tools page". The music library
 * already accepted ?q=; Part Tracks (?score=) and Music Tools (?tool=, ?bpm=)
 * did not, and were given URL context so a checklist could reach them —
 * previously a student landed on a list of five tools or every score in the
 * tenant and had to find their own way.
 *
 * A repertoire task carries the piece title, so the link searches for it by
 * name rather than dumping the student in an unfiltered library.
 */
export interface PracticeTarget {
  href: string;
  label: string;
}

export function practiceLinkFor(task: {
  task_type: string;
  title: string;
  source_repertoire_id?: string | null;
}): PracticeTarget | null {
  // "Prepare: Se Florindo è fedele" → search the library for the piece.
  if (task.source_repertoire_id) {
    const piece = task.title.replace(/^\s*Prepare:\s*/i, '').trim();
    return {
      href: `/dashboard/music-library?q=${encodeURIComponent(piece)}`,
      label: 'Find this in the library',
    };
  }

  switch (task.task_type) {
    case 'sight_reading':
      return { href: '/dashboard/reading-music?tab=sight_singing', label: 'Practise sight-reading' };
    case 'scales':
      // Land on a running metronome at a sensible scale-practice tempo rather
      // than on a page of five tools.
      return { href: '/dashboard/music-tools?tool=metronome&bpm=80', label: 'Open metronome' };
    case 'recording':
      return { href: '/dashboard/music-tools?tool=metronome', label: 'Open recorder' };
    case 'materials':
    case 'repertoire':
      return { href: '/dashboard/music-library', label: 'Open music library' };
    default:
      return null;
  }
}

/** Deep link to a score's rehearsal tracks, when one exists for the piece. */
export function partTracksLink(scoreId: string): PracticeTarget {
  return { href: `/dashboard/part-tracks?score=${scoreId}`, label: 'Rehearsal tracks' };
}
