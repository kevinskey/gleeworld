/**
 * The printed worship aid's PHYSICAL page geometry and type sizes.
 *
 * Its own module because two things need these numbers and neither can import
 * the other: WorshipAidSheets lays the panels out from them, and psalmComposer
 * sizes the engraved psalm to the column they leave over. worshipAid already
 * imports psalmComposer, so putting the geometry there would close an import
 * cycle around a set of module-level consts.
 *
 * Inches for the page, points for the type — for the reason WorshipAidSheets
 * gives: this is a physical object, and physical units are the only ones that
 * survive a print dialog unchanged.
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

/**
 * The aid's BODY text size, in points — the paragraph type a congregation
 * reads the words of the liturgy off.
 *
 * Here rather than inline in WorshipAidSheets because it is no longer only a
 * style: the engraved psalm's lyrics are set to this exact size, so a
 * congregation reads the sung words at the same size as the printed ones.
 * Kevin: "the psalm text size should match the other paragraph text on the
 * worship aid." Two numbers that merely agreed today would drift the first
 * time someone adjusted the page's type, and the drift would be invisible
 * until a print run — the psalm is a rasterised image by then, so nothing on
 * the page can reflow to reveal it.
 *
 * psalmComposer derives the engraving scale from this; the derivation is a
 * division, so this is the only number that has to be right. Changing it
 * resizes the aid's paragraphs AND the psalm's lyrics together, which is the
 * whole point — a large-print aid is one edit, not two that must match.
 */
export const AID_BODY_PT = 8;
