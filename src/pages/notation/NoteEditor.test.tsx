// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NoteEditor } from './NoteEditor';
import { emptyScore, noteOf } from '@/lib/notation/model';

// NotationView draws via VexFlow (SVG in jsdom is fine to mount but we don't assert pixels).
afterEach(() => {
  cleanup();
});

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
});
