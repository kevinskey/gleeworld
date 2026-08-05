// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { VerseRow } from './VerseRow';
import type { BibleVerse } from '@/hooks/useBible';

/**
 * The Apple Pencil path, without an Apple Pencil.
 *
 * What a device can prove that this cannot: that WebKit actually reports
 * pointerType 'pen' for a real Pencil. What this proves — and what was
 * genuinely at risk of breaking silently — is everything downstream of that:
 * `pointerType` is only present on the POINTER event, never on the click that
 * follows, so VerseRow stashes it on pointerdown and reads it back in onClick.
 * If that hand-off ever regresses, every Pencil stroke quietly becomes a
 * highlight and nothing throws.
 */

const verse: BibleVerse = { verse: 1, text: 'In the beginning was the Word.' } as BibleVerse;

/**
 * jsdom does not implement PointerEvent — `window.PointerEvent` is literally
 * undefined — so fireEvent.pointerDown(el, { pointerType: 'pen' }) dispatches
 * a plain Event and the pointerType is dropped on the floor. A test written
 * that way "fails" against correct code, which is worse than no test.
 *
 * Dispatching an event that genuinely carries the property is what a browser
 * actually hands the listener, so this exercises the real code path.
 */
function pointerDown(el: Element, pointerType: string) {
  const ev = new Event('pointerdown', { bubbles: true });
  Object.defineProperty(ev, 'pointerType', { value: pointerType });
  fireEvent(el, ev);
}

function renderRow(onMark = vi.fn()) {
  render(
    <VerseRow verse={verse} annotations={[]} hasNote={false} onMark={onMark} onOpenNote={vi.fn()} />,
  );
  return { onMark, text: screen.getByText(verse.text) };
}

afterEach(cleanup);

describe('VerseRow — pointer type survives to the click', () => {
  it('reports a Pencil as "pen" so the mark becomes an underline', () => {
    const { onMark, text } = renderRow();
    pointerDown(text, 'pen');
    fireEvent.click(text);
    expect(onMark).toHaveBeenCalledWith(1, 'pen');
  });

  it('reports a finger as "touch" so the mark stays a highlight', () => {
    const { onMark, text } = renderRow();
    pointerDown(text, 'touch');
    fireEvent.click(text);
    expect(onMark).toHaveBeenCalledWith(1, 'touch');
  });

  // A click with no preceding pointerdown (keyboard-driven click, synthetic
  // click, some assistive tech) must not inherit 'pen' from an earlier stroke.
  it('does not carry a previous pen stroke into a later plain click', () => {
    const { onMark, text } = renderRow();
    pointerDown(text, 'pen');
    fireEvent.click(text);
    pointerDown(text, 'mouse');
    fireEvent.click(text);
    expect(onMark).toHaveBeenLastCalledWith(1, 'mouse');
  });

  it('treats Enter/Space as an explicit keyboard mark, not a pen', () => {
    const { onMark, text } = renderRow();
    fireEvent.keyDown(text, { key: 'Enter' });
    expect(onMark).toHaveBeenCalledWith(1, 'keyboard');
  });

  it('opens the note from the verse number, not the verse text', () => {
    const onOpenNote = vi.fn();
    const onMark = vi.fn();
    render(
      <VerseRow verse={verse} annotations={[]} hasNote onMark={onMark} onOpenNote={onOpenNote} />,
    );
    fireEvent.click(screen.getByLabelText('Note on verse 1'));
    expect(onOpenNote).toHaveBeenCalledWith(1);
    expect(onMark).not.toHaveBeenCalled();
  });
});
