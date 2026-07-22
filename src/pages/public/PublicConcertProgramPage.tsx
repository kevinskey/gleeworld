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
  const cards = transformProgramToCards(program, pieces, roster);
  const visibleCards = cards.filter((c) => c.visible);
  const theme = themeStyles(program.theme);
  const formatStyles = printFormatStyles(program.print_format);
  const publicUrl = `${window.location.origin}/program/${program.published_slug}`;

  return (
    <PublicLayout>
    <div className={theme.container}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .program-card { break-inside: avoid; border: none !important; box-shadow: none !important; padding: 0.5rem 0 !important; margin: 0 !important; }
          main { gap: 0.75rem !important; }
          @page { margin: 0.6in; }
        }
      ` }} />

      <main className={`${formatStyles} px-4 py-8 space-y-6 w-full mx-auto`}>
        {visibleCards.map((card) => {
          if (card.kind === 'hero-cover') {
            return (
              <div key={card.id} className={`${theme.card} program-card flex flex-col items-center text-center`} style={theme.heroBg}>
                <span className={theme.accent}>Concert Program</span>
                <h1 className="tracking-tight mt-1 break-words text-center" style={{ ...theme.heroTitle, fontSize: 'clamp(2rem, 6vw, 4.5rem)', lineHeight: 1.05 }}>{program.title}</h1>
                {program.subtitle && <p className="text-base italic opacity-80 mt-1 text-center">{program.subtitle}</p>}
                {/* Inherit the hero's theme color via opacity-80 so the
                    metadata reads cleanly on both light and dark hero
                    backdrops (Cathedral burgundy, Jazz Club navy, etc.). */}
                {program.conductor && (
                  <p className="text-xl opacity-90 mt-4 text-center">{program.conductor}, Conductor</p>
                )}
                {program.accompanist && (
                  <p className="text-xs opacity-80 text-center">{program.accompanist}, accompanist</p>
                )}
                {(program.venue || program.event_date) && (
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-4 border-t border-current/20 mt-4 text-sm opacity-80">
                    {program.venue && <span>{program.venue}</span>}
                    {program.venue && program.event_date && <span className="opacity-60">·</span>}
                    {program.event_date && (
                      <span>{new Date(program.event_date).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                    )}
                  </div>
                )}
              </div>
            );
          }
          if (card.kind === 'timeline-program') {
            return (
              <div key={card.id} className={`${theme.card} program-card`}>
                {(() => { const { color: _heroColor, ...heroFont } = theme.heroTitle as any; return (
                  <h3 className="text-center font-bold tracking-tight" style={{ ...heroFont, fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)' }}>{card.title}</h3>
                ); })()}
                <div className="space-y-2 mt-4">
                  {pieces.slice().sort((a, b) => a.sort_order - b.sort_order).map((piece, i) => (
                    <div key={piece.id} className="flex items-center justify-between gap-3 pb-2 text-sm" style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(127,127,127,0.18)' }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono font-bold tabular-nums opacity-50">{String(i + 1).padStart(2, '0')}</span>
                        <div className="font-semibold truncate">{piece.title}</div>
                      </div>
                      <div className="text-xs opacity-70 text-right whitespace-nowrap shrink-0">
                        {piece.composer}
                        {piece.arranger && ` · arr. ${piece.arranger}`}
                      </div>
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
                <div className="text-[11px] flex flex-col md:flex-row items-start md:items-center justify-between gap-2 opacity-85">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>All works credited per composer + licensing.</span>
                  </div>
                  <div className="italic">"Texts and music used by permission. All rights reserved."</div>
                </div>
                {pieces.filter((p) => p.rights_status === 'licensed' && p.copyright_info).length > 0 && (
                  <ul className="mt-2 text-[10px] space-y-0.5 opacity-75">
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
                <p className="text-[10px] font-mono mt-0.5 break-all opacity-75">{publicUrl}</p>
              </div>
            );
          }
          return null;
        })}
      </main>
    </div>
    </PublicLayout>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
