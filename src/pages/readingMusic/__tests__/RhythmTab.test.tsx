// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
vi.mock('@/lib/readingMusic/attemptsApi', () => ({ insertAttempt: vi.fn().mockResolvedValue(true) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import { RhythmTab } from '../RhythmTab';

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
});
