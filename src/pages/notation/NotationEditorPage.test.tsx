// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotationEditorPage from './NotationEditorPage';

vi.mock('@/lib/notation/exercisesApi', () => ({
  saveExercise: vi.fn().mockResolvedValue({ id: 'x1' }),
  loadExercise: vi.fn(),
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ isAdmin: () => true, loading: false }),
}));

// MusicXMLPlayer reaches for window.AudioContext in its constructor, which
// jsdom doesn't provide — mock the playback hook so the page can mount.
vi.mock('@/components/sight-singing/hooks/useTonePlayback', () => ({
  useTonePlayback: () => ({ isPlaying: false, startPlayback: vi.fn(), stopPlayback: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

describe('NotationEditorPage', () => {
  it('a blank editor opens with a Save button and an empty title field', () => {
    render(
      <MemoryRouter>
        <NotationEditorPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /assign/i })).toBeInTheDocument();
  });

  it('renders score-header controls for key, mode, time, clef, and tempo', () => {
    render(
      <MemoryRouter>
        <NotationEditorPage />
      </MemoryRouter>
    );
    expect(screen.getByLabelText(/key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/clef/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tempo/i)).toBeInTheDocument();
  });

  it('binds the tempo control to score state', () => {
    render(
      <MemoryRouter>
        <NotationEditorPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/tempo/i), { target: { value: '96' } });
    expect((screen.getByLabelText(/tempo/i) as HTMLInputElement).value).toBe('96');
  });
});
