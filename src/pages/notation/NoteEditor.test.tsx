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

  it('ArrowRight selects the note then t ties it', () => {
    const initial = { ...emptyScore(), elements: [noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter')] };
    render(<Harness initial={initial} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 't' });
    expect(latest.elements[0]).toMatchObject({ tie: 'start' });
  });

  it('ArrowRight selects the note then . dots it', () => {
    const initial = { ...emptyScore(), elements: [noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter')] };
    render(<Harness initial={initial} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: '.' });
    expect(latest.elements[0].dots).toBe(1);
  });
});
