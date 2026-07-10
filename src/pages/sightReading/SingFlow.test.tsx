// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { SingFlow } from './SingFlow';
import type { ExerciseIR } from '@/lib/sightReading/ir';

// A controllable fake for useMicPitch. The key detail that makes BUG 1
// reproduce is that `useMicPitch` below returns a BRAND-NEW object literal on
// EVERY render — exactly as the real (pre-fix) hook did without a useMemo. If
// SingFlow's teardown effect depends on that object (or any field of it), the
// churn re-runs the effect's cleanup on every re-render and kills the take.
// The functions inside are stable vi.fns so the test can count stop() calls and
// feed captured notes / outcomes in.
const mic = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  getCaptured: vi.fn(),
  permission: 'prompt' as 'prompt' | 'granted' | 'denied',
  live: null as null | { midi: number; cents: number; clarity: number },
  error: null as string | null,
  captured: [] as { midi: number; beatPos: number }[],
  outcome: 'granted' as 'granted' | 'denied' | 'failed',
}));

vi.mock('@/lib/sightReading/useMicPitch', () => ({
  useMicPitch: () => ({
    start: mic.start,
    stop: mic.stop,
    getCaptured: mic.getCaptured,
    permission: mic.permission,
    live: mic.live,
    error: mic.error,
  }),
}));

// These take-lifecycle tests render SingFlow in isolation, without the auth/role
// provider tree. Stub the role hook to a non-admin so the Save-to-Library button
// stays out of the way; admin gating is exercised elsewhere.
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ isAdmin: () => false }),
}));

// jsdom has no Web Audio. playPriming() constructs a real AudioContext, so
// stand up a no-op fake that satisfies the calls it makes.
class FakeParam {
  value = 0;
  setValueAtTime() {}
  linearRampToValueAtTime() {}
}
class FakeOsc {
  type = '';
  frequency = new FakeParam();
  connect() {}
  start() {}
  stop() {}
}
class FakeGain {
  gain = new FakeParam();
  connect() {}
}
class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume() {
    return Promise.resolve();
  }
  createOscillator() {
    return new FakeOsc();
  }
  createGain() {
    return new FakeGain();
  }
  close() {
    return Promise.resolve();
  }
}

const ACTIVITY_KEY = 'gw_sight_reading_activity';

// tempo 120 → 500ms/beat; four quarter notes C-D-E-F → realized = 4 beats;
// take length = (COUNT_IN_BEATS 4 + realized 4 + 1 tail) * 500ms = 4500ms.
function makeExercise(): ExerciseIR {
  const notes = [0, 1, 2, 3].map((i) => ({
    midi: 60 + i,
    beatPos: i,
    durationBeats: 1,
    solfege: 'do',
    phraseIdx: 0,
  }));
  return {
    key: 'C',
    mode: 'major',
    tonicMidi: 60,
    meter: { beats: 4, beatType: 4 },
    tempo: 120,
    notes,
    phrases: 1,
    difficulty: 1,
  };
}

const renderFlow = (ex = makeExercise()) =>
  render(<SingFlow exercise={ex} onExit={() => {}} activityKey={ACTIVITY_KEY} />);

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  mic.permission = 'prompt';
  mic.live = null;
  mic.error = null;
  mic.captured = [];
  mic.outcome = 'granted';
  mic.start.mockReset();
  mic.stop.mockReset();
  mic.getCaptured.mockReset();
  mic.start.mockImplementation(async () => {
    // Mirror the real hook: start() sets permission state and RETURNS the
    // outcome the caller must branch on.
    if (mic.outcome === 'granted') mic.permission = 'granted';
    if (mic.outcome === 'denied') mic.permission = 'denied';
    return mic.outcome;
  });
  mic.getCaptured.mockImplementation(() => [...mic.captured]);
  (window as unknown as { AudioContext: typeof FakeAudioContext }).AudioContext = FakeAudioContext;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SingFlow — the take survives re-renders (BUG 1)', () => {
  it('does NOT call mic.stop() when the component merely re-renders', () => {
    const ex = makeExercise();
    const { rerender } = renderFlow(ex);
    // Each re-render hands SingFlow a fresh mic object (identity churn). Before
    // the fix, the teardown effect depended on that object, so every one of
    // these re-renders ran its cleanup and called stop().
    rerender(<SingFlow exercise={ex} onExit={() => {}} activityKey={ACTIVITY_KEY} />);
    rerender(<SingFlow exercise={ex} onExit={() => {}} activityKey={ACTIVITY_KEY} />);
    rerender(<SingFlow exercise={ex} onExit={() => {}} activityKey={ACTIVITY_KEY} />);
    expect(mic.stop).not.toHaveBeenCalled();
  });

  it('runs priming + count-in + the take to a scored result and logs exactly one entry', async () => {
    mic.outcome = 'granted';
    // Captured on the mic clock (count-in NOT yet subtracted): four notes at
    // beats 4..7 become beats 0..3 after SingFlow shifts by COUNT_IN_BEATS.
    mic.captured = [
      { midi: 60, beatPos: 4 },
      { midi: 61, beatPos: 5 },
      { midi: 62, beatPos: 6 },
      { midi: 63, beatPos: 7 },
    ];
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /start take/i }));

    // Finish playPriming (~3.3s) so start() resolves and the count-in + take
    // timers get scheduled.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    // Through the four-beat count-in and the take window to scoring.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(mic.start).toHaveBeenCalledTimes(1);
    // ResultCard is only reachable if scoreAttempt ran and produced a result.
    expect(screen.getByRole('button', { name: /sing again/i })).toBeInTheDocument();
    expect(screen.getByText(/out of 100/i)).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
    expect(stored).toHaveLength(1);
  });
});

describe('SingFlow — a denied mic is never a dead end (BUG 2)', () => {
  it('runs no count-in, writes nothing, and shows the enable-mic affordance', async () => {
    mic.outcome = 'denied';
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /start take/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    // Advance well past any take window — no count-in/scoring timers should
    // have been scheduled at all.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(mic.start).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/enable mic to get scored/i)).toBeInTheDocument();
    // No result screen…
    expect(screen.queryByRole('button', { name: /sing again/i })).not.toBeInTheDocument();
    // …and, critically, no fake 0/100 take written to localStorage.
    expect(localStorage.getItem(ACTIVITY_KEY)).toBeNull();
  });
});

describe('SingFlow — unmount teardown', () => {
  it('tears the mic down exactly once, on unmount', () => {
    const { unmount } = renderFlow();
    expect(mic.stop).not.toHaveBeenCalled();
    unmount();
    expect(mic.stop).toHaveBeenCalledTimes(1);
  });
});
