// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrompterOverlay } from './PrompterOverlay';

describe('PrompterOverlay', () => {
  it('renders nothing when closed', () => {
    render(<PrompterOverlay open={false} onClose={() => {}} text="Hello" />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders paragraphs and starts paused', () => {
    render(<PrompterOverlay open onClose={() => {}} text={'First line\n\nSecond line'} title="Sermon" />);
    expect(screen.getByRole('dialog', { name: /Sermon/ })).toBeInTheDocument();
    expect(screen.getByText('First line')).toBeInTheDocument();
    expect(screen.getByText('Second line')).toBeInTheDocument();
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
});
