/**
 * The printed worship aid's PHYSICAL page geometry.
 *
 * Its own module because two things need these numbers and neither can import
 * the other: WorshipAidSheets lays the panels out from them, and psalmComposer
 * sizes the engraved psalm to the column they leave over. worshipAid already
 * imports psalmComposer, so putting the geometry there would close an import
 * cycle around a set of module-level consts.
 *
 * Inches throughout, for the reason WorshipAidSheets gives: this is a physical
 * object, and inches are the only units that survive a print dialog unchanged.
 */

/** 11×8.5 landscape, folded once — so each panel is half the sheet. */
export const PANEL_W_IN = 5.5;
export const SHEET_H_IN = 8.5;

/** A panel's ordinary margins. */
export const PANEL_PAD_Y_IN = 0.42;
export const PANEL_PAD_X_IN = 0.40;

/** The day/date band that runs up the outer edge of the inside-right panel. */
export const SIDE_BAND_W_IN = 0.62;
/** …and the right margin that panel therefore needs instead of the ordinary
 *  one, so text clears the band rather than printing under it. */
export const SIDE_BAND_PAD_IN = 0.80;

/** The back cover indents its column past the vertical spine text. */
export const SPINE_INDENT_IN = 0.22;

/**
 * Every content column the aid has, widest first — inside-left, back cover
 * (with its spine), inside-right (with its band).
 */
const CONTENT_COLUMNS_IN = [
  PANEL_W_IN - 2 * PANEL_PAD_X_IN,                     // 4.70 — inside left
  PANEL_W_IN - 2 * PANEL_PAD_X_IN - SPINE_INDENT_IN,   // 4.48 — back cover
  PANEL_W_IN - PANEL_PAD_X_IN - SIDE_BAND_PAD_IN,      // 4.30 — inside right
];

/**
 * The width a block can occupy on ANY page of the aid — the narrowest of them.
 *
 * Not the widest, and not the one the block happens to be generated for.
 * Content is flowed across the three text pages (see lib/liturgy/flow), so
 * which column a block lands in is decided by how much precedes it, not by
 * where it was written. Anything engraved wider than the narrowest column is
 * fine until the day it flows onto the inside-right panel, where the img's
 * `max-width: 100%` silently reduces it — and a rescaled engraving is exactly
 * the defect that made the psalm print at three different staff sizes before.
 *
 * So: the psalm is engraved at a width every page can print at 1:1, and the
 * caps in WorshipAidSheets stay what they were meant to be — a safety net that
 * never actually has to fire.
 */
export const AID_CONTENT_WIDTH_IN = Math.min(...CONTENT_COLUMNS_IN);
