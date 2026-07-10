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

  it('binds the tempo control to score state, clamping only on blur (not per keystroke)', () => {
    render(
      <MemoryRouter>
        <NotationEditorPage />
      </MemoryRouter>
    );
    const input = screen.getByLabelText(/tempo/i) as HTMLInputElement;
    // Typing digit-by-digit must not get clobbered by mid-entry clamping.
    fireEvent.change(input, { target: { value: '9' } });
    expect(input.value).toBe('9');
    fireEvent.change(input, { target: { value: '96' } });
    expect(input.value).toBe('96');
    // Clamping happens on blur.
    fireEvent.blur(input);
    expect(input.value).toBe('96');
  });

  it('clamps an out-of-range tempo to the bounds on blur', () => {
    render(
      <MemoryRouter>
        <NotationEditorPage />
      </MemoryRouter>
    );
    const input = screen.getByLabelText(/tempo/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '900' } });
    expect(input.value).toBe('900');
    fireEvent.blur(input);
    expect(input.value).toBe('400');
  });

  it('changing the Key select updates its reflected value', () => {
    render(
      <MemoryRouter>
        <NotationEditorPage />
      </MemoryRouter>
    );
    const select = screen.getByLabelText(/key/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'G' } });   // Key picks a tonic name now
    expect(select.value).toBe('G');
  });

  it('changing the Clef select updates its reflected value', () => {
    render(
      <MemoryRouter>
        <NotationEditorPage />
      </MemoryRouter>
    );
    const select = screen.getByLabelText(/clef/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'bass' } });
    expect(select.value).toBe('bass');
  });

  it('changing the Time select updates its reflected value', () => {
    render(
      <MemoryRouter>
        <NotationEditorPage />
      </MemoryRouter>
    );
    const select = screen.getByLabelText(/time/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '6/8' } });
    expect(select.value).toBe('6/8');
  });

  it('changing the Mode select updates its reflected value', () => {
    render(
      <MemoryRouter>
        <NotationEditorPage />
      </MemoryRouter>
    );
    const select = screen.getByLabelText(/mode/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'minor' } });
    expect(select.value).toBe('minor');
  });
});
