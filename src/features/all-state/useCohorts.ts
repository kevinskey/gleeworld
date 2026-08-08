// Director-side data access: cohorts, participations, tasks.
//
// Tenant scoping is enforced by RLS, not by filters here — every one of these
// tables carries a restrictive tenant_isolation policy, so a missing .eq()
// cannot leak another tenant's roster. Writes still .select() back, because a
// silent RLS rejection returns zero rows and no error.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateTasks, computeReadiness, type Readiness } from './taskGenerator';

export interface Cohort {
  id: string;
  program_id: string;
  ensemble_id: string | null;
  name: string;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface CohortWithProgram extends Cohort {
  program?: { name: string; season: string; slug: string; state_id: string } | null;
}

export interface ParticipationRow {
  id: string;
  cohort_id: string;
  student_id: string;
  status: string;
  final_result: string | null;
  alternate_rank: number | null;
  director_notes: string | null;
  audition_voice_part_id: string | null;
  assigned_voice_part_id: string | null;
  student?: { id: string; first_name: string | null; last_name: string | null; voice_part: string | null } | null;
}

export interface TaskRow {
  id: string;
  participation_id: string;
  source_repertoire_id?: string | null;
  title: string;
  description: string | null;
  task_type: string;
  due_at: string | null;
  completed_at: string | null;
  sort_order: number;
}

const KEY = 'all-state-cohorts';

export function useCohorts() {
  return useQuery<CohortWithProgram[]>({
    queryKey: [KEY, 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_cohorts')
        .select('*, program:gw_all_state_programs(name,season,slug,state_id)')
        .is('archived_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CohortWithProgram[];
    },
  });
}

export function useParticipations(cohortId: string | undefined) {
  return useQuery<ParticipationRow[]>({
    queryKey: [KEY, 'participations', cohortId],
    enabled: !!cohortId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_participations')
        .select('*, student:gw_profiles(id,first_name,last_name,voice_part)')
        .eq('cohort_id', cohortId);
      if (error) throw error;
      return (data ?? []) as ParticipationRow[];
    },
  });
}

export function useCohortTasks(cohortId: string | undefined) {
  return useQuery<TaskRow[]>({
    queryKey: [KEY, 'tasks', cohortId],
    enabled: !!cohortId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_tasks')
        .select('*')
        .eq('cohort_id', cohortId)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as TaskRow[];
    },
  });
}

/** Readiness per student, computed from their tasks. */
export function readinessByStudent(
  participations: ParticipationRow[],
  tasks: TaskRow[],
  now = new Date(),
): Record<string, Readiness> {
  const byPart: Record<string, TaskRow[]> = {};
  for (const t of tasks) (byPart[t.participation_id] ??= []).push(t);
  return Object.fromEntries(
    participations.map((p) => [p.id, computeReadiness(byPart[p.id] ?? [], now)]),
  );
}

/** Members of a GleeWorld ensemble — the "sync roster from class" source. */
export function useEnsembleRoster(ensembleId: string | null | undefined) {
  return useQuery<Array<{ id: string; first_name: string | null; last_name: string | null; voice_part: string | null }>>({
    queryKey: [KEY, 'ensemble-roster', ensembleId],
    enabled: !!ensembleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_ensemble_members')
        .select('profile:gw_profiles(id,first_name,last_name,voice_part)')
        .eq('ensemble_id', ensembleId)
        .eq('status', 'active');
      if (error) throw error;
      return ((data ?? []) as Array<{ profile: { id: string; first_name: string | null; last_name: string | null; voice_part: string | null } | null }>)
        .map((r) => r.profile)
        .filter(Boolean) as Array<{ id: string; first_name: string | null; last_name: string | null; voice_part: string | null }>;
    },
  });
}

export function useEnsembles() {
  return useQuery<Array<{ id: string; name: string }>>({
    queryKey: [KEY, 'ensembles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_ensembles')
        .select('id,name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [KEY] });
}

export function useCreateCohort() {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (values: { program_id: string; ensemble_id?: string | null; name: string; notes?: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('gw_all_state_cohorts')
        .insert({ ...values, created_by: userRes?.user?.id ?? null })
        .select();
      if (error) throw error;
      if (!data?.length) throw new Error('Rejected — check you are signed in to the right tenant.');
      return data[0] as Cohort;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Cohort created' }); },
    onError: (e: Error) => toast({ title: "Couldn't create cohort", description: e.message, variant: 'destructive' }),
  });
}

/**
 * Add students to a cohort and materialise each one's checklist.
 *
 * The checklist is generated HERE, at add time, from the program's Layer 1
 * requirements and dates plus any cohort overrides — never from a hardcoded
 * list. Tasks are stored rather than derived on read so a director can tick
 * them off, reorder them, and add their own.
 */
export function useAddStudents(cohortId: string, programId: string) {
  const { toast } = useToast();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (studentIds: string[]) => {
      if (studentIds.length === 0) return { added: 0, tasks: 0 };

      const [reqRes, dateRes, cohortDateRes, repRes] = await Promise.all([
        supabase.from('gw_all_state_requirements').select('*').eq('program_id', programId),
        supabase.from('gw_all_state_dates').select('*').eq('program_id', programId),
        supabase.from('gw_all_state_cohort_dates').select('*').eq('cohort_id', cohortId),
        supabase.from('gw_all_state_repertoire').select('*').eq('program_id', programId),
      ]);
      if (reqRes.error) throw reqRes.error;
      if (dateRes.error) throw dateRes.error;

      const { data: parts, error: partErr } = await supabase
        .from('gw_all_state_participations')
        .insert(studentIds.map((student_id) => ({ cohort_id: cohortId, student_id, program_id: programId })))
        .select();
      if (partErr) throw partErr;
      if (!parts?.length) throw new Error('No students were added — the write was rejected.');

      const generated = generateTasks({
        requirements: (reqRes.data ?? []) as never,
        dates: (dateRes.data ?? []) as never,
        cohortDates: (cohortDateRes.data ?? []) as never,
        repertoire: (repRes.data ?? []) as never,
      });

      if (generated.length) {
        const rows = (parts as Array<{ id: string }>).flatMap((p) =>
          generated.map((t) => ({ ...t, participation_id: p.id, cohort_id: cohortId })));
        const { error: taskErr } = await supabase.from('gw_all_state_tasks').insert(rows);
        if (taskErr) throw taskErr;
      }

      return { added: parts.length, tasks: generated.length * parts.length };
    },
    onSuccess: (r) => {
      invalidate();
      toast({
        title: `Added ${r.added} student${r.added === 1 ? '' : 's'}`,
        description: r.tasks
          ? `${r.tasks} checklist items generated from the state's published requirements.`
          : 'No requirements are published for this program yet, so no checklist was generated.',
      });
    },
    onError: (e: Error) => toast({ title: "Couldn't add students", description: e.message, variant: 'destructive' }),
  });
}

export function useSetParticipationStatus() {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('gw_all_state_participations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Rejected.');
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast({ title: "Couldn't update", description: e.message, variant: 'destructive' }),
  });
}

export function useToggleTask() {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('gw_all_state_tasks')
        .update({
          completed_at: done ? new Date().toISOString() : null,
          completed_by: done ? (userRes?.user?.id ?? null) : null,
        })
        .eq('id', id).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Rejected.');
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast({ title: "Couldn't update task", description: e.message, variant: 'destructive' }),
  });
}
