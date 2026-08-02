// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { rows } = vi.hoisted(() => ({
  rows: [{
    id: 'a1', user_id: 'u1', drill: 'echo', level: 3, score: 62, override_score: null,
    payload: {
      bpm: 84, input: 'tap', syllables: 'takadimi', tolerancePct: 0.06,
      expected: [0], actual: [], verdicts: ['missed'], meter: { beats: 4, beatType: 4 }, seed: 1,
    },
    created_at: '2026-08-02T12:00:00Z',
  }],
}));
vi.mock('@/lib/readingMusic/attemptsApi', () => ({
  listAssessmentAttempts: vi.fn().mockResolvedValue(rows),
  overrideAttempt: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) })) },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { ClassAssessments } from '../ClassAssessments';

describe('ClassAssessments', () => {
  it('lists assessment attempts with an override control', async () => {
    render(<ClassAssessments />);
    await waitFor(() => expect(screen.getByText(/echo/i)).toBeInTheDocument());
    expect(screen.getByText('62')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /override/i })).toBeInTheDocument();
  });
});
