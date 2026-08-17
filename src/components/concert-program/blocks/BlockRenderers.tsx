// Shared block renderers for the concert program editor, print overlay,
// and public page. Presentational only — no supabase, no data-fetching
// hooks. Type in pt, geometry in in; no Tailwind classes inside page
// content (spec: "The block model" / "Print designs").
//
// `ctx.edit` (ProgramEditCtx) is OPTIONAL and only ever supplied by the
// editor page. When it's undefined (print overlay, public page) or
// `inlineEditable` is false (mobile), every view below falls through to
// its original plain-text branch — print/public rendering is unchanged.
import { useState } from 'react';
import '@/styles/concert-program.css';
import type { ProgramBlock, PrintDesign } from '@/lib/concertProgram/types';
import type { PageItem } from '@/lib/concertProgram/paginate';
import type { ConcertProgramPiece } from '@/hooks/useConcertPrograms';
import type { RosterSection } from '@/lib/concertPlanner/types';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { PieceLine } from './PieceLine';
import { EditableText } from '../EditableText';
import type { ProgramEditCtx } from '../editTypes';

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
  edit?: ProgramEditCtx;
}

function findBlock(ctx: RenderCtx, blockId: string): ProgramBlock | undefined {
  return ctx.blocks.find((b) => b.id === blockId);
}

function TitleBlockView({ block, ctx }: { block: Extract<ProgramBlock, { kind: 'title' }>; ctx: RenderCtx }) {
  const { program } = ctx;
  const edit = ctx.edit?.inlineEditable ? ctx.edit : undefined;
  return (
    <div className="cp-title-block">
      {block.showLogo && ctx.logoUrl ? (
        <img className="cp-title-logo" src={ctx.logoUrl} alt="" />
      ) : null}
      {block.showOrgName && ctx.orgName ? (
        <div className="cp-title-org">{ctx.orgName}</div>
      ) : null}
      {edit ? (
        <EditableText
          className="cp-title-name"
          value={program.title}
          placeholder="Program title"
          onCommit={(v) => edit.onCommitHeaderField('title', v)}
        />
      ) : (
        <div className="cp-title-name">{program.title}</div>
      )}
      <div className="cp-title-program-word">Program</div>
      {edit ? (
        <div className="cp-title-subtitle">
          <EditableText
            value={program.subtitle ?? ''}
            placeholder="Subtitle"
            onCommit={(v) => edit.onCommitHeaderField('subtitle', v)}
          />
        </div>
      ) : (
        program.subtitle ? <div className="cp-title-subtitle">{program.subtitle}</div> : null
      )}
      {edit ? (
        <div className="cp-title-credit">
          <EditableText
            value={program.conductor ?? ''}
            placeholder="Conductor"
            onCommit={(v) => edit.onCommitHeaderField('conductor', v)}
          />
          {program.conductor ? ', Conductor' : null}
        </div>
      ) : (
        program.conductor ? <div className="cp-title-credit">{program.conductor}, Conductor</div> : null
      )}
      {edit ? (
        <div className="cp-title-credit">
          <EditableText
            value={program.accompanist ?? ''}
            placeholder="Accompanist"
            onCommit={(v) => edit.onCommitHeaderField('accompanist', v)}
          />
          {program.accompanist ? ', Accompanist' : null}
        </div>
      ) : (
        program.accompanist ? <div className="cp-title-credit">{program.accompanist}, Accompanist</div> : null
      )}
    </div>
  );
}

function DividerView() {
  return <div className="cp-divider">—o—</div>;
}

/** Screen-only, edit-mode-only placeholder for a roster block with no
 *  sections that have members yet. Print/public render nothing for this
 *  case (see the pagination fallback in paginate.ts) — `ctx.edit` is only
 *  ever supplied by the editor page, so the `!edit` branch here is dead
 *  code on print/public and this function always returns null there. */
function RosterEmptyPlaceholder({ ctx }: { ctx: RenderCtx }) {
  const edit = ctx.edit;
  if (!edit) return null;
  const open = () => edit.onOpenRoster?.();
  return (
    <div
      className="cp-roster-empty"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
    >
      Roster — click to add sections and names
    </div>
  );
}

function TextView({ block, ctx }: { block: Extract<ProgramBlock, { kind: 'text' }>; ctx: RenderCtx }) {
  const alignClass = block.align === 'left' ? 'cp-text-left' : 'cp-text-center';
  const edit = ctx.edit?.inlineEditable ? ctx.edit : undefined;
  if (edit) {
    return (
      <div className={`cp-text ${alignClass}`}>
        <EditableText
          multiline
          value={block.text}
          placeholder="Program note"
          onCommit={(v) => edit.onCommitBlockField(block.id, 'text', v)}
        />
      </div>
    );
  }
  return <div className={`cp-text ${alignClass}`}>{block.text}</div>;
}

/** Small screen-only popover for the event date — a date is picked, not typed letter by letter. */
function EventDateEditor({ dateStr, edit }: { dateStr: string; edit: ProgramEditCtx }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <span
          className="cp-screen-editable"
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
        >
          {dateStr || 'Add date'}
        </span>
      </PopoverAnchor>
      <PopoverContent className="w-56">
        <label className="text-xs font-medium block mb-1" htmlFor="cp-footer-event-date">Event date</label>
        <input
          id="cp-footer-event-date"
          type="date"
          className="w-full border rounded px-2 py-1 text-sm"
          onChange={(e) => {
            edit.onCommitEventDate(e.target.value || null);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function FooterView({ block, ctx }: { block: Extract<ProgramBlock, { kind: 'footer' }>; ctx: RenderCtx }) {
  const { program } = ctx;
  const dateStr = formatEventDate(program.event_date);
  const showQr = !!(block.showQr && ctx.qrDataUrl);
  const edit = ctx.edit?.inlineEditable ? ctx.edit : undefined;

  if (edit) {
    return (
      <div className="cp-footer-block">
        {ctx.orgName ? <div>{ctx.orgName}</div> : null}
        <div>
          <EventDateEditor dateStr={dateStr} edit={edit} />
          {' — '}
          <EditableText
            value={program.venue ?? ''}
            placeholder="Venue"
            onCommit={(v) => edit.onCommitHeaderField('venue', v)}
          />
        </div>
        {showQr ? <img className="cp-footer-qr" src={ctx.qrDataUrl!} alt="" /> : null}
      </div>
    );
  }

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
  const edit = ctx.edit?.inlineEditable ? ctx.edit : undefined;
  switch (unit.type) {
    case 'block': {
      const block = findBlock(ctx, unit.blockId);
      if (!block) return null;
      switch (block.kind) {
        case 'title': return <TitleBlockView block={block} ctx={ctx} />;
        case 'divider': return <DividerView />;
        case 'text': return <TextView block={block} ctx={ctx} />;
        case 'footer': return <FooterView block={block} ctx={ctx} />;
        case 'roster': return <RosterEmptyPlaceholder ctx={ctx} />;
        default: return null;
      }
    }
    case 'group-header': {
      const block = findBlock(ctx, unit.blockId);
      if (!block || block.kind !== 'piece-group') return null;
      if (edit) {
        return (
          <div className="cp-group-header">
            <EditableText
              value={block.sectionHeading ?? ''}
              placeholder="Section heading"
              onCommit={(v) => edit.onCommitBlockField(block.id, 'sectionHeading', v)}
            />
            {item.continued ? ' (continued)' : ''}
          </div>
        );
      }
      return (
        <div className="cp-group-header">
          {block.sectionHeading}{item.continued ? ' (continued)' : ''}
        </div>
      );
    }
    case 'piece-line': {
      const piece = ctx.piecesById.get(unit.pieceId);
      if (!piece) return null;
      const group = findBlock(ctx, unit.blockId);
      const isLastInGroup = !!group && group.kind === 'piece-group'
        && group.pieceIds[group.pieceIds.length - 1] === unit.pieceId;
      return (
        <PieceLine
          piece={piece}
          edit={ctx.edit}
          groupId={unit.blockId}
          isLastInGroup={isLastInGroup}
        />
      );
    }
    case 'group-credit': {
      const block = findBlock(ctx, unit.blockId);
      if (!block || block.kind !== 'piece-group') return null;
      if (edit) {
        return (
          <div className="cp-group-credit">
            <EditableText
              value={block.creditLine ?? ''}
              placeholder="Credit line"
              onCommit={(v) => edit.onCommitBlockField(block.id, 'creditLine', v)}
            />
          </div>
        );
      }
      return <div className="cp-group-credit">{block.creditLine}</div>;
    }
    case 'roster-section': {
      const section = ctx.roster.find((s) => s.id === unit.sectionId);
      if (!section) return null;
      const names = (
        <>
          <div className="cp-roster-heading">{section.section_name}</div>
          <div className="cp-roster-names">
            {section.members.map((m) => (
              <div key={m.id}>{m.member_name}</div>
            ))}
          </div>
        </>
      );
      // Print/public: unchanged. Editor (either breakpoint): click-to-open
      // the roster panel — a roster section has no inline field editing of
      // its own, so there's nothing else for a click on it to do.
      if (!ctx.edit) return <div className="cp-roster-section">{names}</div>;
      const openRoster = () => ctx.edit!.onOpenRoster?.();
      return (
        <div
          className="cp-roster-section cp-roster-section-editable"
          role="button"
          tabIndex={0}
          onClick={openRoster}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRoster(); } }}
        >
          {names}
        </div>
      );
    }
    default:
      return null;
  }
}
