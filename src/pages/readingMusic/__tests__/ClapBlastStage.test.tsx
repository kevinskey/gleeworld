// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import { createClapBlastRound } from '@/lib/rhythm/clapBlast';
import { generatePattern } from '@/lib/rhythm/generate';
import { expectedOnsets } from '@/lib/rhythm/grade';
import { ClapBlastStage } from '../ClapBlastStage';

const spp = 60 / 80;

// A fresh pattern + round per test: the round is a mutable state machine and
// the stage ticks it every frame, so sharing one across tests leaks state.
function setup() {
  const pattern = generatePattern(1, 42);
  const round = createClapBlastRound({
    expected: expectedOnsets(pattern, spp), secondsPerPulse: spp, tolerancePct: 0.10,
  });
  const ctx = { currentTime: 0 } as unknown as AudioContext;
  const view = render(
    <ClapBlastStage
      pattern={pattern} bpm={80} ctx={ctx} t0={1}
      round={round} getOnsets={() => []} countIn={true}
    />,
  );
  return { pattern, round, view };
}

describe('ClapBlastStage', () => {
  it('renders the staff, hit line, one glyph per event, and the HUD', () => {
    const { pattern, view } = setup();
    expect(screen.getByRole('img', { name: /clap blast/i })).toBeInTheDocument();
    expect(document.querySelector('[data-role="hit-line"]')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-role="cb-note"]').length).toBe(
      pattern.events.filter((e) => !e.rest).length,
    );
    expect(screen.getByText(/score/i)).toBeInTheDocument();
    view.unmount();
  });

  it('shows the count-in banner before beat zero', () => {
    const { view } = setup();
    expect(screen.getByText(/get ready/i)).toBeInTheDocument();
    view.unmount();
  });
});
