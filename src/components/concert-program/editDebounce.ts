// Shared debounce interval for piece-field commits — the page's inline
// EditableText commits (ConcertPlannerEditorPage.tsx) and PieceEditPopover's
// buffered form fields both use this so the two paths can't drift apart.
export const PIECE_FIELD_DEBOUNCE_MS = 700;
