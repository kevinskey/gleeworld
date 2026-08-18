// Public concert program page.
//
// Anonymous URL: /program/:slug. Reads the program + pieces + roster
// through the anon-published RLS policy (gw_concert_programs row only
// readable to anon when published_at IS NOT NULL) — fetch logic is
// unchanged from the card-editor era.
//
// Render is the block model (spec "Publish, QR, public page"): blocks are
// derived IN MEMORY from the program's stored `blocks` (or, for legacy
// programs with no blocks yet, derived on the fly from pieces + roster +
// notes) — anon can never write, so there is no persistence here, unlike
// the editor's first-open effect. A single phone-friendly column always
// renders with the classic-1943 typography tokens, regardless of the
// program's stored print_design (spec) — no pagination, no fake paper
// sheets, no QR (this IS the destination the QR points at).
import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ConcertProgram, ConcertProgramPiece } from '@/hooks/useConcertPrograms';
import type { RosterMember, RosterSection } from '@/lib/concertPlanner/types';
import type { ProgramBlock } from '@/lib/concertProgram/types';
import { deriveDefaultBlocks, reconcileBlocks } from '@/lib/concertProgram/blocks';
import { blocksToUnits, unitKey } from '@/lib/concertProgram/paginate';
import { PageItemView, designClass, type RenderCtx } from '@/components/concert-program/blocks/BlockRenderers';
import { PublicLayout } from '@/components/layout/PublicLayout';

export default function PublicConcertProgramPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-concert-program', slug],
    enabled: !!slug,
    queryFn: async () => {
      // Single round-trip via embed: program → pieces → roster sections → members.
      // Anon RLS on each table only lets the rows through if the parent
      // program is published.
      const { data: program, error: progErr } = await supabase
        .from('gw_concert_programs')
        .select('*')
        .eq('published_slug', slug!)
        .maybeSingle();
      if (progErr) throw progErr;
      if (!program) return null;

      const [piecesRes, sectionsRes] = await Promise.all([
        supabase
          .from('gw_concert_program_pieces')
          .select('*')
          .eq('program_id', program.id)
          .order('sort_order'),
        supabase
          .from('gw_concert_roster_sections')
          .select('id, program_id, section_name, sort_order, gw_concert_roster_members(id, section_id, member_name, sort_order)')
          .eq('program_id', program.id)
          .order('sort_order'),
      ]);
      if (piecesRes.error) throw piecesRes.error;
      if (sectionsRes.error) throw sectionsRes.error;

      type RosterSectionRow = {
        id: string;
        program_id: string;
        section_name: string;
        sort_order: number;
        gw_concert_roster_members: RosterMember[] | null;
      };
      const roster: RosterSection[] = ((sectionsRes.data ?? []) as RosterSectionRow[]).map((s) => ({
        id: s.id,
        program_id: s.program_id,
        section_name: s.section_name,
        sort_order: s.sort_order,
        members: (s.gw_concert_roster_members ?? [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order),
      }));

      return {
        program: program as ConcertProgram,
        pieces: (piecesRes.data ?? []) as ConcertProgramPiece[],
        roster,
      };
    },
  });

  // Derive blocks in memory — never write (anon has no write access, and
  // even if it did, the public page must never be the thing that mutates
  // a program's layout). Same reconcile-or-derive rule the editor's
  // first-open effect persists, just held in a render-time useMemo here.
  const blocks: ProgramBlock[] = useMemo(() => {
    if (!data?.program) return [];
    const { program, pieces, roster } = data;
    return (program.blocks ?? []).length > 0
      ? reconcileBlocks(program.blocks, pieces).blocks
      : deriveDefaultBlocks(program, pieces, roster);
  }, [data]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center bg-background py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </PublicLayout>
    );
  }

  if (error || !data || !data.program) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center bg-background py-20">
          <div className="text-center space-y-3">
            <h1 className="text-xl font-semibold">Program not found</h1>
            <p className="text-sm text-muted-foreground">
              This program may have been unpublished or moved.
            </p>
            <Link to="/" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Home
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const { program, pieces, roster } = data;
  const piecesById = new Map(pieces.map((p) => [p.id, p]));
  const rosterSectionIds = roster.filter((s) => s.members.length > 0).map((s) => s.id);
  const units = blocksToUnits(blocks, rosterSectionIds);

  const ctx: RenderCtx = {
    blocks,
    piecesById,
    roster,
    program: {
      title: program.title,
      subtitle: program.subtitle,
      event_date: program.event_date,
      venue: program.venue,
      conductor: program.conductor,
      accompanist: program.accompanist,
      performer_group: program.performer_group,
    },
    // The public page shows only what the block model itself renders from
    // program fields — org branding needs authenticated tenant context the
    // anon page doesn't have, and there is no QR here (this page IS the
    // QR's destination; a QR-on-the-QR-target would be pointless).
    orgName: null,
    logoUrl: null,
    qrDataUrl: null,
  };

  return (
    <PublicLayout>
      <div
        className={`cp-page ${designClass('classic-1943')}`}
        style={{ maxWidth: '42rem', margin: '0 auto', padding: '1.5rem 1rem', background: '#fff' }}
      >
        {units.map((unit) => (
          <PageItemView key={unitKey(unit)} item={{ unit }} ctx={ctx} />
        ))}
      </div>
    </PublicLayout>
  );
}
