// Shared shape for the optional editing plumbing threaded through
// RenderCtx (BlockRenderers.tsx). Lives in its own module so PieceLine.tsx
// can reference it without importing BlockRenderers.tsx (which imports
// PieceLine) — that import direction would be circular.
//
// When RenderCtx.edit is undefined (print overlay, public page) or
// inlineEditable is false (mobile), renderers fall back to the original
// plain-text markup. Only the page (ConcertPlannerEditorPage) implements
// this contract; PieceEditPopover and EditableText stay dumb.
export interface ProgramEditCtx {
  selectedPieceId: string | null;
  onSelectPiece(id: string): void;
  /** Returns `false` when the commit is rejected (e.g. a blank title) —
   *  EditableText uses that to snap its DOM back to the last-good value. */
  onCommitPieceField(pieceId: string, field: 'title' | 'composer', value: string): boolean;
  onCommitBlockField(blockId: string, field: 'sectionHeading' | 'creditLine' | 'text', value: string): void;
  /** Returns `false` when the commit is rejected (title only — a blank
   *  program title is never accepted). */
  onCommitHeaderField(
    field: 'title' | 'subtitle' | 'conductor' | 'accompanist' | 'venue' | 'performer_group',
    value: string,
  ): boolean;
  /** event_date commits immediately (no debounce) — it's a date picker, not typed text. */
  onCommitEventDate(value: string | null): void;
  onFastEnter(pieceId: string): void;
  onTabToComposer(pieceId: string): void;
  /** Enter in the composer field: focus the next piece's title (or add one at the group's end). */
  onComposerEnter(pieceId: string): void;
  onOpenPieceEditor(pieceId: string, focusField?: string): void;
  onAddPieceAtEnd(groupId: string): void;
  /** Registers the DOM node for a piece's title editor (key: pieceId) or
   *  composer editor (key: `${pieceId}:composer`) so the page can drive
   *  focus for fast entry and Tab routing. Call with `null` to unregister. */
  registerPieceEl(key: string, el: HTMLElement | null): void;
  /** false below the 1024px breakpoint: renderers show plain text + tap-to-open instead of contentEditable. */
  inlineEditable: boolean;
}
