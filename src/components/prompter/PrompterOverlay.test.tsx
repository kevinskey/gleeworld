// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Configurable speech-input stub: tests opt into an available recognizer;
// the default mirrors a browser with none (exercises the VAD fallback).
const speechMock = vi.hoisted(() => ({
  impl: null as null | (() => { available: boolean; start: (onResult: (t: string, f: boolean) => void, onEnd: () => void) => void; stop: () => void }),
}));
vi.mock('@/lib/assistant/speech', () => ({
  getSpeechInput: () => (speechMock.impl ? speechMock.impl() : { available: false, start: () => {}, stop: () => {} }),
}));

import { PrompterOverlay } from './PrompterOverlay';

describe('PrompterOverlay', () => {
  it('renders nothing when closed', () => {
    render(<PrompterOverlay open={false} onClose={() => {}} text="Hello" />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders paragraphs and starts paused', () => {
    render(<PrompterOverlay open onClose={() => {}} text={'First line\n\nSecond line'} title="Sermon" />);
    expect(screen.getByRole('dialog', { name: /Sermon/ })).toBeInTheDocument();
    // Words render as individual spans (follow mode measures them).
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getAllByText('line')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('play toggles to pause, and Escape closes', () => {
    const onClose = vi.fn();
    render(<PrompterOverlay open onClose={onClose} text="Read me" />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('adjusts speed within bounds', () => {
    render(<PrompterOverlay open onClose={() => {}} text="Read me" />);
    const readout = () => screen.getByText(/px\/s/).textContent;
    const before = readout();
    fireEvent.click(screen.getByRole('button', { name: 'Faster' }));
    expect(readout()).not.toBe(before);
  });

  it('shows the empty message for an empty document', () => {
    render(<PrompterOverlay open onClose={() => {}} text="   " />);
    expect(screen.getByText(/Nothing to read/)).toBeInTheDocument();
  });

  it('offers voice control and reports a blocked mic honestly', async () => {
    speechMock.impl = null;
    const getUserMedia = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    render(<PrompterOverlay open onClose={() => {}} text="Read me" />);
    const voice = screen.getByRole('button', { name: /Voice control/ });
    fireEvent.click(voice);
    await screen.findByTitle(/Microphone blocked/);
    expect(getUserMedia).toHaveBeenCalled();
  });

  it('uses word-follow mode when a recognizer is available and survives off-script speech', async () => {
    let capture: ((t: string, f: boolean) => void) | null = null;
    const start = vi.fn((onResult: (t: string, f: boolean) => void) => { capture = onResult; });
    const stop = vi.fn();
    speechMock.impl = () => ({ available: true, start, stop });
    render(<PrompterOverlay open onClose={() => {}} text={'Children go where I send thee'} />);
    const voice = screen.getByRole('button', { name: /Voice control/ });
    await act(async () => { fireEvent.click(voice); });
    expect(start).toHaveBeenCalled();
    expect(voice).toHaveAttribute('aria-pressed', 'true');
    // On-script, ad-lib, and back on-script — none of it may throw.
    act(() => {
      capture?.('children go', false);
      capture?.('children go completely unrelated words', false);
      capture?.('children go completely unrelated words where i send', false);
    });
    // Manual pause wins instantly and releases the recognizer.
    fireEvent.click(screen.getByRole('button', { name: /Pause|Play/ }));
    expect(stop).toHaveBeenCalled();
    speechMock.impl = null;
  });
});
