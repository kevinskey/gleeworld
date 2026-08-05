// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const savePsalmToLibrary = vi.fn().mockResolvedValue({ id: 'row-1', imageUrl: null });

vi.mock('@/lib/liturgy/psalmScores', () => ({
  savePsalmToLibrary: (...args: unknown[]) => savePsalmToLibrary(...args),
}));
// jsdom has no AudioContext; the entry click would otherwise throw on every note.
vi.mock('@/lib/notation/pitchAudio', () => ({ playPitch: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'cantor@example.org', user_metadata: { full_name: 'A Cantor' } } }),
}));
// The engraver is exercised by the notation module's own tests; here it is
// noise (VexFlow measures real DOM boxes, which jsdom reports as zero).
vi.mock('@/pages/notation/NotationView', () => ({
  NotationView: ({ score }: { score: { elements: unknown[] } }) => (
    <div data-testid="staff" data-notes={score.elements.length} />
  ),
}));

import { PsalmComposerDialog } from './PsalmComposerDialog';

const PSALM = 'R. Taste and see the goodness of the Lord.\nI will bless the Lord at all times';

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

beforeEach(() => savePsalmToLibrary.mockClear());
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
  it('never lays out a single measure per line', () => {
    open();
    for (let i = 0; i < 6; i++) fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(screen.queryByText(/1 measure per line/)).not.toBeInTheDocument();
    expect(screen.getByText(/\d+ measures per line/)).toBeInTheDocument();
  });

  it('reports the fixed 4-inch width so the layout intent is visible', () => {
    open();
    expect(screen.getByText(/4″ wide/)).toBeInTheDocument();
  });

  it('does not crash when the day has no psalm text yet', () => {
    open({ psalmText: null, citation: null, observation: null });
    expect(screen.getByLabelText(/title/i)).toHaveValue('Responsorial Psalm');
    expect(screen.queryByText(/words left/)).not.toBeInTheDocument();
  });
});
