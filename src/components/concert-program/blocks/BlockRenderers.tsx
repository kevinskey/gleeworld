// Shared block renderers for the concert program editor, print overlay,
// and public page. Presentational only — no supabase, no side-effect
// hooks. Type in pt, geometry in in; no Tailwind classes inside page
// content (spec: "The block model" / "Print designs").
import '@/styles/concert-program.css';
import type { ProgramBlock, PrintDesign } from '@/lib/concertProgram/types';
import type { PageItem } from '@/lib/concertProgram/paginate';
import type { ConcertProgramPiece } from '@/hooks/useConcertPrograms';
import type { RosterSection } from '@/lib/concertPlanner/types';
import { PieceLine } from './PieceLine';

export function designClass(design: PrintDesign): string {
  switch (design) {
    case 'classic-1943': return 'cp-design-classic-1943';
    case 'modern-clean': return 'cp-design-modern-clean';
    case 'formal': return 'cp-design-formal';
  }
}

export function formatEventDate(d: string | null): string {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export interface RenderCtx {
  blocks: ProgramBlock[];                        // to find block by id
  piecesById: Map<string, ConcertProgramPiece>;
  roster: RosterSection[];                       // sections with members
  program: {
    title: string; subtitle: string | null; event_date: string | null; venue: string | null;
    conductor: string | null; accompanist: string | null; performer_group: string | null;
  };
  orgName: string | null;                        // from branding, for title/footer blocks
  logoUrl: string | null;
  qrDataUrl: string | null;                      // footer QR when showQr && published
}

function findBlock(ctx: RenderCtx, blockId: string): ProgramBlock | undefined {
  return ctx.blocks.find((b) => b.id === blockId);
}

function TitleBlockView({ block, ctx }: { block: Extract<ProgramBlock, { kind: 'title' }>; ctx: RenderCtx }) {
  const { program } = ctx;
  return (
    <div className="cp-title-block">
      {block.showLogo && ctx.logoUrl ? (
        <img className="cp-title-logo" src={ctx.logoUrl} alt="" />
      ) : null}
      {block.showOrgName && ctx.orgName ? (
        <div className="cp-title-org">{ctx.orgName}</div>
      ) : null}
      <div className="cp-title-name">{program.title}</div>
      <div className="cp-title-program-word">Program</div>
      {program.subtitle ? <div className="cp-title-subtitle">{program.subtitle}</div> : null}
      {program.conductor ? <div className="cp-title-credit">{program.conductor}, Conductor</div> : null}
      {program.accompanist ? <div className="cp-title-credit">{program.accompanist}, Accompanist</div> : null}
    </div>
  );
}

function DividerView() {
  return <div className="cp-divider">—o—</div>;
}

function TextView({ block }: { block: Extract<ProgramBlock, { kind: 'text' }> }) {
  const alignClass = block.align === 'left' ? 'cp-text-left' : 'cp-text-center';
  return <div className={`cp-text ${alignClass}`}>{block.text}</div>;
}

function FooterView({ block, ctx }: { block: Extract<ProgramBlock, { kind: 'footer' }>; ctx: RenderCtx }) {
  const { program } = ctx;
  const dateStr = formatEventDate(program.event_date);
  const showQr = !!(block.showQr && ctx.qrDataUrl);
  return (
    <div className="cp-footer-block">
      {ctx.orgName ? <div>{ctx.orgName}</div> : null}
      {dateStr || program.venue ? (
        <div>{[dateStr, program.venue].filter(Boolean).join(' — ')}</div>
      ) : null}
      {showQr ? <img className="cp-footer-qr" src={ctx.qrDataUrl!} alt="" /> : null}
    </div>
  );
}

export function PageItemView({ item, ctx }: { item: PageItem; ctx: RenderCtx }) {
  const { unit } = item;
  switch (unit.type) {
    case 'block': {
      const block = findBlock(ctx, unit.blockId);
      if (!block) return null;
      switch (block.kind) {
        case 'title': return <TitleBlockView block={block} ctx={ctx} />;
        case 'divider': return <DividerView />;
        case 'text': return <TextView block={block} />;
        case 'footer': return <FooterView block={block} ctx={ctx} />;
        default: return null;
      }
    }
    case 'group-header': {
      const block = findBlock(ctx, unit.blockId);
      if (!block || block.kind !== 'piece-group') return null;
      return (
        <div className="cp-group-header">
          {block.sectionHeading}{item.continued ? ' (continued)' : ''}
        </div>
      );
    }
    case 'piece-line': {
      const piece = ctx.piecesById.get(unit.pieceId);
      if (!piece) return null;
      return <PieceLine piece={piece} />;
    }
    case 'group-credit': {
      const block = findBlock(ctx, unit.blockId);
      if (!block || block.kind !== 'piece-group') return null;
      return <div className="cp-group-credit">{block.creditLine}</div>;
    }
    case 'roster-section': {
      const section = ctx.roster.find((s) => s.id === unit.sectionId);
      if (!section) return null;
      return (
        <div className="cp-roster-section">
          <div className="cp-roster-heading">{section.section_name}</div>
          <div className="cp-roster-names">
            {section.members.map((m) => (
              <div key={m.id}>{m.member_name}</div>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
