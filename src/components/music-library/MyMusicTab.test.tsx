// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MyMusicTab } from './MyMusicTab';
import { getSignedUrl } from '@/utils/storage';
import type { PersonalScore } from '@/hooks/usePersonalScores';

const state: {
  scores: PersonalScore[]; isLoading: boolean;
} = { scores: [], isLoading: false };

vi.mock('@/hooks/usePersonalScores', () => ({
  usePersonalScores: () => ({
    scores: state.scores, isLoading: state.isLoading,
    uploadScore: vi.fn(), removeScore: vi.fn(),
  }),
}));
vi.mock('@/utils/storage', () => ({ getSignedUrl: vi.fn(async () => 'https://signed.example/x.pdf') }));

const score = (over: Partial<PersonalScore>): PersonalScore => ({
  id: 's1', user_id: 'u1', title: 'Ave Maria', composer: 'Gounod', voicing: 'SATB',
  source: 'upload', pd_work_id: null, entitlement_id: null,
  storage_path: 'u1/uploads/a.pdf', thumbnail_path: null,
  created_at: '2026-07-12T00:00:00Z', ...over,
});

afterEach(cleanup);

describe('MyMusicTab', () => {
  it('shows the inviting empty state when there are no scores', () => {
    state.scores = []; state.isLoading = false;
    render(<MyMusicTab />);
    expect(screen.getByText(/no music yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add a pdf/i })).toBeInTheDocument();
  });

  it('lists scores with source badges', () => {
    state.scores = [
      score({ id: '1', title: 'Ave Maria', source: 'upload' }),
      score({ id: '2', title: 'Sicut Cervus', source: 'cpdl' }),
      score({ id: '3', title: 'New Dawn', source: 'purchase' }),
    ];
    render(<MyMusicTab />);
    expect(screen.getByText('Ave Maria')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('CPDL')).toBeInTheDocument();
    expect(screen.getByText('GW Sheet Music Store')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    state.scores = []; state.isLoading = true;
    render(<MyMusicTab />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  // A source badge is NOT an open affordance — without a visible "Open" cue the
  // cards read as an inert list, which is exactly how this was misread in use.
  it('gives every card a visible open affordance', () => {
    state.scores = [score({ id: '1' }), score({ id: '2', title: 'Sicut Cervus' })];
    state.isLoading = false;
    render(<MyMusicTab />);
    expect(screen.getAllByText('Open')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /open ave maria/i })).toBeInTheDocument();
  });

  // Regression: openScore used waitForReady=true, so a missing object retried
  // for 30 SILENT seconds before erroring. Existing scores must fail fast.
  it('does not use the post-upload retry loop when opening a score', async () => {
    state.scores = [score({ id: '1' })]; state.isLoading = false;
    render(<MyMusicTab />);
    fireEvent.click(screen.getByRole('button', { name: /open ave maria/i }));
    await waitFor(() => expect(getSignedUrl).toHaveBeenCalled());
    const [, , , waitForReady] = vi.mocked(getSignedUrl).mock.calls.at(-1)!;
    expect(waitForReady).toBe(false);
  });
});
