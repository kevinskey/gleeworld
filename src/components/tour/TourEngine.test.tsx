// @vitest-environment jsdom
//
// Regression coverage for I1 (round 1 of the Task 4 review): a step whose
// target lives behind something that UNMOUNTS its contents when closed
// (NavShelf's All Tools sheet is the real case) must still get spotlighted
// and fire onActivate. Round 1's fix called flushSync from inside
// beforeMeasure to force the reveal synchronous before measuring — that is
// a documented no-op (plus a console warning) when called from inside a
// React passive-effect commit, which is exactly where TourEngine calls
// beforeMeasure. The reveal never actually happened in time, measureTarget
// kept returning null, and the engine skipped straight past the click
// pulse — where onActivate fires — into 'reading'. This test reproduces
// that exact shape (a target whose sibling only mounts once revealed) and
// asserts the real, currently-shipped fix: TourEngine retries the
// measurement after a requestAnimationFrame before concluding a step with
// a declared target has none.
//
// The reveal function under test is the REAL, shipped `ensureAllToolsOpen`
// from productTourScript.ts — not a local reimplementation. An earlier
// version of this file hand-rolled its own `revealBeforeMeasure`, checking
// a `data-testid="toggle"` element's `aria-expanded` attribute the way the
// OLD sidebar disclosure worked. Phase 3 replaced that disclosure with a
// searchable sheet whose All Tools button has no `aria-expanded` at all
// (NavShelf.tsx's `onOpenAllTools` just opens, never toggles) — the real
// `ensureAllToolsOpen` was updated to match (see productTourScript.ts), but
// the local copy here kept passing against its own synthetic fixture the
// whole time, so this suite stayed green while the production helper was a
// permanent no-op. That is the second time a nav change broke the tour
// silently; importing the real function is what makes a third one
// impossible to miss here.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { TourEngine } from './TourEngine';
import { ensureAllToolsOpen } from './productTourScript';
import type { TourStep } from './types';

afterEach(cleanup);

// jsdom never computes real layout — every element reports a 0×0 rect by
// default, which measureTarget treats as "not really there" (matches its
// own null-guard for zero-size elements). Stub a fixed, non-zero rect so
// a target that DOES exist in the DOM is recognized as found.
HTMLElement.prototype.getBoundingClientRect = function () {
  return { width: 40, height: 20, top: 100, left: 100, right: 140, bottom: 120, x: 100, y: 100, toJSON: () => ({}) };
} as never;

// Mirrors NavShelf's real All Tools button + AllToolsSheet: the toggle's
// target content only MOUNTS once opened — not merely CSS-hidden — matching
// the production shape that broke onActivate, and the toggle itself carries
// the exact `data-tour="nav-all-tools-toggle"` selector `ensureAllToolsOpen`
// queries for in the real app (see productTourScript.ts). Unlike the old
// disclosure, the real button always OPENS (never toggles closed), so this
// harness's button does the same — `onClick={() => setOpen(true)}`, not a
// toggle — to keep the harness honest about what production code shapes.
function Harness({ steps }: { steps: TourStep[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" data-tour="nav-all-tools-toggle" onClick={() => setOpen(true)}>
        All Tools
      </button>
      {open && (
        <button type="button" data-tour="hidden-target">
          Hidden target
        </button>
      )}
      <TourEngine steps={steps} />
    </div>
  );
}

describe('TourEngine — beforeMeasure reveal of a conditionally-unmounted target', () => {
  it('finds the target after the reveal and fires onActivate', async () => {
    const onActivate = vi.fn();
    // Silences the expected React act()/console noise from the rAF retry;
    // nothing is asserted about it.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const steps: TourStep[] = [
      {
        id: 'reveal-step',
        targetSelector: '[data-tour="hidden-target"]',
        description: 'test step',
        dwellMs: 50,
        beforeMeasure: () => ensureAllToolsOpen('[data-tour="hidden-target"]'),
        onActivate,
      },
    ];

    render(<Harness steps={steps} />);

    // onActivate only fires after the cursor "arrives" (CURSOR_TRAVEL_MS)
    // and the click pulse completes (PULSE_MS) — real time, not mocked.
    await waitFor(() => expect(onActivate).toHaveBeenCalledTimes(1), { timeout: 3000 });

    // The toggle got clicked and the target stayed mounted — proof the
    // reveal actually took effect rather than the engine giving up and
    // reading nothing.
    expect(document.querySelector('[data-tour="hidden-target"]')).not.toBeNull();

    errorSpy.mockRestore();
  }, 5000);

  it('sanity check: without beforeMeasure the target never mounts — the harness genuinely models absence', () => {
    const steps: TourStep[] = [
      {
        id: 'no-reveal',
        targetSelector: '[data-tour="hidden-target"]',
        description: 'test step',
      },
    ];
    render(<Harness steps={steps} />);
    expect(document.querySelector('[data-tour="hidden-target"]')).toBeNull();
  });
});
