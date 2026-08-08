// Student-side data access.
//
// Reads go through gw_all_state_my_participations / _my_audition_attempts —
// curated views that simply do not contain director_notes, scores, or
// adjudicator comments. Never query the base tables from student surfaces;
// they are staff-only by policy and will return zero rows anyway.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';
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

export interface ChildParticipation {
  participation_id: string;
  child_first_name: string | null;
  program_name: string;
  program_season: string;
  state_name: string;
  state_slug: string;
  cohort_name: string;
}

/**
 * A verified parent's children in All-State cohorts. Scoped by acceptance
 * criterion 6 — dates, cost, location, nothing else — so the view carries no
 * status, results, scores, or notes, and this hook cannot add them back.
 */
export function useMyChildren() {
  return useQuery<ChildParticipation[]>({
    queryKey: ['all-state-me', 'children'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_my_children').select('*');
      if (error) throw error;
      return (data ?? []) as ChildParticipation[];
    },
  });
}

export function useMyChildrenDates(participationIds: string[]) {
  return useQuery<Array<{ participation_id: string; title: string; due_at: string }>>({
    queryKey: ['all-state-me', 'children-dates', participationIds.join(',')],
    enabled: participationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_my_children_dates')
        .select('*')
        .in('participation_id', participationIds)
        .order('due_at');
      if (error) throw error;
      return (data ?? []) as never;
    },
  });
}

export interface MyRecording {
  id: string;
  title: string | null;
  audio_url: string | null;
  duration_sec: number | null;
  created_at: string;
}

/** The student's own practice recordings (made in Music Tools' recorder). */
export function useMyRecordings() {
  return useQuery<MyRecording[]>({
    queryKey: ['all-state-me', 'my-recordings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_practice_recordings')
        .select('id,title,audio_url,duration_sec,created_at')
        .order('created_at', { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as MyRecording[];
    },
  });
}

export interface SubmissionLink {
  id: string;
  participation_id: string;
  external_ref: string | null;
  created_at: string;
}

/** Recordings the student has SUBMITTED against their participations. */
export function useMySubmissions(participationIds: string[]) {
  return useQuery<SubmissionLink[]>({
    queryKey: ['all-state-me', 'submissions', participationIds.join(',')],
    enabled: participationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_practice_links')
        .select('id,participation_id,external_ref,created_at')
        .in('participation_id', participationIds)
        .eq('tool', 'recording')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SubmissionLink[];
    },
  });
}

/**
 * Submit = link one of the student's existing recordings to their
 * participation via gw_all_state_practice_links — the adapter table built for
 * exactly this, so no blob is duplicated and no shared table changes. Also
 * auto-completes any open 'recording' task on the participation: submitting
 * IS the completion, and asking the student to also tick a box is busywork.
 */
export function useSubmitRecording() {
  return { async submit(participationId: string, recordingId: string) {
    const { data, error } = await supabase
      .from('gw_all_state_practice_links')
      .insert({ participation_id: participationId, tool: 'recording', external_ref: recordingId })
      .select();
    if (error) throw error;
    if (!data?.length) throw new Error('Submission was rejected.');
    const { data: userRes } = await supabase.auth.getUser();
    await supabase.from('gw_all_state_tasks')
      .update({ completed_at: new Date().toISOString(), completed_by: userRes?.user?.id ?? null })
      .eq('participation_id', participationId)
      .eq('task_type', 'recording')
      .is('completed_at', null);
    trackEvent('all_state_recording_submitted', {});
  } };
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
