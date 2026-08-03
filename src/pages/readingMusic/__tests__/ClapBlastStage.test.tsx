// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { createClapBlastRound } from '@/lib/rhythm/clapBlast';
import { generatePattern } from '@/lib/rhythm/generate';
import { expectedOnsets } from '@/lib/rhythm/grade';
import { ClapBlastStage } from '../ClapBlastStage';

const pattern = generatePattern(1, 42);
const spp = 60 / 80;
const round = createClapBlastRound({
  expected: expectedOnsets(pattern, spp), secondsPerPulse: spp, tolerancePct: 0.10,
});
const fakeCtx = { currentTime: 0 } as unknown as AudioContext;

describe('ClapBlastStage', () => {
  it('renders the staff, hit line, one glyph per event, and the HUD', () => {
    render(
      <ClapBlastStage
        pattern={pattern} bpm={80} ctx={fakeCtx} t0={1}
        round={round} getOnsets={() => []} countIn={true}
      />,
    );
    expect(screen.getByRole('img', { name: /clap blast/i })).toBeInTheDocument();
    expect(document.querySelector('[data-role="hit-line"]')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-role="cb-note"]').length).toBe(
      pattern.events.filter((e) => !e.rest).length,
    );
    expect(screen.getByText(/score/i)).toBeInTheDocument();
  });

  it('shows the count-in banner before beat zero', () => {
    render(
      <ClapBlastStage
        pattern={pattern} bpm={80} ctx={fakeCtx} t0={1}
        round={round} getOnsets={() => []} countIn={true}
      />,
    );
    expect(screen.getByText(/get ready/i)).toBeInTheDocument();
  });
});
