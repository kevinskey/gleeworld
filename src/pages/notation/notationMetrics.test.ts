import { describe, it, expect } from 'vitest';
// VexFlow's TS shim under-declares its own exports — NotationView.tsx carries
// the same note, and the repo's typecheck baseline is full of the TS2305s a
// named import produces. Pulled through the namespace and typed to just the
// members used here, so this file adds none of its own.
import * as VexFlowNs from 'vexflow';
import { STAFF_SPACE, LYRIC_EM, LYRIC_POINT_SIZE } from './lyricSpacing';
import { fitScaleForRow } from './packRows';
import {
  PSALM_ENGRAVING_SCALE, PSALM_MIN_ENGRAVING_SCALE, PSALM_STAFF_HEIGHT_IN,
  PSALM_LYRIC_PT, PSALM_WIDTH_IN, CSS_DPI,
} from '@/lib/liturgy/psalmComposer';
import {
  AID_CONTENT_WIDTH_IN, AID_BODY_PT, PANEL_W_IN, PANEL_PAD_X_IN, SIDE_BAND_PAD_IN,
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

  it('sets its lyrics at the size the aid prints its own paragraphs', () => {
    // The whole spec, as one number. The words are drawn at LYRIC_EM units and
    // every unit prints PSALM_ENGRAVING_SCALE CSS px, and 96 CSS px is 72pt —
    // so this product IS what comes off the printer. It read 6.11pt beside 8pt
    // body text; a congregation reads the sung words off the page the same way
    // it reads the printed ones.
    const printedLyricPt = PSALM_ENGRAVING_SCALE * LYRIC_EM * 0.75;
    expect(printedLyricPt).toBeCloseTo(AID_BODY_PT, 10);
    // …by derivation, not coincidence: change the aid's body size and the
    // engraving follows it.
    expect(PSALM_LYRIC_PT).toBe(AID_BODY_PT);
  });

  it('will not let the renderer shrink the words below reading size', () => {
    // #588 let the engraving shrink so the requested bars stayed on one line.
    // A scale shrinks the lyrics with the staff, so any shrink prints them
    // under the aid's body size — the floor is therefore the size itself, and
    // the bars per line are what give way instead.
    expect(PSALM_MIN_ENGRAVING_SCALE).toBe(PSALM_ENGRAVING_SCALE);
    const floorPt = PSALM_MIN_ENGRAVING_SCALE * LYRIC_EM * 0.75;
    expect(floorPt).toBeGreaterThanOrEqual(AID_BODY_PT);
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

  it('holds the size when four bars of lyrics will not fit, and lets the line drop', () => {
    // The reported psalm: four bars whose syllables need ~700 engraving units
    // between them, which at reading size is about a foot of system — more
    // than any panel of a 5.5in leaflet has. #588 answered that by shrinking
    // the engraving to 5.39mm so the four bars stayed on one line, and the
    // words went to 6.11pt with it. The floor now refuses that trade.
    const psalmArgs = {
      widths: [166.6, 177.3, 163.1, 194.2], perRow: 4,
      cssWidth: PSALM_WIDTH_IN * CSS_DPI, maxScale: PSALM_ENGRAVING_SCALE,
      overheadUnits: 86,
    };
    expect(fitScaleForRow({ ...psalmArgs, minScale: PSALM_MIN_ENGRAVING_SCALE }))
      .toBe(PSALM_ENGRAVING_SCALE);

    // The floor is what does that, not the arithmetic: hand the same bars a
    // floor below reading size and the fitting shrinks them exactly as before.
    // So this pins the mechanism #588 built as still working, and the psalm's
    // choice not to use it as a choice.
    const unfloored = fitScaleForRow({ ...psalmArgs, minScale: 0 });
    expect(unfloored).toBeLessThan(PSALM_ENGRAVING_SCALE);
    expect(unfloored * LYRIC_EM * 0.75).toBeLessThan(AID_BODY_PT);
  });

  it('prints a staff at the top of the hymnal range, which 8pt words imply', () => {
    // Stated as a number because it is the cost of the spec and should go red
    // if anyone changes it by accident. Lyric size is a fixed multiple of
    // staff space, so pinning the words at the aid's body size pins the staff
    // too: 7.06mm, where 6–7mm is the small-score norm. The only route to 8pt
    // words on a smaller staff is a looser lyric-to-staff ratio, which is a
    // house-style change reaching every engraved score in the app.
    const mm = (PSALM_ENGRAVING_SCALE * STAFF_SPACE * 4 / CSS_DPI) * 25.4;
    expect(mm).toBeCloseTo(7.06, 2);
    expect(mm).toBeCloseTo(PSALM_STAFF_HEIGHT_IN * 25.4, 10);
  });
});
