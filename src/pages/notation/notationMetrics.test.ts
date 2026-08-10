import { describe, it, expect } from 'vitest';
// VexFlow's TS shim under-declares its own exports — NotationView.tsx carries
// the same note, and the repo's typecheck baseline is full of the TS2305s a
// named import produces. Pulled through the namespace and typed to just the
// members used here, so this file adds none of its own.
import * as VexFlowNs from 'vexflow';
import { STAFF_SPACE, LYRIC_EM, LYRIC_POINT_SIZE } from './lyricSpacing';
import { fitScaleForRow } from './packRows';
import {
  PSALM_ENGRAVING_SCALE, PSALM_STAFF_HEIGHT_IN, PSALM_WIDTH_IN, CSS_DPI,
} from '@/lib/liturgy/psalmComposer';
import {
  AID_CONTENT_WIDTH_IN, PANEL_W_IN, PANEL_PAD_X_IN, SIDE_BAND_PAD_IN,
} from '@/lib/liturgy/aidPage';

const { Stave, Annotation, Font } = VexFlowNs as unknown as {
  Stave: new (x: number, y: number, width: number) => { getSpacingBetweenLines(): number };
  Annotation: new (text: string) => {
    setFont(family: string, size: number): unknown;
    fontInfo: { size: string | number };
  };
  Font: { convertSizeToPixelValue(size: string | number): number };
};

/**
 * The numbers the engraving's PRINTED size depends on, pinned against the
 * things that actually decide them — VexFlow's own geometry and the psalm
 * card's print spec — rather than against each other.
 */
describe('engraving units', () => {
  it('agrees with VexFlow about how big a staff space is', () => {
    // Everything downstream is a multiple of this: the psalm's engraving
    // scale is derived from it, and so is the lyric size. A VexFlow upgrade
    // that moved it would silently resize every printed score.
    expect(new Stave(0, 0, 100).getSpacingBetweenLines()).toBe(STAFF_SPACE);
  });

  it('reads a bare setFont size as POINTS, which is why LYRIC_POINT_SIZE exists', () => {
    // This is the bug, stated as a test. VexFlow is handed a number and draws
    // it as points; the layout measures the same words in engraving units. The
    // two only agree if the point size is the unit size × 0.75, so pass
    // LYRIC_EM here by mistake and this goes red instead of shipping words a
    // third too big for the width reserved for them.
    const ann = new Annotation('shepherd');
    ann.setFont('Times New Roman, Times, serif', LYRIC_POINT_SIZE);
    expect(Font.convertSizeToPixelValue(ann.fontInfo.size)).toBeCloseTo(LYRIC_EM, 6);
  });
});

describe('the psalm card prints at the size it says it does', () => {
  it('engraves a staff exactly PSALM_STAFF_HEIGHT_IN tall', () => {
    // scale is CSS pixels per engraving unit; a staff is four spaces tall.
    const staffHeightIn = (PSALM_ENGRAVING_SCALE * STAFF_SPACE * 4) / CSS_DPI;
    expect(staffHeightIn).toBeCloseTo(PSALM_STAFF_HEIGHT_IN, 10);
  });

  it('sets its lyrics smaller than the aid prints its own headings', () => {
    // The reported complaint, as a number: the words came out at 10.2pt beside
    // 8.6pt section headings. WorshipAidSheets sets headings at 8.6pt and body
    // text at 8pt; sung text belongs under both.
    const printedLyricPt = PSALM_ENGRAVING_SCALE * LYRIC_EM * 0.75;
    expect(printedLyricPt).toBeLessThan(8);
    expect(printedLyricPt).toBeGreaterThan(6);   // and still readable in a pew
  });

  it('takes the aid\'s narrowest column, so no page rescales it', () => {
    // The engraving's width and the slot's width are set in different files;
    // if they ever disagree the score is silently rescaled on the page. And
    // the narrowest column is the one that has to be met — content flows, so
    // the psalm can land on the panel whose margin clears the day/date band.
    expect(PSALM_WIDTH_IN).toBe(AID_CONTENT_WIDTH_IN);
    expect(PSALM_WIDTH_IN).toBeLessThanOrEqual(PANEL_W_IN - PANEL_PAD_X_IN - SIDE_BAND_PAD_IN);
  });

  it('never asks four bars to print SMALLER than the fit needs', () => {
    // What the old per-density table did: four bars were engraved at 0.62× the
    // two-bar size whatever the score, a multiplier tuned for a four-inch card
    // that no longer exists. Now the reduction is computed from the bars'
    // own widths, and a score that fits keeps the full size.
    const roomy = fitScaleForRow({
      widths: [80, 80, 80, 80], perRow: 4,
      cssWidth: PSALM_WIDTH_IN * CSS_DPI, maxScale: PSALM_ENGRAVING_SCALE,
      overheadUnits: 86,
    });
    expect(roomy).toBe(PSALM_ENGRAVING_SCALE);
  });

  it('shrinks rather than dropping a bar when four bars of lyrics will not fit', () => {
    // The reported psalm: four bars whose syllables need ~700 engraving units
    // between them. At the printed staff height that is about twelve inches of
    // system, which no panel of a 5.5in leaflet has — so the size gives way.
    const tight = fitScaleForRow({
      widths: [166.6, 177.3, 163.1, 194.2], perRow: 4,
      cssWidth: PSALM_WIDTH_IN * CSS_DPI, maxScale: PSALM_ENGRAVING_SCALE,
      overheadUnits: 86,
    });
    expect(tight).toBeLessThan(PSALM_ENGRAVING_SCALE);
    // …but still visibly bigger than the flat 0.62 penalty it replaces, which
    // is the whole complaint: "it can be wider so the 4 measure clips can be
    // bigger."
    expect(tight).toBeGreaterThan(PSALM_ENGRAVING_SCALE * 0.62);
    // And the staff it prints stays a small-score rastral, not the 10.6mm
    // that started this.
    const mm = (tight * STAFF_SPACE * 4 / CSS_DPI) * 25.4;
    expect(mm).toBeGreaterThan(5);
    expect(mm).toBeLessThan(7);
  });
});
