// @vitest-environment jsdom
//
// Regression coverage for I1 (round 1 of the Task 4 review): a step whose
// target lives behind something that UNMOUNTS its contents when closed
// (NavShelf's All Tools disclosure is the real case) must still get
// spotlighted and fire onActivate. Round 1's fix called flushSync from
// inside beforeMeasure to force the reveal synchronous before measuring —
// that is a documented no-op (plus a console warning) when called from
// inside a React passive-effect commit, which is exactly where TourEngine
// calls beforeMeasure. The disclosure never actually opened in time,
// measureTarget kept returning null, and the engine skipped straight past
// the click pulse — where onActivate fires — into 'reading'. This test
// reproduces that exact shape (a toggle whose sibling only mounts when
// open) and asserts the real, currently-shipped fix: TourEngine retries
// the measurement after a requestAnimationFrame before concluding a step
// with a declared target has none.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { TourEngine } from './TourEngine';
import type { TourStep } from './types';

afterEach(cleanup);

// jsdom never computes real layout — every element reports a 0×0 rect by
// default, which measureTarget treats as "not really there" (matches its
// own null-guard for zero-size elements). Stub a fixed, non-zero rect so
// a target that DOES exist in the DOM is recognized as found.
HTMLElement.prototype.getBoundingClientRect = function () {
  return { width: 40, height: 20, top: 100, left: 100, right: 140, bottom: 120, x: 100, y: 100, toJSON: () => ({}) };
} as never;

// Mirrors NavShelf's All Tools disclosure: the toggle's sibling content
// only MOUNTS when open — not merely CSS-hidden — matching the production
// shape that broke onActivate.
function Harness({ steps }: { steps: TourStep[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" data-testid="toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Reveal
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

function revealBeforeMeasure() {
  const toggle = document.querySelector('[data-testid="toggle"]') as HTMLButtonElement | null;
  if (toggle && toggle.getAttribute('aria-expanded') === 'false') {
    toggle.click();
  }
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
        beforeMeasure: revealBeforeMeasure,
        onActivate,
      },
    ];

    render(<Harness steps={steps} />);

    // onActivate only fires after the cursor "arrives" (CURSOR_TRAVEL_MS)
    // and the click pulse completes (PULSE_MS) — real time, not mocked.
    await waitFor(() => expect(onActivate).toHaveBeenCalledTimes(1), { timeout: 3000 });

    // The toggle got clicked and stayed open — proof the reveal actually
    // took effect rather than the engine giving up and reading nothing.
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
