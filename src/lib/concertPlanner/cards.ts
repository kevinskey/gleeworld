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

// Re-order according to an explicit list. Cards missing from the override
// keep their relative positions at the end (so a new piece doesn't vanish
// just because the admin saved an older layout snapshot).
function orderByOverride(cards: ProgramCard[], order: string[]): ProgramCard[] {
  const idx = new Map(order.map((id, i) => [id, i]));
  return cards.slice().sort((a, b) => {
    const ia = idx.has(a.id) ? idx.get(a.id)! : order.length + cards.indexOf(a);
    const ib = idx.has(b.id) ? idx.get(b.id)! : order.length + cards.indexOf(b);
    return ia - ib;
  });
}

export { HERO_ID, TIMELINE_ID, ROSTER_ID, RIGHTS_ID, QR_ID, pieceCardId };
