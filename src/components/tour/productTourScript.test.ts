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
import { ensureAllToolsOpen, closeAllTools, buildAdminProductTour } from './productTourScript';

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

  it('DOES click when the only copy of the target is inside the sheet', () => {
    // The consecutive-sheet-steps case. closeAllTools runs from the previous
    // step's teardown and its state update commits AFTER the next step's
    // beforeMeasure — so a row visible inside the sheet right now is one
    // commit away from unmounting, and treating it as "already revealed"
    // would leave the next step with no target at all. Re-clicking is free
    // (the button only ever opens) and React batches the pending close with
    // this open, so the sheet simply stays open.
    const toggle = mountToggle();
    let clicked = false;
    toggle.addEventListener('click', () => { clicked = true; });
    const sheet = document.createElement('div');
    sheet.setAttribute('data-all-tools-sheet', '');
    const target = document.createElement('div');
    target.setAttribute('data-tour', 'nav-settings');
    sheet.appendChild(target);
    document.body.appendChild(sheet);

    ensureAllToolsOpen('[data-tour="nav-settings"]');

    expect(clicked).toBe(true);
  });
});

describe('closeAllTools', () => {
  function mountSheet(): HTMLElement {
    const sheet = document.createElement('div');
    sheet.setAttribute('data-all-tools-sheet', '');
    document.body.appendChild(sheet);
    return sheet;
  }

  it('dismisses the sheet when one is mounted', () => {
    mountSheet();
    const keys: string[] = [];
    const listener = (e: Event) => keys.push((e as KeyboardEvent).key);
    document.addEventListener('keydown', listener);

    closeAllTools();

    document.removeEventListener('keydown', listener);
    // Escape is what Radix's dismissable layer listens for, and only the
    // top-most layer responds — exactly "close the sheet, don't reach past
    // it".
    expect(keys).toEqual(['Escape']);
  });

  it('does nothing when no sheet is open', () => {
    const keys: string[] = [];
    const listener = (e: Event) => keys.push((e as KeyboardEvent).key);
    document.addEventListener('keydown', listener);

    closeAllTools();

    document.removeEventListener('keydown', listener);
    expect(keys).toEqual([]);
  });
});

describe('buildAdminProductTour', () => {
  it('binds a sheet teardown to every step, so an opened sheet cannot outlive its step', () => {
    // Without this the sheet stayed over the page for the rest of the step
    // AND through the next step's cursor travel, self-healing only when the
    // next onActivate happened to navigate and remount the shell.
    const steps = buildAdminProductTour({ navigate: () => {} });
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) expect(step.onStepEnd).toBe(closeAllTools);
    // ...and the reveal is still bound only where there's a target.
    for (const step of steps) {
      expect(typeof step.beforeMeasure === 'function').toBe(!!step.targetSelector);
    }
  });
});
