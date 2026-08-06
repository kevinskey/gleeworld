// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { heroBlock } from '../hero';
import type { SiteRenderContext } from '../../types';

/**
 * Dragging the hero's text without selecting it.
 *
 * The fields are contentEditable, so a press puts a caret in them and a sweep
 * highlights words — which is what happened when you tried to move one.
 * Suppressing selection outright would cost inline editing, so a press stays
 * a click until it has clearly travelled.
 *
 * Both halves matter, and only one of them is the reported bug: if the
 * threshold is ever removed, dragging selects text again; if it grows into a
 * blanket preventDefault, the text silently stops being editable.
 */

beforeAll(() => {
  // jsdom implements neither pointer capture nor layout.
  Object.assign(HTMLElement.prototype, {
    setPointerCapture: () => {}, releasePointerCapture: () => {}, hasPointerCapture: () => false,
  });
  HTMLElement.prototype.getBoundingClientRect = function () {
    return { width: 1000, height: 500, top: 0, left: 0, right: 1000, bottom: 500, x: 0, y: 0, toJSON: () => ({}) };
  } as never;
});

const ctx: SiteRenderContext = {
  slug: 'kevin', orgName: 'Kevin Phillip Johnson', logoUrl: null,
  isPreview: true, activeAddons: [],
  theme: {} as SiteRenderContext['theme'],
};

/** jsdom has no PointerEvent constructor; React only needs the fields it reads. */
function pointer(el: Element, type: string, x: number, y: number) {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(e, 'pointerId', { value: 1 });
  Object.defineProperty(e, 'pointerType', { value: 'mouse' });
  act(() => { el.dispatchEvent(e); });
  return e;
}

function renderHero() {
  const onConfigChange = vi.fn();
  const config = heroBlock.configSchema.parse({
    imageUrl: 'https://example.test/hero.jpg',
    headline: 'Retirement Concert', subheadline: 'October 2026',
    textX: 50, textY: 50,
  });
  const utils = render(<heroBlock.Render config={config} ctx={ctx} onConfigChange={onConfigChange} />);
  const stack = utils.container.querySelector('.gw-hero-overlay') ?? utils.container.querySelector('[data-hero-field]');
  return { onConfigChange, stack: stack as Element, ...utils };
}

beforeEach(() => cleanup());

describe('dragging hero text', () => {
  it('a press that barely moves is still a click, not a drag', () => {
    const { stack, onConfigChange } = renderHero();
    pointer(stack, 'pointerdown', 500, 250);
    pointer(stack, 'pointermove', 502, 251);
    expect(onConfigChange).not.toHaveBeenCalled();
  });

  it('moves the text once the pointer clearly travels', () => {
    const { stack, onConfigChange } = renderHero();
    pointer(stack, 'pointerdown', 500, 250);
    pointer(stack, 'pointermove', 560, 300);
    expect(onConfigChange).toHaveBeenCalled();
    const patch = onConfigChange.mock.calls.at(-1)?.[0];
    expect(patch).toHaveProperty('textX');
    expect(patch).toHaveProperty('textY');
  });

  // The actual complaint: text got highlighted instead of moving.
  it('clears any selection the press made when the drag starts', () => {
    const removeAllRanges = vi.fn();
    vi.spyOn(window, 'getSelection').mockReturnValue({ removeAllRanges } as unknown as Selection);
    const { stack } = renderHero();
    pointer(stack, 'pointerdown', 500, 250);
    pointer(stack, 'pointermove', 560, 300);
    expect(removeAllRanges).toHaveBeenCalled();
  });

  it('suppresses selection on the section only while dragging', () => {
    const { stack, container } = renderHero();
    const section = container.querySelector('.gw-hero-section')!;
    expect(section.className).not.toContain('select-none');
    pointer(stack, 'pointerdown', 500, 250);
    pointer(stack, 'pointermove', 560, 300);
    expect(section.className).toContain('select-none');
    pointer(stack, 'pointerup', 560, 300);
    expect(section.className).not.toContain('select-none');
  });

  // The other half: inline editing has to survive the fix.
  it('does not block the browser default on editable text, so a click can edit', () => {
    const { container } = renderHero();
    const editable = container.querySelector('[contenteditable="true"]');
    expect(editable).toBeTruthy();
    const e = pointer(editable!, 'pointerdown', 500, 250);
    expect(e.defaultPrevented).toBe(false);
  });
});
