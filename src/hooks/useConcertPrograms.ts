// CRUD hooks for the Concert Planner. One program = one printed program;
// each program holds an ordered list of pieces + a roster of performers
// grouped by voice part. The hooks mirror the Part Tracks Studio
// patterns: list query + single query + a handful of targeted mutations
// the editor wires up directly.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  RightsStatus, VisualTheme, PrintFormat, ProgramCardLayout, RosterSection,
} from '@/lib/concertPlanner/types';

// Legacy "template" axis. The new UI replaces this with theme + print_format;
// the column stays in the DB to avoid losing the test program's value.
export type ProgramTemplate = 'classical' | 'choral' | 'festival' | 'recital';

export interface ConcertProgram {
  id: string;
  title: string;
  subtitle: string | null;
  event_date: string | null;
  call_time: string | null;
  venue: string | null;
  conductor: string | null;
  accompanist: string | null;
  performer_group: string | null;
  cover_image_url: string | null;
  notes: string | null;
  target_length_minutes: number | null;
  template_kind: ProgramTemplate;
  theme: VisualTheme;
  print_format: PrintFormat;
  card_layout: ProgramCardLayout;
  design_state: Record<string, any>;
  canva_design_id: string | null;
  setlist_id: string | null;
  published_at: string | null;
  published_by: string | null;
  published_slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConcertProgramPiece {
  id: string;
  program_id: string;
  sort_order: number;
  section_heading: string | null;
  title: string;
  composer: string | null;
  arranger: string | null;
  voicing: string | null;
  soloists: string | null;
  duration_seconds: number | null;
  program_notes: string | null;
  sheet_music_id: string | null;
  rights_status: RightsStatus | null;
  copyright_info: string | null;
}

export function useConcertPrograms() {
  return useQuery<ConcertProgram[]>({
    queryKey: ['concert-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_concert_programs')
        .select('*')
        .order('event_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ConcertProgram[];
    },
  });
}

export function useConcertProgram(id: string | undefined) {
  const qc = useQueryClient();

  const programQ = useQuery<ConcertProgram | null>({
    queryKey: ['concert-program', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_concert_programs')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as ConcertProgram | null;
    },
  });

  const piecesQ = useQuery<ConcertProgramPiece[]>({
    queryKey: ['concert-program-pieces', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_concert_program_pieces')
        .select('*')
        .eq('program_id', id!)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as ConcertProgramPiece[];
    },
  });

  const updateProgram = useMutation({
    mutationFn: async (patch: Partial<ConcertProgram>) => {
      if (!id) throw new Error('Missing program id');
      const { error } = await supabase
        .from('gw_concert_programs')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concert-program', id] }),
  });

  const addPiece = useMutation({
    mutationFn: async (input: Partial<ConcertProgramPiece>) => {
      if (!id) throw new Error('Missing program id');
      const order = (piecesQ.data?.length ?? 0);
      const { error } = await supabase
        .from('gw_concert_program_pieces')
        .insert({ program_id: id, sort_order: order, title: 'New piece', ...input });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concert-program-pieces', id] }),
  });

  const updatePiece = useMutation({
    mutationFn: async ({ pieceId, patch }: { pieceId: string; patch: Partial<ConcertProgramPiece> }) => {
      const { error } = await supabase
        .from('gw_concert_program_pieces')
        .update(patch)
        .eq('id', pieceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concert-program-pieces', id] }),
  });

  const deletePiece = useMutation({
    mutationFn: async (pieceId: string) => {
      const { error } = await supabase
        .from('gw_concert_program_pieces')
        .delete()
        .eq('id', pieceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concert-program-pieces', id] }),
  });

  const reorderPieces = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((pieceId, idx) =>
          supabase.from('gw_concert_program_pieces').update({ sort_order: idx }).eq('id', pieceId),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concert-program-pieces', id] }),
  });

  // ── Roster ───────────────────────────────────────────────────────
  // Sections + members are split tables; we fetch both and stitch into
  // RosterSection[] for the transform layer to consume.

  const rosterQ = useQuery<RosterSection[]>({
    queryKey: ['concert-program-roster', id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: sections, error: sErr }, { data: members, error: mErr }] = await Promise.all([
        supabase
          .from('gw_concert_roster_sections')
          .select('id, program_id, section_name, sort_order')
          .eq('program_id', id!)
          .order('sort_order'),
        supabase
          .from('gw_concert_roster_members')
          .select('id, section_id, member_name, sort_order')
          .order('sort_order'),
      ]);
      if (sErr) throw sErr;
      if (mErr) throw mErr;
      const bySection = new Map<string, any[]>();
      (members ?? []).forEach((m: any) => {
        if (!bySection.has(m.section_id)) bySection.set(m.section_id, []);
        bySection.get(m.section_id)!.push(m);
      });
      return (sections ?? []).map((s: any) => ({
        ...s,
        members: bySection.get(s.id) ?? [],
      })) as RosterSection[];
    },
  });

  const addRosterSection = useMutation({
    mutationFn: async (section_name: string) => {
      if (!id) throw new Error('Missing program id');
      const order = rosterQ.data?.length ?? 0;
      const { error } = await supabase
        .from('gw_concert_roster_sections')
        .insert({ program_id: id, section_name, sort_order: order });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concert-program-roster', id] }),
  });

  const updateRosterSection = useMutation({
    mutationFn: async ({ sectionId, patch }: { sectionId: string; patch: { section_name?: string; sort_order?: number } }) => {
      const { error } = await supabase
        .from('gw_concert_roster_sections')
        .update(patch)
        .eq('id', sectionId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concert-program-roster', id] }),
  });

  const deleteRosterSection = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase
        .from('gw_concert_roster_sections')
        .delete()
        .eq('id', sectionId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concert-program-roster', id] }),
  });

  const addRosterMember = useMutation({
    mutationFn: async ({ sectionId, member_name }: { sectionId: string; member_name: string }) => {
      // Count existing members for sort_order — small N, cheap.
      const section = rosterQ.data?.find((s) => s.id === sectionId);
      const order = section?.members.length ?? 0;
      const { error } = await supabase
        .from('gw_concert_roster_members')
        .insert({ section_id: sectionId, member_name, sort_order: order });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concert-program-roster', id] }),
  });

  const deleteRosterMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('gw_concert_roster_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concert-program-roster', id] }),
  });

  return {
    program: programQ.data ?? null,
    pieces: piecesQ.data ?? [],
    roster: rosterQ.data ?? [],
    isLoading: programQ.isLoading || piecesQ.isLoading || rosterQ.isLoading,
    updateProgram,
    addPiece,
    updatePiece,
    deletePiece,
    reorderPieces,
    addRosterSection,
    updateRosterSection,
    deleteRosterSection,
    addRosterMember,
    deleteRosterMember,
  };
}

export async function createConcertProgram(input: {
  title: string;
  template_kind?: ProgramTemplate;
  event_date?: string | null;
  setlist_id?: string | null;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('gw_concert_programs')
    .insert({
      title: input.title,
      template_kind: input.template_kind ?? 'choral',
      event_date: input.event_date ?? null,
      setlist_id: input.setlist_id ?? null,
    })
    .select()
    .single();
  if (error || !data) return null;
  return data.id;
}

export async function deleteConcertProgram(id: string): Promise<void> {
  await supabase.from('gw_concert_programs').delete().eq('id', id);
}
