// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NoteEditor } from './NoteEditor';
import { emptyScore, noteOf, EditorScore } from '@/lib/notation/model';

// NotationView draws via VexFlow (SVG in jsdom is fine to mount but we don't assert pixels).
afterEach(() => {
  cleanup();
});

// A plain `let latest` variable goes stale after the first keystroke for multi-step key
// sequences, because NoteEditor reads score off a prop (via scoreRef) that doesn't change
// until React re-renders it with the new value. This controlled harness re-renders NoteEditor
// with the updated score after every onChange, so subsequent keystrokes see current state.
let latest: any;
function Harness({ initial }: { initial: EditorScore }) {
  const [s, setS] = useState(initial);
  latest = s;
  return <NoteEditor score={s} onChange={setS} />;
}

describe('NoteEditor', () => {
  it('arming quarter then pressing C appends a middle-C quarter note', () => {
    let latest = emptyScore();
    render(<NoteEditor score={latest} onChange={(s) => { latest = s; }} />);
    fireEvent.click(screen.getByRole('button', { name: /quarter/i }));
    fireEvent.keyDown(window, { key: 'c' });
    expect(latest.elements).toHaveLength(1);
    expect(latest.elements[0]).toMatchObject({ kind: 'note', base: 'quarter', pitch: { step: 'C' } });
  });
  it('R inserts a rest of the armed duration', () => {
    let latest = emptyScore();
    render(<NoteEditor score={latest} onChange={(s) => { latest = s; }} />);
    fireEvent.click(screen.getByRole('button', { name: /half/i }));
    fireEvent.keyDown(window, { key: 'r' });
    expect(latest.elements[0]).toMatchObject({ kind: 'rest', base: 'half' });
  });
  it('Backspace deletes the last element', () => {
    let latest = { ...emptyScore(), elements: [noteOf({ step:'C', octave:4, alter:0 }, 'quarter')] };
    render(<NoteEditor score={latest} onChange={(s) => { latest = s; }} />);
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(latest.elements).toHaveLength(0);
  });
  it('ignores note keys while a text input is focused', () => {
    let latest = emptyScore();
    render(<><input aria-label="ttl" /><NoteEditor score={latest} onChange={(s) => { latest = s; }} /></>);
    const input = screen.getByLabelText('ttl');
    input.focus();
    fireEvent.keyDown(input, { key: 'c' });
    expect(latest.elements).toHaveLength(0);
  });

  it('arming a dot then pressing C inserts a dotted quarter note', () => {
    render(<Harness initial={emptyScore()} />);
    fireEvent.keyDown(window, { key: '.' });
    fireEvent.keyDown(window, { key: 'c' });
    expect(latest.elements[0]).toMatchObject({ kind: 'note', base: 'quarter', dots: 1 });
  });

  it('arming a flat then pressing C inserts a flat C', () => {
    render(<Harness initial={emptyScore()} />);
    fireEvent.keyDown(window, { key: '-' });
    fireEvent.keyDown(window, { key: 'c' });
    expect(latest.elements[0]).toMatchObject({ kind: 'note', pitch: { step: 'C', alter: -1 } });
  });

  it('arming a sharp then pressing F inserts a sharp F', () => {
    render(<Harness initial={emptyScore()} />);
    fireEvent.keyDown(window, { key: '=' });
    fireEvent.keyDown(window, { key: 'f' });
    expect(latest.elements[0]).toMatchObject({ pitch: { step: 'F', alter: 1 } });
  });

  it('ArrowRight selects the note then t ties it to the following note (start/stop pair)', () => {
    const initial = {
      ...emptyScore(),
      elements: [
        noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter'),
        noteOf({ step: 'D', octave: 4, alter: 0 }, 'quarter'),
      ],
    };
    render(<Harness initial={initial} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 't' });
    expect(latest.elements[0]).toMatchObject({ tie: 'start' });
    expect(latest.elements[1]).toMatchObject({ tie: 'stop' });
  });

  it('ArrowRight selects the note then . dots it', () => {
    const initial = { ...emptyScore(), elements: [noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter')] };
    render(<Harness initial={initial} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: '.' });
    expect(latest.elements[0].dots).toBe(1);
  });

  it('note insertion honors the cursor: inserts after the selected note, not just at the end', () => {
    const initial = { ...emptyScore(), elements: [noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter')] };
    render(<Harness initial={initial} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // selects index 0
    fireEvent.keyDown(window, { key: 'd' });
    expect(latest.elements).toHaveLength(2);
    expect(latest.elements[1]).toMatchObject({ pitch: { step: 'D' } });
  });

  // ── On-screen note pad (phone/tablet entry — no hardware keyboard) ──

  it('tapping the C pad button appends a middle-C note of the armed duration', () => {
    render(<Harness initial={emptyScore()} />);
    fireEvent.click(screen.getByRole('button', { name: /half/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Add note C' }));
    expect(latest.elements[0]).toMatchObject({ kind: 'note', base: 'half', pitch: { step: 'C' } });
  });

  it('pad pitch buttons honor an armed accidental', () => {
    render(<Harness initial={emptyScore()} />);
    fireEvent.click(screen.getByRole('button', { name: '♭' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add note E' }));
    expect(latest.elements[0]).toMatchObject({ pitch: { step: 'E', alter: -1 } });
  });

  it('tapping the rest pad button inserts a rest of the armed duration', () => {
    render(<Harness initial={emptyScore()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add rest' }));
    expect(latest.elements[0]).toMatchObject({ kind: 'rest', base: 'quarter' });
  });

  it('tapping delete removes the last element', () => {
    const initial = { ...emptyScore(), elements: [noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter')] };
    render(<Harness initial={initial} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(latest.elements).toHaveLength(0);
  });

  it('pad selection arrows + pitch nudge transpose the selected note', () => {
    const initial = { ...emptyScore(), elements: [noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter')] };
    render(<Harness initial={initial} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select next note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pitch up' }));
    expect(latest.elements[0]).toMatchObject({ pitch: { step: 'C', alter: 1 } });
  });

  it('pad insertion honors the cursor like typing does', () => {
    const initial = {
      ...emptyScore(),
      elements: [
        noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter'),
        noteOf({ step: 'E', octave: 4, alter: 0 }, 'quarter'),
      ],
    };
    render(<Harness initial={initial} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select next note' })); // selects C
    fireEvent.click(screen.getByRole('button', { name: 'Add note D' }));
    expect(latest.elements.map((e: { pitch: { step: string } }) => e.pitch.step)).toEqual(['C', 'D', 'E']);
  });

  it('duration pills show their keyboard number', () => {
    render(<Harness initial={emptyScore()} />);
    expect(screen.getByRole('button', { name: /3.*quarter/i })).toBeTruthy();
  });

  it('note insertion in the middle: selecting the first of two notes and inserting lands between them', () => {
    const initial = {
      ...emptyScore(),
      elements: [
        noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter'),
        noteOf({ step: 'E', octave: 4, alter: 0 }, 'quarter'),
      ],
    };
    render(<Harness initial={initial} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // selects C (index 0)
    fireEvent.keyDown(window, { key: 'd' });
    expect(latest.elements.map((e: any) => e.pitch.step)).toEqual(['C', 'D', 'E']);
  });
});
