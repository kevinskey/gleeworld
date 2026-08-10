// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { NotationView } from './NotationView';
import { emptyScore, noteOf, type EditorScore } from '@/lib/notation/model';
import {
  PSALM_ENGRAVING_SCALE, PSALM_MIN_ENGRAVING_SCALE, PSALM_WIDTH_PX,
} from '@/lib/liturgy/psalmComposer';

afterEach(cleanup);

/** N bars of four quarter notes in 4/4. Deliberately WITHOUT lyrics: the
 *  words' widths come from canvas text metrics jsdom does not have, and this
 *  file is about how many bars a system reports, not how wide they are. */
function bars(n: number): EditorScore {
  return {
    ...emptyScore(),
    elements: Array.from({ length: n * 4 }, () => noteOf({ step: 'C', octave: 5, alter: 0 }, 'quarter')),
  };
}

function layoutOf(props: Parameters<typeof NotationView>[0]) {
  let seen: { rows: number; perRow: number } | null = null;
  render(<NotationView {...props} onLayout={(i) => { seen = i; }} />);
  return seen as unknown as { rows: number; perRow: number } | null;
}

describe('what NotationView reports about the layout it drew', () => {
  it('counts the measures a system actually holds', () => {
    // A row is [start, end) — end is exclusive — so a four-bar system is
    // end − start = 4. It used to add one, and the psalm dialog dutifully
    // told the user "(fits 5 here)" about a line it had asked to hold four:
    // a number the packer cannot produce, since MAX_PER_ROW_DESKTOP is 4.
    const info = layoutOf({ score: bars(4), width: 900, targetPerRow: 4 });
    expect(info).toEqual({ rows: 1, perRow: 4 });
  });

  it('reports the count it was asked for when two systems are needed', () => {
    const info = layoutOf({ score: bars(4), width: 900, targetPerRow: 2 });
    expect(info).toEqual({ rows: 2, perRow: 2 });
  });

  it('reports the one empty bar an empty score still draws', () => {
    // layoutMeasures always yields at least one measure, so a blank editor
    // shows an empty staff rather than nothing — and that IS one bar on one
    // system, which the old +1 reported as two.
    expect(layoutOf({ score: emptyScore(), width: 900 })).toEqual({ rows: 1, perRow: 1 });
  });
});

describe('fitScaleFloor keeps the requested bars on one line', () => {
  /** The SVG's viewBox width divided by its CSS width is 1 / engraving scale,
   *  which is the only place the size the renderer settled on is visible. */
  function engravedScale(container: HTMLElement): number {
    const svg = container.querySelector('svg')!;
    const vbW = Number((svg.getAttribute('viewBox') ?? '').split(/\s+/)[2]);
    return Number(svg.getAttribute('width')) / vbW;
  }

  it('is off when no floor is given — the packer drops the row instead', () => {
    // Four bars asked for in a card-width staff at the card's staff height.
    // Without a floor there is no fitting: the size is honoured and the bar
    // count is whatever fits.
    const { container } = render(
      <NotationView score={bars(4)} width={PSALM_WIDTH_PX} targetPerRow={4}
        scale={PSALM_ENGRAVING_SCALE} />,
    );
    expect(engravedScale(container)).toBeCloseTo(PSALM_ENGRAVING_SCALE, 10);
  });

  it('never engraves LARGER than the size it was given', () => {
    // Two sparse bars in a wide staff: there is room to spare, and spare room
    // must not become magnification.
    const { container } = render(
      <NotationView score={bars(2)} width={1200} targetPerRow={2}
        scale={PSALM_ENGRAVING_SCALE} fitScaleFloor={PSALM_MIN_ENGRAVING_SCALE} />,
    );
    expect(engravedScale(container)).toBeCloseTo(PSALM_ENGRAVING_SCALE, 10);
  });

  it('reduces the size, and only the size, when the bars will not fit', () => {
    // A staff far too narrow for four bars at this size. Fitting must keep
    // all four on one system and pay for it in scale.
    const narrow = 200;
    const info = layoutOf({
      score: bars(4), width: narrow, targetPerRow: 4,
      scale: PSALM_ENGRAVING_SCALE, fitScaleFloor: PSALM_MIN_ENGRAVING_SCALE,
    });
    expect(info).toEqual({ rows: 1, perRow: 4 });

    const { container } = render(
      <NotationView score={bars(4)} width={narrow} targetPerRow={4}
        scale={PSALM_ENGRAVING_SCALE} fitScaleFloor={PSALM_MIN_ENGRAVING_SCALE} />,
    );
    const fitted = engravedScale(container);
    expect(fitted).toBeLessThan(PSALM_ENGRAVING_SCALE);
    expect(fitted).toBeGreaterThanOrEqual(PSALM_MIN_ENGRAVING_SCALE);
  });

  it('stops at the floor and lets the packer refuse, rather than shrinking to nothing', () => {
    // A staff far too narrow for four bars at ANY readable size. Shrinking
    // without a floor would hand back four bars nobody can read; the floor
    // makes it four bars' worth of legible notes across as many systems as
    // that takes, which is what onLayout then reports.
    const { container } = render(
      <NotationView score={bars(4)} width={40} targetPerRow={4}
        scale={PSALM_ENGRAVING_SCALE} fitScaleFloor={PSALM_MIN_ENGRAVING_SCALE} />,
    );
    expect(engravedScale(container)).toBeCloseTo(PSALM_MIN_ENGRAVING_SCALE, 10);

    const info = layoutOf({
      score: bars(4), width: 40, targetPerRow: 4,
      scale: PSALM_ENGRAVING_SCALE, fitScaleFloor: PSALM_MIN_ENGRAVING_SCALE,
    });
    expect(info!.rows).toBeGreaterThan(1);
    expect(info!.perRow).toBeLessThan(4);
  });
});
