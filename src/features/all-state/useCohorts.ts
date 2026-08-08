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

/**
 * The tenant's own roster, searchable — the PRIMARY add-students source.
 *
 * Found by auditing against live data rather than fixtures: production has
 * ZERO gw_ensembles rows in any tenant, so an ensemble-only picker meant no
 * director could add a single student. Real rosters live in gw_profiles
 * (tenant-scoped by RLS; no .eq('tenant_id') needed or wanted here).
 */
export function useTenantRoster(query: string) {
  return useQuery<Array<{ id: string; first_name: string | null; last_name: string | null; voice_part: string | null; role: string | null }>>({
    queryKey: [KEY, 'tenant-roster', query],
    queryFn: async () => {
      let q = supabase
        .from('gw_profiles')
        .select('id,first_name,last_name,voice_part,role')
        .order('last_name', { ascending: true, nullsFirst: false })
        .limit(50);
      if (query.trim()) {
        const term = query.trim().replace(/[%_]/g, '');
        q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as never;
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

export interface AttemptRow {
  id: string;
  participation_id: string;
  round_number: number;
  round_label: string | null;
  scheduled_at: string | null;
  submitted_at: string | null;
  format: 'live' | 'recorded' | 'virtual' | null;
  score: number | null;
  score_scale: number | null;
  rank: number | null;
  advanced: boolean | null;
  result: string | null;
  adjudicator_notes: string | null;
}

export interface VoicePartOption {
  id: string;
  code: string;
  label: string;
  sort_order: number;
}

/** The state's own voice parts for a program — S1..B2 in Georgia, S/A/T/B in
 * Texas 1A-4A. Feeds the auditioned-as / placed-as pickers. */
export function useProgramVoiceParts(programId: string | undefined) {
  return useQuery<VoicePartOption[]>({
    queryKey: [KEY, 'voice-parts', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_voice_parts')
        .select('id,code,label,sort_order')
        .eq('program_id', programId)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as VoicePartOption[];
    },
  });
}

export function useCohortAttempts(participationIds: string[]) {
  return useQuery<AttemptRow[]>({
    queryKey: [KEY, 'attempts', participationIds.join(',')],
    enabled: participationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_audition_attempts')
        .select('*')
        .in('participation_id', participationIds)
        .order('round_number');
      if (error) throw error;
      return (data ?? []) as AttemptRow[];
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

export function useSaveAttempt() {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Partial<AttemptRow> & { participation_id: string } }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const payload = { ...values, recorded_by: userRes?.user?.id ?? null };
      const q = id
        ? supabase.from('gw_all_state_audition_attempts').update(payload).eq('id', id).select()
        : supabase.from('gw_all_state_audition_attempts').insert(payload).select();
      const { data, error } = await q;
      if (error) {
        // The UNIQUE(participation_id, round_number) constraint reads terribly
        // raw; say what it means.
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          throw new Error('That round number already exists for this student. Edit the existing round instead.');
        }
        throw error;
      }
      if (!data?.length) throw new Error('Rejected — staff only.');
      return data[0];
    },
    onSuccess: () => { invalidate(); toast({ title: 'Round saved' }); },
    onError: (e: Error) => toast({ title: "Couldn't save round", description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteAttempt() {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('gw_all_state_audition_attempts').delete().eq('id', id).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Rejected — staff only.');
    },
    onSuccess: () => { invalidate(); toast({ title: 'Round deleted' }); },
    onError: (e: Error) => toast({ title: "Couldn't delete", description: e.message, variant: 'destructive' }),
  });
}

/** The S2-auditioned / S1-placed case: two separate columns, set independently. */
export function useSetVoiceParts() {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, audition, assigned }: { id: string; audition?: string | null; assigned?: string | null }) => {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (audition !== undefined) patch.audition_voice_part_id = audition;
      if (assigned !== undefined) patch.assigned_voice_part_id = assigned;
      const { data, error } = await supabase
        .from('gw_all_state_participations').update(patch).eq('id', id).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Rejected — staff only.');
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast({ title: "Couldn't update voice part", description: e.message, variant: 'destructive' }),
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
