// Public concert program page.
//
// Anonymous URL: /program/:slug. Reads the program + pieces + roster
// through the anon-published RLS policy (gw_concert_programs row only
// readable to anon when published_at IS NOT NULL).
//
// Renders the same card-stack the admin sees in Audience view, with
// hidden cards dropped, themed by the program's stored theme. No
// editor chrome.

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  transformProgramToCards,
  themeStyles,
  printFormatStyles,
  type ConcertProgram, type ConcertPiece, type RosterSection,
} from '@/lib/concertPlanner';

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

      const roster: RosterSection[] = (sectionsRes.data ?? []).map((s: any) => ({
        id: s.id,
        program_id: s.program_id,
        section_name: s.section_name,
        sort_order: s.sort_order,
        members: (s.gw_concert_roster_members ?? [])
          .slice()
          .sort((a: any, b: any) => a.sort_order - b.sort_order),
      }));

      return {
        program: program as ConcertProgram,
        pieces: (piecesRes.data ?? []) as ConcertPiece[],
        roster,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data || !data.program) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
    );
  }

  const { program, pieces, roster } = data;
  const cards = transformProgramToCards(program, pieces, roster);
  const visibleCards = cards.filter((c) => c.visible);
  const theme = themeStyles(program.theme);
  const formatStyles = printFormatStyles(program.print_format);
  const publicUrl = `${window.location.origin}/program/${program.published_slug}`;

  return (
    <div className={`min-h-screen ${theme.container}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .program-card { page-break-after: always; break-inside: avoid; border: none !important; box-shadow: none !important; padding: 2rem 0 !important; }
        }
      ` }} />

      <main className={`${formatStyles} px-4 py-8 space-y-6 w-full mx-auto`}>
        {visibleCards.map((card) => {
          if (card.kind === 'hero-cover') {
            return (
              <div key={card.id} className={`${theme.card} program-card text-center`} style={theme.heroBg}>
                <span className={theme.accent}>Concert Program</span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight mt-1 break-words leading-[1.05]" style={theme.heroTitle}>{program.title}</h1>
                {program.subtitle && <p className="text-base italic opacity-80 mt-1">{program.subtitle}</p>}
                {/* Inherit the hero's theme color via opacity-80 so the
                    metadata reads cleanly on both light and dark hero
                    backdrops (Cathedral burgundy, Jazz Club navy, etc.). */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4 border-t border-current/20 mt-4 text-sm opacity-80">
                  {program.venue && <div><strong>Venue:</strong> {program.venue}</div>}
                  {program.conductor && <div><strong>Conductor:</strong> {program.conductor}</div>}
                  {program.accompanist && <div><strong>Accompanist:</strong> {program.accompanist}</div>}
                </div>
                {program.event_date && (
                  <div className="text-sm opacity-70 pt-1 mt-2">
                    {new Date(program.event_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    {program.call_time && ` · Call ${program.call_time}`}
                  </div>
                )}
              </div>
            );
          }
          if (card.kind === 'timeline-program') {
            return (
              <div key={card.id} className={`${theme.card} program-card`}>
                <h3 className={theme.accent}>{card.title}</h3>
                <div className="space-y-2 mt-4">
                  {pieces.slice().sort((a, b) => a.sort_order - b.sort_order).map((piece, i) => (
                    <div key={piece.id} className="flex items-start justify-between border-b border-border/50 pb-2 text-sm">
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-muted-foreground/60 font-bold tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                        <div>
                          <div className="font-semibold">{piece.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {piece.composer}
                            {piece.arranger && ` · arr. ${piece.arranger}`}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {piece.duration_seconds ? formatDuration(piece.duration_seconds) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          if (card.kind === 'piece-detail') {
            const piece = pieces.find((p) => p.id === card.pieceId);
            if (!piece) return null;
            return (
              <div key={card.id} className={`${theme.card} program-card`}>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5 border-l-2 border-border pl-3">
                    <span className={theme.accent}>Performance notes</span>
                    <h4 className="text-lg font-bold leading-tight mt-1">{piece.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {piece.composer}
                      {piece.arranger && ` · arr. ${piece.arranger}`}
                    </p>
                  </div>
                  <div className="md:col-span-7 text-xs italic text-muted-foreground">
                    "{piece.program_notes || 'No program notes provided.'}"
                  </div>
                </div>
              </div>
            );
          }
          if (card.kind === 'grid-roster') {
            return (
              <div key={card.id} className={`${theme.card} program-card`}>
                <h3 className={theme.accent}>{card.title}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {roster.map((sect) => (
                    <div key={sect.id} className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-0.5">{sect.section_name}</h4>
                      <ul className="text-xs space-y-0.5">
                        {sect.members.map((m) => <li key={m.id} className="truncate">{m.member_name}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          if (card.kind === 'rights-footer') {
            return (
              <div key={card.id} className={`${theme.card} program-card`}>
                <div className="text-[11px] flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>All works credited per composer + licensing.</span>
                  </div>
                  <div className="italic">"Texts and music used by permission. All rights reserved."</div>
                </div>
                {pieces.filter((p) => p.rights_status === 'licensed' && p.copyright_info).length > 0 && (
                  <ul className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
                    {pieces
                      .filter((p) => p.rights_status === 'licensed' && p.copyright_info)
                      .map((p) => (
                        <li key={p.id} className="truncate">
                          <strong>{p.title}</strong> — {p.copyright_info}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            );
          }
          if (card.kind === 'qr-access') {
            return (
              <div key={card.id} className={`${theme.card} program-card text-center`}>
                <p className="text-xs font-semibold">Share this program</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5 break-all">{publicUrl}</p>
              </div>
            );
          }
          return null;
        })}
      </main>
    </div>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
