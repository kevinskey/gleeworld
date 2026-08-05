// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useEffect } from 'react';

const savePsalmToLibrary = vi.fn().mockResolvedValue({ id: 'row-1', imageUrl: null });

vi.mock('@/lib/liturgy/psalmScores', () => ({
  savePsalmToLibrary: (...args: unknown[]) => savePsalmToLibrary(...args),
}));
// jsdom has no AudioContext; the entry click would otherwise throw on every note.
const playPitch = vi.fn();
vi.mock('@/lib/notation/pitchAudio', () => ({ playPitch: (...a: unknown[]) => playPitch(...a) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'cantor@example.org', user_metadata: { full_name: 'A Cantor' } } }),
}));
// The engraver is exercised by the notation module's own tests; here it is
// noise (VexFlow measures real DOM boxes, which jsdom reports as zero).
vi.mock('@/pages/notation/NotationView', () => ({
  NotationView: ({ score, targetPerRow, scale, onLayout, onNoteClick }: {
    score: { elements: unknown[] };
    targetPerRow?: number; scale?: number;
    onLayout?: (i: { rows: number; perRow: number }) => void;
    onNoteClick?: (i: number) => void;
  }) => {
    // Stand in for the real packer honouring the request, so the dialog's
    // reporting can be tested without VexFlow measuring real glyph boxes.
    //
    // In an EFFECT, not in the render body. onLayout sets state in the
    // parent; calling it while rendering re-renders the parent, which
    // re-renders this child, which calls it again — an infinite loop that
    // hangs the whole run rather than failing. (The real NotationView calls
    // it from its render effect, so it does not have this problem.)
    useEffect(() => { onLayout?.({ rows: 1, perRow: targetPerRow ?? 0 }); }, [onLayout, targetPerRow]);
    return (
      <div
        data-testid="staff"
        data-notes={score.elements.length}
        data-per-row={targetPerRow}
        data-scale={scale}
      >
        {score.elements.map((_, i) => (
          <button key={i} type="button" data-testid={`note-${i}`} onClick={() => onNoteClick?.(i)} />
        ))}
      </div>
    );
  },
}));

import { PsalmComposerDialog } from './PsalmComposerDialog';

const PSALM = 'R. Taste and see the goodness of the Lord.\nI will bless the Lord at all times';

// The real shape: no "R." marker, the refrain simply recurring between verses.
const REFRAIN_PSALM = [
  'The Lord will guard us, as a shepherd guards his flock.',
  'O nations, hear the word of the Lord,',
  'The Lord will guard us, as a shepherd guards his flock.',
].join('\n');

function open(props: Partial<React.ComponentProps<typeof PsalmComposerDialog>> = {}) {
  return render(
    <PsalmComposerDialog
      open
      onClose={vi.fn()}
      citation="Psalm 34:2-9"
      observation="19th Sunday in Ordinary Time"
      psalmText={PSALM}
      {...props}
    />,
  );
}

beforeEach(() => { savePsalmToLibrary.mockClear(); playPitch.mockClear(); });
afterEach(cleanup);

describe('PsalmComposerDialog', () => {
  it('titles the setting from the citation and the day', () => {
    open();
    expect(screen.getByLabelText(/title/i)).toHaveValue('Psalm 34:2-9 — 19th Sunday in Ordinary Time');
  });

  it('credits the signed-in user as composer, editably', () => {
    open();
    const composer = screen.getByLabelText(/composed by/i);
    expect(composer).toHaveValue('A Cantor');
    fireEvent.change(composer, { target: { value: 'Sister Thea' } });
    expect(composer).toHaveValue('Sister Thea');
  });

  it('offers both entry alphabets — scale degrees and letters', () => {
    open();
    for (const d of ['1', '2', '3', '4', '5', '6', '7']) {
      expect(screen.getByRole('button', { name: d })).toBeInTheDocument();
    }
    for (const l of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
      expect(screen.getByRole('button', { name: l })).toBeInTheDocument();
    }
  });

  it('adds a note when a scale degree is pressed', () => {
    open();
    expect(screen.getByTestId('staff')).toHaveAttribute('data-notes', '0');
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(screen.getByTestId('staff')).toHaveAttribute('data-notes', '1');
  });

  // The refrain marker "R." and the verse numbers are apparatus, never sung.
  it('queues the psalm words and consumes them as notes are entered', () => {
    open();
    expect(screen.getByText(/16 words left/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(screen.getByText(/15 words left/)).toBeInTheDocument();
  });

  it('refuses to save an empty staff rather than filing a blank score', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: /save to library/i }));
    expect(savePsalmToLibrary).not.toHaveBeenCalled();
  });

  it('saves the composed setting with its title and composer', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: /save to library/i }));
    await vi.waitFor(() => expect(savePsalmToLibrary).toHaveBeenCalled());
    const arg = savePsalmToLibrary.mock.calls[0][0];
    expect(arg.title).toBe('Psalm 34:2-9 — 19th Sunday in Ordinary Time');
    expect(arg.composer).toBe('A Cantor');
    expect(arg.score.elements).toHaveLength(1);
  });

  it('offers key, mode, metre and clef', () => {
    open();
    expect(screen.getByLabelText(/^key$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/metre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/clef/i)).toBeInTheDocument();
  });

  it('offers rests and dotted durations', () => {
    open();
    expect(screen.getByRole('button', { name: /^rest$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^dotted$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /double dotted/i })).toBeInTheDocument();
  });

  // Spelled-out durations rather than 𝅝/𝅗𝅥: those live in the Unicode
  // Supplementary Plane and rendered as tofu boxes with the bundled fonts.
  it('names durations in text so none of them render as tofu', () => {
    open();
    for (const label of ['Whole', 'Half', 'Quarter', '8th', '16th']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('carries the armed dot onto the next note', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: /^dotted$/i }));
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: /save to library/i }));
    return vi.waitFor(() => {
      const el = savePsalmToLibrary.mock.calls[0][0].score.elements[0];
      expect(el.dots).toBe(1);
    });
  });

  // The whole point of keying the number row: after switching to E flat,
  // degree 3 has to be G rather than E.
  it('re-aims the number row when the key changes', async () => {
    open();
    fireEvent.change(screen.getByLabelText(/^key$/i), { target: { value: '-3' } });
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: /save to library/i }));
    await vi.waitFor(() => expect(savePsalmToLibrary).toHaveBeenCalled());
    const saved = savePsalmToLibrary.mock.calls[0][0].score;
    expect(saved.keyFifths).toBe(-3);
    expect(saved.elements[0].pitch).toMatchObject({ step: 'G', alter: 0 });
  });

  it('keeps the chosen metre on the saved score', async () => {
    open();
    fireEvent.change(screen.getByLabelText(/metre/i), { target: { value: '6/8' } });
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: /save to library/i }));
    await vi.waitFor(() => expect(savePsalmToLibrary).toHaveBeenCalled());
    expect(savePsalmToLibrary.mock.calls[0][0].score.timeSig).toEqual({ beats: 6, beatType: 8 });
  });

  // Kevin: "i will never use one measure wide on a four inch wide space."
  // One-per-line is not merely avoided, it is not offered — the only choices
  // are 2 and 4.
  it('never lays out a single measure per line', () => {
    open();
    for (let i = 0; i < 6; i++) fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(screen.getByTestId('staff').getAttribute('data-per-row')).not.toBe('1');
    expect(screen.queryByRole('button', { name: /1 per line/i })).not.toBeInTheDocument();
    for (const n of ['2 per line', '4 per line']) {
      expect(screen.getByRole('button', { name: new RegExp(n, 'i') })).toBeInTheDocument();
    }
  });

  // Each word is its own <span> so it can be highlighted, so text matchers
  // have to read textContent rather than look for a single text node. The
  // dialog also renders in a portal, outside `container`.
  const psalmParagraphs = () =>
    Array.from(document.body.querySelectorAll('p'))
      .filter((el) => /guard us|O nations/.test(el.textContent ?? ''));

  it('lays the psalm out as refrain and verse, not one paragraph', () => {
    open({ psalmText: REFRAIN_PSALM });
    const paras = psalmParagraphs();
    expect(paras).toHaveLength(3);
    expect(paras[0].textContent).toMatch(/The Lord will guard us/);
    expect(paras[1].textContent).toMatch(/O nations/);
  });

  it('sets the refrain apart in bold with space around it', () => {
    open({ psalmText: REFRAIN_PSALM });
    const paras = psalmParagraphs();
    expect(paras[0].className).toContain('font-semibold');      // refrain
    expect(paras[1].className).not.toContain('font-semibold');  // verse
    expect(paras[1].className).toContain('mt-4');               // space after the refrain
    expect(paras[2].className).toContain('font-semibold');      // refrain returns
    expect(paras[2].className).toContain('mt-4');               // space before it
  });

  // The highlight has to track the flat cursor even though the words are now
  // split across lines, or the "next word" shown is not the one the note takes.
  it('advances the highlight across a line break', () => {
    open({ psalmText: REFRAIN_PSALM });
    expect(screen.getByText(/30 words left/)).toBeInTheDocument();
    // 11 words is exactly the first refrain line — the 12th lands on the verse.
    for (let i = 0; i < 12; i++) fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(screen.getByText(/18 words left/)).toBeInTheDocument();
    const verse = psalmParagraphs()[1];
    expect(verse.querySelector('.bg-primary\\/15')).not.toBeNull();
  });

  it('reports the fixed 4-inch width so the layout intent is visible', () => {
    open();
    expect(screen.getByText(/4″ wide/)).toBeInTheDocument();
  });

  it('lets the user choose 2 or 4 measures per printed line', () => {
    open();
    const staff = screen.getByTestId('staff');
    expect(staff).toHaveAttribute('data-per-row', '2');
    fireEvent.click(screen.getByRole('button', { name: /4 per line/i }));
    expect(screen.getByTestId('staff')).toHaveAttribute('data-per-row', '4');
  });

  // Four bars in four inches only fit at a smaller engraving size — the note
  // size has to follow the density or the packer just refuses the request.
  it('engraves smaller when more bars share a line', () => {
    open();
    const two = Number(screen.getByTestId('staff').getAttribute('data-scale'));
    fireEvent.click(screen.getByRole('button', { name: /4 per line/i }));
    const four = Number(screen.getByTestId('staff').getAttribute('data-scale'));
    expect(four).toBeLessThan(two);
  });

  it('says so when the engraver cannot fit what was asked for', () => {
    open();
    // The stub honours the request, so no discrepancy is reported.
    expect(screen.queryByText(/fits \d+ here/)).not.toBeInTheDocument();
  });

  // Kevin: "i cant add a flat or sharp". Without these a minor psalm tone
  // cannot have its raised leading tone, which is how most of them cadence.
  it('offers flat, natural and sharp', () => {
    open();
    for (const n of ['Flat', 'Natural', 'Sharp']) {
      expect(screen.getByRole('button', { name: n })).toBeInTheDocument();
    }
  });

  it('applies an armed sharp to the next note entered by letter', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Sharp' }));
    fireEvent.click(screen.getByRole('button', { name: 'F' }));
    fireEvent.click(screen.getByRole('button', { name: /save to library/i }));
    await vi.waitFor(() => expect(savePsalmToLibrary).toHaveBeenCalled());
    expect(savePsalmToLibrary.mock.calls[0][0].score.elements[0].pitch)
      .toMatchObject({ step: 'F', alter: 1 });
  });

  // A degree is already spelled by the key, so an accidental SHIFTS it: in
  // D minor, sharpening degree 7 has to give C sharp, not C natural.
  it('raises a scale degree rather than replacing its spelling', async () => {
    open();
    fireEvent.change(screen.getByLabelText(/^key$/i), { target: { value: '-1' } });
    fireEvent.change(screen.getByLabelText(/mode/i), { target: { value: 'minor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sharp' }));
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: /save to library/i }));
    await vi.waitFor(() => expect(savePsalmToLibrary).toHaveBeenCalled());
    expect(savePsalmToLibrary.mock.calls[0][0].score.elements[0].pitch)
      .toMatchObject({ step: 'C', alter: 1 });
  });

  it('sounds a note when it is clicked', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    playPitch.mockClear();
    fireEvent.click(screen.getByTestId('note-0'));
    expect(playPitch).toHaveBeenCalled();
  });

  it('moves the selected note by a semitone with the arrow keys', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getByTestId('note-0'));
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.click(screen.getByRole('button', { name: /save to library/i }));
    await vi.waitFor(() => expect(savePsalmToLibrary).toHaveBeenCalled());
    const p = savePsalmToLibrary.mock.calls[0][0].score.elements[0].pitch;
    expect(`${p.step}${p.alter}`).not.toBe('C0');   // it moved
  });

  it('respells the selected note enharmonically on Enter', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Sharp' }));
    fireEvent.click(screen.getByRole('button', { name: 'F' }));
    fireEvent.click(screen.getByTestId('note-0'));
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /save to library/i }));
    await vi.waitFor(() => expect(savePsalmToLibrary).toHaveBeenCalled());
    // F sharp respells as G flat — same sound, different spelling.
    expect(savePsalmToLibrary.mock.calls[0][0].score.elements[0].pitch)
      .toMatchObject({ step: 'G', alter: -1 });
  });

  it('does not crash when the day has no psalm text yet', () => {
    open({ psalmText: null, citation: null, observation: null });
    expect(screen.getByLabelText(/title/i)).toHaveValue('Responsorial Psalm');
    expect(screen.queryByText(/words left/)).not.toBeInTheDocument();
  });
});
