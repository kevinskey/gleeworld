// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
vi.mock('@/lib/readingMusic/attemptsApi', () => ({ insertAttempt: vi.fn().mockResolvedValue(true) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import { RhythmTab } from '../RhythmTab';

// jsdom has no Web Audio; the tab needs a context to get past its first guard.
class FakeParam {
  value = 0;
  setValueAtTime() { return this; }
  linearRampToValueAtTime() { return this; }
  exponentialRampToValueAtTime() { return this; }
}
class FakeNode { connect(n: unknown) { return n; } disconnect() {} }
class FakeOsc extends FakeNode { type = 'sine'; frequency = new FakeParam(); start() {} stop() {} }
class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakeCtx {
  currentTime = 0;
  state = 'running';
  destination = new FakeNode();
  resume() { return Promise.resolve(); }
  createOscillator() { return new FakeOsc(); }
  createGain() { return new FakeGain(); }
}

describe('RhythmTab', () => {
  it('renders drills, input + syllable toggles, and start button', () => {
    render(<RhythmTab />);
    expect(screen.getByRole('button', { name: /steady beat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /echo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /read & clap/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/input/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/syllables/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });
  it('shows the level journey with level 1 unlocked', () => {
    render(<RhythmTab />);
    expect(screen.getByRole('button', { name: /level 1/i })).toBeEnabled();
  });
  it('renders the Clap Blast drill chip', () => {
    render(<RhythmTab />);
    expect(screen.getByRole('button', { name: /clap blast/i })).toBeInTheDocument();
  });

  it('records a Take-assessment take as an assessment on the FIRST click', async () => {
    // Regression: start() read `assessment` from a closure created before the
    // click's setState committed, so the first assessment ran with practice
    // tolerance, saved as mode:'practice', and awarded stars.
    const { insertAttempt } = await import('@/lib/readingMusic/attemptsApi');
    vi.mocked(insertAttempt).mockClear();
    localStorage.setItem('rm_rhythm_stars', JSON.stringify({ 1: 2 })); // unlock the button
    localStorage.setItem('rm_rhythm_level', '1');
    localStorage.setItem('rm_rhythm_input', 'tap');
    localStorage.setItem('rm_rhythm_measures', '2');
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
    vi.useFakeTimers();
    try {
      render(<RhythmTab />);
      fireEvent.click(screen.getByRole('button', { name: /read & clap/i }));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /take assessment/i }));
      });
      await act(async () => { vi.advanceTimersByTime(120_000); });
      expect(insertAttempt).toHaveBeenCalled();
      const arg = vi.mocked(insertAttempt).mock.calls[0][0];
      expect(arg.mode).toBe('assessment');
      expect(arg.payload.tolerancePct).toBe(0.06); // ASSESSMENT, not the 0.10 practice value
    } finally {
      vi.useRealTimers();
      localStorage.clear();
    }
  });

  it('lets any level be picked — stars record progress, they do not gate it', () => {
    localStorage.removeItem('rm_rhythm_stars');
    render(<RhythmTab />);
    expect(screen.getByRole('button', { name: /level 8/i })).toBeEnabled();
    expect(screen.queryByText(/🔒/)).not.toBeInTheDocument();
  });

  it('offers the measure-count choices', () => {
    render(<RhythmTab />);
    const select = screen.getByLabelText(/measures/i) as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(['2', '4', '8', '16']);
    fireEvent.change(select, { target: { value: '16' } });
    expect(select.value).toBe('16');
  });

  it('hides the syllables picker on Clap Blast and restores it on other drills', () => {
    render(<RhythmTab />);
    expect(screen.getByLabelText(/syllables/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clap blast/i }));
    expect(screen.queryByLabelText(/syllables/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^echo$/i }));
    expect(screen.getByLabelText(/syllables/i)).toBeInTheDocument();
  });

  it('falls back to tap (and closes calibration) when the mic is denied', async () => {
    localStorage.removeItem('rm_clap_latency_ms');
    localStorage.removeItem('rm_rhythm_input');
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
    const getUserMedia = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });

    render(<RhythmTab />);
    fireEvent.click(screen.getByRole('button', { name: /clap blast/i }));
    fireEvent.change(screen.getByLabelText(/input/i), { target: { value: 'mic' } });
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));

    // Mic + Clap Blast + no stored latency → the calibration gate opens.
    expect(screen.getByText(/calibrate your clap timing/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start calibration/i }));
    });

    expect(getUserMedia).toHaveBeenCalled();
    expect(screen.queryByText(/calibrate your clap timing/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/input/i)).toHaveValue('tap');
  });
});
