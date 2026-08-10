// @vitest-environment jsdom
//
// Engraving the psalm AT PRINT TIME.
//
// The worship aid used to print a JPEG made when the setting was saved, so
// three separate fixes to the engraver (staff height, card width, lyric size)
// all landed on a page that could not show any of them. What this covers is
// the replacement chain and, just as importantly, the fact that it stops at
// an <img>: the archive PDF composites with html2canvas, which is reliable
// with images and unpredictable with inline SVG.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';

const svgToJpegBlob = vi.fn();
vi.mock('@/lib/notation/exportImage', () => ({
  svgToJpegBlob: (...args: unknown[]) => svgToJpegBlob(...args),
}));

// A stand-in that draws a real <svg> — which is all this component reaches
// into VexFlow for — and reports the print spec it was handed.
vi.mock('@/pages/notation/NotationView', () => ({
  NotationView: ({ score, width, targetPerRow, scale, fitScaleFloor, lyricOffset }: {
    score: { elements: unknown[]; title: string };
    width?: number; targetPerRow?: number; scale?: number;
    fitScaleFloor?: number; lyricOffset?: number;
  }) => (
    <svg
      data-testid="staff"
      data-notes={score.elements.length}
      data-title={score.title}
      data-width={width}
      data-per-row={targetPerRow}
      data-scale={scale}
      data-fit-floor={fitScaleFloor}
      data-lyric-offset={lyricOffset}
    />
  ),
}));

import { PsalmEngraving } from './PsalmEngraving';
import { editorScoreToMusicXML } from '@/lib/notation/musicxmlWrite';
import { emptyScore, noteOf, type EditorScore } from '@/lib/notation/model';
import {
  PSALM_WIDTH_PX, PSALM_ENGRAVING_SCALE, PSALM_MIN_ENGRAVING_SCALE,
} from '@/lib/liturgy/psalmComposer';

const score: EditorScore = {
  ...emptyScore(),
  title: 'Psalm 34:2-9',
  elements: [
    { ...noteOf({ step: 'E', octave: 4, alter: 0 }, 'quarter'), lyric: 'Taste' },
    { ...noteOf({ step: 'G', octave: 4, alter: 0 }, 'quarter'), lyric: 'and' },
    { ...noteOf({ step: 'A', octave: 4, alter: 0 }, 'half'), lyric: 'see' },
  ],
};

const XML = editorScoreToMusicXML(score);

let created: string[] = [];
let revoked: string[] = [];

beforeEach(() => {
  created = [];
  revoked = [];
  let n = 0;
  // jsdom implements neither.
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:psalm-${++n}`;
    created.push(url);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url: string) => { revoked.push(url); });
  svgToJpegBlob.mockReset();
  svgToJpegBlob.mockResolvedValue(new Blob(['jpeg'], { type: 'image/jpeg' }));
});

afterEach(cleanup);

describe('engraving the stored score when the aid is built', () => {
  it('rasterises the staff it just drew and hands back an object URL', async () => {
    const onImage = vi.fn();
    render(<PsalmEngraving xml={XML} onImage={onImage} />);

    await waitFor(() => expect(onImage).toHaveBeenCalledWith('blob:psalm-1'));
    // The blob came from the SVG this component rendered — not from some
    // other element, and not from a URL fetched off storage.
    expect(svgToJpegBlob).toHaveBeenCalledTimes(1);
    expect(svgToJpegBlob.mock.calls[0][0]).toBe(screen.getByTestId('staff'));
  });

  it('draws at the composer\'s print spec, from the score\'s own values', async () => {
    const withPrefs = { ...score, barsPerLine: 4, lyricOffset: 6 };
    render(<PsalmEngraving xml={editorScoreToMusicXML(withPrefs)} onImage={vi.fn()} />);
    const staff = screen.getByTestId('staff');

    // Imported constants, not repeated numbers: the aid must engrave the same
    // card the composer showed, and #585/#588/#589 settled these.
    expect(staff.getAttribute('data-width')).toBe(String(PSALM_WIDTH_PX));
    expect(staff.getAttribute('data-scale')).toBe(String(PSALM_ENGRAVING_SCALE));
    expect(staff.getAttribute('data-fit-floor')).toBe(String(PSALM_MIN_ENGRAVING_SCALE));
    // And the two things the AUTHOR chose, which only reach here by having
    // survived the save.
    expect(staff.getAttribute('data-per-row')).toBe('4');
    expect(staff.getAttribute('data-lyric-offset')).toBe('6');
    expect(staff.getAttribute('data-notes')).toBe('3');
  });

  it('draws off-screen, laid out rather than hidden', async () => {
    // VexFlow measures text to space notes. display:none measures as zero and
    // the systems would pack wrong; this has to be a real layout the user
    // simply cannot see.
    render(<PsalmEngraving xml={XML} onImage={vi.fn()} />);
    const host = screen.getByTestId('psalm-engraving-host');
    expect(host.style.display).not.toBe('none');
    expect(host.style.visibility).not.toBe('hidden');
    expect(Number.parseFloat(host.style.left)).toBeLessThan(-1000);
    expect(host).toHaveAttribute('aria-hidden');
  });

  it('reports nothing when there is no score to engrave', async () => {
    const onImage = vi.fn();
    render(<PsalmEngraving xml={null} onImage={onImage} />);
    await waitFor(() => expect(onImage).toHaveBeenCalledWith(null));
    expect(screen.queryByTestId('staff')).toBeNull();
    expect(svgToJpegBlob).not.toHaveBeenCalled();
  });

  it('reports nothing rather than throwing on MusicXML that will not parse', async () => {
    const onImage = vi.fn();
    render(<PsalmEngraving xml="<score-partwise" onImage={onImage} />);
    await waitFor(() => expect(onImage).toHaveBeenCalledWith(null));
    expect(screen.queryByTestId('staff')).toBeNull();
  });

  it('reports nothing when rasterising fails, so the caller can fall back', async () => {
    // In practice: the music font did not load, and every notehead would have
    // come out an empty box. Printing tofu is worse than printing the words.
    svgToJpegBlob.mockRejectedValue(new Error('music font 404'));
    const onImage = vi.fn();
    render(<PsalmEngraving xml={XML} onImage={onImage} />);
    await waitFor(() => expect(onImage).toHaveBeenCalledWith(null));
    expect(created).toHaveLength(0);
  });
});

describe('not leaking a blob per render', () => {
  it('releases the object URL when the aid goes away', async () => {
    const onImage = vi.fn();
    const view = render(<PsalmEngraving xml={XML} onImage={onImage} />);
    await waitFor(() => expect(onImage).toHaveBeenCalledWith('blob:psalm-1'));
    expect(revoked).toEqual([]);
    view.unmount();
    expect(revoked).toEqual(['blob:psalm-1']);
  });

  it('releases the previous one when the score changes', async () => {
    const onImage = vi.fn();
    const other = editorScoreToMusicXML({ ...score, title: 'Psalm 63' });
    const view = render(<PsalmEngraving xml={XML} onImage={onImage} />);
    await waitFor(() => expect(onImage).toHaveBeenCalledWith('blob:psalm-1'));

    view.rerender(<PsalmEngraving xml={other} onImage={onImage} />);
    await waitFor(() => expect(onImage).toHaveBeenCalledWith('blob:psalm-2'));
    expect(revoked).toEqual(['blob:psalm-1']);

    view.unmount();
    expect(revoked).toEqual(['blob:psalm-1', 'blob:psalm-2']);
  });

  it('does not re-engrave when the page around it re-renders', async () => {
    // The aid page re-renders on every keystroke in a notice and every drag
    // of a spacing slider. Engraving is the expensive step; it is keyed on
    // the parsed document, not on the render.
    function Host() {
      const [n, setN] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setN((v) => v + 1)}>bump {n}</button>
          {/* A fresh arrow every render, exactly as the page passes. */}
          <PsalmEngraving xml={XML} onImage={() => undefined} />
        </>
      );
    }
    render(<Host />);
    await waitFor(() => expect(svgToJpegBlob).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('bump 2'));

    expect(svgToJpegBlob).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(1);
  });
});
