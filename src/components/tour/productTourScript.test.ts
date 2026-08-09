// @vitest-environment jsdom
//
// Direct unit coverage for ensureAllToolsOpen's own branch logic, separate
// from TourEngine.test.tsx's timing/rAF-retry coverage of the same
// function. Isolating these two branches here (rather than only proving
// them indirectly through TourEngine's async click-pulse machinery) is what
// makes each one provable on its own: TourEngine.test.tsx's harness always
// starts with the target absent, so it only ever exercises the "target
// missing → click" branch. The "target already present → do nothing"
// branch — the one that matters now that opening the sheet means popping a
// modal over already-visible content, not just harmlessly expanding a
// disclosure — had no coverage anywhere until this file.
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ensureAllToolsOpen } from './productTourScript';

afterEach(() => {
  document.body.innerHTML = '';
  cleanup();
});

function mountToggle(): HTMLButtonElement {
  const toggle = document.createElement('button');
  toggle.setAttribute('data-tour', 'nav-all-tools-toggle');
  document.body.appendChild(toggle);
  return toggle;
}

describe('ensureAllToolsOpen', () => {
  it('clicks the All Tools toggle when the target is not yet in the DOM', () => {
    const toggle = mountToggle();
    let clicked = false;
    toggle.addEventListener('click', () => { clicked = true; });

    ensureAllToolsOpen('[data-tour="nav-analytics"]');

    expect(clicked).toBe(true);
  });

  it('does NOT click the toggle when the target is already present', () => {
    // The case that matters most post-Phase-3: the sheet is a modal now, so
    // clicking the toggle when the target is already visible on the shelf
    // would pop a dialog over content that's already there instead of
    // harmlessly no-opping.
    const toggle = mountToggle();
    let clicked = false;
    toggle.addEventListener('click', () => { clicked = true; });
    const target = document.createElement('a');
    target.setAttribute('data-tour', 'nav-calendar');
    document.body.appendChild(target);

    ensureAllToolsOpen('[data-tour="nav-calendar"]');

    expect(clicked).toBe(false);
  });

  it('does not throw when the toggle is not mounted at all', () => {
    // e.g. a role/tenant whose gated catalog leaves nothing behind All
    // Tools, or the mobile drawer isn't open. No toggle in the DOM at all.
    expect(() => ensureAllToolsOpen('[data-tour="nav-analytics"]')).not.toThrow();
  });
});
