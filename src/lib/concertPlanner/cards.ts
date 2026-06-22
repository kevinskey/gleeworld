// Pure transform: program + pieces + roster + layout overrides
// → ordered ProgramCard[].
//
// This is the "one data set drives every layout block"
// engine. It runs the same way for both Editor and Audience views; the
// only difference is the consumer (the audience renderer drops cards
// where visible === false; the editor still shows them so the admin
// can toggle them back on).

import type {
  ConcertProgram,
  ConcertPiece,
  RosterSection,
  ProgramCard,
  PrintFormat,
} from './types';

// Stable IDs so card_layout overrides survive reorders of pieces (we key
// piece-detail cards off the piece id, not the order index).
const HERO_ID = 'hero';
const TIMELINE_ID = 'timeline';
const ROSTER_ID = 'roster';
const RIGHTS_ID = 'rights';
const QR_ID = 'qr';
const pieceCardId = (pieceId: string) => `piece:${pieceId}`;

interface BuildOptions {
  /** Print format influences which cards default to visible. The
   *  QR-lobby format intentionally hides everything except the hero +
   *  QR so the lobby flyer stays scannable. */
  printFormat?: PrintFormat;
}

export function transformProgramToCards(
  program: ConcertProgram | null,
  pieces: ConcertPiece[],
  roster: RosterSection[],
  options: BuildOptions = {},
): ProgramCard[] {
  if (!program) return [];

  const printFormat = options.printFormat ?? program.print_format;

  // Default visibility per kind. Print formats can shrink the visible
  // set; admins can hide further via card_layout.hidden in the editor.
  const defaultVisible: Record<string, boolean> = {
    [HERO_ID]: true,
    [TIMELINE_ID]: printFormat !== 'qr-lobby',
    [ROSTER_ID]: printFormat !== 'qr-lobby' && roster.length > 0,
    [RIGHTS_ID]: printFormat !== 'qr-lobby',
    [QR_ID]: printFormat === 'qr-lobby' || !!program.published_slug,
  };

  // Default order. Top anchors: Cover then Ensemble (so the audience
  // meets the performers before the music). Middle sortable group:
  // Program timeline + per-piece detail cards. Bottom anchors: Rights
  // then Share/QR (always last so the closing credits land at the end
  // of the printed program). The CardNavigator UI enforces the
  // top/bottom anchors at drag time — this transform just provides
  // the default order.
  const defaultCards: ProgramCard[] = [
    { id: HERO_ID, kind: 'hero-cover', title: program.title || 'Untitled program', visible: defaultVisible[HERO_ID] },
    { id: ROSTER_ID, kind: 'grid-roster', title: 'Ensemble', visible: defaultVisible[ROSTER_ID] },
    { id: TIMELINE_ID, kind: 'timeline-program', title: 'Program order', visible: defaultVisible[TIMELINE_ID] },
    ...pieces
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map<ProgramCard>((p) => {
        const id = pieceCardId(p.id);
        const pieceVisible = printFormat !== 'qr-lobby' && printFormat !== 'trifold';
        defaultVisible[id] = pieceVisible;
        return { id, kind: 'piece-detail', title: p.title, visible: pieceVisible, pieceId: p.id };
      }),
    { id: RIGHTS_ID, kind: 'rights-footer', title: 'Rights & credits', visible: defaultVisible[RIGHTS_ID] },
    { id: QR_ID, kind: 'qr-access', title: 'Open the digital program', visible: defaultVisible[QR_ID] },
  ];

  // Apply layout overrides: explicit order + hidden list.
  const layout = program.card_layout ?? {};
  const hiddenSet = new Set(layout.hidden ?? []);

  const ordered = layout.order && layout.order.length > 0
    ? orderByOverride(defaultCards, layout.order)
    : defaultCards;

  return ordered.map((c) => ({ ...c, visible: c.visible && !hiddenSet.has(c.id) }));
}

// Re-order according to an explicit list, with a smart insertion point
// for cards missing from the override (e.g. a piece added after the
// admin last saved a custom order).
//
// Rule: missing piece-detail cards land at the END of the piece group
// in the saved order — never after Rights/Share. Other missing cards
// (rare) fall back to their position in the default order.
function orderByOverride(cards: ProgramCard[], order: string[]): ProgramCard[] {
  const idx = new Map(order.map((id, i) => [id, i]));

  // Walk the saved order once and remember:
  //   - the highest index assigned to any piece-detail card so we can
  //     slot new pieces just after the last existing piece.
  //   - the lowest index of any "bottom anchor" card (rights/qr) so the
  //     piece-fallback never crosses that line.
  let lastPieceIdx = -1;
  let firstBottomIdx = Number.POSITIVE_INFINITY;
  const cardById = new Map(cards.map((c) => [c.id, c]));
  for (const id of order) {
    const c = cardById.get(id);
    if (!c) continue;
    const i = idx.get(id)!;
    if (c.kind === 'piece-detail' && i > lastPieceIdx) lastPieceIdx = i;
    if ((c.kind === 'rights-footer' || c.kind === 'qr-access') && i < firstBottomIdx) firstBottomIdx = i;
  }

  // Each missing piece-detail card gets a fractional index that puts
  // it after the last existing piece but BEFORE any bottom-anchor card.
  // Counter ensures multiple new pieces preserve their relative order.
  let newPieceCounter = 0;

  const sortKey = (c: ProgramCard): number => {
    if (idx.has(c.id)) return idx.get(c.id)!;
    if (c.kind === 'piece-detail') {
      const base = lastPieceIdx >= 0
        ? lastPieceIdx + 0.001
        : Math.min(firstBottomIdx, order.length) - 0.5;
      return base + (++newPieceCounter) * 0.0001;
    }
    // Non-piece missing card — drop at the very end, ordered by their
    // position in the default cards array.
    return order.length + cards.indexOf(c);
  };

  return cards.slice().sort((a, b) => sortKey(a) - sortKey(b));
}

export { HERO_ID, TIMELINE_ID, ROSTER_ID, RIGHTS_ID, QR_ID, pieceCardId };
