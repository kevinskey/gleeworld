// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scrollToHash } from '../scrollToHash';

const placeAt = (id: string, top: number) => {
  const el = document.createElement('section');
  el.id = id;
  document.body.appendChild(el);
  el.getBoundingClientRect = () => ({ top, bottom: top + 100, left: 0, right: 0, width: 0, height: 100, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  return el;
};

describe('scrollToHash', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
  });

  it('returns false and does not scroll when the target is missing', () => {
    expect(scrollToHash('#nope')).toBe(false);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  // The whole point of the helper: a native fragment jump animates under
  // `scroll-behavior: smooth` and regularly stops short, so we scroll
  // explicitly and instantly instead.
  it('scrolls instantly to the target', () => {
    placeAt('music', 3218);
    expect(scrollToHash('#music')).toBe(true);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 3218, behavior: 'instant' });
  });

  it('subtracts the sticky header offset so the section clears the bar', () => {
    placeAt('music', 3218);
    scrollToHash('#music', 72);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 3146, behavior: 'instant' });
  });

  it('accounts for the current scroll position', () => {
    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true, writable: true });
    placeAt('music', 200);
    scrollToHash('#music');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 700, behavior: 'instant' });
  });

  it('never scrolls above the top of the page', () => {
    placeAt('top', 10);
    scrollToHash('#top', 72);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });

  it('accepts a bare id and a percent-encoded one', () => {
    placeAt('my section', 900);
    expect(scrollToHash('my%20section')).toBe(true);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 900, behavior: 'instant' });
  });

  it('ignores an empty hash', () => {
    expect(scrollToHash('#')).toBe(false);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
