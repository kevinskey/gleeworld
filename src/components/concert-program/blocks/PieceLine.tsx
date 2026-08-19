import type { KeyboardEvent } from 'react';
import type { ConcertProgramPiece } from '@/hooks/useConcertPrograms';
import type { ProgramEditCtx } from '../editTypes';
import { EditableText } from '../EditableText';

export function composerCredit(p: Pick<ConcertProgramPiece, 'composer' | 'arranger'>): string {
  if (p.composer && p.arranger) return `${p.composer}, arr. ${p.arranger}`;
  if (p.composer) return p.composer;
  if (p.arranger) return `arr. ${p.arranger}`;
  return '';
}

function rightsLabel(rights: ConcertProgramPiece['rights_status']): string {
  const status = rights ?? 'unknown';
  if (status === 'public_domain') return 'Public domain';
  if (status === 'licensed') return 'Licensed';
  return 'Unknown rights';
}

function activate(fn: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
  };
}

function ChipsRow({ piece, edit }: { piece: ConcertProgramPiece; edit: ProgramEditCtx }) {
  const status = piece.rights_status ?? 'unknown';
  const openField = (field: string) => () => edit.onOpenPieceEditor(piece.id, field);
  return (
    <div className="cp-screen-chips">
      {!piece.arranger ? (
        <span className="cp-chip" role="button" tabIndex={0} onClick={openField('arranger')} onKeyDown={activate(openField('arranger'))}>
          + arranger
        </span>
      ) : null}
      {!piece.voicing ? (
        <span className="cp-chip" role="button" tabIndex={0} onClick={openField('voicing')} onKeyDown={activate(openField('voicing'))}>
          + voicing
        </span>
      ) : null}
      {!piece.soloists ? (
        <span className="cp-chip" role="button" tabIndex={0} onClick={openField('soloists')} onKeyDown={activate(openField('soloists'))}>
          + soloists
        </span>
      ) : null}
      <span
        className={`cp-chip${status === 'unknown' ? ' cp-chip-rights-unknown' : ''}`}
        role="button"
        tabIndex={0}
        onClick={openField('rights_status')}
        onKeyDown={activate(openField('rights_status'))}
      >
        {rightsLabel(piece.rights_status)}
      </span>
    </div>
  );
}

export interface PieceLineProps {
  piece: ConcertProgramPiece;
  /** Present only from the editor; undefined for print overlay + public page (unchanged markup). */
  edit?: ProgramEditCtx;
  groupId?: string;
  isLastInGroup?: boolean;
}

export function PieceLine({ piece, edit, groupId, isLastInGroup }: PieceLineProps) {
  const credit = composerCredit(piece);

  if (!edit) {
    return (
      <div className="cp-piece">
        <div className="cp-piece-line">
          <span className="cp-piece-title">{piece.title}</span>
          <span className="cp-leader" aria-hidden="true" />
          {credit ? <span className="cp-piece-composer">{credit}</span> : null}
        </div>
        {piece.voicing ? <div className="cp-piece-voicing">{piece.voicing}</div> : null}
        {piece.soloists ? <div className="cp-piece-soloists">{piece.soloists}</div> : null}
      </div>
    );
  }

  // Mobile (<1024px): plain text, tap anywhere on the line to open the dialog.
  if (!edit.inlineEditable) {
    return (
      <div className="cp-piece" onClick={() => edit.onOpenPieceEditor(piece.id)}>
        <div className="cp-piece-line">
          <span className="cp-piece-title">{piece.title}</span>
          <span className="cp-leader" aria-hidden="true" />
          {credit ? <span className="cp-piece-composer">{credit}</span> : null}
        </div>
        {piece.voicing ? <div className="cp-piece-voicing">{piece.voicing}</div> : null}
        {piece.soloists ? <div className="cp-piece-soloists">{piece.soloists}</div> : null}
      </div>
    );
  }

  // Desktop: click-to-edit in place, fast entry, ghost chips for empty fields.
  const selected = edit.selectedPieceId === piece.id;
  return (
    <>
      <div className="cp-piece" onClick={() => edit.onSelectPiece(piece.id)}>
        <div className="cp-piece-line">
          <EditableText
            className="cp-piece-title"
            value={piece.title}
            placeholder="Piece title"
            onCommit={(v) => edit.onCommitPieceField(piece.id, 'title', v)}
            inputRef={(el) => edit.registerPieceEl(piece.id, el)}
            onKeyDownCapture={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                edit.onFastEnter(piece.id);
              } else if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                edit.onTabToComposer(piece.id);
              }
            }}
          />
          <span className="cp-leader" aria-hidden="true" />
          <EditableText
            className="cp-piece-composer"
            value={piece.composer ?? ''}
            placeholder="Composer"
            onCommit={(v) => edit.onCommitPieceField(piece.id, 'composer', v)}
            inputRef={(el) => edit.registerPieceEl(`${piece.id}:composer`, el)}
            onKeyDownCapture={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                edit.onComposerEnter(piece.id);
              }
            }}
          />
        </div>
        {piece.voicing ? <div className="cp-piece-voicing">{piece.voicing}</div> : null}
        {piece.soloists ? <div className="cp-piece-soloists">{piece.soloists}</div> : null}
        {selected ? <ChipsRow piece={piece} edit={edit} /> : null}
      </div>
      {groupId && isLastInGroup ? (
        <div className="cp-add-piece-row-wrap">
          <span
            className="cp-add-piece-row"
            role="button"
            tabIndex={0}
            onClick={() => edit.onAddPieceAtEnd(groupId)}
            onKeyDown={activate(() => edit.onAddPieceAtEnd(groupId))}
          >
            + piece
          </span>
        </div>
      ) : null}
    </>
  );
}
