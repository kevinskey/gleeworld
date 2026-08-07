// Staff mutations for All-State Layer 1.
//
// Writes are gated in the database on is_platform_owner(), so these hooks do
// not re-check permission client-side beyond hiding the UI — the fence is RLS,
// not the button.
//
// Every mutation .select()s back after writing. That is a house convention
// with a sharp reason: a silent RLS rejection returns no error, just zero
// rows, so a write that "succeeded" with no returned row means you were
// denied. Checking only `error` would show a success toast for a rejected save.

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AllStateProgram, AllStateOrganization } from '../types';

/** Organizations for a state — used by the program editor's org picker. */
export function useStateOrganizations(stateId: string | undefined) {
  return useQuery<AllStateOrganization[]>({
    queryKey: ['all-state-admin', 'orgs', stateId],
    enabled: !!stateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_organizations').select('*').eq('state_id', stateId).order('name');
      if (error) throw error;
      return (data ?? []) as AllStateOrganization[];
    },
  });
}

/** Rows for one child entity of a program, unfiltered by verification status. */
export function useAdminRows(table: string, programId: string | undefined, orderBy: string) {
  return useQuery<Record<string, unknown>[]>({
    queryKey: ['all-state-admin', table, programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table).select('*').eq('program_id', programId).order(orderBy);
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  });
}

/** All programs for a state, including drafts (staff view). */
export function useAdminPrograms(stateId: string | undefined) {
  return useQuery<AllStateProgram[]>({
    queryKey: ['all-state-admin', 'programs', stateId],
    enabled: !!stateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_programs').select('*')
        .eq('state_id', stateId)
        .order('season', { ascending: false }).order('name');
      if (error) throw error;
      return (data ?? []) as AllStateProgram[];
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['all-state-admin'] });
    qc.invalidateQueries({ queryKey: ['all-state'] });   // public views too
  };
}

export function useSaveRow(table: string) {
  const { toast } = useToast();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, unknown> }) => {
      const query = id
        ? supabase.from(table).update(values).eq('id', id).select()
        : supabase.from(table).insert(values).select();
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        // Zero rows with no error is what an RLS denial looks like here.
        throw new Error(
          'Save was rejected. This usually means your account is not a platform owner — Layer 1 is staff-writable only.'
        );
      }
      return data[0];
    },
    onSuccess: () => { invalidate(); toast({ title: 'Saved' }); },
    onError: (e: Error) =>
      toast({ title: "Couldn't save", description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteRow(table: string) {
  const { toast } = useToast();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from(table).delete().eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Delete was rejected — Layer 1 is staff-writable only.');
      }
    },
    onSuccess: () => { invalidate(); toast({ title: 'Deleted' }); },
    onError: (e: Error) =>
      toast({ title: "Couldn't delete", description: e.message, variant: 'destructive' }),
  });
}

/**
 * Flip a program's verification status. Separated from the generic row saver
 * because publishing is the one action with real consequences: it makes rows
 * visible to logged-out visitors, so it deserves its own explicit call site
 * and its own confirmation in the UI.
 */
export function useSetVerification() {
  const { toast } = useToast();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async ({ programId, status }: { programId: string; status: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const patch: Record<string, unknown> = { verification_status: status };
      if (status === 'verified') {
        patch.verified_at = new Date().toISOString();
        patch.verified_by = userRes?.user?.id ?? null;
      }
      const { data, error } = await supabase
        .from('gw_all_state_programs').update(patch).eq('id', programId).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Rejected — staff only.');
      return data[0];
    },
    onSuccess: (_d, vars) => {
      invalidate();
      toast({
        title: vars.status === 'verified' ? 'Published' : 'Status updated',
        description: vars.status === 'verified'
          ? 'This program is now visible on the public state page.'
          : undefined,
      });
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't update", description: e.message, variant: 'destructive' }),
  });
}

/** Marks a state live in the directory. Separate from program verification. */
export function useSetStateActive() {
  const { toast } = useToast();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async ({ stateId, active }: { stateId: string; active: boolean }) => {
      const { data, error } = await supabase
        .from('gw_all_state_states').update({ active }).eq('id', stateId).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Rejected — staff only.');
    },
    onSuccess: () => { invalidate(); toast({ title: 'Directory updated' }); },
    onError: (e: Error) =>
      toast({ title: "Couldn't update", description: e.message, variant: 'destructive' }),
  });
}
